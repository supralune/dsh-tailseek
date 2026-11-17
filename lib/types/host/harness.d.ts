import type { Context } from '@deepseek-ai/cordis';
import type { OutgoingHttpHeaders } from 'node:http';
/** Public release APIs and the newer source-tree provider seam are distinct. */
export declare function harnessCredentials(ctx: Context): () => OutgoingHttpHeaders;
