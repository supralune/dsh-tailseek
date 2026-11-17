import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { DIRECTORY_CAPABILITY, REMOTE_DIRECTORY } from './types.js';
import type { DirectoryListing, DirectoryRequest } from './types.js';

interface DirectoryFlowOwner {
  open: boolean;
  busy: boolean;
  onPicked(path: string): void;
  onCancel(): void;
  onError(message: string): void;
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'tailseek-directory': DirectoryKey }
  interface SlotMap {
    'conversation.hero.workspace.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwner };
    'sidebar.workspaces.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwner };
    'workspace.picker.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwner };
  }
}

const slots = ['conversation.hero.workspace.directoryFlow', 'sidebar.workspaces.directoryFlow', 'workspace.picker.directoryFlow'] as const;
const messages = {
  zh: {
    title: '选择远端工作区目录', path: '远端绝对路径', go: '前往', home: '主目录', up: '上一级',
    folders: '文件夹', hidden: '显示隐藏文件夹', empty: '没有可显示的子文件夹', truncated: '文件夹较多，仅显示前部分结果。',
    loading: '正在读取文件夹…', unreadable: '无法读取此目录。请检查路径和访问权限。',
    exists: '同名文件或文件夹已存在。', createFailed: '无法确认文件夹已创建。请检查目录后重试。',
    newFolder: '新建文件夹', name: '文件夹名称', create: '创建', creating: '正在创建…',
    cancel: '取消', select: '选用此目录',
  },
  en: {
    title: 'Choose remote workspace folder', path: 'Remote absolute path', go: 'Go', home: 'Home', up: 'Up',
    folders: 'Folders', hidden: 'Show hidden folders', empty: 'No folders to show', truncated: 'This folder contains more entries than shown.',
    loading: 'Loading folders…', unreadable: 'Could not read this folder. Check its path and access permissions.',
    exists: 'A file or folder with this name already exists.', createFailed: 'Could not confirm folder creation. Check the directory and try again.',
    newFolder: 'New folder', name: 'Folder name', create: 'Create', creating: 'Creating…',
    cancel: 'Cancel', select: 'Use this folder',
  },
};
type DirectoryKey = keyof typeof messages.en;
type DirectoryProps = PropsRuntime<'sidebar.workspaces.directoryFlow'> & PropsLocale<'tailseek-directory'>;

const h = React.createElement;
export const directoryDialogCss = `
.tailseek-directory{box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:18px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:14px system-ui}
.tailseek-directory::backdrop{background:rgb(0 0 0 / .35)}
.tailseek-directory h2{margin:0 0 14px;font-size:17px;font-weight:600}
.tailseek-directory button,.tailseek-directory input:not([type=checkbox]){box-sizing:border-box;min-height:32px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;background:var(--dsw-alias-bg-base,Canvas);color:inherit;font:inherit}
.tailseek-directory button{cursor:pointer;white-space:nowrap}.tailseek-directory button:disabled{cursor:default;opacity:.5}
.tailseek-directory button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-directory :is(button,input):focus-visible{outline:2px solid Highlight;outline-offset:1px}
.tailseek-directory form,.tailseek-directory nav,.tailseek-directory footer{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tailseek-directory form input{flex:1;min-width:7em}.tailseek-directory nav{margin:8px 0}
.tailseek-directory nav label{display:flex;align-items:center;gap:4px;margin-inline-start:auto;font-size:12px}
.tailseek-directory ul{box-sizing:border-box;height:min(260px,38dvh);overflow:auto;margin:0;padding:4px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;list-style:none}
.tailseek-directory ul button{width:100%;border-color:transparent;text-align:start;white-space:normal;overflow-wrap:anywhere}
.tailseek-directory p{margin:8px 0;color:var(--dsw-alias-label-secondary,GrayText);line-height:1.5}
.tailseek-directory ul>li>p{margin:5px 8px}.tailseek-directory footer,.tailseek-directory .tailseek-create-folder{margin-top:10px}
.tailseek-directory footer>button:nth-last-child(2){margin-inline-start:auto}
.tailseek-directory footer .tailseek-use-folder{background:var(--dsw-alias-bg-layer-1,Canvas);font-weight:600}
`;

async function requestDirectory<T>(request: DirectoryRequest, signal: AbortSignal): Promise<T> {
  const response = await fetch(REMOTE_DIRECTORY, { method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]) });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error === 'directory-exists' ? 'directory-exists' : 'directory-request-failed');
  }
  return response.json() as Promise<T>;
}

