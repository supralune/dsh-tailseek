import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { Context, Service } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRemoteAttachment, isHostPath } from '../src/attachment.js';
import { bindAttachmentDrafts, fileMenuRows } from '../src/client/attachment-compat.js';
import type { RemoteFileRequest } from '../src/types.js';

const root = process.platform === 'win32' ? 'C:\\' : '/';
const workspace = join(root, 'workspace');
const shared = join(root, 'mnt', 'shared');
const document = join(shared, 'example.txt');

async function handle(input: RemoteFileRequest, { changed = false, subagent = false } = {}) {
  const original = Buffer.from([0, 255, 17]);
  const uploaded: Buffer[] = [];
  let stats = 0;
  const services = new Map<string, unknown>([
    ['sessions', { get: () => ({ header: { cwd: workspace, origin: subagent ? 'subagent' : undefined } }) }],
    ['fs', {
      resolve: async (path: string) => ({ displayPath: path, targetKey: path }),
      stat: async ({ targetKey }: { targetKey: string }) => targetKey === document
        ? { type: 'file', size: original.length, version: changed && ++stats > 1 ? 'new' : 'old' }
        : { type: 'directory', version: 'folder' },
      listDir: async () => [{ name: 'example.txt', type: 'file', size: original.length, target: { targetKey: 'opaque' } },
        { name: 'subfolder', type: 'directory' }, { name: 'socket', type: 'other' }],
      readByteRange: async () => original,
    }],
    ['fileUploads', {
      uploadStream: async (input: { sessionId: string; data: AsyncIterable<Uint8Array>; name: string }) => {
        assert.equal(input.sessionId, 'session');
        for await (const chunk of input.data) uploaded.push(Buffer.from(chunk));
        return { receiptId: 'receipt', file: { attachmentId: 'digest', name: input.name, bytes: original.length } };
      },
      uploadImageStream: async () => { throw new Error('unexpected image'); },
    }],
    ['attachments', { readImage: async () => { throw new Error('unexpected image'); } }],
  ]);
  const ctx = { get: (name: string) => services.get(name) } as Context;
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(input))]), { method: 'POST' });
  let status = 0, body = '';
  const res = Object.assign(new EventEmitter(), { destroyed: false,
    writeHead(code: number) { status = code; return this; }, end(value: string) { body = value; return this; } });
  await handleRemoteAttachment(ctx, req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return { status, body: JSON.parse(body), uploaded: Buffer.concat(uploaded), original };
}

test('remote selection stages exact bytes outside the workspace and rejects changed files and relative paths', async () => {
  const stage = (path: string, options?: { changed?: boolean; subagent?: boolean }) =>
    handle({ sessionId: 'session', action: 'stage', path }, options);
  const result = await stage(document);
  assert.equal(result.status, 200);
  assert.equal(result.body.value.receiptId, 'receipt');
  assert.equal(result.body.name, 'example.txt');
  assert.deepEqual(result.uploaded, result.original);
  const traversal = await stage('../example.txt');
  assert.equal(traversal.status, 400);
  assert.equal(traversal.uploaded.length, 0);
  const unavailable = await stage(document, { subagent: true });
  assert.equal(unavailable.status, 422);
  assert.equal(unavailable.uploaded.length, 0);
  const changed = await stage(document, { changed: true });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.error, 'remote-file-changed');
});

test('host browsing lists upward from the workspace and can select a pasted absolute file path', async () => {
  const initial = await handle({ sessionId: 'session', action: 'list', place: 'workspace' });
  assert.equal(initial.body.path, workspace);
  assert.equal(initial.body.parent, root);
  const outside = await handle({ sessionId: 'session', action: 'list', path: document });
  assert.equal(outside.status, 200);
  assert.equal(outside.body.path, shared);
  assert.equal(outside.body.picked, document);
  assert.deepEqual(outside.body.entries, [
    { name: 'subfolder', type: 'directory', path: join(shared, 'subfolder') },
    { name: 'example.txt', type: 'file', path: document, size: 3 },
  ]);
  assert.equal(outside.uploaded.length, 0);
  assert.equal(isHostPath('D:\\file.txt', 'win32'), true);
  assert.equal(isHostPath('\\\\server\\share\\file.txt', 'win32'), true);
  assert.equal(isHostPath('D:file.txt', 'win32'), false);
  assert.equal(isHostPath('\\\\.\\C:\\file.txt', 'win32'), false);
});

test('source entries share the native upload menu section without replacing the local command', () => {
  const local = { name: 'file', label: 'File', section: 'Add' };
  const other = { name: 'plan', label: 'Plan', section: 'Add' };
  const remote = { name: 'tailseek-remote-file', label: 'Choose remote files', section: 'Commands' };
  const rows = fileMenuRows([local, other, remote], 'Upload from this device');
  assert.deepEqual(rows, [{ ...remote, section: 'Add', icon: undefined }, { ...local, label: 'Upload from this device' }, other]);
  assert.equal(local.label, 'File');
});

test('remote receipts and ordinary files enter the same draft through one upload service', async () => {
  class UploadService extends Service {
    constructor(ctx: Context) { super(ctx, 'fileUpload'); }
    async upload(id: string, file: File) { return { ok: true, value: { receiptId: `${id}/${file.name}` } }; }
    async uploadImage(id: string, file: File) { return this.upload(id, file); }
  }
  const ctx = new Context();
  await ctx.plugin(UploadService).await();
  const binding = { ctx, session: { getSnapshot: () => ({ openState: 'open', subagent: null }) } };
  const draft: string[] = [];
  const uploads: Promise<{ value: { receiptId: string } }>[] = [];
  ctx.provide('conversation', {
    input: { for: () => ({ addAttachments: (ids: readonly string[]) => { draft.push(...ids); return true; } }) },
    createDrafts(id: string, files: readonly File[]) {
      const service = ctx.get('fileUpload') as UploadService;
      return files.map(file => { uploads.push(service.upload(id, file)); return { id: file.name }; });
    },
    releaseDraftAttachments() { throw new Error('accepted draft must not be released'); },
  });
  let addRemote: ReturnType<typeof bindAttachmentDrafts>;
  const effect = ctx.plugin({ inject: ['fileUpload', 'conversation'], apply(scope: Context) {
    addRemote = bindAttachmentDrafts(scope, () => binding, () => 'reselect');
  } });
  try {
    await effect.await();
    addRemote!({ id: 'session', binding }, [{ name: 'remote.txt', bytes: 10,
      value: { receiptId: 'remote-receipt', file: { attachmentId: 'digest', name: 'remote.txt', bytes: 10 } } }]);
    const conversation = ctx.get('conversation')!;
    const local = conversation.createDrafts('session', [new File(['local'], 'local.txt')]);
    conversation.input.for().addAttachments(local.map((item: { id: string }) => item.id));
    assert.deepEqual(draft, ['remote.txt', 'local.txt']);
    assert.deepEqual((await Promise.all(uploads)).map(result => result.value.receiptId), ['remote-receipt', 'session/local.txt']);
  } finally {
    await effect.dispose();
  }
});
