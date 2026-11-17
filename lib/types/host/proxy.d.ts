import http from 'node:http';
import type { Duplex } from 'node:stream';
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders, Server } from 'node:http';
export declare function proxyHeaders(req: Pick<IncomingMessage, 'headers'>, target: string, extra: OutgoingHttpHeaders, upgrade?: boolean): OutgoingHttpHeaders;
export declare function relayHTTP(req: IncomingMessage, res: ServerResponse, target: string, extra?: OutgoingHttpHeaders, agent?: http.Agent): void;
export declare function relayUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, target: string, extra?: OutgoingHttpHeaders, sockets?: Set<Duplex>, agent?: http.Agent): void;
export declare function listen(server: Server, port: number, host: string): Promise<number>;
export declare function closeServer(server: Server, sockets?: Set<Duplex>): Promise<void>;
