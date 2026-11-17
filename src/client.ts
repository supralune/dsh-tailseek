import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type { Instance, ScanStamp, Status, ViewEntry } from './types.js';
import { enableRemoteDirectory } from './directory-client.js';
import { enableRemoteFiles } from './client/remote-files.js';

type ClientContext = Context & { connection: ConnectionHandle };
const messages = {
  zh: {
    local: '本机', back: '切回本机', connected: '已连接', offline: '离线', retry: '重连',
    paused: '发送已暂停；不会转发到本机。断线前已提交的操作可能仍在目标运行，请先检查会话再重试。',
    unavailable: 'Tailscale 或 Tailseek 监听不可用', incompatible: '版本不兼容', selector: '选择 Harness 实例',
    failed: '连接失败，请重连', native: '远端 Harness 原生界面', loading: '正在加载原生界面',
    timeout: '原生界面连接超时；请检查浏览器是否允许 loopback 分区 Cookie，再点击重连。',
    desktop: '桌面版', web: 'Web 版', current: '当前实例', available: '可连接',
    description: '自动发现同一 Tailscale 网络中的 Harness 实例。',
    refresh: '刷新', refreshing: '正在探测…', refreshFailed: '无法刷新实例列表，请重试。', latency: '延迟',
    empty: '暂未发现远端实例', emptyHint: '请确认另一台设备已连接 Tailscale，并已启动安装 Tailseek 的 Harness。',
    cli: '未找到 Tailscale CLI，请安装 Tailscale 或设置 tailscaleCLI',
    stopped: 'Tailscale 未登录或未连接', userspace: '暂不支持 Tailscale userspace 网络',
    listener: '无法监听 Tailscale 地址，请检查本机防火墙和端口占用',
    harness: '当前 Harness 监听或认证接口不受支持，请查看插件说明',
  },
  en: {
    local: 'Local', back: 'Back to local', connected: 'Connected', offline: 'offline', retry: 'Reconnect',
    paused: 'Sending is paused. Nothing is routed to local. Previously submitted work may still be running; check the session before retrying.',
    unavailable: 'Tailscale or Tailseek listener unavailable', incompatible: 'Incompatible version', selector: 'Choose Harness instance',
    failed: 'Connection failed; reconnect', native: 'Remote native Harness interface', loading: 'Loading native interface',
    timeout: 'Native interface timed out. Check browser support for loopback partitioned cookies, then reconnect.',
    desktop: 'Desktop', web: 'Web', current: 'Current instance', available: 'Available',
    description: 'Automatically discover Harness instances on your Tailscale network.',
    refresh: 'Refresh', refreshing: 'Discovering…', refreshFailed: 'Could not refresh instances. Try again.', latency: 'Latency',
    empty: 'No remote instances found', emptyHint: 'Connect the other device to Tailscale and start Harness with Tailseek installed.',
    cli: 'Tailscale CLI not found; install Tailscale or set tailscaleCLI',
    stopped: 'Tailscale is signed out or disconnected', userspace: 'Tailscale userspace networking is not supported yet',
    listener: 'Cannot listen on Tailscale address; check firewall and port availability',
    harness: 'Unsupported Harness listener or authentication API; see plugin documentation',
  },
};
type LocaleKey = keyof typeof messages.en;
type Translate = (key: LocaleKey) => string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { tailseek: LocaleKey }
  interface SlotMap {
    'sidebar.panellist': { kind: 'list'; scope: 'root'; owner: { size: number; active: boolean } };
    'main': { kind: 'keyed'; scope: 'root' };
  }
}
const h = React.createElement;
const storageKey = 'tailseek.selected.v2';
const css = `
.tailseek-modal{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-primary,CanvasText)}
.tailseek-modal[open]{display:flex;flex-direction:column}
.tailseek-modal::backdrop{background:var(--dsw-alias-bg-base,Canvas)}
.tailseek-titlebar{display:none}
html[data-platform='darwin']:not([data-fullscreen]) .tailseek-titlebar,
html[data-windows-titlebar]:not([data-fullscreen]) .tailseek-titlebar{display:block;flex:none;height:42px;-webkit-app-region:drag}
html[data-windows-titlebar]:not([data-fullscreen]) .tailseek-titlebar{height:max(42px,env(titlebar-area-height,0px))}
.tailseek-viewport{position:relative;flex:1;min-height:0}
.tailseek-dock{display:flex;flex:none;align-items:center;justify-content:center;gap:6px;padding:5px 10px max(5px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--dsw-alias-border-l2,GrayText);font:12px system-ui}
.tailseek-dock select,.tailseek-dock button{box-sizing:border-box;min-height:28px;padding:3px 8px;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;font:inherit}
.tailseek-dock select{min-width:0;max-width:320px;overflow:hidden;text-overflow:ellipsis;border-color:var(--dsw-alias-border-l2,GrayText)}
.tailseek-dock button{flex:none;cursor:pointer;white-space:nowrap}.tailseek-dock button:disabled{opacity:.5;cursor:default}
.tailseek-dock .tailseek-back,.tailseek-dock button:hover:not(:disabled),.tailseek-dock select:hover{background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-dock .tailseek-back{border-color:var(--dsw-alias-border-l2,GrayText)}
.tailseek-page{height:100%;overflow:auto;box-sizing:border-box;padding:32px 24px;color:var(--dsw-alias-label-primary,CanvasText);font:14px system-ui}
.tailseek-page-inner{max-width:720px;margin:0 auto}.tailseek-page h1{font-size:24px;font-weight:600;margin:0}.tailseek-page p{color:var(--dsw-alias-label-secondary,GrayText);line-height:1.6;margin:0 0 24px}
.tailseek-page-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 12px;margin-bottom:8px}
.tailseek-refresh{font:inherit;color:inherit;background:var(--dsw-alias-bg-base,Canvas);border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:7px;padding:6px 12px;cursor:pointer}
.tailseek-refresh:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}.tailseek-refresh:disabled{cursor:default;opacity:.6}
.tailseek-instances{display:grid;gap:10px;list-style:none;margin:0;padding:0}.tailseek-instance{display:flex;align-items:center;gap:14px;box-sizing:border-box;width:100%;padding:16px;text-align:left;font:inherit;color:inherit;background:var(--dsw-alias-bg-base,Canvas);border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;cursor:pointer}
.tailseek-instance:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}.tailseek-instance:disabled{cursor:default;opacity:.6}.tailseek-instance>svg{flex-shrink:0}.tailseek-instance-info{flex:1;min-width:0}.tailseek-instance strong{display:block;font-weight:500;overflow-wrap:anywhere}.tailseek-instance small{display:block;margin-top:5px;color:var(--dsw-alias-label-secondary,GrayText);overflow-wrap:anywhere;line-height:1.5}
.tailseek-instance-status{display:grid;justify-items:end;gap:4px;flex-shrink:0;text-align:right}
.tailseek-latency{font-size:12px;white-space:nowrap;color:var(--dsw-alias-label-secondary,GrayText)}
.tailseek-latency-value{font-weight:600;font-variant-numeric:tabular-nums;color:var(--tailseek-latency-color);color:color-mix(in srgb,var(--tailseek-latency-color) 65%,var(--dsw-alias-label-primary,CanvasText))}
.tailseek-latency[data-level=low]{--tailseek-latency-color:var(--dsw-alias-state-success-primary,#22c55e)}
.tailseek-latency[data-level=moderate]{--tailseek-latency-color:var(--dsw-alias-state-warn-label,#dd8629)}
.tailseek-latency[data-level=high]{--tailseek-latency-color:var(--dsw-alias-state-error-primary,#ef4444)}
.tailseek-badge{font-size:12px;color:var(--dsw-alias-label-secondary,GrayText);flex-shrink:0}.tailseek-refresh:focus-visible,.tailseek-instance:focus-visible,.tailseek-dock select:focus-visible,.tailseek-dock button:focus-visible{outline:2px solid Highlight;outline-offset:2px}
.tailseek-notice{padding:16px;margin:20px 0;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;line-height:1.6}.tailseek-notice p{margin:4px 0 0}
@media(max-width:480px){.tailseek-page{padding:24px 12px}.tailseek-instance{padding:12px;gap:10px}.tailseek-badge{max-width:5em;text-align:right;white-space:normal}}
.tailseek-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--dsw-alias-bg-base,Canvas)}
.tailseek-block{position:absolute;inset:0;z-index:1;display:grid;place-content:center;justify-items:center;background:var(--dsw-alias-bg-base,Canvas);text-align:center;font:15px system-ui;gap:12px;padding:20px}
.tailseek-block small{color:var(--dsw-alias-label-secondary,GrayText);max-width:460px;line-height:1.6}
.tailseek-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary,Highlight)}.tailseek-dot[data-blocked=true]{background:GrayText}
`;
function savedSelection(): { key: string; label: string } {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey) || 'null');
    if (value && typeof value === 'object' && 'key' in value && 'label' in value
      && typeof value.key === 'string' && typeof value.label === 'string') return { key: value.key, label: value.label };
    const previous = sessionStorage.getItem('tailseek.selected.v1');
    if (previous) return { key: previous, label: previous.split('/')[0] };
  } catch { /* Storage is optional, credentials are never stored here. */ }
  return { key: '', label: '' };
}
function instanceLabel(item: Instance, t: Translate): string {
  const name = item.label && item.label !== item.surface ? `${item.machine} / ${item.label}` : item.machine;
  return `${name} · ${t(item.surface)} · ${item.version} · ${item.id.slice(0, 6)}`;
}
function errorKey(error: string | undefined): LocaleKey {
  switch (error) {
    case 'tailscale-cli-missing': return 'cli';
    case 'tailscale-not-running': return 'stopped';
    case 'tailscale-userspace-unsupported': return 'userspace';
    case 'listener-unavailable': return 'listener';
    case 'unsupported-harness': return 'harness';
    default: return 'unavailable';
  }
}
async function api<T>(path: string, body?: object, signal = AbortSignal.timeout(5000)): Promise<T> {
  const response = await fetch(`/api/tailseek/${path}`, { credentials: 'same-origin', signal,
    ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error('tailseek-unavailable');
  return response.json() as Promise<T>;
}
function release(old: ViewEntry | null) {
  if (old) void api('close', { viewId: old.viewId }).catch(() => {});
}
type SelectorState = { status: Status; selected: string; label: string; choose: (key: string) => void };
// The sidebar can unmount when collapsed. Keep the connection owner in the root
// slot, and share only selector state/actions with the sidebar's presentation.
function createSelectorStore() {
  let snapshot: SelectorState | null = null;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish: (next: SelectorState | null) => { snapshot = next; listeners.forEach(listener => listener()); },
  };
}
type SelectorStore = ReturnType<typeof createSelectorStore>;
function InstanceSelect({ state, t, id }: { state: SelectorState | null; t: Translate; id?: string }) {
  const { status, selected, label } = state ?? { status: { instances: [] }, selected: '', label: '' };
  return h('select', { id, value: selected, disabled: !state, title: `${t('selector')} · ${label || t('local')}`,
    'aria-label': t('selector'), onChange: (e: React.ChangeEvent<HTMLSelectElement>) => state?.choose(e.currentTarget.value) },
    h('option', { value: '' }, `${t('local')}${status.local?.version ? ` · ${status.local.version}` : ''}`),
    selected && !status.instances.some(item => item.key === selected) && h('option', { value: selected }, `${label} · ${t('offline')}`),
    status.instances.map(item => h('option', { key: item.key, value: item.key, disabled: !item.online || !item.compatible },
      `${instanceLabel(item, t)}${!item.online ? ` · ${t('offline')}` : !item.compatible ? ` · ${t('incompatible')}` : ''}`)));
}
function InstanceIcon({ size = 18 }: { size?: number }) {
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
    h('rect', { x: 3, y: 3, width: 18, height: 6, rx: 2 }), h('rect', { x: 3, y: 15, width: 18, height: 6, rx: 2 }),
    h('path', { d: 'M12 9v6M6 6h.01M6 18h.01' }));
}
function InstanceLatency({ latencyMs, t }: { latencyMs: number; t: Translate }) {
  const level = latencyMs < 50 ? 'low' : latencyMs < 150 ? 'moderate' : 'high';
  return h('span', { className: 'tailseek-latency', 'data-level': level }, `${t('latency')} `,
    h('span', { className: 'tailseek-latency-value' }, `${latencyMs} ms`));
}
function InstancePage({ t, store }: { t: Translate; store: SelectorStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
  const status = state?.status;
  const lastScan = status?.lastScan;
  const [refresh, setRefresh] = React.useState<ScanStamp | 'requesting' | 'failed' | null>(null);
  const refreshRequest = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => refreshRequest.current?.abort(), []);
  const refreshing = refresh === 'requesting' || (refresh !== null && typeof refresh === 'object'
    && (!lastScan || (lastScan.boot === refresh.boot && lastScan.sequence < refresh.sequence)));
  const rescan = async () => {
    if (refreshing || refreshRequest.current) return;
    const controller = new AbortController();
    refreshRequest.current = controller;
    setRefresh('requesting');
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
      const scan = await api<ScanStamp>('refresh', {}, signal);
      if (!controller.signal.aborted) setRefresh(scan);
    } catch { if (!controller.signal.aborted) setRefresh('failed'); }
    finally { refreshRequest.current = null; }
  };
  return h('section', { className: 'tailseek-page', 'aria-label': 'Tailseek' }, h('div', { className: 'tailseek-page-inner' },
    h('div', { className: 'tailseek-page-heading' }, h('h1', null, 'Tailseek'),
      h('button', { type: 'button', className: 'tailseek-refresh', disabled: refreshing || status?.error === 'unsupported-harness',
        onClick: () => { void rescan(); } }, t(refreshing ? 'refreshing' : 'refresh'))),
    h('p', null, t('description')),
    h('ul', { className: 'tailseek-instances', 'aria-label': t('selector') },
      h('li', null, h('button', { className: 'tailseek-instance', disabled: !state,
        'aria-current': !state?.selected ? 'true' : undefined, onClick: () => state?.choose('') },
        h(InstanceIcon, { size: 22 }), h('span', { className: 'tailseek-instance-info' },
          h('strong', null, t('local')), h('small', null, status?.local?.version)),
        !state?.selected && h('span', { className: 'tailseek-badge' }, t('current')))),
      status?.instances.map(item => {
        const online = item.online && !status.error;
        return h('li', { key: item.key }, h('button', {
          className: 'tailseek-instance', disabled: !online || !item.compatible,
          onClick: () => state?.choose(item.key) },
          h(InstanceIcon, { size: 22 }), h('span', { className: 'tailseek-instance-info' },
            h('strong', null, item.label && item.label !== item.surface ? `${item.machine} / ${item.label}` : item.machine),
            h('small', null, `${t(item.surface)} · ${item.version} · ${item.id.slice(0, 6)}`)),
          h('span', { className: 'tailseek-instance-status' },
            online && item.latencyMs !== undefined && h(InstanceLatency, { t, latencyMs: item.latencyMs }),
            h('span', { className: 'tailseek-badge' }, !online ? t('offline') : !item.compatible ? t('incompatible') : t('available')))));
      })),
    refresh === 'failed' && h('div', { className: 'tailseek-notice', role: 'status' }, t('refreshFailed')),
    status?.error && h('div', { className: 'tailseek-notice', role: 'status' }, t(errorKey(status.error))),
    status && !status.error && status.instances.length === 0 && h('div', { className: 'tailseek-notice', role: 'status' },
      h('strong', null, t('empty')), h('p', null, t('emptyHint')))));
}
function Panel({ t, store }: { t: Translate; store: SelectorStore }) {
  const [status, setStatus] = React.useState<Status>({ instances: [] });
  const [selection, setSelection] = React.useState(savedSelection);
  const selected = selection.key;
  const [view, setView] = React.useState<ViewEntry | null>(null);
  const [ready, setReady] = React.useState(false);
  const [failure, setFailure] = React.useState<LocaleKey | null>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const form = React.useRef<HTMLFormElement>(null);
  const modal = React.useRef<HTMLDialogElement>(null);
  const seq = React.useRef(0);
  const currentView = React.useRef<ViewEntry | null>(null);
  const opening = React.useRef(false);
  const selectedRef = React.useRef(selected);
  const lastMessage = React.useRef(0);
  const openedAt = React.useRef(0);
  const everReady = React.useRef(false);
  const nextAttempt = React.useRef(0);
  const open = async (key: string) => {
    if (opening.current) return;
    opening.current = true;
    const generation = ++seq.current;
    release(currentView.current); currentView.current = null;
    setView(null); setReady(false); setFailure(null); everReady.current = false;
    nextAttempt.current = Date.now() + 10_000;
    try {
      const next = await api<ViewEntry>('open', { key });
      if (seq.current !== generation || selectedRef.current !== key) { release(next); return; }
      currentView.current = next; openedAt.current = Date.now(); lastMessage.current = 0; setView(next);
    } catch { if (seq.current === generation) setFailure('failed'); }
    finally { opening.current = false; }
  };
  const choose = (key: string) => {
    ++seq.current; selectedRef.current = key; setReady(false); setFailure(null); nextAttempt.current = 0;
    const target = status.instances.find(item => item.key === key);
    const next = { key, label: target ? instanceLabel(target, t) : '' };
    setSelection(next); release(currentView.current); currentView.current = null; setView(null);
    try {
      sessionStorage.removeItem('tailseek.selected.v1');
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { /* Optional. */ }
  };
  React.useEffect(() => {
    let active = true; let polling = false;
    const poll = async () => {
      if (polling) return; polling = true;
      try {
        const next = await api<Status>('status');
        if (!active) return;
        setStatus(next);
        const key = selectedRef.current;
        const target = next.instances.find(item => item.key === key);
        const old = currentView.current;
        if (key && target?.online && target.compatible && !next.error
          && ((!old && Date.now() >= nextAttempt.current) || (old && old.boot !== target.boot))) void open(key);
        if (key && (!target?.online || Date.now() - lastMessage.current > 4000)) setReady(false);
        if (old && !everReady.current && Date.now() - openedAt.current > 15_000) setFailure('timeout');
      } catch { if (active) { setStatus(old => ({ ...old, error: 'unavailable' })); setReady(false); } }
      finally { polling = false; }
    };
    const message = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== currentView.current?.origin
        || event.data?.type !== 'tailseek:connection') return;
      lastMessage.current = Date.now(); setReady(event.data.connected === true);
      if (event.data.connected === true) { everReady.current = true; setFailure(null); }
    };
    window.addEventListener('message', message);
    const timer = setInterval(poll, 1000); void poll();
    return () => { active = false; ++seq.current; clearInterval(timer); window.removeEventListener('message', message); release(currentView.current); };
  }, []);
  React.useLayoutEffect(() => {
    // Native modal top layer makes every underlying local control inert, including
    // keyboard navigation and accessibility; Escape must never resume local sends.
    if (selected && !modal.current?.open) modal.current?.showModal();
    if (!selected && modal.current?.open) modal.current.close();
  }, [selected]);
  React.useEffect(() => { if (view) form.current?.submit(); }, [view]);
  const target = status.instances.find(item => item.key === selected);
  const label = target ? instanceLabel(target, t) : selection.label || t('local');
  const online = !!target?.online && !status.error;
  const blocked = !online || !ready;
  const connectionLabel = t(!online || (blocked && everReady.current) ? 'offline' : !blocked ? 'connected' : failure ?? 'loading');
  React.useLayoutEffect(() => { store.publish({ status, selected, label, choose }); });
  React.useEffect(() => () => { store.publish(null); }, [store]);
  const dock = h('footer', { className: 'tailseek-dock', 'aria-label': 'Tailseek' },
    h('span', { className: 'tailseek-dot', 'data-blocked': blocked, role: 'img', 'aria-label': connectionLabel, title: connectionLabel }),
    h(InstanceSelect, { state: { status, selected, label, choose }, t }),
    h('button', { type: 'button', onClick: () => { void open(selected); }, disabled: !online }, t('retry')),
    h('button', { type: 'button', className: 'tailseek-back', onClick: () => choose('') }, t('back')));
  return h(React.Fragment, null,
    h('style', null, css),
    h('dialog', { ref: modal, className: 'tailseek-modal', 'aria-label': label, onCancel: (e: React.SyntheticEvent) => e.preventDefault() },
      h('div', { className: 'tailseek-titlebar', 'aria-hidden': true }),
      h('div', { className: 'tailseek-viewport' },
        view && h('iframe', { ref: frame, key: view.viewId, name: `tailseek-${view.viewId}`, title: t('native'),
          className: 'tailseek-frame', inert: blocked ? '' : undefined, tabIndex: blocked ? -1 : 0,
          sandbox: 'allow-scripts allow-same-origin allow-forms allow-downloads allow-modals', referrerPolicy: 'no-referrer' }),
        view && h('form', { ref: form, method: 'POST', action: `${view.origin}/__tailseek/enter`, target: `tailseek-${view.viewId}`, hidden: true },
          h('input', { type: 'hidden', name: 'ticket', value: view.ticket })),
        selected && blocked && h('div', { className: 'tailseek-block', role: 'status', 'aria-live': 'polite' },
          h('strong', null, `${label} — ${connectionLabel}`),
          status.error && h('small', null, t(errorKey(status.error))), h('small', null, t('paused')))),
      selected && dock));
}
export const inject = ['slots', 'connection', 'locale'];
export function apply(ctx: ClientContext) {
  if (window.parent !== window) {
    ctx.effect(() => {
      const controller = new AbortController();
      let initialized = false;
      const publish = () => window.parent.postMessage({ type: 'tailseek:connection',
        connected: initialized && ctx.connection.state.getSnapshot() === 'connected' }, '*');
      const off = ctx.connection.state.subscribe(publish);
      const timer = setInterval(publish, 1000); publish();
      void Promise.allSettled([enableRemoteDirectory(ctx, controller.signal), enableRemoteFiles(ctx, controller.signal)]).then(() => {
        if (!controller.signal.aborted) { initialized = true; publish(); }
      });
      return () => { controller.abort(); off(); clearInterval(timer); };
    });
    return;
  }
  const store = createSelectorStore();
  ctx.effect(() => ctx.locale.register('tailseek', messages));
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'tailseek', locale: 'tailseek' },
    ({ t }) => h(Panel, { t, store })));
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'tailseek', locale: 'tailseek' },
    ({ t }) => h(InstancePage, { t, store })));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'tailseek', order: 20, label: 'Tailseek' }, InstanceIcon));
}
