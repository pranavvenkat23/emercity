import type { SqlDriver } from './sql-driver';

/**
 * Local database schema (§21.2). Household data is stored document-style , 
 * one JSON row per record, mirroring the Firestore layout in §24.5 so the
 * sync layer can move records between the two without field mapping.
 *
 * Append new migrations; never edit a shipped one.
 */
const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS records (
    collection   TEXT NOT NULL,
    id           TEXT NOT NULL,
    household_id TEXT NOT NULL,
    data         TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    deleted_at   TEXT,
    PRIMARY KEY (collection, id)
  );
  CREATE INDEX IF NOT EXISTS records_by_household ON records (household_id, collection);

  -- §21.3 sync queue: every local write to a synced household creates an op.
  CREATE TABLE IF NOT EXISTS sync_queue (
    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
    op_id        TEXT NOT NULL UNIQUE,
    household_id TEXT NOT NULL,
    collection   TEXT NOT NULL,
    record_id    TEXT NOT NULL,
    op           TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
    fields       TEXT,
    created_at   TEXT NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    last_error   TEXT
  );

  -- Small app state: session mode, last-checked times, offline package date.
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SqlDriver): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
    });
    await db.exec(`PRAGMA user_version = ${v + 1}`);
  }
}
