import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Tailscale, cliCandidates, parseStatus } from '../src/tailscale.js';
import { Discovery } from '../src/discovery.js';
import { Tailseek } from '../src/service.js';
import { TargetView } from '../src/view.js';
import { listen, closeServer, proxyHeaders } from '../src/proxy.js';
import { instanceId, parseAdvertisement, equalSecret, tailIP, ID_HEADER, BOOT_HEADER } from '../src/protocol.js';
import type { DiscoveredInstance } from '../src/types.js';

const self = { ID: 'self', UserID: 42, Online: true, TailscaleIPs: ['100.65.1.1'], DNSName: 'work.example.ts.net.' };
const status = { BackendState: 'Running', Self: self, TailscaleIPs: self.TailscaleIPs, Peer: {} };
function ts() { const t = new Tailscale({ cli: 'tailscale', execute: async () => ({ stdout: JSON.stringify(status) }) }); t.status = status; t.checkedAt = Date.now(); return t; }
function ad(): DiscoveredInstance { return { protocol: 1, id: instanceId('target'), boot: randomUUID(), nodeId: 'self', label: 'web', version: '0.2.2-rc.3', surface: 'web', compatible: true, key: `self/${instanceId('target')}`, machine: 'Work', origin: '', seen: Date.now(), online: true }; }

