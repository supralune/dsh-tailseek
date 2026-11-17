import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Advertisement } from './types.js';
export declare const PROTOCOL = 1;
export declare const PORTS: readonly number[];
export declare const DISCOVERY = "/.well-known/tailseek";
export declare const ID_HEADER = "x-tailseek-instance";
export declare const BOOT_HEADER = "x-tailseek-boot";
export declare const AUTH_HEADER = "x-tailseek-internal";
export declare function equalSecret(a: unknown, b: unknown): boolean;
export declare function instanceId(scope: string): string;
export declare function isLoopback(ip?: string): ip is "::1" | "127.0.0.1" | "::ffff:127.0.0.1";
export declare function tailIP(ip: unknown): ip is string;
export declare function compatible(version: string): boolean;
export declare function parseAdvertisement(value: unknown, nodeId: string): Advertisement & {
    compatible: boolean;
};
export declare function json(res: ServerResponse, status: number, value: unknown): void;
export declare function boundedBody(req: IncomingMessage, limit?: number): Promise<string>;
