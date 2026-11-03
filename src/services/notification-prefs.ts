import { create } from 'zustand';

import { DEFAULT_PREFS, parsePrefs } from '@/domain/notification-prefs';
import type { NotificationPrefs } from '@/models/types';
import { useSession } from '@/stores/session-store';

const KV_PREFS = 'notifications.prefs';

interface PrefsState {
  prefs: NotificationPrefs;
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<NotificationPrefs>): Promise<void>;
}

/** SET-03 preferences, kept on this phone in the encrypted key/value store. */
export const useNotificationPrefs = create<PrefsState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  loaded: false,
  async load() {
    const db = useSession.getState().db;
    if (!db) return;
    set({ prefs: parsePrefs(await db.kv.get(KV_PREFS)), loaded: true });
  },
  async update(patch) {
    const prefs = { ...get().prefs, ...patch };
    set({ prefs });
    await useSession.getState().db?.kv.set(KV_PREFS, JSON.stringify(prefs));
  },
}));

export async function currentPrefs(): Promise<NotificationPrefs> {
  const s = useNotificationPrefs.getState();
  if (!s.loaded) await s.load();
  return useNotificationPrefs.getState().prefs;
}
