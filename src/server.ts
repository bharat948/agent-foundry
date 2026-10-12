import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { bootstrapOwner } from './auth.js';
import { buildApp } from './app.js';

const cfg = loadConfig();
const db = createPool(cfg.databaseUrl);
await migrate(db);
console.log(`owner bootstrap: ${await bootstrapOwner(db, cfg.ownerUsername, cfg.ownerPassword)}`);
const app = await buildApp({ db, sessionTtlSeconds: cfg.sessionTtlSeconds, logger: true });
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, async () => { await app.close(); await db.end(); process.exit(0); });
}
await app.listen({ port: cfg.port, host: cfg.host });
