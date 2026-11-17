import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { boundedBody, json } from './protocol.js';
import { DIRECTORY_CAPABILITY } from './types.js';
import type { DirectoryListing, DirectoryRequest } from './types.js';

export interface DirectoryBrowser {
  kind: 'browse';
  list(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
  createDirectory(path: string, name: string): Promise<string>;
}

export async function loadDirectoryBrowser(ctx: Context, installAnchor: string): Promise<DirectoryBrowser | undefined> {
  try {
    const webBundle = createRequire(installAnchor).resolve('@deepseek-ai/dsh-web-app/package.json');
    const entry = createRequire(webBundle).resolve('@deepseek-ai/dsh-host-directory-picker-browse');
    const { default: browse } = await import(pathToFileURL(entry).href);
    // Own the alternate backend in this plugin's scope so Harness keeps the
    // directoryPicker service selected by its profile for all local clients.
    const scope = ctx.isolate('directoryPicker');
    const fiber = scope.plugin(browse, { maxEntries: 1000 });
    try {
      await fiber.await();
      const browser = scope.get('directoryPicker')?.capability();
      if (browser?.kind === 'browse') return browser as DirectoryBrowser;
    } catch { /* A failed optional picker cannot stop Tailseek. */ }
    await fiber.dispose();
  } catch { /* The Harness installation may not ship the browse backend. */ }
  return undefined;
}

function directoryRequest(input: unknown): DirectoryRequest | undefined {
  if (typeof input !== 'object' || input === null || !('action' in input)) return;
  const path = 'path' in input ? input.path : undefined;
  if (path !== undefined && (typeof path !== 'string' || !path || path.includes('\0'))) return;
  if (input.action === 'list') return { action: 'list', path };
  if (input.action !== 'create' || typeof path !== 'string' || !('name' in input)) return;
  const name = input.name;
  if (typeof name !== 'string' || !name.trim() || name === '.' || name === '..' || /[/\\\0]/.test(name)) return;
  return { action: 'create', path, name };
}

export async function handleDirectory(req: IncomingMessage, res: ServerResponse, browser: DirectoryBrowser | undefined) {
  if (!browser) { json(res, 404, { error: 'directory-browser-unavailable' }); return; }
  if (req.method === 'HEAD') {
    res.writeHead(204, { 'cache-control': 'no-store', [DIRECTORY_CAPABILITY]: '1' }).end();
    return;
  }
  if (req.method !== 'POST') { json(res, 405, { error: 'method-not-allowed' }); return; }
  let request: DirectoryRequest | undefined;
  try { request = directoryRequest(JSON.parse(await boundedBody(req))); } catch { /* Invalid body. */ }
  if (!request) { json(res, 400, { error: 'invalid-directory-request' }); return; }
  if (res.destroyed) return;

  const closed = new AbortController();
  const onClose = () => closed.abort();
  res.once('close', onClose);
  try {
    const result = request.action === 'list'
      ? await browser.list(request.path, AbortSignal.any([closed.signal, AbortSignal.timeout(10_000)]))
      : { path: await browser.createDirectory(request.path, request.name) };
    if (!res.destroyed) json(res, 200, result);
  } catch (error) {
    if (res.destroyed) return;
    if (error && typeof error === 'object' && 'code' in error && error.code === 'directory-exists') {
      json(res, 409, { error: 'directory-exists' });
      return;
    }
    json(res, 422, { error: request.action === 'list' ? 'directory-unreadable' : 'directory-create-failed' });
  } finally {
    res.off('close', onClose);
  }
}