test('platform CLI lookup handles PATH, Windows spaces, macOS app and Linux paths', () => {
  assert.deepEqual(cliCandidates('win32', { PATH: 'D:\\Tools', ProgramFiles: 'D:\\Program Files' }, '', () => true), ['D:\\Tools\\tailscale.exe', 'D:\\Program Files\\Tailscale\\tailscale.exe']);
  assert.ok(cliCandidates('darwin', { PATH: '/tools' }, '/home/test', () => true).includes('/Applications/Tailscale.app/Contents/MacOS/Tailscale'));
  const linuxCandidates = cliCandidates('linux', { PATH: '/tools:/opt/tools' }, '', () => true);
  assert.deepEqual(linuxCandidates.slice(0, 2), ['/tools/tailscale', '/opt/tools/tailscale']);
  assert.deepEqual(cliCandidates('linux', {}, '', () => false), []);
});
test('wire validation strips untrusted fields, refuses node impersonation and incompatible protocols', () => {
  const item = ad(); const parsed = parseAdvertisement({ ...item, token: 'must-not-leak' }, 'self');
  assert.equal('token' in parsed, false);
  assert.throws(() => parseAdvertisement(item, 'another-node'));
  assert.throws(() => parseAdvertisement({ ...item, protocol: 2 }, 'self'));
  assert.equal(parseAdvertisement({ ...item, version: '0.2.3' }, 'self').compatible, false);
  assert.equal(equalSecret('€', 'abc'), false);
  assert.equal(tailIP('100.64.0.1'), true); assert.equal(tailIP('100.128.0.1'), false);
  assert.equal(tailIP('fd7a:115c:a1e0::1'), true); assert.equal(tailIP('::1'), false);
  assert.throws(() => parseStatus({ ...status, TUN: false }), /userspace/);
});
test('whois binds identity to actual source IP and owner; failures revoke immediately', async () => {
  let calls = 0; let stopped = false;
  const t = new Tailscale({ cli: 'tailscale', execute: async (_file, args) => {
    if (stopped) throw new Error('unavailable');
    if (args[0] === 'status') return { stdout: JSON.stringify(status) };
    calls++; return { stdout: JSON.stringify({ Node: { StableID: 'peer', User: 42, Addresses: ['100.65.1.2/32'] } }) };
  } });
  await t.refresh();
  assert.equal(await t.authorize('100.65.1.2'), true);
  assert.equal(await t.authorize('100.65.1.2'), true); assert.equal(calls, 1);
  assert.equal(await t.authorize('100.65.1.3'), false);
  assert.equal(await t.authorize('127.0.0.1'), false);
  assert.equal(t.permitted('peer', 43), false);
  stopped = true; await t.refresh(); assert.equal(await t.authorize('100.65.1.2'), false);
});
test('discovery distinguishes processes, retains offline targets and rejects duplicate identities', async () => {
  const t = ts(); let online = true; let duplicate = false;
  const first = ad(); const second = { ...ad(), id: instanceId('desktop'), surface: 'desktop' };
  const d = new Discovery(t, { ports: [1, 2], fetcher: async input => {
    if (!online) throw new Error('offline');
    return Response.json(String(input).includes(':1/') || duplicate ? first : second);
  } });
  await d.scan(); assert.equal(d.list().length, 2); assert.ok(d.list().every(i => i.online));
  assert.equal('origin' in d.list()[0], false);
  online = false; await d.scan(); assert.equal(d.list().length, 2); assert.ok(d.list().every(i => !i.online));
  online = true; duplicate = true; await d.scan(); assert.ok(d.list().every(i => !i.online));
});
test('native HTTP, bytes, uploads and cookies route only to the fixed identity; restart never redirects a write', async t => {
  const requests: { path: string; headers: http.IncomingHttpHeaders; body: Buffer }[] = [];
  const backend = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    requests.push({ path: req.url!, headers: req.headers, body: Buffer.concat(chunks) });
    res.setHeader('set-cookie', 'harness-secret=never-to-browser');
    res.setHeader('content-type', 'application/octet-stream'); res.end(Buffer.from([0, 255, 7, 13]));
  });
  const port = await listen(backend, 0, '127.0.0.1'); t.after(() => closeServer(backend));
  const tailscale = ts(); tailscale.authorize = async () => true;
  const service = new Tailseek({ id: instanceId('target'), version: '0.2.2-rc.3', label: 'web', surface: 'web',
    credentials: () => ({ cookie: 'private=harness' }), upstream: () => `http://127.0.0.1:${port}`, tailscale, ports: [0] });
  await service.startListener('127.0.0.1'); t.after(() => service.close());
  const target = { ...ad(), boot: service.boot, origin: `http://127.0.0.1:${(service.server!.address() as import('node:net').AddressInfo).port}` };
  const d = new Discovery(tailscale); d.instances.set(target.key, target);
  const view = new TargetView(target.key, d); const entry = await view.start(); t.after(() => view.close());
  let response = await fetch(entry.origin); assert.equal(response.status, 401);
  response = await fetch(`${entry.origin}/__tailseek/enter`, { method: 'POST', body: new URLSearchParams({ ticket: entry.ticket }), redirect: 'manual' });
  assert.equal(response.status, 303); const cookie = response.headers.get('set-cookie')!.split(';')[0];
  assert.equal(response.headers.get('location'), '/');
  const again = await fetch(`${entry.origin}/__tailseek/enter`, { method: 'POST', body: new URLSearchParams({ ticket: entry.ticket }) }); assert.equal(again.status, 401);
  response = await fetch(`${entry.origin}/api/upload`, { method: 'POST', headers: { cookie, origin: entry.origin, authorization: 'do-not-forward' }, body: Buffer.from([1, 2, 255]) });
  assert.equal(response.status, 200); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([0, 255, 7, 13]));
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(requests[0].body, Buffer.from([1, 2, 255]));
  assert.equal(requests[0].headers.cookie, 'private=harness');
  assert.equal(requests[0].headers.authorization, undefined); assert.equal(requests[0].headers.origin, undefined);
  response = await fetch(`${entry.origin}/api/write`, { method: 'POST', headers: { cookie, origin: 'https://evil.invalid' } }); assert.equal(response.status, 401);
  target.online = false;
  response = await fetch(`${entry.origin}/api/write`, { method: 'POST', headers: { cookie } }); assert.equal(response.status, 503);
  target.online = true; target.boot = randomUUID();
  response = await fetch(`${entry.origin}/api/write`, { method: 'POST', headers: { cookie } }); assert.equal(response.status, 503);
  assert.equal(requests.length, 1);
  // Even a stale discovery lease cannot accidentally send a write to a reused port.
  response = await fetch(`${target.origin}/api/write`, { method: 'POST', headers: { [ID_HEADER]: instanceId('other'), [BOOT_HEADER]: service.boot } });
  assert.equal(response.status, 409); assert.equal(requests.length, 1);
  response = await fetch(`${target.origin}/.well-known/tailseek`, { headers: { origin: 'https://evil.invalid' } }); assert.equal(response.status, 403);
  response = await fetch(`${target.origin}/.well-known/tailseek`); assert.equal(response.status, 200);
  assert.ok(!JSON.stringify(await response.json()).includes('harness-secret'));
});
test('proxy removes hop-by-hop and caller credentials before injecting its own', () => {
  const request = { headers: { host: 'evil', connection: 'x-private', 'x-private': 'hidden', cookie: 'stolen', origin: 'https://evil.invalid', 'x-tailseek-internal': 'forged' } };
  const headers = proxyHeaders(request, 'http://127.0.0.1:4000', { cookie: 'owned' });
  assert.deepEqual(headers, { host: '127.0.0.1:4000', 'accept-encoding': 'identity', cookie: 'owned' });
});

