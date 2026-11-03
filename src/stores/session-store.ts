import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

import { openDatabase, type Database } from '@/data/database';
import { DEMO_HOUSEHOLD_ID } from '@/data/demo-household';
import { loadSnapshot, seedDemoHousehold } from '@/data/household-repo';
import type { StoredCollection } from '@/data/record-store';
import type { Household, HouseholdSnapshot, RecordMeta } from '@/models/types';
import { subscribeToAuth, signOut, type AuthUser } from '@/services/auth';

/**
 * App session: the local database, which household is active, the loaded
 * snapshot, sign-in state and connectivity. The database is the source of
 * truth (§24.1); this store holds what the UI needs to render it, and is the
 * single write path for household records.
 *
 * Modes:
 *  - none: onboarding
 *  - demo: the built-in demo household (§26.3), never synced
 *  - account, signed in; household syncs through the queue (§19.4)
 *  - local: developer builds only: a real household set up without an
 *              account, never synced (lets onboarding be tested before
 *              Firebase is configured)
 */
export type SessionMode = 'none' | 'demo' | 'account' | 'local';

const KV_MODE = 'session.mode';
const KV_HOUSEHOLD = 'session.householdId';
const KV_LAST_SAVED = 'session.lastSavedAt';

interface SessionState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  db: Database | null;
  mode: SessionMode;
  householdId: string | null;
  snapshot: HouseholdSnapshot | null;
  user: AuthUser | null;
  /** null until NetInfo reports. Unknown is treated as offline for safety copy. */
  online: boolean | null;
  pendingSync: number;
  /** When the local plan was last written; shown on the OfflineBar. */
  lastSavedAt: string | null;

  init(): Promise<void>;
  enterDemo(): Promise<void>;
  /** After sign-in/sign-up; household setup follows. */
  setAccountMode(): Promise<void>;
  /** Developer-only: set up a household on this phone without an account. */
  setLocalMode(): Promise<void>;
  resetDemo(): Promise<void>;
  exitToWelcome(): Promise<void>;
  reload(): Promise<void>;

  /** Makes a household that was downloaded from the cloud active (sign-in on a new phone, joining). */
  adoptHousehold(householdId: string, opts?: { onboardingDone?: boolean }): Promise<void>;
  /** Creates the household root record and makes it active (ONB-04). */
  createHousehold(household: Household): Promise<void>;
  /** Saves any household record; queues sync for synced households. */
  save<T extends RecordMeta>(collection: StoredCollection, record: T, changed?: (keyof T)[]): Promise<T>;
  /** Soft-deletes a record (30-day restore window, §19.5). */
  remove(collection: StoredCollection, id: string): Promise<void>;
  /** Marks onboarding finished for this household. */
  completeOnboarding(): Promise<void>;
  onboardingDone: boolean;
}

let unsubscribers: (() => void)[] = [];

