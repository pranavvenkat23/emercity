import { serialized, type SqlDriver, type SqlParam } from '@/data/sql-driver';

/**
 * In-memory SQLite driver for Jest, backed by Node's built-in `node:sqlite`
 * (Node ≥ 22.5). Lets data-layer tests run the real SQL the app runs.
 */
export function createNodeDriver(): SqlDriver {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
  const db = new DatabaseSync(':memory:');

  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: SqlParam[] = []) {
      db.prepare(sql).run(...params);
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async first<T>(sql: string, params: SqlParam[] = []) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    transaction: serialized(async (fn) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }),
  };
}
