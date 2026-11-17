import type { Context } from '@deepseek-ai/cordis';
declare const messages: {
    zh: {
        remote: string;
        local: string;
        title: string;
        workspace: string;
        up: string;
        home: string;
        root: string;
        path: string;
        go: string;
        hidden: string;
        empty: string;
        truncated: string;
        loading: string;
        unreadable: string;
        failed: string;
        cancel: string;
        add: string;
        preparing: string;
        reselect: string;
    };
    en: {
        remote: string;
        local: string;
        title: string;
        workspace: string;
        up: string;
        home: string;
        root: string;
        path: string;
        go: string;
        hidden: string;
        empty: string;
        truncated: string;
        loading: string;
        unreadable: string;
        failed: string;
        cancel: string;
        add: string;
        preparing: string;
        reselect: string;
    };
};
type Key = keyof typeof messages.en;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'tailseek-files': Key;
    }
    interface SlotMap {
        'shell.overlay': {
            kind: 'list';
            scope: 'root';
        };
    }
}
export declare function enableRemoteFiles(ctx: Context, signal: AbortSignal): Promise<void>;
export {};
