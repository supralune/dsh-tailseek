import type { Context } from '@deepseek-ai/cordis';
import type { AttachmentReceipt, StagedRemoteFile } from '../types.js';

export interface SessionCursor { sessionId: string }
export interface SessionBinding {
  ctx: Context;
  session: { getSnapshot(): { openState: string; subagent: object | null } };
}
export interface PickerTarget { id: string; binding: SessionBinding }
interface DraftInput { addAttachments(ids: readonly string[]): boolean }
interface Conversation {
  input: { for(ctx: Context): DraftInput };
  createDrafts(sessionId: string, files: readonly File[], uploadImages: boolean): readonly { id: string }[];
  releaseDraftAttachments(drafts: readonly { id: string }[]): void;
}
interface CommandMenuRow { name: string; label?: string; section?: string; icon?: unknown }
interface CommandSource {
  name: string;
  trigger: string;
  candidates(session: SessionCursor, request: unknown): Promise<readonly CommandMenuRow[]>;
}
type Upload = (sessionId: string, file: Blob, ...args: unknown[]) => Promise<unknown>;

export const remoteFileCommand = 'tailseek-remote-file';

export function findCommandSource(ctx: Context): CommandSource | undefined {
  // rc.2/rc.3 can register commands publicly, but their stock File row has
  // no label or placement override. Adapt only that view's command source.
  const triggers = ctx.get('inputTriggers') as { live?: { sources?: CommandSource[] } } | undefined;
  if (!Array.isArray(triggers?.live?.sources)) return;
  return triggers.live.sources.find(entry => entry.name === 'command' && entry.trigger === '/' && typeof entry.candidates === 'function');
}

export function fileMenuRows(rows: readonly CommandMenuRow[], localLabel: string): readonly CommandMenuRow[] {
  const local = rows.find(row => row.name === 'file');
  const remote = rows.find(row => row.name === remoteFileCommand);
  if (!local) return rows;
  const renamed = { ...local, label: localLabel };
  if (!remote) return rows.map(row => row === local ? renamed : row);
  return rows.flatMap(row => row === local
    ? [{ ...remote, section: local.section, icon: remote.icon ?? local.icon }, renamed]
    : row === remote ? [] : [row]);
}

export function bindAttachmentDrafts(ctx: Context, bindingFor: (id: string) => SessionBinding | undefined, reselect: () => string) {
  const conversation = ctx.get('conversation') as Conversation | undefined;
  const upload = ctx.get('fileUpload') as { upload: Upload; uploadImage: Upload } | undefined;
  if (typeof conversation?.input?.for !== 'function' || typeof conversation.createDrafts !== 'function'
    || typeof conversation.releaseDraftAttachments !== 'function'
    || typeof upload?.upload !== 'function' || typeof upload.uploadImage !== 'function') return;

  // The composer in these releases has no receipt-to-draft operation. Its
  // existing File draft flow gets the Host receipt for the exact placeholder.
  // All ordinary files still call their original upload service.
  const files = new WeakMap<Blob, { target: PickerTarget; receipt: AttachmentReceipt }>();
  for (const method of ['upload', 'uploadImage'] as const) {
    const original = upload[method].bind(upload);
    const wrapped: Upload = (sessionId, file, ...args) => {
      const remote = files.get(file);
      if (!remote) return original(sessionId, file, ...args);
      if (remote.target.id !== sessionId || bindingFor(sessionId) !== remote.target.binding) {
        return Promise.reject(new Error(reselect()));
      }
      return Promise.resolve({ ok: true, value: remote.receipt });
    };
    ctx.accessor(`fileUpload.${method}`, { get: () => wrapped });
  }
  return (target: PickerTarget, staged: readonly StagedRemoteFile[]) => {
    const chosen = staged.map(item => {
      const image = 'image' in item.value ? item.value.image : undefined;
      const contents = item.preview ? [Uint8Array.from(atob(item.preview), character => character.charCodeAt(0))] : [];
      const file = new File(contents, item.name, { type: image?.mediaType });
      Object.defineProperty(file, 'size', { value: item.bytes });
      files.set(file, { target, receipt: item.value });
      return file;
    });
    const input = conversation.input.for(target.binding.ctx);
    const drafts = conversation.createDrafts(target.id, chosen, true);
    if (!input.addAttachments(drafts.map(draft => draft.id))) {
      conversation.releaseDraftAttachments(drafts);
      throw new Error('draft-unavailable');
    }
  };
}
