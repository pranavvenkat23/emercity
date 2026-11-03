/**
 * Minimal SQL interface the data layer depends on. The app uses expo-sqlite
 * with SQLCipher (`expo-driver.ts`); tests use Node's built-in `node:sqlite`
 * (`test-utils/node-driver.ts`), so repository SQL is exercised for real.
 */
export type SqlParam = string | number | null;

export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** Runs `fn` atomically; rolls back if it throws. */
  transaction(fn: () => Promise<void>): Promise<void>;
}

/**
 * Wraps a transaction function so calls run one after another. SQLite has one
 * connection here, so two overlapping BEGINs fail ("cannot start a
 * transaction within a transaction"). Must not be called re-entrantly.
 */
export function serialized(run: (fn: () => Promise<void>) => Promise<void>): (fn: () => Promise<void>) => Promise<void> {
  let tail: Promise<unknown> = Promise.resolve();
  return (fn) => {
    const next = tail.then(() => run(fn));
    tail = next.catch(() => {});
    return next;
  };
}
