import { randomBytes } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type { PeerScope, ConnectionTrustRequest } from '@deepseek-ai/dsh-client-connection';
import type { OutgoingHttpHeaders } from 'node:http';
import { AUTH_HEADER, equalSecret } from './protocol.js';

interface AuthenticationRegistry {
  register(provider: { authenticate(request: ConnectionTrustRequest): PeerScope | undefined }): () => Promise<void>;
}

/** Public release APIs and the newer source-tree provider seam are distinct. */
export function harnessCredentials(ctx: Context): () => OutgoingHttpHeaders {
  const connection = ctx.connection;
  if (typeof connection.authenticatedUrl === 'function' && typeof connection.authorizeIndex === 'function') {
    let cookie = ''; let expires = 0;
    return () => {
      if (Date.now() < expires) return { cookie };
      const origin = ctx.webServer.getOrigin();
      // Run the native token exchange entirely in memory: no request URL,
      // address bar, discovery response, disk file, or log contains the token.
      const signed = new URL(connection.authenticatedUrl(origin));
      let status = 0;
      connection.authorizeIndex({ method: 'GET', url: `${signed.pathname}${signed.search}`, headers: { host: signed.host } }, {
        writeHead(code, headers) { status = code; cookie = headers?.['set-cookie']?.split(';')[0] ?? ''; },
        end() {},
      });
      if (status !== 303 || !cookie) throw new Error('harness-authentication-unavailable');
      expires = Date.now() + 60 * 60 * 1000;
      return { cookie };
    };
  }
  const registry = ctx.get('connection.authentication') as AuthenticationRegistry | undefined;
  if (!registry || typeof registry.register !== 'function') throw new Error('unsupported-harness-authentication');
  const secret = randomBytes(32).toString('base64url');
  const peer = connection.createPeer({ principal: { kind: 'owner' }, interactions: 'answer' });
  registry.register({ authenticate(request) {
    const value = request.headers instanceof Headers ? request.headers.get(AUTH_HEADER) : request.headers[AUTH_HEADER];
    return equalSecret(value, secret) ? peer : undefined;
  } });
  return () => ({ [AUTH_HEADER]: secret });
}
