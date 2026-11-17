import { existsSync } from 'node:fs';
import type { Candidate } from './types.js';
export interface NodeStatus {
    ID: string;
    UserID: number;
    Online?: boolean;
    TailscaleIPs: string[];
    HostName?: string;
    DNSName?: string;
}
export interface TailStatus {
    BackendState: string;
    TUN?: boolean;
    Self: NodeStatus;
    TailscaleIPs: string[];
    Peer: Record<string, NodeStatus>;
}
export type Execute = (file: string, args: string[], options: {
    timeout: number;
    maxBuffer: number;
    windowsHide: boolean;
}) => Promise<{
    stdout: string;
}>;
export declare function cliCandidates(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, home?: string, exists?: typeof existsSync): string[];
export declare function parseStatus(value: unknown): TailStatus;
export declare class Tailscale {
    readonly allowedNodes: Set<string>;
    readonly execute: Execute;
    readonly candidatesCLI: string[];
    cli?: string;
    status?: TailStatus;
    checkedAt: number;
    error: string | undefined;
    private identities;
    constructor({ cli, allowedNodes, execute }?: {
        cli?: string;
        allowedNodes?: string[];
        execute?: Execute;
    });
    command(args: string[], cli?: string | undefined): Promise<unknown>;
    refresh(): Promise<TailStatus | undefined>;
    permitted(nodeId: string, userId: number): boolean;
    candidates(): Candidate[];
    authorize(address: string | undefined): Promise<boolean>;
}
