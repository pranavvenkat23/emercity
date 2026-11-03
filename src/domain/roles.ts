import type { Hazard, HouseholdSnapshot, Member, Task } from '@/models/types';

import { ageBand, displayName, needsHelpEvacuating } from './members';
import type { RankedSubject } from './priority/types';

/**
 * Members who can be a helper (§15.4): adults and teens who don't need help
 * evacuating themselves.
 */
export function capableHelpers(snap: Pick<HouseholdSnapshot, 'members'>, now: Date): Member[] {
  return snap.members.filter((m) => !m.archived && ['teen', 'adult', 'older-adult'].includes(ageBand(m, now)) && !needsHelpEvacuating(m, now));
}

/** The helper task for a subject in a hazard, if any. */
export function helperTask(tasks: Task[], hazard: Hazard, subjectId: string): Task | undefined {
  return tasks.find((t) => t.hazard === hazard && t.linkedSubjectId === subjectId);
}

/**
 * Warns when one person helps two Critical subjects in the same hazard
 * ("Mom can't carry Jamie and help Grandma at the same time", §15.4).
 */
export function roleWarnings(tasks: Task[], hazard: Hazard, order: RankedSubject[], snap: Pick<HouseholdSnapshot, 'members' | 'pets'>): string[] {
  const name = (id: string) => {
    const m = snap.members.find((x) => x.id === id);
    return m ? displayName(m) : snap.pets.find((p) => p.id === id)?.name ?? 'someone';
  };
  const critical = order.filter((o) => o.tier === 'critical').map((o) => o.subjectId);
  const byHelper = new Map<string, string[]>();
  for (const id of critical) {
    const helper = helperTask(tasks, hazard, id)?.assignedMemberId;
    if (helper) byHelper.set(helper, [...(byHelper.get(helper) ?? []), id]);
  }
  const out: string[] = [];
  for (const [helper, subjects] of byHelper) {
    if (subjects.length < 2) continue;
    const names = subjects.map(name);
    out.push(`${name(helper)} can't help ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} at the same time.`);
  }
  return out;
}