/** Only real, signed-in households sync. Demo and local never leave the phone. */
function shouldSync(mode: SessionMode, snapshot: HouseholdSnapshot | null): boolean {
  return mode === 'account' && !!snapshot && !snapshot.household.isDemo;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  error: null,
  db: null,
  mode: 'none',
  householdId: null,
  snapshot: null,
  user: null,
  online: null,
  pendingSync: 0,
  lastSavedAt: null,
  onboardingDone: false,

  async init() {
    if (get().db) return;
    try {
      const db = await openDatabase();
      const mode = ((await db.kv.get(KV_MODE)) as SessionMode | null) ?? 'none';
      const householdId = await db.kv.get(KV_HOUSEHOLD);
      const lastSavedAt = await db.kv.get(KV_LAST_SAVED);
      const onboardingDone = householdId ? (await db.kv.get(`onboarding.done.${householdId}`)) === '1' : false;
      set({ db, mode, householdId, lastSavedAt, onboardingDone });
      await get().reload();

      unsubscribers.forEach((u) => u());
      unsubscribers = [
        NetInfo.addEventListener((s) => {
          set({ online: s.isConnected === true && s.isInternetReachable !== false });
        }),
        subscribeToAuth(db.kv, (user) => set({ user })),
      ];
      set({ status: 'ready' });
    } catch (e) {
      // Never put record contents in errors; only the message.
      set({ status: 'error', error: e instanceof Error ? e.message : 'Could not open local data' });
    }
  },

  async enterDemo() {
    const { db } = get();
    if (!db) return;
    const snapshot = await seedDemoHousehold(db.records);
    const now = new Date().toISOString();
    await db.kv.set(KV_MODE, 'demo');
    await db.kv.set(KV_HOUSEHOLD, DEMO_HOUSEHOLD_ID);
    await db.kv.set(KV_LAST_SAVED, now);
    await db.kv.set(`onboarding.done.${DEMO_HOUSEHOLD_ID}`, '1');
    // One atomic update: mode and snapshot change together, so the
    // protected-route guard flips exactly once.
    set({
      mode: 'demo',
      householdId: DEMO_HOUSEHOLD_ID,
      lastSavedAt: now,
      snapshot,
      pendingSync: 0,
      onboardingDone: true,
    });
  },

  async setAccountMode() {
    const { db } = get();
    if (!db) return;
    await db.kv.set(KV_MODE, 'account');
    set({ mode: 'account' });
  },

  async setLocalMode() {
    const { db } = get();
    if (!db) return;
    await db.kv.set(KV_MODE, 'local');
    set({ mode: 'local' });
  },

  async resetDemo() {
    const { db } = get();
    if (!db) return;
    await seedDemoHousehold(db.records);
    await get().reload();
  },

  async exitToWelcome() {
    const { db, mode, householdId } = get();
    if (!db) return;
    if (mode === 'demo') await db.records.deleteHousehold(DEMO_HOUSEHOLD_ID);
    // A developer-local household has no other copy; leaving deletes it.
    if (mode === 'local' && householdId) await db.records.deleteHousehold(householdId);
    if (mode === 'account') {
      // The cloud holds the household; don't leave health data on a phone
      // nobody is signed in to (§22). Callers push the queue first.
      if (householdId) await db.records.deleteHousehold(householdId);
      await db.kv.remove('account.adult18');
      await signOut(db.kv);
    }
    await db.kv.set(KV_MODE, 'none');
    await db.kv.remove(KV_HOUSEHOLD);
    set({ mode: 'none', householdId: null, snapshot: null, onboardingDone: false });
  },

  async reload() {
    const { db, householdId } = get();
    if (!db) return;
    const snapshot = householdId ? await loadSnapshot(db.records, householdId) : null;
    const pendingSync = await db.records.pendingSyncCount(householdId ?? undefined);
    set({ snapshot, pendingSync });
  },

  async adoptHousehold(householdId, opts = {}) {
    const { db } = get();
    if (!db) return;
    const done = opts.onboardingDone ?? true;
    await db.kv.set(KV_HOUSEHOLD, householdId);
    if (done) await db.kv.set(`onboarding.done.${householdId}`, '1');
    set({ householdId, onboardingDone: done });
    await get().reload();
  },

  async createHousehold(household) {
    const { db, mode } = get();
    if (!db) return;
    const sync = mode === 'account' && !household.isDemo;
    await db.records.upsert('households', household.id, household, { sync });
    await db.kv.set(KV_HOUSEHOLD, household.id);
    set({ householdId: household.id, onboardingDone: false });
    await get().reload();
  },

  async save(collection, record, changed) {
    const { db, mode, snapshot, householdId } = get();
    if (!db || !householdId) throw new Error('No active household');
    const saved = await db.records.upsert(collection, householdId, record, { sync: shouldSync(mode, snapshot) }, changed);
    const now = new Date().toISOString();
    await db.kv.set(KV_LAST_SAVED, now);
    set({ lastSavedAt: now });
    await get().reload();
    return saved;
  },

  async remove(collection, id) {
    const { db, mode, snapshot, householdId } = get();
    if (!db || !householdId) return;
    await db.records.softDelete(collection, householdId, id, { sync: shouldSync(mode, snapshot) });
    await get().reload();
  },

  async completeOnboarding() {
    const { db, householdId } = get();
    if (!db || !householdId) return;
    await db.kv.set(`onboarding.done.${householdId}`, '1');
    set({ onboardingDone: true });
  },
}));
