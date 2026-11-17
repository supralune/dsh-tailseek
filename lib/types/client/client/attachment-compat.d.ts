import type { Context } from '@deepseek-ai/cordis';
import type { StagedRemoteFile } from '../types.js';
export interface SessionCursor {
    sessionId: string;
}
export interface SessionBinding {
    ctx: Context;
    session: {
        getSnapshot(): {
            openState: string;
            subagent: object | null;
        };
    };
}
export interface PickerTarget {
    id: string;
    binding: SessionBinding;
}
interface CommandMenuRow {
    name: string;
    label?: string;
    section?: string;
    icon?: unknown;
}
interface CommandSource {
    name: string;
    trigger: string;
    candidates(session: SessionCursor, request: unknown): Promise<readonly CommandMenuRow[]>;
}
export declare const remoteFileCommand = "tailseek-remote-file";
export declare function findCommandSource(ctx: Context): CommandSource | undefined;
export declare function fileMenuRows(rows: readonly CommandMenuRow[], localLabel: string): readonly CommandMenuRow[];
export declare function bindAttachmentDrafts(ctx: Context, bindingFor: (id: string) => SessionBinding | undefined, reselect: () => string): ((target: PickerTarget, staged: readonly StagedRemoteFile[]) => void) | undefined;
export {};
