import { useEffect } from 'react';

import { computeNudges, nudgeNotes } from '@/domain/nudges';
import { computeHazardScores } from '@/domain/risk';
import { replaceScheduled } from '@/services/notifications';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

const CATEGORIES = ['nudges', 'drills', 'supplies', 'medications', 'devices'] as const;

/**
 * Keeps reminder notifications (seasonal tips, supply expiry, refills,
 * device charging, drills) scheduled from the current plan (§17.4, §23).
 * The demo household never schedules real reminders.
 */
export function useReminders() {
  const snapshot = useSession((s) => s.snapshot);
  const risk = useConditions((s) => s.risk);

  useEffect(() => {
    if (!snapshot) return;
    const demo = snapshot.household.isDemo;
    const now = new Date();
    const groups = demo ? {} : nudgeNotes(computeNudges(snapshot, { now, scores: computeHazardScores(snapshot, risk?.value.factors ?? []), drills: snapshot.drills }), now);
    for (const c of CATEGORIES) {
      replaceScheduled(`nudge-${c}:`, c, (groups as Record<string, Parameters<typeof replaceScheduled>[2]>)[c] ?? []).catch(() => {});
    }
  }, [snapshot, risk]);
}
