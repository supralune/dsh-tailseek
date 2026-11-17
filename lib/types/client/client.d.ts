import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
type ClientContext = Context & {
    connection: ConnectionHandle;
};
declare const messages: {
    zh: {
        local: string;
        back: string;
        connected: string;
        offline: string;
        retry: string;
        paused: string;
        unavailable: string;
        incompatible: string;
        selector: string;
        failed: string;
        native: string;
        loading: string;
        timeout: string;
        desktop: string;
        web: string;
        current: string;
        available: string;
        description: string;
        refresh: string;
        refreshing: string;
        refreshFailed: string;
        latency: string;
        empty: string;
        emptyHint: string;
        cli: string;
        stopped: string;
        userspace: string;
        listener: string;
        harness: string;
    };
    en: {
        local: string;
        back: string;
        connected: string;
        offline: string;
        retry: string;
        paused: string;
        unavailable: string;
        incompatible: string;
        selector: string;
        failed: string;
        native: string;
        loading: string;
        timeout: string;
        desktop: string;
        web: string;
        current: string;
        available: string;
        description: string;
        refresh: string;
        refreshing: string;
        refreshFailed: string;
        latency: string;
        empty: string;
        emptyHint: string;
        cli: string;
        stopped: string;
        userspace: string;
        listener: string;
        harness: string;
    };
};
type LocaleKey = keyof typeof messages.en;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        tailseek: LocaleKey;
    }
    interface SlotMap {
        'sidebar.panellist': {
            kind: 'list';
            scope: 'root';
            owner: {
                size: number;
                active: boolean;
            };
        };
        'main': {
            kind: 'keyed';
            scope: 'root';
        };
    }
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export {};
