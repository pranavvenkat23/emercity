import { useEffect, useRef } from 'react';

import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';

/**
 * Shares the outage between household phones through the household record
 * (§19.5 "Countdown start times differ: earliest start wins"). Simulated
 * demo outages never leave the phone.
 */
export function useOutageShare() {
  const mode = useSession((s) => s.mode);
  const household = useSession((s) => s.snapshot?.household);
  const current = useOutage((s) => s.current);
  const lastRemote = useRef<string | null>(null);
  const shared = household?.sharedOutage ?? null;
  const active = mode === 'account' && !!household && !household.isDemo;

  // Remote to local: another phone started (or ended) an outage.
  useEffect(() => {
    if (!active || !shared) return;
    const key = `${shared.startedAt}|${shared.endedAt ?? ''}`;
    if (lastRemote.current === key) return;
    lastRemote.current = key;
    const local = useOutage.getState().current;
    if (shared.endedAt) {
      if (local && !local.simulated && local.startedAt >= shared.startedAt) useOutage.getState().end(new Date(shared.endedAt));
    } else if (!local || (!local.simulated && shared.startedAt < local.startedAt)) {
      useOutage.getState().mergeStart(shared.startedAt);
    }
  }, [active, shared]);

  // Local to remote, only when this phone's outage actually changes
  // (not on first load, when the local copy may not be loaded yet).
  const prev = useRef<string | null | undefined>(undefined);
  const localKey = current && !current.simulated ? current.startedAt : null;
  useEffect(() => {
    if (!active || !household) return;
    const before = prev.current;
    prev.current = localKey;
    if (before === undefined || before === localKey) return;
    const save = useSession.getState().save;
    if (localKey && (!shared || shared.endedAt || localKey < shared.startedAt)) {
      lastRemote.current = `${localKey}|`;
      save('households', { ...household, sharedOutage: { startedAt: localKey, endedAt: null } }, ['sharedOutage']);
    } else if (!localKey && before && shared && !shared.endedAt) {
      const endedAt = new Date().toISOString();
      lastRemote.current = `${shared.startedAt}|${endedAt}`;
      save('households', { ...household, sharedOutage: { ...shared, endedAt } }, ['sharedOutage']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, localKey]);
}
