import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export interface Config {
    instanceName: string;
    allowedNodes: string[];
    tailscaleCLI: string;
    refreshIntervalMs: number;
}
export declare const Config: z<Config>;
export declare const name = "tailseek";
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