function DirectoryDialog({ busy, onCancel, onPicked, t }: DirectoryProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const request = React.useRef<AbortController | null>(null);
  const titleId = React.useId();
  const [listing, setListing] = React.useState<DirectoryListing>();
  const [path, setPath] = React.useState('');
  const [name, setName] = React.useState<string>();
  const [hidden, setHidden] = React.useState(false);
  const [pending, setPending] = React.useState<DirectoryRequest['action'] | null>('list');
  const [error, setError] = React.useState<DirectoryKey>();

  async function navigate(input: DirectoryRequest) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(input.action);
    setError(undefined);
    let target = input.path;
    let errorKey: DirectoryKey = input.action === 'create' ? 'createFailed' : 'unreadable';
    try {
      if (input.action === 'create') {
        target = (await requestDirectory<{ path: string }>(input, controller.signal)).path;
        if (controller.signal.aborted) return;
        setName(undefined);
        setListing(undefined);
        setPath(target);
        setPending('list');
        errorKey = 'unreadable';
      }
      const result = await requestDirectory<DirectoryListing>({ action: 'list', path: target }, controller.signal);
      if (controller.signal.aborted) return;
      setListing(result);
      setPath(result.path);
      setName(undefined);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error && cause.message === 'directory-exists' ? 'exists' : errorKey);
    } finally {
      if (request.current === controller) { request.current = null; setPending(null); }
    }
  }

  React.useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    void navigate({ action: 'list' });
    return () => {
      const active = request.current;
      request.current = null;
      active?.abort();
      element.close();
    };
  }, []);

  const disabled = busy || pending !== null;
  const parent = listing?.crumbs.at(-2);
  const folders = listing?.entries.filter(entry => hidden || !entry.hidden) ?? [];
  const current = listing?.path === path ? listing : undefined;
  const go = (path?: string) => { void navigate({ action: 'list', path }); };
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    if (!current || !name?.trim() || disabled) return;
    void navigate({ action: 'create', path: current.path, name });
  };
  return h(React.Fragment, null, h('style', null, directoryDialogCss),
    h('dialog', { className: 'tailseek-directory', ref: dialog, 'aria-labelledby': titleId,
      onCancel: (event: React.SyntheticEvent) => { event.preventDefault(); if (!busy) onCancel(); } },
      h('h2', { id: titleId }, t('title')),
      h('form', { onSubmit: (event: React.FormEvent) => { event.preventDefault(); if (!disabled && path) go(path); } },
        h('input', { value: path, 'aria-label': t('path'), placeholder: t('path'), spellCheck: false, disabled,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setPath(event.currentTarget.value) }),
        h('button', { type: 'submit', disabled: disabled || !path }, t('go'))),
      h('nav', { 'aria-label': t('folders') },
        h('button', { type: 'button', disabled, onClick: () => go(listing?.home) }, t('home')),
        h('button', { type: 'button', disabled: disabled || !parent, onClick: () => go(parent?.path) }, t('up')),
        h('label', null, h('input', { type: 'checkbox', checked: hidden,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setHidden(event.currentTarget.checked) }), t('hidden'))),
      h('ul', { 'aria-label': t('folders'), 'aria-busy': pending !== null },
        folders.map(entry => h('li', { key: entry.path }, h('button', { type: 'button', disabled, onClick: () => go(entry.path) }, entry.name))),
        listing && folders.length === 0 && h('li', null, h('p', null, t('empty')))),
      pending && h('p', { role: 'status' }, t(pending === 'create' ? 'creating' : 'loading')),
      error && h('p', { role: 'alert' }, t(error)),
      listing?.truncated && h('p', null, t('truncated')),
      name !== undefined && h('form', { className: 'tailseek-create-folder', onSubmit: create },
        h('input', { value: name, 'aria-label': t('name'), placeholder: t('name'), autoFocus: true, disabled,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setName(event.currentTarget.value) }),
        h('button', { type: 'submit', disabled: disabled || !current || !name.trim() }, t('create')),
        h('button', { type: 'button', disabled, onClick: () => setName(undefined) }, t('cancel'))),
      h('footer', null,
        h('button', { type: 'button', disabled: disabled || !current || name !== undefined, onClick: () => setName('') }, t('newFolder')),
        h('button', { type: 'button', disabled: busy, onClick: onCancel }, t('cancel')),
        h('button', { type: 'button', className: 'tailseek-use-folder', disabled: disabled || !current || name !== undefined,
          onClick: () => { if (current) onPicked(current.path); } }, t('select')))));
}

function DirectoryFlow(props: DirectoryProps) {
  return props.open ? h(DirectoryDialog, props) : null;
}

export async function enableRemoteDirectory(ctx: Context, signal: AbortSignal) {
  const response = await fetch(REMOTE_DIRECTORY, { method: 'HEAD', credentials: 'same-origin',
    redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) });
  if (signal.aborted || response.status !== 204 || response.headers.get(DIRECTORY_CAPABILITY) !== '1') return;
  ctx.effect(() => ctx.locale.register('tailseek-directory', messages));
  // Each installed Harness version declares its own set of entry points.
  // Shadow the local picker only in this authenticated embedded document.
  for (const name of slots) {
    ctx.slots.inject(name, () => ctx.slots.register({ name, priority: -100, locale: 'tailseek-directory' }, DirectoryFlow));
  }
}
