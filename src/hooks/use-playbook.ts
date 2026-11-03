import { useMemo } from 'react';

import { mapAlert } from '@/domain/alerts';
import { generatePlaybook, insertFallback, type PlaybookStep } from '@/domain/playbook';
import type { PriorityResult } from '@/domain/priority/types';
import type { EmergencySession } from '@/models/types';
import { useConditions } from '@/stores/conditions-store';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';

import { usePriorities, usePriorityContext } from './use-priorities';

/** The live playbook for a session (§12.5): regenerated as conditions change. */
export function usePlaybook(session: EmergencySession | null): { steps: PlaybookStep[]; priorities: PriorityResult | null } {
  const snapshot = useSession((s) => s.snapshot);
  const priorities = usePriorities(session?.hazard ?? 'outage');
  const ctx = usePriorityContext();
  const outage = useOutage((s) => s.current);
  const alerts = useConditions((s) => s.alerts);

  const steps = useMemo(() => {
    if (!snapshot || !session || !priorities) return [];
    const alert = session.alertId ? alerts?.value.find((a) => a.id === session.alertId) : null;
    let list = generatePlaybook(snapshot, session.hazard, {
      priorities,
      evacuationOrdered: ctx.evacuationOrdered,
      outageActive: !!outage,
      alertFirstStep: alert ? mapAlert(alert).firstStep ?? null : null,
    });
    // Re-insert fallbacks after the step that produced them.
    for (const fb of session.insertedFallbacks ?? []) {
      const owner = list.find((s) => s.fallback?.id === fb);
      if (owner) list = insertFallback(list, owner.id);
    }
    const reassigned = session.reassigned ?? {};
    return list.map((s) => (reassigned[s.id] ? { ...s, assigneeId: reassigned[s.id] } : s));
  }, [snapshot, session, priorities, ctx.evacuationOrdered, outage, alerts]);

  return { steps, priorities };
}
