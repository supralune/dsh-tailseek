import type { Context } from '@deepseek-ai/cordis';
interface DirectoryFlowOwner {
    open: boolean;
    busy: boolean;
    onPicked(path: string): void;
    onCancel(): void;
    onError(message: string): void;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'tailseek-directory': DirectoryKey;
    }
    interface SlotMap {
        'conversation.hero.workspace.directoryFlow': {
            kind: 'single';
            scope: 'root';
            owner: DirectoryFlowOwner;
        };
        'sidebar.workspaces.directoryFlow': {
            kind: 'single';
            scope: 'root';
            owner: DirectoryFlowOwner;
        };
        'workspace.picker.directoryFlow': {
            kind: 'single';
            scope: 'root';
            owner: DirectoryFlowOwner;
        };
    }
}
declare const messages: {
    zh: {
        title: string;
        path: string;
        go: string;
        home: string;
        up: string;
        folders: string;
        hidden: string;
        empty: string;
        truncated: string;
        loading: string;
        unreadable: string;
        exists: string;
        createFailed: string;
        newFolder: string;
        name: string;
        create: string;
        creating: string;
        cancel: string;
        select: string;
    };
    en: {
        title: string;
        path: string;
        go: string;
        home: string;
        up: string;
        folders: string;
        hidden: string;
        empty: string;
        truncated: string;
        loading: string;
        unreadable: string;
        exists: string;
        createFailed: string;
        newFolder: string;
        name: string;
        create: string;
        creating: string;
        cancel: string;
        select: string;
    };
};
type DirectoryKey = keyof typeof messages.en;
export declare const directoryDialogCss = "\n.tailseek-directory{box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:18px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:14px system-ui}\n.tailseek-directory::backdrop{background:rgb(0 0 0 / .35)}\n.tailseek-directory h2{margin:0 0 14px;font-size:17px;font-weight:600}\n.tailseek-directory button,.tailseek-directory input:not([type=checkbox]){box-sizing:border-box;min-height:32px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;background:var(--dsw-alias-bg-base,Canvas);color:inherit;font:inherit}\n.tailseek-directory button{cursor:pointer;white-space:nowrap}.tailseek-directory button:disabled{cursor:default;opacity:.5}\n.tailseek-directory button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}\n.tailseek-directory :is(button,input):focus-visible{outline:2px solid Highlight;outline-offset:1px}\n.tailseek-directory form,.tailseek-directory nav,.tailseek-directory footer{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.tailseek-directory form input{flex:1;min-width:7em}.tailseek-directory nav{margin:8px 0}\n.tailseek-directory nav label{display:flex;align-items:center;gap:4px;margin-inline-start:auto;font-size:12px}\n.tailseek-directory ul{box-sizing:border-box;height:min(260px,38dvh);overflow:auto;margin:0;padding:4px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;list-style:none}\n.tailseek-directory ul button{width:100%;border-color:transparent;text-align:start;white-space:normal;overflow-wrap:anywhere}\n.tailseek-directory p{margin:8px 0;color:var(--dsw-alias-label-secondary,GrayText);line-height:1.5}\n.tailseek-directory ul>li>p{margin:5px 8px}.tailseek-directory footer,.tailseek-directory .tailseek-create-folder{margin-top:10px}\n.tailseek-directory footer>button:nth-last-child(2){margin-inline-start:auto}\n.tailseek-directory footer .tailseek-use-folder{background:var(--dsw-alias-bg-layer-1,Canvas);font-weight:600}\n";
export declare function enableRemoteDirectory(ctx: Context, signal: AbortSignal): Promise<void>;
export {};
