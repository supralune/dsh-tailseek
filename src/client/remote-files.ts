import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import { directoryDialogCss } from '../directory-client.js';
import { ATTACHMENT_CAPABILITY, ATTACHMENT_VERSION, REMOTE_ATTACHMENT } from '../types.js';
import type { RemoteFileListing, RemoteFileLocation, RemoteFileRequest, StagedRemoteFile } from '../types.js';
import { bindAttachmentDrafts, findCommandSource, fileMenuRows, remoteFileCommand } from './attachment-compat.js';
import type { PickerTarget, SessionBinding, SessionCursor } from './attachment-compat.js';

const messages = {
  zh: {
    remote: '远端选取', local: '本机上传', title: '选取远端文件', workspace: '当前工作区', up: '上一级',
    home: '主目录', root: '根目录', path: '远端绝对路径', go: '前往', hidden: '显示隐藏文件',
    empty: '此目录没有可选文件', truncated: '条目较多，可输入完整路径直接定位。', loading: '正在读取…',
    unreadable: '无法读取此目录。', failed: '无法添加选中的文件。请检查文件后重试。',
    cancel: '取消', add: '添加到消息', preparing: '正在准备附件…', reselect: '请为当前会话重新选取这个远端文件。',
  },
  en: {
    remote: 'Choose remote files', local: 'Upload from this device', title: 'Choose remote files', workspace: 'Current workspace', up: 'Up',
    home: 'Home', root: 'Root', path: 'Remote absolute path', go: 'Go', hidden: 'Show hidden files',
    empty: 'No files to choose in this folder', truncated: 'The list is limited. Enter a full path to locate a file directly.', loading: 'Loading…',
    unreadable: 'Could not read this folder.', failed: 'Could not add the selected files. Check the files and try again.',
    cancel: 'Cancel', add: 'Add to message', preparing: 'Preparing attachments…', reselect: 'Choose this remote file again for the current session.',
  },
};
type Key = keyof typeof messages.en;
type Translate = (key: Key) => string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'tailseek-files': Key }
  interface SlotMap { 'shell.overlay': { kind: 'list'; scope: 'root' } }
}

const h = React.createElement;
const pickerCss = `
.tailseek-directory .tailseek-file-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 8px;overflow-wrap:anywhere;cursor:pointer}
.tailseek-directory .tailseek-file-row:hover{background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-directory .tailseek-file-row small{margin-inline-start:auto;white-space:nowrap;color:var(--dsw-alias-label-secondary,GrayText)}
`;

function FilePicker({ t, close, list, add }: { t: Translate; close(): void;
  list(location: RemoteFileLocation, signal: AbortSignal): Promise<RemoteFileListing>;
  add(paths: readonly string[], signal: AbortSignal): Promise<void> }) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const request = React.useRef<AbortController | null>(null);
  const [listing, setListing] = React.useState<RemoteFileListing>();
  const [pathInput, setPathInput] = React.useState('');
  const [hidden, setHidden] = React.useState(false);
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [pending, setPending] = React.useState<'list' | 'add' | null>('list');
  const [error, setError] = React.useState<'unreadable' | 'failed'>();
  const id = React.useId();

  async function run(action: 'list' | 'add', operation: (signal: AbortSignal) => Promise<void>) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(action);
    setError(undefined);
    try { await operation(controller.signal); }
    catch { if (!controller.signal.aborted) setError(action === 'list' ? 'unreadable' : 'failed'); }
    finally {
      if (request.current === controller) { request.current = null; setPending(null); }
    }
  }
  const go = (location: RemoteFileLocation) => { void run('list', async signal => {
    const next = await list(location, signal);
    if (signal.aborted) return;
    setListing(next);
    setPathInput(next.path);
    const picked = next.picked;
    if (picked) setSelected(old => new Set([...old, picked]));
  }); };
  React.useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    go({ place: 'workspace' });
    return () => {
      const active = request.current;
      request.current = null;
      active?.abort();
      element.close();
    };
  }, []);

  const disabled = pending !== null;
  const entries = listing?.entries.filter(entry => hidden || !entry.name.startsWith('.') || selected.has(entry.path)) ?? [];
  const rawSize = (size: number) => new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(size);
  return h(React.Fragment, null, h('style', null, directoryDialogCss + pickerCss),
    h('dialog', { ref: dialog, className: 'tailseek-directory', 'aria-labelledby': id,
      onCancel: (event: React.SyntheticEvent) => { event.preventDefault(); close(); } },
      h('h2', { id }, t('title')),
      h('form', { onSubmit: (event: React.FormEvent) => {
        event.preventDefault();
        if (!disabled && pathInput) go({ path: pathInput });
      } }, h('input', { value: pathInput, disabled, placeholder: t('path'), 'aria-label': t('path'), spellCheck: false,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setPathInput(event.currentTarget.value) }),
      h('button', { type: 'submit', disabled: disabled || !pathInput }, t('go'))),
      h('nav', { 'aria-label': t('workspace') },
        h('button', { type: 'button', disabled, onClick: () => go({ place: 'workspace' }) }, t('workspace')),
        h('button', { type: 'button', disabled, onClick: () => go({ place: 'home' }) }, t('home')),
        h('button', { type: 'button', disabled: disabled || !listing?.parent,
          onClick: () => { if (listing?.parent) go({ path: listing.parent }); } }, t('up')),
        h('button', { type: 'button', disabled: disabled || !listing || listing.path === listing.root,
          onClick: () => { if (listing) go({ path: listing.root }); } }, t('root')),
        h('label', null, h('input', { type: 'checkbox', checked: hidden,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setHidden(event.currentTarget.checked) }), t('hidden'))),
      h('ul', { 'aria-busy': disabled }, entries.map(entry => {
        const target = entry.path;
        return h('li', { key: target }, entry.type === 'directory'
          ? h('button', { type: 'button', disabled, onClick: () => go({ path: target }) }, `${entry.name}/`)
          : h('label', { className: 'tailseek-file-row' }, h('input', { type: 'checkbox', disabled, checked: selected.has(target),
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              const checked = event.currentTarget.checked;
              setSelected(old => { const next = new Set(old); if (checked) next.add(target); else next.delete(target); return next; });
            } }), entry.name, entry.size === undefined ? null : h('small', null, rawSize(entry.size))));
      }), listing && entries.length === 0 && h('li', null, h('p', null, t('empty')))),
      pending && h('p', { role: 'status' }, t(pending === 'list' ? 'loading' : 'preparing')),
      error && h('p', { role: 'alert' }, t(error)),
      listing?.truncated && h('p', null, t('truncated')),
      h('footer', null,
        h('button', { type: 'button', onClick: close }, t('cancel')),
        h('button', { type: 'button', className: 'tailseek-use-folder', disabled: disabled || selected.size === 0,
          onClick: () => { void run('add', async signal => { await add([...selected], signal); if (!signal.aborted) close(); }); } },
        `${t('add')}${selected.size ? ` (${selected.size})` : ''}`))));
}

