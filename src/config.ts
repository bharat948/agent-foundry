export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  ownerUsername: string;
  ownerPassword: string | undefined;
  sessionTtlSeconds: number;
}

function req(env: NodeJS.ProcessEnv, k: string): string {
  const v = env[k];
  if (!v) throw new Error(`missing required env var ${k}`);
  return v;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const ttl = Number(env.SESSION_TTL_SECONDS ?? 43200);
  if (!Number.isInteger(ttl) || ttl <= 0) throw new Error('SESSION_TTL_SECONDS must be a positive integer');
  return {
    databaseUrl: req(env, 'DATABASE_URL'),
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    ownerUsername: env.OWNER_USERNAME ?? 'owner',
    ownerPassword: env.OWNER_PASSWORD || undefined,
    sessionTtlSeconds: ttl,
  };
}
