import type { Tailscale } from './tailscale.js';
import type { DiscoveredInstance, Instance } from './types.js';
/** Tailnet probes must not inherit Harness's model-provider HTTP proxy. */
export declare const directPeerFetch: typeof fetch;
export declare class Discovery {
    readonly tailscale: Tailscale;
    readonly ports: readonly number[];
    readonly timeout: number;
    readonly fetcher: typeof fetch;
    readonly instances: Map<string, DiscoveredInstance>;
    running: boolean;
    constructor(tailscale: Tailscale, { ports, timeout, fetcher }?: {
        ports?: readonly number[];
        timeout?: number;
        fetcher?: typeof fetch;
    });
    scan(): Promise<void>;
    get(key: string): DiscoveredInstance | undefined;
    list(): Instance[];
}
