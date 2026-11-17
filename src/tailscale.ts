import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { posix, win32 } from 'node:path';
import { homedir } from 'node:os';
import { tailIP } from './protocol.js';
import type { Candidate } from './types.js';

const exec = promisify(execFile);
export interface NodeStatus {
  ID: string; UserID: number; Online?: boolean; TailscaleIPs: string[];
  HostName?: string; DNSName?: string;
}
export interface TailStatus {
  BackendState: string; TUN?: boolean; Self: NodeStatus;
  TailscaleIPs: string[]; Peer: Record<string, NodeStatus>;
}
interface Identity { Node: { StableID: string; User: number; Expired?: boolean; Addresses: string[] } }
export type Execute = (file: string, args: string[], options: { timeout: number; maxBuffer: number; windowsHide: boolean }) => Promise<{ stdout: string }>;

export function cliCandidates(platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env,
  home = homedir(), exists = existsSync): string[] {
  const isWindows = platform === 'win32';
  const path = isWindows ? win32 : posix;
  const executable = isWindows ? 'tailscale.exe' : 'tailscale';
  const fromPath = (env.PATH ?? env.Path ?? '').split(path.delimiter)
    .filter(Boolean).map(dir => path.join(dir, executable));
  const standard = platform === 'darwin'
    ? [
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      path.join(home, 'Applications/Tailscale.app/Contents/MacOS/Tailscale'),
      '/opt/homebrew/bin/tailscale', '/usr/local/bin/tailscale',
    ]
    : isWindows
      ? [
        path.join(env.ProgramFiles ?? 'C:\\Program Files', 'Tailscale', executable),
        ...(env.LOCALAPPDATA ? [path.join(env.LOCALAPPDATA, 'Tailscale', executable)] : []),
      ]
      : ['/usr/bin/tailscale', '/usr/local/bin/tailscale', '/opt/bin/tailscale'];
  return [...new Set([...fromPath, ...standard].filter(file => exists(file)))];
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-tailscale-response');
  return value as Record<string, unknown>;
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) throw new Error('invalid-tailscale-response');
  return value as string[];
}
function parseNode(value: unknown): NodeStatus {
  const node = object(value);
  if (typeof node.ID !== 'string' || typeof node.UserID !== 'number') throw new Error('invalid-tailscale-response');
  return { ID: node.ID, UserID: node.UserID, TailscaleIPs: strings(node.TailscaleIPs),
    Online: node.Online !== false, HostName: typeof node.HostName === 'string' ? node.HostName : undefined,
    DNSName: typeof node.DNSName === 'string' ? node.DNSName : undefined };
}
export function parseStatus(value: unknown): TailStatus {
  const data = object(value);
  if (data.BackendState !== 'Running') throw new Error('tailscale-not-running');
  if (data.TUN === false) throw new Error('tailscale-userspace-unsupported');
  const peers = Object.fromEntries(Object.entries(object(data.Peer ?? {})).map(([key, peer]) => [key, parseNode(peer)]));
  return { BackendState: data.BackendState, Self: parseNode(data.Self), Peer: peers, TailscaleIPs: strings(data.TailscaleIPs) };
}
function parseIdentity(value: unknown): Identity {
  const node = object(object(value).Node);
  if (typeof node.StableID !== 'string' || typeof node.User !== 'number') throw new Error('invalid-tailscale-response');
  return { Node: { StableID: node.StableID, User: node.User, Expired: node.Expired === true, Addresses: strings(node.Addresses) } };
}
export class Tailscale {
  readonly allowedNodes: Set<string>;
  readonly execute: Execute;
  readonly candidatesCLI: string[];
  cli?: string;
  status?: TailStatus;
  checkedAt = 0;
  error: string | undefined = 'tailscale-unavailable';
  private identities = new Map<string, { until: number; pending: Promise<Identity> }>();
  constructor({ cli, allowedNodes = [], execute = exec }: { cli?: string; allowedNodes?: string[]; execute?: Execute } = {}) {
    this.candidatesCLI = cli ? [cli] : cliCandidates(); this.allowedNodes = new Set(allowedNodes); this.execute = execute;
  }
  async command(args: string[], cli = this.cli): Promise<unknown> {
    if (!cli) throw new Error('tailscale-cli-missing');
    const { stdout } = await this.execute(cli, args, { timeout: 4000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    return JSON.parse(stdout);
  }
  async refresh(): Promise<TailStatus | undefined> {
    this.error = this.candidatesCLI.length ? 'tailscale-unavailable' : 'tailscale-cli-missing';
    for (const cli of this.cli ? [this.cli] : this.candidatesCLI) {
      try {
        const status = parseStatus(await this.command(['status', '--json'], cli));
        this.cli = cli; this.status = status; this.checkedAt = Date.now(); this.error = undefined;
        return status;
      } catch (error) {
        if (error instanceof Error && ['tailscale-not-running', 'tailscale-userspace-unsupported'].includes(error.message)) this.error = error.message;
      }
    }
    this.status = undefined; this.checkedAt = 0; this.identities.clear(); this.cli = undefined;
    return undefined;
  }
  permitted(nodeId: string, userId: number): boolean {
    return !!this.status && Date.now() - this.checkedAt < 12_000
      && (this.allowedNodes.has(nodeId) || (userId === this.status.Self.UserID && userId > 0));
  }
  candidates(): Candidate[] {
    if (!this.status) return [];
    return [this.status.Self, ...Object.values(this.status.Peer)]
      .filter(p => p.Online !== false && this.permitted(p.ID, p.UserID))
      .flatMap(p => {
        const ips = p.TailscaleIPs.filter(tailIP);
        const ip = ips.find(ip => !ip.includes(':')) ?? ips[0];
        return ip ? [{ nodeId: p.ID, ip, label: p.DNSName?.split('.')[0] || p.HostName || 'Harness' }] : [];
      });
  }
  async authorize(address: string | undefined): Promise<boolean> {
    const ip = address?.replace(/^::ffff:/, '');
    if (!tailIP(ip) || !this.status) return false;
    try {
      let cached = this.identities.get(ip);
      if (!cached || cached.until < Date.now()) {
        if (this.identities.size > 256) this.identities.clear();
        cached = { until: Date.now() + 4000, pending: this.command(['whois', '--json', ip]).then(parseIdentity) };
        this.identities.set(ip, cached);
      }
      const { Node: node } = await cached.pending;
      return !node.Expired && this.permitted(node.StableID, node.User)
        && node.Addresses.some(address => address.split('/')[0] === ip);
    } catch { return false; }
  }
}
