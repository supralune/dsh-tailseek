import { readFileSync } from 'node:fs';
import { Tailseek } from './service.js';
import { Tailscale } from './tailscale.js';
import { instanceId, compatible } from './protocol.js';
import { harnessCredentials } from './harness.js';
import { loadDirectoryBrowser } from './directory.js';
import { handleRemoteAttachment } from './attachment.js';
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionFetchMethod } from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-host-webserver';
import z from '@deepseek-ai/schemastery';

interface ProfileFacts { name: string; dir: string; installAnchor: string }
export interface Config {
  instanceName: string;
  allowedNodes: string[];
  tailscaleCLI: string;
  refreshIntervalMs: number;
}
export const Config: z<Config> = z.object({
  instanceName: z.string().max(120).default(''),
  allowedNodes: z.array(String).default([]),
  tailscaleCLI: z.string().default(''),
  refreshIntervalMs: z.natural().min(1000).max(8000).default(4000),
});

export const name = 'tailseek';
export const inject = ['connection', 'webServer', 'profileContext'];

export function apply(ctx: Context, config: Config): void {
  const profile = ctx.get('profileContext') as ProfileFacts;
  const version = JSON.parse(readFileSync(profile.installAnchor, 'utf8')).version;
  let supported = compatible(version) && ctx.webServer.protocol === 'http:'
    && ['127.0.0.1', '::1'].includes(ctx.webServer.host);
  if (config.allowedNodes !== undefined && (!Array.isArray(config.allowedNodes) || config.allowedNodes.some(n => typeof n !== 'string'))) {
    throw new Error('Tailseek allowedNodes must contain Tailscale stable node IDs');
  }
  if (config.instanceName !== undefined && (typeof config.instanceName !== 'string' || config.instanceName.length > 120)) {
    throw new Error('Tailseek instanceName must be at most 120 characters');
  }
  const surface = profile.name === 'desktop' ? 'desktop' : 'web';
  // installAnchor distinguishes concurrently installed runtime versions. Profile
  // identity survives ephemeral desktop ports and ordinary process restarts.
  const id = instanceId(`${profile.dir}\n${profile.installAnchor}\n${surface === 'desktop' ? surface : new URL(ctx.webServer.getOrigin()).port}`);
  let credentials: ReturnType<typeof harnessCredentials> = () => { throw new Error('unsupported-harness'); };
  try { if (supported) credentials = harnessCredentials(ctx); } catch { supported = false; }
  const service = new Tailseek({ id, version, surface, credentials, label: config.instanceName || surface,
    upstream: () => ctx.webServer.getOrigin(), tailscale: new Tailscale({ allowedNodes: config.allowedNodes, cli: config.tailscaleCLI || undefined }),
    directoryBrowser: supported ? loadDirectoryBrowser(ctx, profile.installAnchor) : undefined,
    remoteAttachment: supported ? (req, res) => handleRemoteAttachment(ctx, req, res) : undefined });
  const routes: [string, ConnectionFetchMethod[], (request: Request) => unknown | Promise<unknown>][] = [
    ['/api/tailseek/status', ['GET'], () => supported ? service.snapshot() : { ...service.snapshot(), error: 'unsupported-harness' }],
    ['/api/tailseek/refresh', ['POST'], () => {
      if (!supported) throw new Error('unsupported-harness');
      return service.refresh();
    }],
    ['/api/tailseek/open', ['POST'], async request => {
      const data = await request.json();
      if (typeof data.key !== 'string' || data.key.length > 200) throw new Error('invalid-target');
      return service.open(data.key);
    }],
    ['/api/tailseek/close', ['POST'], async request => {
      const data = await request.json();
      if (typeof data.viewId !== 'string') throw new Error('invalid-view');
      await service.release(data.viewId); return { ok: true };
    }],
  ];
  for (const [path, methods, handler] of routes) ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', async fetch(request) {
    try { return Response.json(await handler(request), { headers: { 'cache-control': 'no-store' } }); }
    catch { return Response.json({ error: 'tailseek-operation-unavailable' }, { status: 409 }); }
  } });
  ctx.effect(() => {
    if (!supported) return () => {};
    const timer = setInterval(() => { void service.tick(); }, config.refreshIntervalMs);
    void service.tick();
    return async () => { clearInterval(timer); await service.close(); };
  });
}
