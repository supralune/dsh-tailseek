import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Advertisement } from './types.js';

export const PROTOCOL = 1;
export const PORTS = Object.freeze(Array.from({ length: 16 }, (_, i) => 42180 + i));
export const DISCOVERY = '/.well-known/tailseek';
export const ID_HEADER = 'x-tailseek-instance';
export const BOOT_HEADER = 'x-tailseek-boot';
export const AUTH_HEADER = 'x-tailseek-internal';

export function equalSecret(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
    && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function instanceId(scope: string): string {
  return createHash('sha256').update(scope).digest('hex').slice(0, 32);
}
export function isLoopback(ip = '') {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
}
export function tailIP(ip: unknown): ip is string {
  if (typeof ip !== 'string') return false;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 100 && b >= 64 && b <= 127;
  }
  return isIP(ip) === 6 && ip.toLowerCase().startsWith('fd7a:115c:a1e0:');
}
export function compatible(version: string): boolean {
  return /^0\.2\.2-rc\.[23]$/.test(version);
}
export function parseAdvertisement(value: unknown, nodeId: string): Advertisement & { compatible: boolean } {
  if (typeof value !== 'object' || value === null) throw new Error('incompatible-advertisement');
  const data = value as Record<string, unknown>;
  if (data.protocol !== PROTOCOL || data.nodeId !== nodeId
    || typeof data.id !== 'string' || !/^[a-f0-9]{32}$/.test(data.id)
    || typeof data.boot !== 'string' || !/^[a-f0-9-]{36}$/.test(data.boot)
    || typeof data.version !== 'string' || data.version.length > 64
    || typeof data.label !== 'string' || data.label.length > 120
    || (data.surface !== 'web' && data.surface !== 'desktop')) throw new Error('incompatible-advertisement');
  // Pick fields explicitly: never propagate arbitrary peer data or credentials.
  return { protocol: PROTOCOL, id: data.id, boot: data.boot, nodeId,
    label: data.label, version: data.version, surface: data.surface,
    compatible: compatible(data.version) };
}
export function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(value));
}
export async function boundedBody(req: IncomingMessage, limit = 8192): Promise<string> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
