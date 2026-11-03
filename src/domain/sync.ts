import type { StoredCollection } from '@/data/record-store';

/**
 * Pure pieces of cloud sync (§19.4–19.5, §24.5). The service layer wires
 * them to Firestore.
 *
 * Layout: households/{hid} holds the household record; every other record
 * lives at households/{hid}/{collection}/{id}. (The spec nests check-ins and
 * step events under sessions; they are kept flat here so listeners and
 * rules stay simple. The spec calls the layout a sketch.)
 */
export function cloudPath(collection: StoredCollection, householdId: string, id: string): string {
  return collection === 'households' ? `households/${id}` : `households/${householdId}/${collection}/${id}`;
}

/** Firestore rejects undefined; drop it (recursively) before writing. */
export function stripUndefined<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripUndefined) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).map(([k, x]) => [k, stripUndefined(x)])) as T;
  }
  return v;
}

/** Fields only this phone needs; never sent to the cloud. */
const LOCAL_ONLY = new Set<string>([]);

export interface QueuedOp {
  collection: string;
  record_id: string;
  household_id: string;
  op: 'upsert' | 'delete';
  fields: string | null;
  created_at: string;
}

/**
 * The merge write for a queued op. Field-level: only the fields this phone
 * changed are sent, so two people editing different fields of one record
 * both keep their changes; the same field is last-writer-wins (§19.5).
 * Deletes are soft (§19.5): the record stays 30 days with deletedAt set.
 */
export function pushWrite(op: QueuedOp, uid: string): { path: string; data: Record<string, unknown> } {
  const path = cloudPath(op.collection as StoredCollection, op.household_id, op.record_id);
  if (op.op === 'delete') {
    return { path, data: { id: op.record_id, deletedAt: op.created_at, updatedAt: op.created_at, updatedBy: uid } };
  }
  const fields = (op.fields ? JSON.parse(op.fields) : {}) as Record<string, unknown>;
  const data = Object.fromEntries(Object.entries(fields).filter(([k]) => !LOCAL_ONLY.has(k)));
  return { path, data: stripUndefined({ ...data, id: op.record_id, updatedAt: op.created_at, updatedBy: uid }) };
}

/** True if a push failure will never succeed by retrying (rules said no). */
export function isPermanentPushError(code: string | undefined): boolean {
  return code === 'permission-denied' || code === 'invalid-argument' || code === 'failed-precondition';
}

/**
 * §19.5 "Step marked done on two phones: done once; credit to the first
 * timestamp." Union by step, keeping the earliest entry. A step one phone
 * un-marked stays marked if another phone recorded it (a done step is
 * never silently lost).
 */
export function mergeSteps<T extends { stepId: string; at: string }>(a: T[] | undefined, b: T[] | undefined): T[] {
  const best = new Map<string, T>();
  for (const s of [...(a ?? []), ...(b ?? [])]) {
    const prev = best.get(s.stepId);
    if (!prev || s.at < prev.at) best.set(s.stepId, s);
  }
  return [...best.values()].sort((x, y) => x.at.localeCompare(y.at));
}