async function request<T>(input: RemoteFileRequest, signal: AbortSignal): Promise<T> {
  const response = await fetch(REMOTE_ATTACHMENT, { method: 'POST', headers: { 'content-type': 'application/json' },
    credentials: 'same-origin', redirect: 'error', signal, body: JSON.stringify(input) });
  if (!response.ok) throw new Error('remote-attachment-failed');
  return response.json() as Promise<T>;
}

export async function enableRemoteFiles(ctx: Context, signal: AbortSignal) {
  const response = await fetch(REMOTE_ATTACHMENT, { method: 'HEAD', credentials: 'same-origin', redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) });
  if (signal.aborted || response.status !== 204 || response.headers.get(ATTACHMENT_CAPABILITY) !== ATTACHMENT_VERSION) return;
  ctx.inject(['commandUi', 'inputTriggers', 'remote', 'sessions', 'fileUpload', 'conversation'], scope => {
    const source = findCommandSource(scope);
    if (!source) return;
    const commands = scope.get('commandUi') as { register(value: { name: string; label(): string;
      available(session: SessionCursor): boolean; ui: { kind: 'action'; run(session: SessionCursor): void } }): () => void };
    const sessions = scope.get('sessions') as { binding(id: string): SessionBinding | undefined };
    const t = scope.locale.bind('tailseek-files');
    const addDrafts = bindAttachmentDrafts(scope, id => sessions.binding(id), () => t('reselect'));
    if (!addDrafts) return;
    scope.effect(() => scope.locale.register('tailseek-files', messages));
    let target: PickerTarget | null = null;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
    const setTarget = (next: PickerTarget | null) => { target = next; listeners.forEach(listener => listener()); };

    const bindingFor = (id: string) => {
      const binding = sessions.binding(id);
      const state = binding?.session.getSnapshot();
      return state?.openState === 'open' && state.subagent === null ? binding : undefined;
    };
    scope.effect(() => commands.register({ name: remoteFileCommand, label: () => t('remote'),
      available: ({ sessionId }) => !!bindingFor(sessionId),
      ui: { kind: 'action', run: ({ sessionId }) => {
        const binding = bindingFor(sessionId);
        if (binding) setTarget({ id: sessionId, binding });
      } } }));
    scope.effect(() => {
      const original = source.candidates;
      const decorated: typeof original = async (session, request) => fileMenuRows(await original.call(source, session, request), t('local'));
      source.candidates = decorated;
      return () => { if (source.candidates === decorated) source.candidates = original; };
    });
    scope.slots.inject('shell.overlay', () => scope.slots.register({ name: 'shell.overlay', id: remoteFileCommand, locale: 'tailseek-files' }, () => {
      const active = React.useSyncExternalStore(subscribe, () => target);
      if (!active) return null;
      const assertActive = () => { if (bindingFor(active.id) !== active.binding) throw new Error('session-changed'); };
      return h(FilePicker, { key: active.id, t, close: () => setTarget(null),
        list: (location, signal) => {
          assertActive();
          return request<RemoteFileListing>({ action: 'list', sessionId: active.id, ...location }, signal);
        },
        add: async (paths, signal) => {
          const chosen: StagedRemoteFile[] = [];
          for (const path of paths) {
            assertActive();
            const staged = await request<StagedRemoteFile>({ action: 'stage', sessionId: active.id, path }, signal);
            signal.throwIfAborted();
            chosen.push(staged);
          }
          assertActive();
          signal.throwIfAborted();
          addDrafts(active, chosen);
        } });
    }));
  });
}
