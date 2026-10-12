import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';

const db = createPool(loadConfig().databaseUrl);
try {
  const applied = await migrate(db);
  console.log(applied.length ? `applied: ${applied.join(', ')}` : 'no pending migrations');
} finally {
  await db.end();
}
