import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Discovery } from './discovery.js';
import type { DiscoveredInstance } from './types.js';
/** One viewer has one immutable instance identity. It never routes to localhost on failure. */
export declare class TargetView {
    readonly key: string;
    readonly discovery: Discovery;
    readonly sockets: Set<Duplex>;
    readonly secret: string;
    ticket: string | undefined;
    readonly cookie: string;
    readonly created: number;
    lastUsed: number;
    readonly boot: string | undefined;
    readonly server: Server;
    origin: string;
    constructor(key: string, discovery: Discovery);
    start(): Promise<{
        origin: string;
        ticket: string;
    }>;
    target(): DiscoveredInstance | undefined;
    headers(target: DiscoveredInstance): {
        "x-tailseek-instance": string;
        "x-tailseek-boot": string | undefined;
    };
    authorized(req: IncomingMessage): boolean;
    handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
    suspend(): void;
    close(): Promise<void>;
}
