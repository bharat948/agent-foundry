import Fastify, { type FastifyInstance } from 'fastify';
import type { Db } from './db.js';
import { login, requireOwner, revokeSession } from './auth.js';

export interface AppOptions { db: Db; sessionTtlSeconds: number; logger?: boolean; }

/**
 * Extension points for later AF-005 parts (pending Atlas's ADRs):
 *  - policy gateway: register tool routes inside the authenticated scope; tool execution must go
 *    through a single gateway module, never a route handler directly.
 *  - approvals / budget / cancel: state lives in Postgres (durable across kill -9), added as new
 *    numbered migrations; routes register via `registerProtected`.
 */
export const PUBLIC_ROUTES = new Set(['GET /health', 'POST /auth/login']);

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ? { redact: ['req.headers.authorization', 'body.password'] } : false,
    bodyLimit: 64 * 1024,
  });
  const { db } = opts;

  // Global deny-by-default auth; unknown routes also 401 for unauthenticated callers.
  app.addHook('onRequest', requireOwner(db, PUBLIC_ROUTES));

  app.get('/health', async () => {
    await db.query('SELECT 1');
    return { status: 'ok' };
  });

  app.post<{ Body: { username: string; password: string } }>('/auth/login', {
    schema: { body: { type: 'object', required: ['username', 'password'], additionalProperties: false,
      properties: { username: { type: 'string', minLength: 1, maxLength: 128 },
                    password: { type: 'string', minLength: 1, maxLength: 1024 } } } },
  }, async (req, reply) => {
    const s = await login(db, req.body.username, req.body.password, opts.sessionTtlSeconds);
    if (!s) return reply.code(401).send({ error: 'invalid credentials' });
    return { token: s.token, expiresAt: s.expiresAt.toISOString() };
  });

  app.post('/auth/logout', async (req, reply) => {
    await revokeSession(db, req.principal!.sessionId);
    return reply.code(204).send();
  });

  app.get('/me', async (req) => ({ ownerId: req.principal!.ownerId }));

  return app;
}
