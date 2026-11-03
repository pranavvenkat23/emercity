import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { KeyValueStore, RecordStore } from './record-store';
import { migrate } from './schema';
import { serialized, type SqlDriver, type SqlParam } from './sql-driver';

const DB_NAME = 'emercity.db';
const KEY_NAME = 'emercity.db.key.v1';

/**
 * Keychain/Keystore item for the database key (§21.2). AFTER_FIRST_UNLOCK so
 * scheduled countdown work can open the DB while the phone is locked;
 * THIS_DEVICE_ONLY so the key never leaves the device in backups.
 */
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, hex, KEY_OPTIONS);
  return hex;
}

function wrap(db: SQLite.SQLiteDatabase): SqlDriver {
  const transaction = serialized((fn) => db.withTransactionAsync(fn));
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlParam[] = []) => {
      await db.runAsync(sql, params);
    },
    all: <T,>(sql: string, params: SqlParam[] = []) => db.getAllAsync<T>(sql, params),
    first: <T,>(sql: string, params: SqlParam[] = []) => db.getFirstAsync<T>(sql, params),
    transaction,
  };
}

export interface Database {
  driver: SqlDriver;
  records: RecordStore;
  kv: KeyValueStore;
  /** SQLCipher version string; empty means the DB is NOT encrypted. */
  cipherVersion: string;
}

let opening: Promise<Database> | null = null;

/** Opens (once) the encrypted local database and runs migrations. */
export function openDatabase(): Promise<Database> {
  if (!opening) {
    opening = (async () => {
      const key = await getOrCreateKey();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // The key pragma must be the first statement on the connection.
      await db.execAsync(`PRAGMA key = '${key}'`);
      const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const driver = wrap(db);
      await migrate(driver);
      return {
        driver,
        records: new RecordStore(driver),
        kv: new KeyValueStore(driver),
        cipherVersion: cipher?.cipher_version ?? '',
      };
    })().catch((e) => {
      opening = null;
      throw e;
    });
  }
  return opening;
}
