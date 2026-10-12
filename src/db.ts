import pg from 'pg';
export type Db = pg.Pool;
export function createPool(url: string): Db {
  // Small pool: R0 must fit an 8 GB CPU-only host.
  return new pg.Pool({ connectionString: url, max: 5 });
}
