import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join, normalize, parse } from 'node:path';
import { boundedBody, json } from './protocol.js';
import { ATTACHMENT_CAPABILITY, ATTACHMENT_VERSION } from './types.js';
import type { AttachmentReceipt, ImageAttachment, RemoteFileListing, RemoteFileRequest, StagedRemoteFile } from './types.js';

interface FsTarget { targetKey: unknown; displayPath: string }
interface FileInfo { type: string; size?: number; version: string }
interface HostFs {
  resolve(path: string, options: { signal: AbortSignal }): Promise<FsTarget>;
  stat(target: FsTarget, signal: AbortSignal): Promise<FileInfo | undefined>;
  listDir(target: FsTarget, signal: AbortSignal): Promise<readonly { name: string; type: 'file' | 'directory' | 'other'; size?: number }[]>;
  readByteRange(target: FsTarget, range: { offset: number; length: number }, signal: AbortSignal): Promise<Uint8Array>;
}
interface UploadInput { sessionId: string; data: AsyncIterable<Uint8Array>; signal: AbortSignal; name: string }
interface FileUploads {
  uploadStream(input: UploadInput): Promise<AttachmentReceipt>;
  uploadImageStream(input: UploadInput & { mediaType: string }): Promise<{ receiptId: string; image: ImageAttachment }>;
}
interface AttachmentStore {
  readImage(ref: ImageAttachment, signal: AbortSignal): Promise<{ data: Uint8Array }>;
}
type Sessions = { get(id: string): { header: { cwd?: string; origin?: string } } | undefined };

const imageTypes = new Map([
  ['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp'], ['gif', 'image/gif'],
]);

export function isHostPath(path: string, platform = process.platform): boolean {
  if (path.includes('\0')) return false;
  if (platform !== 'win32') return path.startsWith('/');
  // Reject drive-relative and device namespace paths. Ordinary drive roots
  // and UNC shares use the same chooser as other absolute host paths.
  return /^[a-z]:[/\\]/i.test(path) || /^[/\\]{2}[^/\\?.][^/\\]*[/\\][^/\\]+/.test(path);
}

function attachmentRequest(input: unknown): RemoteFileRequest | undefined {
  if (!input || typeof input !== 'object' || !('sessionId' in input) || !('action' in input)) return;
  const { sessionId, action } = input;
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 200) return;
  if ('path' in input) {
    if (typeof input.path !== 'string' || !isHostPath(input.path)) return;
    const path = normalize(input.path);
    if (action === 'list') return { sessionId, action, path };
    if (action === 'stage') return { sessionId, action, path };
  }
  if (action === 'list' && 'place' in input && (input.place === 'workspace' || input.place === 'home')) {
    return { sessionId, action, place: input.place };
  }
}

async function listFiles(fs: HostFs, selectedPath: string, signal: AbortSignal): Promise<RemoteFileListing> {
  const target = await fs.resolve(selectedPath, { signal });
  const info = await fs.stat(target, signal);
  if (info?.type !== 'directory' && info?.type !== 'file') throw new Error('invalid-file');
  const picked = info.type === 'file' ? selectedPath : undefined;
  const path = picked ? dirname(picked) : selectedPath;
  const parent = dirname(path);
  const folder = picked ? await fs.resolve(path, { signal }) : target;
  const entries = (await fs.listDir(folder, signal))
    .flatMap(({ name, type, size }) => type === 'other' ? [] : [{ name, type, size, path: join(path, name) }]);
  entries.sort((a, b) => Number(a.type === 'file') - Number(b.type === 'file') || a.name.localeCompare(b.name));
  const limit = 1000;
  const visible = entries.slice(0, limit);
  if (picked && !visible.some(entry => entry.path === picked)) {
    visible.unshift({ name: basename(picked), type: 'file', size: info.size, path: picked });
  }
  return { path, parent: parent === path ? undefined : parent, root: parse(path).root,
    entries: visible, truncated: entries.length > limit, picked };
}

