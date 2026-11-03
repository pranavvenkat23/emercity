import { useCallback, useMemo, useRef } from 'react';

import { newId } from '@/data/ids';
import { computeHazardScores } from '@/domain/risk';
import { generateSupplies, mergeSupplies, type SupplyTemplate } from '@/domain/supplies';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

/** Generated supply templates plus a sync that merges them into the stored list (§17.2). */
export function useSupplies(): { generated: SupplyTemplate[]; sync: () => Promise<void>; built: boolean } {
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const risk = useConditions((s) => s.risk);
  const generated = useMemo(() => (snapshot ? generateSupplies(snapshot, computeHazardScores(snapshot, risk?.value.factors ?? [])) : []), [snapshot, risk]);
  const running = useRef(false);
  const sync = useCallback(async () => {
    if (!snapshot || running.current) return;
    running.current = true;
    try {
      const { upsert, remove: gone } = mergeSupplies(snapshot.supplies, generated, newId, snapshot.household.id, new Date().toISOString());
      for (const s of upsert) await save('supplies', s);
      for (const id of gone) await remove('supplies', id);
    } finally {
      running.current = false;
    }
  }, [snapshot, generated, save, remove]);
  return { generated, sync, built: (snapshot?.supplies.length ?? 0) > 0 };
}
