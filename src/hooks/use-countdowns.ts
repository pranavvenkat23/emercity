import { useEffect, useMemo } from 'react';

import { countdownEngineInputs, householdCountdowns, outageNotifications, type Countdown } from '@/domain/countdown';
import type { PriorityContext } from '@/domain/priority/types';
import { STORAGE_RULES_BY_ID } from '@/reference/storage-rules';
import { replaceScheduled } from '@/services/notifications';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';

import { useNow } from './use-now';

/** Every countdown for the active household, refreshed every 15 s. */
export function useCountdowns(): { countdowns: Countdown[]; running: boolean; startedAt: string | null; simulated: boolean } {
  const snapshot = useSession((s) => s.snapshot);
  const current = useOutage((s) => s.current);
  const now = useNow(15_000);
  const countdowns = useMemo(
    () => (snapshot ? householdCountdowns(snapshot, STORAGE_RULES_BY_ID, current, now) : []),
    [snapshot, current, now],
  );
  return { countdowns, running: !!current, startedAt: current?.startedAt ?? null, simulated: !!current?.simulated };
}

/** Countdown inputs for the priority engine (§8.1), recomputed each minute. */
export function useCountdownContext(): PriorityContext['outage'] {
  const snapshot = useSession((s) => s.snapshot);
  const current = useOutage((s) => s.current);
  const now = useNow(60_000);
  return useMemo(() => {
    if (!snapshot || !current) return null;
    const inputs = countdownEngineInputs(householdCountdowns(snapshot, STORAGE_RULES_BY_ID, current, now));
    return { active: true, ...inputs };
  }, [snapshot, current, now]);
}

/**
 * Loads persisted outage state for the active household and keeps the
 * pre-scheduled countdown notifications in step with it (§11.7).
 * Mount once at the app root.
 */
export function useOutageSync() {
  const householdId = useSession((s) => s.householdId);
  const snapshot = useSession((s) => s.snapshot);
  const current = useOutage((s) => s.current);

  useEffect(() => {
    if (householdId) useOutage.getState().load(householdId);
  }, [householdId]);

  useEffect(() => {
    if (!snapshot) return;
    const now = new Date();
    const notes = current ? outageNotifications(householdCountdowns(snapshot, STORAGE_RULES_BY_ID, current, now), now) : [];
    replaceScheduled('outage:', 'countdown', notes).catch(() => {
      // Notifications unavailable or denied: the in-app countdowns still run.
    });
  }, [snapshot, current]);
}
