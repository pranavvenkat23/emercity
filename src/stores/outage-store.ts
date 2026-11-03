import { create } from 'zustand';

import type { ItemState, OutageInput } from '@/domain/countdown';

import { useSession } from './session-store';

/**
 * Power outage state for the active household (§6.3, §11.5, §11.6).
 * Persisted in the encrypted database so countdowns survive an app restart
 * (§25.4). Synced across household phones in Phase 10, where the earliest
 * confirmed start time wins (§19.5).
 */
export interface OutageRecord extends OutageInput {
  simulated?: boolean;
  confirmedBy?: string | null;
}

export interface OutageLogEntry {
  startedAt: string;
  endedAt: string;
  simulated?: boolean;
}

interface OutageStore {
  householdId: string | null;
  current: OutageRecord | null;
  log: OutageLogEntry[];
  /** Set after "Power's back" until the medicine/food checklist is done. */
  restoredCheck: OutageRecord | null;
  load(householdId: string): Promise<void>;
  start(at?: Date, opts?: { simulated?: boolean }): Promise<void>;
  /** Earliest start wins (another member confirmed earlier). */
  mergeStart(startedAt: string): Promise<void>;
  end(at?: Date): Promise<void>;
  /** Drops a demo outage without a power-restored check or log entry (§26.3). */
  discardSimulated(): Promise<void>;
  updateItem(id: string, patch: ItemState): Promise<void>;
  setIndoorTemp(tempF: number | null): Promise<void>;
  finishRestoredCheck(): Promise<void>;
}

const key = (h: string) => `outage.${h}`;
const logKey = (h: string) => `outage.log.${h}`;
const restoredKey = (h: string) => `outage.restored.${h}`;

async function persist(s: OutageStore) {
  const db = useSession.getState().db;
  if (!db || !s.householdId) return;
  if (s.current) await db.kv.setJSON(key(s.householdId), s.current);
  else await db.kv.remove(key(s.householdId));
  await db.kv.setJSON(logKey(s.householdId), s.log.slice(-100));
  if (s.restoredCheck) await db.kv.setJSON(restoredKey(s.householdId), s.restoredCheck);
  else await db.kv.remove(restoredKey(s.householdId));
}

export const useOutage = create<OutageStore>((set, get) => ({
  householdId: null,
  current: null,
  log: [],
  restoredCheck: null,

  async load(householdId) {
    const db = useSession.getState().db;
    if (!db) return;
    const [current, log, restoredCheck] = await Promise.all([
      db.kv.getJSON<OutageRecord>(key(householdId)),
      db.kv.getJSON<OutageLogEntry[]>(logKey(householdId)),
      db.kv.getJSON<OutageRecord>(restoredKey(householdId)),
    ]);
    set({ householdId, current: current ?? null, log: log ?? [], restoredCheck: restoredCheck ?? null });
  },

  async start(at = new Date(), opts = {}) {
    if (get().current) return;
    set({ current: { startedAt: at.toISOString(), items: {}, simulated: opts.simulated }, restoredCheck: null });
    await persist(get());
  },

  async mergeStart(startedAt) {
    const cur = get().current;
    if (!cur) set({ current: { startedAt, items: {} } });
    else if (startedAt < cur.startedAt) set({ current: { ...cur, startedAt } });
    await persist(get());
  },

  async end(at = new Date()) {
    const cur = get().current;
    if (!cur) return;
    const ended = { ...cur, endedAt: at.toISOString() };
    set({
      current: null,
      restoredCheck: ended,
      log: [...get().log, { startedAt: cur.startedAt, endedAt: ended.endedAt, simulated: cur.simulated }],
    });
    await persist(get());
  },

  async discardSimulated() {
    if (!get().current?.simulated) return;
    set({ current: null, restoredCheck: null });
    await persist(get());
  },

  async updateItem(id, patch) {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, items: { ...cur.items, [id]: { ...cur.items[id], ...patch } } } });
    await persist(get());
  },

  async setIndoorTemp(tempF) {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, indoorTempF: tempF } });
    await persist(get());
  },

  async finishRestoredCheck() {
    set({ restoredCheck: null });
    await persist(get());
  },
}));
