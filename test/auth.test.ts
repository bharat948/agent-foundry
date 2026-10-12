import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createPool, type Db } from '../src/db.js';
import { migrate } from '../src/migrate.js';
import { bootstrapOwner } from '../src/auth.js';
import { buildApp } from '../src/app.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL is required (a disposable Postgres DB; it is wiped)');

const PW = 'correct horse battery staple';
let db: Db; let app: FastifyInstance;
const login = (username: string, password: string) =>
  app.inject({ method: 'POST', url: '/auth/login', payload: { username, password } });

beforeAll(async () => {
  db = createPool(url);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await migrate(db);
  expect(await bootstrapOwner(db, 'owner', PW)).toBe('created');
  expect(await bootstrapOwner(db, 'owner', 'another-password-x')).toBe('exists');
  app = await buildApp({ db, sessionTtlSeconds: 3600 });
});
afterAll(async () => { await app?.close(); await db?.end(); });

describe('owner auth', () => {
  it('health is public', async () => {
    const r = await app.inject('/health');
    expect(r.statusCode).toBe(200);
  });

  it('unauthenticated request to protected route -> 401', async () => {
    expect((await app.inject('/me')).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/logout' })).statusCode).toBe(401);
  });

  it('unknown routes are not reachable unauthenticated', async () => {
    expect((await app.inject('/tools/run')).statusCode).toBe(401);
  });

  it('wrong password and unknown user rejected', async () => {
    expect((await login('owner', 'wrong-password!!')).statusCode).toBe(401);
    expect((await login('nobody', PW)).statusCode).toBe(401);
  });

  it('password stored as scrypt hash, not plaintext', async () => {
    const { rows } = await db.query('SELECT password_hash FROM owner_account');
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(rows[0].password_hash).not.toContain(PW);
  });

  it('correct login succeeds; token works on protected route and is stored hashed', async () => {
    const r = await login('owner', PW);
    expect(r.statusCode).toBe(200);
    const { token } = r.json();
    const me = await app.inject({ url: '/me', headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(200);
    const raw = await db.query('SELECT 1 FROM owner_session WHERE convert_from(token_hash, \'LATIN1\') = $1', [token]);
    expect(raw.rowCount).toBe(0);
  });

  it('invalid, malformed and tampered tokens rejected', async () => {
    const { token } = (await login('owner', PW)).json();
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    for (const h of [`Bearer ${tampered}`, 'Bearer nope', token, `Basic ${token}`, `Bearer ${token} x`]) {
      expect((await app.inject({ url: '/me', headers: { authorization: h } })).statusCode).toBe(401);
    }
  });

  it('expired token rejected', async () => {
    const { token } = (await login('owner', PW)).json();
    await db.query("UPDATE owner_session SET expires_at = now() - interval '1 second'");
    expect((await app.inject({ url: '/me', headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(401);
  });

  it('logout revokes the token', async () => {
    const { token } = (await login('owner', PW)).json();
    const h = { authorization: `Bearer ${token}` };
    expect((await app.inject({ method: 'POST', url: '/auth/logout', headers: h })).statusCode).toBe(204);
    expect((await app.inject({ url: '/me', headers: h })).statusCode).toBe(401);
  });
});