test('discovery bypasses a poisoned global proxy agent and rejects redirects, empty status and oversized responses', async t => {
  const { directPeerFetch } = await import('../src/discovery.js');
  const server = http.createServer((req, res) => {
    if (req.url === '/empty') { res.writeHead(204); res.end(); }
    else if (req.url === '/redirect') { res.writeHead(302, { location: 'http://example.invalid' }); res.end(); }
    else if (req.url === '/large') res.end('x'.repeat(4097));
    else res.end(JSON.stringify(ad()));
  });
  const port = await listen(server, 0, '127.0.0.1'); t.after(() => closeServer(server));
  const previous = http.globalAgent;
  const poisoned = new Proxy(new http.Agent(), { get(target, property, receiver) {
    if (property === 'addRequest') return () => { throw new Error('global proxy must not be used'); };
    return Reflect.get(target, property, receiver);
  } });
  http.globalAgent = poisoned;
  t.after(() => { http.globalAgent = previous; poisoned.destroy(); });
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await directPeerFetch(base)).status, 200);
  await assert.rejects(directPeerFetch(`${base}/empty`));
  await assert.rejects(directPeerFetch(`${base}/redirect`));
  await assert.rejects(directPeerFetch(`${base}/large`));
});

test('native Gateway upgrade forwards opaque frames both ways, strips credentials and closes on suspend', async t => {
  const { createConnection } = await import('node:net');
  const { default: EventEmitter } = await import('node:events');
  const once = EventEmitter.once;
  const { createHash } = await import('node:crypto');
  const backend = http.createServer();
  const backendSockets = new Set<import('node:stream').Duplex>();
  let headers: http.IncomingHttpHeaders = {};
  backend.on('upgrade', (req, socket) => {
    headers = req.headers; backendSockets.add(socket); socket.on('close', () => backendSockets.delete(socket));
    const accept = createHash('sha1').update(String(req.headers['sec-websocket-key']) + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.on('data', bytes => socket.write(bytes));
  });
  const port = await listen(backend, 0, '127.0.0.1'); t.after(() => closeServer(backend, backendSockets));
  const tailscale = ts(); tailscale.authorize = async () => true;
  const service = new Tailseek({ id: instanceId('target'), version: '0.2.2-rc.3', label: 'web', surface: 'web',
    credentials: () => ({ cookie: 'harness=private' }), upstream: () => `http://127.0.0.1:${port}`, tailscale, ports: [0] });
  await service.startListener('127.0.0.1'); t.after(() => service.close());
  const target = { ...ad(), boot: service.boot, origin: `http://127.0.0.1:${(service.server!.address() as import('node:net').AddressInfo).port}` };
  const discovery = new Discovery(tailscale); discovery.instances.set(target.key, target);
  const view = new TargetView(target.key, discovery); const entry = await view.start(); t.after(() => view.close());
  const response = await fetch(`${entry.origin}/__tailseek/enter`, { method: 'POST', body: new URLSearchParams({ ticket: entry.ticket }), redirect: 'manual' });
  const cookie = response.headers.get('set-cookie')!.split(';')[0];
  const url = new URL(entry.origin);
  const socket = createConnection({ host: '127.0.0.1', port: Number(url.port) }); t.after(() => socket.destroy());
  await once(socket, 'connect');
  const handshake = once(socket, 'data');
  socket.write(`GET /api/remote.mux HTTP/1.1\r\nHost: ${url.host}\r\nOrigin: ${entry.origin}\r\nCookie: ${cookie}\r\nAuthorization: secret-caller\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n`);
  assert.match(String((await handshake)[0]), /101 Switching Protocols/);
  assert.equal(headers.cookie, 'harness=private'); assert.equal(headers.authorization, undefined);
  for (const payload of [Buffer.from([0, 1, 255, 127]), Buffer.from('approval-answer:once'), Buffer.from('stream:中文')]) {
    const received = once(socket, 'data'); socket.write(payload);
    assert.deepEqual((await received)[0], payload);
  }
  const closed = once(socket, 'close'); view.suspend(); await closed;
  assert.equal(socket.destroyed, true);
});
