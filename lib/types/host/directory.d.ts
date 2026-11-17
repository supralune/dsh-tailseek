import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { DirectoryListing } from './types.js';
export interface DirectoryBrowser {
    kind: 'browse';
    list(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
    createDirectory(path: string, name: string): Promise<string>;
}
export declare function loadDirectoryBrowser(ctx: Context, installAnchor: string): Promise<DirectoryBrowser | undefined>;
export declare function handleDirectory(req: IncomingMessage, res: ServerResponse, browser: DirectoryBrowser | undefined): Promise<void>;