async function* readFile(fs: HostFs, target: FsTarget, size: number, version: string, signal: AbortSignal) {
  for (let offset = 0; offset < size;) {
    signal.throwIfAborted();
    const length = Math.min(1024 * 1024, size - offset);
    const bytes = await fs.readByteRange(target, { offset, length }, signal);
    if (bytes.byteLength !== length) throw new Error('remote-file-changed');
    offset += length;
    yield bytes;
  }
  const current = await fs.stat(target, signal);
  if (current?.version !== version || current.size !== size) throw new Error('remote-file-changed');
}

export async function handleRemoteAttachment(ctx: Context, req: IncomingMessage, res: ServerResponse) {
  const fs = ctx.get('fs') as HostFs | undefined;
  const uploads = ctx.get('fileUploads') as FileUploads | undefined;
  const sessions = ctx.get('sessions') as Sessions | undefined;
  const attachments = ctx.get('attachments') as AttachmentStore | undefined;
  const sandbox = ctx.get('sandboxPolicy') as { workspaceRoot?: string } | undefined;
  if (typeof fs?.readByteRange !== 'function' || typeof fs.listDir !== 'function' || typeof uploads?.uploadStream !== 'function'
    || typeof uploads.uploadImageStream !== 'function' || typeof sessions?.get !== 'function'
    || typeof attachments?.readImage !== 'function') {
    json(res, 404, { error: 'remote-attachment-unavailable' }); return;
  }
  if (req.method === 'HEAD') {
    res.writeHead(204, { 'cache-control': 'no-store', [ATTACHMENT_CAPABILITY]: ATTACHMENT_VERSION }).end(); return;
  }
  if (req.method !== 'POST') { json(res, 405, { error: 'method-not-allowed' }); return; }
  let request: RemoteFileRequest | undefined;
  try { request = attachmentRequest(JSON.parse(await boundedBody(req))); } catch { /* Invalid input. */ }
  if (!request) { json(res, 400, { error: 'invalid-remote-file' }); return; }
  if (res.destroyed) return;

  const controller = new AbortController();
  const onClose = () => controller.abort();
  res.once('close', onClose);
  const signal = controller.signal;
  try {
    const header = sessions.get(request.sessionId)?.header;
    if (!header || header.origin === 'subagent') throw new Error('session-unavailable');
    if (request.action === 'list') {
      const workspace = header.cwd ?? sandbox?.workspaceRoot;
      const path = 'path' in request ? request.path
        : request.place === 'workspace' && workspace && isHostPath(workspace) ? workspace : homedir();
      const listing = await listFiles(fs, normalize(path), AbortSignal.any([signal, AbortSignal.timeout(10_000)]));
      if (!res.destroyed) json(res, 200, listing);
      return;
    }
    const target = await fs.resolve(request.path, { signal });
    const stat = await fs.stat(target, signal);
    const size = stat?.size;
    if (stat?.type !== 'file' || size === undefined || !Number.isSafeInteger(size) || size < 0) throw new Error('invalid-file');

    const name = basename(request.path);
    const input = { sessionId: request.sessionId, data: readFile(fs, target, size, stat.version, signal), signal, name };
    const dot = name.lastIndexOf('.');
    const mediaType = dot > 0 ? imageTypes.get(name.slice(dot + 1).toLowerCase()) : undefined;
    let result: StagedRemoteFile;
    if (mediaType) {
      const value = await uploads.uploadImageStream({ ...input, mediaType });
      const stored = await attachments.readImage(value.image, signal);
      result = { value, name, bytes: size, preview: Buffer.from(stored.data).toString('base64') };
    } else {
      result = { value: await uploads.uploadStream(input), name, bytes: size };
    }
    if (!res.destroyed) json(res, 200, result);
  } catch (error) {
    if (res.destroyed) return;
    if (error instanceof Error && error.message === 'remote-file-changed') json(res, 409, { error: 'remote-file-changed' });
    else json(res, 422, { error: 'remote-file-unavailable' });
  } finally {
    res.off('close', onClose);
  }
}
