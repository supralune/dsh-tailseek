import http from 'node:http';
import { pipeline } from 'node:stream';
import type { Duplex } from 'node:stream';
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders, Server, ClientRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AUTH_HEADER, ID_HEADER, BOOT_HEADER, json } from './protocol.js';

const STRIP = new Set(['host', 'cookie', 'authorization', 'origin', 'referer',
  'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
  AUTH_HEADER, ID_HEADER, BOOT_HEADER, 'connection', 'proxy-authorization',
  'proxy-authenticate', 'keep-alive', 'te', 'trailer', 'transfer-encoding']);

export function proxyHeaders(req: Pick<IncomingMessage, 'headers'>, target: string, extra: OutgoingHttpHeaders, upgrade = false): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = {};
  const connectionHeaders = new Set(String(req.headers.connection ?? '').toLowerCase().split(',').map(x => x.trim()));
  for (const [key, value] of Object.entries(req.headers)) {
    if (!STRIP.has(key) && !connectionHeaders.has(key) && !key.startsWith('sec-fetch-')) headers[key] = value;
  }
  headers.host = new URL(target).host;
  headers['accept-encoding'] = 'identity';
  if (upgrade) { headers.connection = 'Upgrade'; headers.upgrade = 'websocket'; }
  return { ...headers, ...extra };
}
function options(req: IncomingMessage, target: string, headers: OutgoingHttpHeaders) {
  const url = new URL(target);
  // Preserve the path verbatim, never let //host replace the chosen upstream.
  if (!req.url?.startsWith('/') || req.url.startsWith('//') || /[\r\n]/.test(req.url)) throw new Error('invalid-path');
  if (url.protocol !== 'http:') throw new Error('unsupported-upstream-protocol');
  return { hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port, protocol: url.protocol,
    method: req.method, path: req.url, headers };
}
export function relayHTTP(req: IncomingMessage, res: ServerResponse, target: string, extra: OutgoingHttpHeaders = {}, agent: http.Agent = new http.Agent()): void {
  let upstream: ClientRequest;
  try {
    const opts = options(req, target, proxyHeaders(req, target, extra));
    upstream = http.request({ ...opts, agent }, response => {
      const headers = { ...response.headers };
      delete headers['set-cookie']; delete headers[AUTH_HEADER];
      // A login/absolute redirect would expose an upstream address or credential.
      if (headers.location && (!headers.location.startsWith('/') || headers.location.startsWith('//') || /token=/i.test(headers.location))) {
        response.resume(); json(res, 502, { error: 'upstream-redirect-refused' }); return;
      }
      delete headers['transfer-encoding']; delete headers.connection;
      res.writeHead(response.statusCode ?? 502, headers);
      pipeline(response, res, () => {});
    });
  } catch { json(res, 400, { error: 'invalid-request' }); return; }
  upstream.setTimeout(30_000, () => upstream.destroy());
  upstream.on('error', () => {
    if (!res.headersSent) json(res, 503, { error: 'target-offline' }); else res.destroy();
  });
  res.on('close', () => upstream.destroy());
  pipeline(req, upstream, () => {});
}
export function relayUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, target: string, extra: OutgoingHttpHeaders = {}, sockets = new Set<Duplex>(), agent: http.Agent = new http.Agent()): void {
  if (req.url !== '/api/remote.mux') { socket.destroy(); return; }
  const opts = options(req, target, proxyHeaders(req, target, extra, true));
  const request = http.request({ ...opts, agent });
  sockets.add(socket);
  const fail = () => { socket.destroy(); request.destroy(); sockets.delete(socket); };
  socket.on('error', fail); socket.on('close', fail);
  request.on('error', fail); request.on('response', response => { response.resume(); fail(); });
  request.setTimeout(5000, fail);
  request.on('upgrade', (response, upstream, upstreamHead) => {
    request.setTimeout(0);
    sockets.add(upstream);
    upstream.on('error', fail);
    upstream.on('close', () => { sockets.delete(upstream); fail(); });
    socket.on('close', () => upstream.destroy());
    const headers = Object.entries(response.headers)
      .filter(([key]) => !['set-cookie', AUTH_HEADER].includes(key))
      .map(([key, value]) => `${key}: ${value}`).join('\r\n');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers}\r\n\r\n`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstream.write(head);
    upstream.pipe(socket); socket.pipe(upstream);
  });
  request.end();
}
export function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const error = (err: Error) => { server.off('listening', ready); reject(err); };
    const ready = () => { server.off('error', error); resolve((server.address() as AddressInfo).port); };
    server.once('error', error); server.once('listening', ready); server.listen(port, host);
  });
}
export async function closeServer(server: Server, sockets = new Set<Duplex>()): Promise<void> {
  for (const socket of sockets) socket.destroy();
  server.closeAllConnections();
  if (server.listening) await new Promise(resolve => server.close(resolve));
}
