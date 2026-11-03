import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { computeReadiness, type ReadinessResult } from '@/domain/readiness';
import { notificationsEnabled } from '@/services/notifications';
import { useSession } from '@/stores/session-store';

export const KV_OFFLINE_PACKAGE = 'offline.packageDate';

/** Readiness (§6.4) for the active household, recomputed on any change. */
export function useReadiness(): ReadinessResult | null {
  const snapshot = useSession((s) => s.snapshot);
  const db = useSession((s) => s.db);
  const [notifOn, setNotifOn] = useState(false);
  const [offlineDate, setOfflineDate] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!db || !snapshot) return;
    db.kv.get(KV_OFFLINE_PACKAGE).then(setOfflineDate).catch(() => {});
    notificationsEnabled().then(setNotifOn).catch(() => setNotifOn(false));
  }, [db, snapshot]);

  useEffect(refresh, [refresh]);
  useFocusEffect(refresh);

  return useMemo(
    () => (snapshot ? computeReadiness(snapshot, { now: new Date(), drills: snapshot.drills, notificationsEnabled: notifOn, offlinePackageDate: offlineDate }) : null),
    [snapshot, notifOn, offlineDate],
  );
}
