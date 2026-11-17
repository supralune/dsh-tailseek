import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare function isHostPath(path: string, platform?: NodeJS.Platform): boolean;
export declare function handleRemoteAttachment(ctx: Context, req: IncomingMessage, res: ServerResponse): Promise<void>;
