import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { dummyHash, hashPassword, verifyPassword } from './password.js';

export interface Principal { ownerId: number; sessionId: number; }

declare module 'fastify' {
  interface FastifyRequest { principal?: Principal; }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest();

/** Creates the owner from env if none exists. Never overwrites an existing owner. */
export async function bootstrapOwner(db: Db, username: string, password: string | undefined): Promise<'created' | 'exists'> {
  const { rowCount } = await db.query('SELECT 1 FROM owner_account');
  if (rowCount) return 'exists';
  if (!password || password.length < 12) throw new Error('OWNER_PASSWORD (min 12 chars) required to bootstrap the owner account');
  await db.query('INSERT INTO owner_account(username, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [username, await hashPassword(password)]);
  return 'created';
}

export async function login(db: Db, username: string, password: string, ttlSeconds: number):
    Promise<{ token: string; expiresAt: Date } | null> {
  const { rows } = await db.query<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM owner_account WHERE username = $1', [username]);
  const ok = await verifyPassword(password, rows[0]?.password_hash ?? await dummyHash());
  if (!rows[0] || !ok) return null;
  const token = randomBytes(32).toString('base64url');
  const r = await db.query<{ expires_at: Date }>(
    `INSERT INTO owner_session(owner_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3)) RETURNING expires_at`,
    [rows[0].id, sha256(token), ttlSeconds]);
  return { token, expiresAt: r.rows[0].expires_at };
}

export async function resolveToken(db: Db, token: string): Promise<Principal | null> {
  const { rows } = await db.query<{ id: string; owner_id: string }>(
    `SELECT id, owner_id FROM owner_session
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`, [sha256(token)]);
  return rows[0] ? { ownerId: Number(rows[0].owner_id), sessionId: Number(rows[0].id) } : null;
}

export async function revokeSession(db: Db, sessionId: number): Promise<void> {
  await db.query('UPDATE owner_session SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [sessionId]);
}

/** onRequest hook: everything except the public allowlist requires a valid owner session. Deny by default. */
export function requireOwner(db: Db, publicRoutes: Set<string>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const route = `${req.method} ${req.routeOptions.url ?? ''}`;
    if (req.routeOptions.url && publicRoutes.has(route)) return;
    const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(req.headers.authorization ?? '');
    const principal = m ? await resolveToken(db, m[1]) : null;
    if (!principal) return reply.code(401).send({ error: 'unauthorized' });
    req.principal = principal;
  };
}
