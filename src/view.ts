import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { boundedBody, equalSecret, isLoopback, json, ID_HEADER, BOOT_HEADER } from './protocol.js';
import { relayHTTP, relayUpgrade, listen, closeServer } from './proxy.js';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Discovery } from './discovery.js';
import type { DiscoveredInstance } from './types.js';

/** One viewer has one immutable instance identity. It never routes to localhost on failure. */
export class TargetView {
  readonly key: string;
  readonly discovery: Discovery;
  readonly sockets: Set<Duplex>;
  readonly secret: string;
  ticket: string | undefined;
  readonly cookie: string;
  readonly created: number;
  lastUsed: number;
  readonly boot: string | undefined;
  readonly server: Server;
  origin = '';
  constructor(key: string, discovery: Discovery) {
    this.key = key; this.discovery = discovery; this.sockets = new Set();
    this.secret = randomBytes(32).toString('base64url');
    this.ticket = randomBytes(32).toString('base64url');
    this.cookie = `tailseek_${randomBytes(12).toString('hex')}`;
    this.created = Date.now(); this.lastUsed = Date.now(); this.boot = discovery.get(key)?.boot;
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch(() => { if (!res.headersSent) json(res, 400, { error: 'invalid-request' }); else res.destroy(); });
    });
    this.server.on('upgrade', (req, socket, head) => {
      const target = this.target();
      if (!this.authorized(req) || !target) { socket.destroy(); return; }
      relayUpgrade(req, socket, head, target.origin, this.headers(target), this.sockets);
    });
  }
  async start() {
    const port = await listen(this.server, 0, '127.0.0.1');
    this.origin = `http://127.0.0.1:${port}`;
    return { origin: this.origin, ticket: this.ticket! };
  }
  target() {
    const target = this.discovery.get(this.key);
    // A restarted Host invalidates old event IDs, approvals, and pending writes.
    // Reopening the same selected target obtains a fresh page and boot identity.
    return target?.online && target.compatible && target.boot === this.boot ? target : undefined;
  }
  headers(target: DiscoveredInstance) { return { [ID_HEADER]: target.id, [BOOT_HEADER]: this.boot }; }
  authorized(req: IncomingMessage): boolean {
    if (!isLoopback(req.socket.remoteAddress) || req.headers.host !== new URL(this.origin).host) return false;
    if (req.headers.origin && req.headers.origin !== this.origin) return false;
    const pair = String(req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(`${this.cookie}=`));
    return equalSecret(pair?.slice(this.cookie.length + 1), this.secret);
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.url === '/__tailseek/enter' && req.method === 'POST') {
      if (!isLoopback(req.socket.remoteAddress) || req.headers.host !== new URL(this.origin).host) { json(res, 403, { error: 'forbidden' }); return; }
      const body = new URLSearchParams(await boundedBody(req));
      if (!this.ticket || Date.now() - this.created > 30_000 || !equalSecret(body.get('ticket'), this.ticket)) {
        json(res, 401, { error: 'entry-expired' }); return;
      }
      this.ticket = undefined;
      // Partitioned cookie supports an embedded desktop document without granting
      // other top-level sites access. Chromium treats loopback as trustworthy.
      res.writeHead(303, { location: '/', 'cache-control': 'no-store',
        'set-cookie': `${this.cookie}=${this.secret}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/` });
      res.end(); return;
    }
    if (!this.authorized(req)) { json(res, 401, { error: 'unauthorized' }); return; }
    this.lastUsed = Date.now();
    const target = this.target();
    if (!target) { json(res, 503, { error: 'target-offline-or-restarted' }); return; }
    // Remote users must never open another nested administrative Tailseek relay.
    if (req.url?.startsWith('/api/tailseek/')) { json(res, 403, { error: 'nested-control-disabled' }); return; }
    relayHTTP(req, res, target.origin, this.headers(target));
  }
  suspend() { for (const socket of this.sockets) socket.destroy(); this.server.closeAllConnections(); }
  close() { return closeServer(this.server, this.sockets); }
}
