import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';

import type { Member } from '@/models/types';
import { useSession } from '@/stores/session-store';

/**
 * Which household member is using this phone. Signed-in users are the
 * member linked to their account (§19.2); on the demo or a local household
 * it is chosen once and saved.
 */
const useMeStore = create<{ chosen: Record<string, string>; set(householdId: string, memberId: string): void }>((set, get) => ({
  chosen: {},
  set: (h, m) => set({ chosen: { ...get().chosen, [h]: m } }),
}));

const key = (h: string) => `me.${h}`;

export function useMe(): { me: Member | null; setMe: (memberId: string) => Promise<void> } {
  const snapshot = useSession((s) => s.snapshot);
  const user = useSession((s) => s.user);
  const db = useSession((s) => s.db);
  const chosen = useMeStore((s) => (snapshot ? s.chosen[snapshot.household.id] : undefined));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!db || !snapshot || loaded) return;
    db.kv.get(key(snapshot.household.id)).then((v) => {
      if (v) useMeStore.getState().set(snapshot.household.id, v);
      setLoaded(true);
    });
  }, [db, snapshot, loaded]);

  const setMe = useCallback(
    async (memberId: string) => {
      if (!snapshot || !db) return;
      useMeStore.getState().set(snapshot.household.id, memberId);
      await db.kv.set(key(snapshot.household.id), memberId);
    },
    [db, snapshot],
  );

  if (!snapshot) return { me: null, setMe };
  const linked = user ? snapshot.members.find((m) => m.linkedUserId === user.uid) : undefined;
  const picked = chosen ? snapshot.members.find((m) => m.id === chosen) : undefined;
  const fallback = snapshot.members.find((m) => m.role === 'adult') ?? snapshot.members[0] ?? null;
  return { me: linked ?? picked ?? fallback, setMe };
}
