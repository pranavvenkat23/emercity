import { useEffect } from 'react';
import { create } from 'zustand';

import { mapAlert } from '@/domain/alerts';
import type { Alert } from '@/models/types';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

import { fetchAlerts, fetchWeather } from './nws';

/**
 * Alert watching while the app is open (§10.2 step 5: poll every 5 minutes
 * as a backup). Server-side polling and remote push (§10.2 steps 1–3) need
 * Cloud Functions on the Firebase Blaze plan; see docs/PROGRESS.md.
 */

const POLL_MS = 5 * 60_000;
const YEAR_MS = 365 * 86_400_000;
const historyKey = (h: string) => `alerts.history.${h}`;

interface HistoryEntry extends Alert {
  firstSeenAt: string;
  emergencyStartedBy?: string | null;
}

interface AlertHistoryStore {
  entries: HistoryEntry[];
  /** Alert ids already shown as a full-screen prompt (§10.3). */
  prompted: string[];
  pending: Alert | null;
  load(householdId: string): Promise<void>;
  record(householdId: string, alerts: Alert[]): Promise<Alert[]>;
  setPending(a: Alert | null): void;
}

export const useAlertHistoryStore = create<AlertHistoryStore>((set, get) => ({
  entries: [],
  prompted: [],
  pending: null,
  async load(householdId) {
    const db = useSession.getState().db;
    if (!db) return;
    const entries = (await db.kv.getJSON<HistoryEntry[]>(historyKey(householdId))) ?? [];
    set({ entries });
  },
  async record(householdId, alerts) {
    const db = useSession.getState().db;
    const now = Date.now();
    const known = new Map(get().entries.map((e) => [e.id, e]));
    const fresh: Alert[] = [];
    for (const a of alerts) {
      if (!known.has(a.id)) fresh.push(a);
      known.set(a.id, { ...known.get(a.id), ...a, firstSeenAt: known.get(a.id)?.firstSeenAt ?? new Date(now).toISOString() });
    }
    const entries = [...known.values()].filter((e) => now - new Date(e.firstSeenAt).getTime() < YEAR_MS).sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
    set({ entries });
    if (db) await db.kv.setJSON(historyKey(householdId), entries);
    return fresh;
  },
  setPending: (pending) => set({ pending }),
}));

export function useAlertHistory(): HistoryEntry[] {
  return useAlertHistoryStore((s) => s.entries);
}

export async function markAlertSeen(id: string): Promise<void> {
  const { householdId, db } = useSession.getState();
  const store = useAlertHistoryStore.getState();
  const entries = store.entries.map((e) => (e.id === id ? { ...e, seenAt: new Date().toISOString() } : e));
  useAlertHistoryStore.setState({ entries });
  const cur = useConditions.getState().alerts;
  if (cur) useConditions.getState().setAlerts({ ...cur, value: cur.value.map((a) => (a.id === id ? { ...a, seenAt: new Date().toISOString() } : a)) });
  if (db && householdId) await db.kv.setJSON(historyKey(householdId), entries);
}

/** Records who started Emergency Mode from an alert (§10.5). */
export async function noteEmergencyStarted(alertId: string, by: string): Promise<void> {
  const { householdId, db } = useSession.getState();
  const entries = useAlertHistoryStore.getState().entries.map((e) => (e.id === alertId ? { ...e, emergencyStartedBy: by } : e));
  useAlertHistoryStore.setState({ entries });
  if (db && householdId) await db.kv.setJSON(historyKey(householdId), entries);
}

/** One check: alerts + weather for the household point. */
export async function checkNow(): Promise<void> {
  const { snapshot, online } = useSession.getState();
  const conditions = useConditions.getState();
  const h = snapshot?.household;
  if (!h || h.address.lat == null || h.address.lng == null) return;
  if (online === false) return;
  // Never overwrite a simulated demo alert with a live check; clearing the demo restores live checks.
  const simulated = conditions.alerts?.simulated;
  try {
    const alerts = await fetchAlerts(h.address.lat, h.address.lng, h.id);
    if (!simulated) {
      conditions.setAlerts({ value: alerts, source: 'NWS', fetchedAt: new Date().toISOString() }, null);
      const fresh = await useAlertHistoryStore.getState().record(h.id, alerts);
      const prompt = fresh.find((a) => mapAlert(a).prompt === 'full-screen' && !useAlertHistoryStore.getState().prompted.includes(a.id));
      if (prompt) {
        useAlertHistoryStore.setState((s) => ({ prompted: [...s.prompted, prompt.id], pending: prompt }));
      }
    }
  } catch (e) {
    if (!simulated) useConditions.getState().setAlerts(conditions.alerts, e instanceof Error ? e.message : 'Alert service unavailable');
  }
  try {
    if (useConditions.getState().weather?.simulated) return;
    const w = await fetchWeather(h.address.lat, h.address.lng);
    if (w) useConditions.getState().setWeather({ value: w, source: 'NWS forecast', fetchedAt: new Date().toISOString() });
  } catch {
    // Keep the last value; freshness labels show its age (§21.4).
  }
}

/** Mount once: loads history and polls every 5 minutes while online. */
export function useAlertPolling() {
  const householdId = useSession((s) => s.householdId);
  const online = useSession((s) => s.online);
  const lat = useSession((s) => s.snapshot?.household.address.lat);

  useEffect(() => {
    if (householdId) useAlertHistoryStore.getState().load(householdId);
  }, [householdId]);

  useEffect(() => {
    if (!householdId || online === false || lat == null) return;
    checkNow();
    const id = setInterval(checkNow, POLL_MS);
    return () => clearInterval(id);
  }, [householdId, online, lat]);
}
