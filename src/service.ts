import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Tailscale } from './tailscale.js';
import { Discovery } from './discovery.js';
import { TargetView } from './view.js';
import { PROTOCOL, PORTS, DISCOVERY, AUTH_HEADER, ID_HEADER, BOOT_HEADER, json } from './protocol.js';
import { relayHTTP, relayUpgrade, listen, closeServer } from './proxy.js';
import { handleDirectory } from './directory.js';
import { REMOTE_ATTACHMENT, REMOTE_DIRECTORY } from './types.js';
import type { DirectoryBrowser } from './directory.js';
import type { IncomingMessage, Server, ServerResponse, OutgoingHttpHeaders } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Advertisement, ScanStamp, Status, ViewEntry } from './types.js';

export interface ServiceOptions {
  id: string; version: string; label: string; surface: 'web' | 'desktop';
  upstream: () => string; credentials: () => OutgoingHttpHeaders; tailscale?: Tailscale; ports?: readonly number[];
  directoryBrowser?: Promise<DirectoryBrowser | undefined>;
  remoteAttachment?: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

export class Tailseek {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly surface: 'web' | 'desktop';
  readonly upstream: () => string;
  readonly credentials: () => OutgoingHttpHeaders;
  readonly tailscale: Tailscale;
  readonly ports: readonly number[];
  private readonly directoryBrowser?: Promise<DirectoryBrowser | undefined>;
  private readonly remoteAttachment?: ServiceOptions['remoteAttachment'];
  readonly boot: string;
  readonly discovery: Discovery;
  readonly views: Map<string, TargetView>;
  readonly sockets: Set<Duplex>;
  error: string | undefined;
  closed: boolean;
  private scanInProgress?: Promise<void>;
  private completedScans = 0;
  server?: Server;
  ip?: string;
  constructor({ id, version, label, surface, upstream, credentials, tailscale = new Tailscale(), ports = PORTS,
    directoryBrowser, remoteAttachment }: ServiceOptions) {
    this.id = id; this.version = version; this.label = label; this.surface = surface;
    this.upstream = upstream; this.credentials = credentials; this.tailscale = tailscale; this.ports = ports;
    this.directoryBrowser = directoryBrowser;
    this.remoteAttachment = remoteAttachment;
    this.boot = randomUUID(); this.discovery = new Discovery(tailscale, { ports });
    this.views = new Map(); this.sockets = new Set(); this.error = 'starting'; this.closed = false;
  }
  advertisement(): Advertisement {
    return { protocol: PROTOCOL, id: this.id, boot: this.boot, nodeId: this.tailscale.status!.Self.ID,
      version: this.version, label: this.label, surface: this.surface };
  }
  async admit(req: IncomingMessage): Promise<boolean> {
    if (req.headers.origin || req.headers['sec-fetch-site'] || !await this.tailscale.authorize(req.socket.remoteAddress)) return false;
    return true;
  }
  matches(req: IncomingMessage): boolean { return req.headers[ID_HEADER] === this.id && req.headers[BOOT_HEADER] === this.boot; }
  async startListener(ip: string): Promise<void> {
    const server = http.createServer((req, res) => {
      (async () => {
        if (!await this.admit(req)) { json(res, 403, { error: 'tailnet-access-denied' }); return; }
        if (req.url === DISCOVERY && req.method === 'GET') { json(res, 200, this.advertisement()); return; }
        if (!this.matches(req)) { json(res, 409, { error: 'instance-changed' }); return; }
        if (req.url === REMOTE_DIRECTORY) { await handleDirectory(req, res, await this.directoryBrowser); return; }
        if (req.url === REMOTE_ATTACHMENT && this.remoteAttachment) { await this.remoteAttachment(req, res); return; }
        if (req.url?.startsWith('/api/tailseek/') || req.url?.startsWith('/connect') || /[?&]token=/i.test(req.url ?? '')) {
          json(res, 403, { error: 'control-route-denied' }); return;
        }
        relayHTTP(req, res, this.upstream(), this.credentials());
      })().catch(() => { if (!res.headersSent) json(res, 503, { error: 'tailnet-unavailable' }); else res.destroy(); });
    });
    server.headersTimeout = 10_000; server.requestTimeout = 60_000; server.maxConnections = 128;
    server.on('upgrade', (req, socket, head) => {
      (async () => {
        if (!await this.admit(req) || !this.matches(req)) { socket.destroy(); return; }
        relayUpgrade(req, socket, head, this.upstream(), this.credentials(), this.sockets);
      })().catch(() => socket.destroy());
    });
    for (const port of this.ports) {
      try { await listen(server, port, ip); this.server = server; this.ip = ip; return; }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'EADDRINUSE')) { await closeServer(server); throw error; } }
    }
    throw new Error('instance-ports-exhausted');
  }
  async tick() {
    if (this.closed) return;
    this.scanInProgress ??= this.scan().finally(() => {
      this.completedScans++;
      this.scanInProgress = undefined;
    });
    return this.scanInProgress;
  }
  refresh(): ScanStamp {
    if (this.closed) throw new Error('tailseek-closed');
    void this.tick();
    // Let the status poll report completion without holding the POST open.
    return { boot: this.boot, sequence: this.completedScans + 1 };
  }
  private async scan() {
    try {
      this.upstream(); // Listener may not be ready during plugin activation.
      await this.tailscale.refresh();
      const ips = this.tailscale.status?.TailscaleIPs;
      const ip = ips?.find(ip => !ip.includes(':')) ?? ips?.[0];
      if ((!ip || ip !== this.ip) && this.server) {
        await closeServer(this.server, this.sockets); this.server = undefined; this.ip = undefined;
      }
      if (ip && !this.server && !this.closed) await this.startListener(ip);
      if (this.closed) return;
      await this.discovery.scan();
      this.error = this.tailscale.error;
      for (const [id, view] of this.views) {
        if (!view.target()) view.suspend();
        const expiry = view.ticket ? 30_000 : 60 * 60 * 1000;
        if (!view.sockets.size && Date.now() - view.lastUsed > expiry) { await view.close(); this.views.delete(id); }
      }
    } catch { this.error = 'listener-unavailable'; }
  }
  snapshot(): Status {
    return { local: { id: this.id, version: this.version, surface: this.surface }, error: this.error,
      instances: this.discovery.list().filter(item => item.id !== this.id || item.nodeId !== this.tailscale.status?.Self.ID),
      lastScan: { boot: this.boot, sequence: this.completedScans } };
  }
  async open(key: string): Promise<ViewEntry> {
    const target = this.discovery.get(key);
    if (!target?.online || !target.compatible) throw new Error('target-unavailable');
    if (this.views.size >= 32) throw new Error('too-many-views');
    const view = new TargetView(key, this.discovery);
    const id = randomUUID();
    const entry = await view.start(); this.views.set(id, view);
    return { ...entry, viewId: id, boot: target.boot };
  }
  async release(id: string): Promise<void> {
    const view = this.views.get(id); if (!view) return;
    this.views.delete(id); await view.close();
  }
  async close() {
    this.closed = true;
    // Wait for an in-flight discovery pass before closing any listener it creates.
    await this.scanInProgress;
    await Promise.all([...this.views.values()].map(view => view.close())); this.views.clear();
    if (this.server) await closeServer(this.server, this.sockets);
  }
}
