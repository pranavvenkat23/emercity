import type { HouseholdCollection, RecordMeta } from '@/models/types';

import type { SqlDriver } from './sql-driver';

export type StoredCollection = HouseholdCollection | 'households';

export interface WriteOptions {
  /** Demo household writes never enter the sync queue (§26.3). */
  sync: boolean;
  /** Injectable clock and id source for deterministic tests. */
  now?: () => Date;
  newOpId?: () => string;
}

interface RecordRow {
  data: string;
}

/**
 * Local-first record store (§19.4, §21.3): every write lands in SQLite
 * first and, for synced households, appends an op to the sync queue in the
 * same transaction, so a write is never lost and never half-applied.
 */
export class RecordStore {
  constructor(private readonly db: SqlDriver) {}

  async get<T extends RecordMeta>(collection: StoredCollection, id: string): Promise<T | null> {
    const row = await this.db.first<RecordRow>(
      'SELECT data FROM records WHERE collection = ? AND id = ? AND deleted_at IS NULL',
      [collection, id],
    );
    return row ? (JSON.parse(row.data) as T) : null;
  }

  async list<T extends RecordMeta>(collection: StoredCollection, householdId: string): Promise<T[]> {
    const rows = await this.db.all<RecordRow>(
      `SELECT data FROM records
       WHERE collection = ? AND household_id = ? AND deleted_at IS NULL
       ORDER BY json_extract(data, '$.createdAt'), id`,
      [collection, householdId],
    );
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  /**
   * Inserts or replaces a record, stamping updatedAt. `changedFields` lets the
   * sync layer do field-level merges (§19.5); omitted means "all fields".
   */
  async upsert<T extends RecordMeta>(
    collection: StoredCollection,
    householdId: string,
    record: T,
    opts: WriteOptions,
    changedFields?: (keyof T)[],
  ): Promise<T> {
    const now = (opts.now ?? (() => new Date()))().toISOString();
    const stamped: T = { ...record, updatedAt: now, createdAt: record.createdAt || now };
    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO records (collection, id, household_id, data, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON CONFLICT (collection, id) DO UPDATE SET
           household_id = excluded.household_id,
           data = excluded.data,
           updated_at = excluded.updated_at,
           deleted_at = NULL`,
        [collection, stamped.id, householdId, JSON.stringify(stamped), now],
      );
      if (opts.sync) {
        const fields = changedFields
          ? Object.fromEntries(changedFields.map((k) => [k, stamped[k]]))
          : stamped;
        await this.enqueue(householdId, collection, stamped.id, 'upsert', fields, now, opts);
      }
    });
    return stamped;
  }

  /** Soft delete (§19.5): the row stays for 30 days so it can be restored. */
  async softDelete(
    collection: StoredCollection,
    householdId: string,
    id: string,
    opts: WriteOptions,
  ): Promise<void> {
    const now = (opts.now ?? (() => new Date()))().toISOString();
    await this.db.transaction(async () => {
      await this.db.run(
        `UPDATE records SET deleted_at = ?, updated_at = ?,
           data = json_set(data, '$.deletedAt', ?, '$.updatedAt', ?)
         WHERE collection = ? AND id = ?`,
        [now, now, now, now, collection, id],
      );
      if (opts.sync) await this.enqueue(householdId, collection, id, 'delete', null, now, opts);
    });
  }

  async restore(collection: StoredCollection, id: string): Promise<void> {
    await this.db.run(
      `UPDATE records SET deleted_at = NULL, data = json_remove(data, '$.deletedAt')
       WHERE collection = ? AND id = ?`,
      [collection, id],
    );
  }

  /** Permanently removes soft-deleted rows older than `days` (default 30). */
  async purgeDeleted(now: Date, days = 30): Promise<number> {
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
    const before = await this.db.first<{ n: number }>(
      'SELECT COUNT(*) AS n FROM records WHERE deleted_at IS NOT NULL AND deleted_at < ?',
      [cutoff],
    );
    await this.db.run('DELETE FROM records WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
    return before?.n ?? 0;
  }

  /** Removes every record for a household (demo reset, leave household). */
  async deleteHousehold(householdId: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM records WHERE household_id = ?', [householdId]);
      await this.db.run('DELETE FROM sync_queue WHERE household_id = ?', [householdId]);
    });
  }

  async pendingSyncCount(householdId?: string): Promise<number> {
    const row = householdId
      ? await this.db.first<{ n: number }>(
          'SELECT COUNT(*) AS n FROM sync_queue WHERE household_id = ?',
          [householdId],
        )
      : await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue');
    return row?.n ?? 0;
  }

  async pendingOps(limit = 100) {
    return this.db.all<{
      seq: number;
      op_id: string;
      household_id: string;
      collection: string;
      record_id: string;
      op: 'upsert' | 'delete';
      fields: string | null;
      created_at: string;
      attempts: number;
    }>('SELECT * FROM sync_queue ORDER BY seq LIMIT ?', [limit]);
  }

  /** Removes a pushed op from the queue. */
  async ackOp(seq: number): Promise<void> {
    await this.db.run('DELETE FROM sync_queue WHERE seq = ?', [seq]);
  }

  /** Records a failed push; the op stays queued and is retried later. */
  async failOp(seq: number, error: string): Promise<void> {
    await this.db.run('UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE seq = ?', [error.slice(0, 500), seq]);
  }

  /** True if this record has local changes not yet pushed. */
  async hasPending(collection: StoredCollection, id: string): Promise<boolean> {
    const row = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue WHERE collection = ? AND record_id = ?', [collection, id]);
    return (row?.n ?? 0) > 0;
  }

  /**
   * Applies a change that came from the cloud (another phone). Never queued
   * (it's already in the cloud). Skipped while this phone has unpushed
   * changes to the same record, so a local edit isn't overwritten before it
   * reaches the server; the server's merged copy arrives after the push.
   * Returns false when skipped or older than the local copy.
   */
  async applyRemote<T extends RecordMeta>(collection: StoredCollection, householdId: string, record: T): Promise<boolean> {
    if (await this.hasPending(collection, record.id)) return false;
    const local = await this.db.first<{ updated_at: string }>('SELECT updated_at FROM records WHERE collection = ? AND id = ?', [collection, record.id]);
    if (local && record.updatedAt && local.updated_at > record.updatedAt) return false;
    const deletedAt = record.deletedAt ?? null;
    await this.db.run(
      `INSERT INTO records (collection, id, household_id, data, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (collection, id) DO UPDATE SET
         household_id = excluded.household_id, data = excluded.data,
         updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
      [collection, record.id, householdId, JSON.stringify(record), record.updatedAt || new Date().toISOString(), deletedAt],
    );
    return true;
  }

  /** Full JSON of a record, including soft-deleted ones (for pushing deletes). */
  async getAny<T extends RecordMeta>(collection: StoredCollection, id: string): Promise<T | null> {
    const row = await this.db.first<RecordRow>('SELECT data FROM records WHERE collection = ? AND id = ?', [collection, id]);
    return row ? (JSON.parse(row.data) as T) : null;
  }

  private async enqueue(
    householdId: string,
    collection: StoredCollection,
    recordId: string,
    op: 'upsert' | 'delete',
    fields: unknown,
    now: string,
    opts: WriteOptions,
  ) {
    const opId = opts.newOpId ? opts.newOpId() : `${now}-${Math.random().toString(36).slice(2)}`;
    await this.db.run(
      `INSERT INTO sync_queue (op_id, household_id, collection, record_id, op, fields, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [opId, householdId, collection, recordId, op, fields == null ? null : JSON.stringify(fields), now],
    );
  }
}

export class KeyValueStore {
  constructor(private readonly db: SqlDriver) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db.first<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.run(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.run('DELETE FROM kv WHERE key = ?', [key]);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }
}
