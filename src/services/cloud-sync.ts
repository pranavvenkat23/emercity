import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, runTransaction, setDoc, type Unsubscribe } from 'firebase/firestore';
import { useEffect } from 'react';

import type { StoredCollection } from '@/data/record-store';
import { isPermanentPushError, mergeSteps, pushWrite } from '@/domain/sync';
import { HOUSEHOLD_COLLECTIONS, type RecordMeta } from '@/models/types';
import { useSession } from '@/stores/session-store';

import { getDb } from './firebase';

/**
 * Cloud sync on the free Spark plan (§19.4, §21.3): the encrypted local
 * database stays the source of truth. Queued local writes are pushed to
 * Firestore as field-level merges; real-time listeners bring other members'
 * changes into the local database. Nothing here blocks the UI.
 */

const errCode = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : undefined);
const MAX_PERMANENT_ATTEMPTS = 3;

/** Writes the signed-in user's profile (§4.2 User). Called after sign-up. */
export async function saveUserProfile(uid: string, profile: { email: string | null; ageConfirmed13Plus: boolean; isAdult18Plus: boolean }) {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, 'users', uid), { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
}

let flushing = false;

/** Pushes queued writes in order. Stops at the first network error and retries later. */
export async function flushQueue(): Promise<{ pushed: number; rejected: number }> {
  const { db: local, user, mode, online } = useSession.getState();
  const fs = getDb();
  if (flushing || !local || !fs || !user || mode !== 'account' || online === false) return { pushed: 0, rejected: 0 };
  flushing = true;
  let pushed = 0;
  let rejected = 0;
  try {
    for (;;) {
      const ops = await local.records.pendingOps(50);
      if (!ops.length) break;
      for (const op of ops) {
        const w = pushWrite(op, user.uid);
        try {
          if (op.collection === 'sessions' && Array.isArray(w.data.stepsCompleted)) {
            // Two phones can mark steps at once: merge, don't overwrite (§19.5).
            await runTransaction(fs, async (tx) => {
              const ref = doc(fs, w.path);
              const cur = await tx.get(ref);
              const steps = mergeSteps(cur.data()?.stepsCompleted as { stepId: string; at: string }[] | undefined, w.data.stepsCompleted as { stepId: string; at: string }[]);
              const data = { ...w.data, stepsCompleted: steps };
              tx.set(ref, data, { mergeFields: Object.keys(data) });
            });
          } else {
            // mergeFields replaces each changed top-level field whole. (merge:
            // true would deep-merge maps, so a key removed from `roles` would
            // never be removed in the cloud.)
            await setDoc(doc(fs, w.path), w.data, { mergeFields: Object.keys(w.data) });
          }
          if (op.collection === 'households') {
            await setDoc(doc(fs, 'users', user.uid), { householdIds: arrayUnion(op.record_id) }, { merge: true });
          }
          await local.records.ackOp(op.seq);
          pushed++;
        } catch (e) {
          const code = errCode(e);
          await local.records.failOp(op.seq, code ?? String(e));
          if (isPermanentPushError(code)) {
            // The server will never accept this write (e.g. a teen editing a
            // medication). Keep the local copy; drop the op after a few tries
            // so it doesn't block everything queued behind it.
            if (op.attempts + 1 >= MAX_PERMANENT_ATTEMPTS) {
              await local.records.ackOp(op.seq);
              rejected++;
            }
            continue;
          }
          return { pushed, rejected }; // offline or server busy: try again later
        }
      }
    }
  } finally {
    flushing = false;
    if (pushed || rejected) await useSession.getState().reload();
  }
  return { pushed, rejected };
}

type Remote = RecordMeta & Record<string, unknown>;

async function applyAll(householdId: string, coll: StoredCollection, docs: Remote[]): Promise<number> {
  const local = useSession.getState().db;
  if (!local) return 0;
  let n = 0;
  for (const d of docs) if (await local.records.applyRemote(coll, householdId, d)) n++;
  return n;
}

/** Downloads a whole household into the local database (new phone, joining). */
export async function pullHousehold(householdId: string): Promise<boolean> {
  const fs = getDb();
  if (!fs) return false;
  const root = await getDoc(doc(fs, 'households', householdId));
  if (!root.exists()) return false;
  await applyAll(householdId, 'households', [{ ...(root.data() as Remote), id: householdId }]);
  for (const c of HOUSEHOLD_COLLECTIONS) {
    const snap = await getDocs(collection(fs, 'households', householdId, c));
    await applyAll(
      householdId,
      c,
      snap.docs.map((d) => ({ ...(d.data() as Remote), id: d.id })),
    );
  }
  return true;
}

/** This phone's copy of the account's 18+ answer ('1' / '0'), for ONB-03. */
export const KV_ACCOUNT_ADULT = 'account.adult18';

/** The signed-in user's cloud profile: households and the age answer. */
export async function accountProfile(uid: string): Promise<{ householdIds: string[]; isAdult18Plus: boolean } | null> {
  const fs = getDb();
  if (!fs) return null;
  const u = await getDoc(doc(fs, 'users', uid));
  if (!u.exists()) return null;
  const d = u.data();
  return { householdIds: ((d.householdIds as string[] | undefined) ?? []).filter(Boolean), isAdult18Plus: d.isAdult18Plus === true };
}

/** Real-time listeners for the active household (§19.4). */
function listen(householdId: string): Unsubscribe {
  const fs = getDb();
  if (!fs) return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const reloadSoon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => useSession.getState().reload(), 250);
  };
  const subs: Unsubscribe[] = [
    onSnapshot(doc(fs, 'households', householdId), async (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      if (await applyAll(householdId, 'households', [{ ...(snap.data() as Remote), id: householdId }])) reloadSoon();
    }, () => {}),
    ...HOUSEHOLD_COLLECTIONS.map((c) =>
      onSnapshot(collection(fs, 'households', householdId, c), async (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        const changed = snap.docChanges().filter((ch) => ch.type !== 'removed').map((ch) => ({ ...(ch.doc.data() as Remote), id: ch.doc.id }));
        if (changed.length && (await applyAll(householdId, c, changed))) reloadSoon();
      }, () => {}),
    ),
  ];
  return () => {
    if (timer) clearTimeout(timer);
    subs.forEach((u) => u());
  };
}

/**
 * Mount once (AppServices): while signed in with a synced household,
 * listens for changes and pushes the queue whenever it grows, when the
 * phone comes back online, and every 30 seconds.
 */
export function useCloudSync() {
  const mode = useSession((s) => s.mode);
  const uid = useSession((s) => s.user?.uid);
  const householdId = useSession((s) => s.householdId);
  const isDemo = useSession((s) => s.snapshot?.household.isDemo ?? false);
  const online = useSession((s) => s.online);
  const pending = useSession((s) => s.pendingSync);
  const active = mode === 'account' && !!uid && !!householdId && !isDemo;

  useEffect(() => {
    if (!active || online === false) return;
    const stop = listen(householdId!);
    return stop;
  }, [active, householdId, online]);

  useEffect(() => {
    if (!active || online === false) return;
    flushQueue().catch(() => {});
  }, [active, online, pending]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => flushQueue().catch(() => {}), 30_000);
    return () => clearInterval(id);
  }, [active]);
}
