import { DISCOVERY, PORTS, parseAdvertisement } from './protocol.js';
import type { Tailscale } from './tailscale.js';
import type { DiscoveredInstance, Instance } from './types.js';
import http from 'node:http';

/** Tailnet probes must not inherit Harness's model-provider HTTP proxy. */
export const directPeerFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  return new Promise<Response>((resolve, reject) => {
    const request = http.get(url, { agent: new http.Agent({ keepAlive: false }), signal: init?.signal ?? undefined }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error('discovery-unavailable')); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 4096) { response.destroy(new Error('advertisement-too-large')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: 200 })));
    });
    request.on('error', reject);
  });
};

export class Discovery {
  readonly tailscale: Tailscale;
  readonly ports: readonly number[];
  readonly timeout: number;
  readonly fetcher: typeof fetch;
  readonly instances: Map<string, DiscoveredInstance>;
  running: boolean;
  constructor(tailscale: Tailscale, { ports = PORTS, timeout = 1200, fetcher = directPeerFetch }: { ports?: readonly number[]; timeout?: number; fetcher?: typeof fetch } = {}) {
    this.tailscale = tailscale; this.ports = ports; this.timeout = timeout; this.fetcher = fetcher;
    this.instances = new Map(); this.running = false;
  }
  async scan() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = this.tailscale.candidates().flatMap(node => this.ports.map(port => ({ node, port })));
      const found = new Map<string, DiscoveredInstance | null>();
      await Promise.all(Array.from({ length: Math.min(24, jobs.length) }, async () => {
        while (jobs.length) {
          const { node, port } = jobs.shift()!;
          const origin = `http://${node.ip.includes(':') ? `[${node.ip}]` : node.ip}:${port}`;
          try {
            const started = performance.now();
            const response = await this.fetcher(`${origin}${DISCOVERY}`, {
              signal: AbortSignal.timeout(this.timeout), redirect: 'error',
            });
            if (!response.ok) continue;
            const text = await response.text();
            const latencyMs = Math.ceil(performance.now() - started);
            if (text.length > 4096) continue;
            const ad = parseAdvertisement(JSON.parse(text), node.nodeId);
            const key = `${ad.nodeId}/${ad.id}`;
            // A duplicate stable identity is ambiguous; do not choose either.
            if (found.has(key)) { found.set(key, null); continue; }
            found.set(key, { ...ad, key, origin, machine: node.label, online: true, seen: Date.now(), latencyMs });
          } catch { /* Unreachable ports are normal; never print endpoints or response data. */ }
        }
      }));
      for (const [key, item] of this.instances) {
        if (!found.get(key)) this.instances.set(key, { ...item, online: false });
      }
      for (const [key, item] of found) if (item) this.instances.set(key, item);
    } finally { this.running = false; }
  }
  get(key: string): DiscoveredInstance | undefined {
    const item = this.instances.get(key);
    if (!item || !this.tailscale.status || Date.now() - item.seen > 12_000) return item && { ...item, online: false };
    return item;
  }
  list(): Instance[] {
    return [...this.instances.keys()].map(key => {
      const { origin, seen, latencyMs, ...publicItem } = this.get(key)!;
      return publicItem.online ? { ...publicItem, latencyMs } : publicItem;
    });
  }
}
