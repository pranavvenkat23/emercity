import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import type { Task } from '@/models/types';

import type { RankedSubject } from './priority/types';
import { capableHelpers, roleWarnings } from './roles';

const now = new Date('2026-10-24T12:00:00');
const demo = buildDemoHousehold();
const ranked = (id: string, tier: RankedSubject['tier']): RankedSubject => ({ subjectType: 'member', subjectId: id, rank: 1, tier, score: 0, ruleIds: [], reasons: [], computedAt: '', pinned: null });
const task = (subjectId: string, helper: string): Task => ({ id: subjectId, householdId: 'h', createdAt: '', updatedAt: '', hazard: 'fire', assignedMemberId: helper, title: subjectId, order: 0, linkedSubjectType: 'member', linkedSubjectId: subjectId, tier: 'critical' });

describe('roles (§15.4)', () => {
  it('helpers are adults and teens who do not need help themselves', () => {
    const ids = capableHelpers(demo, now).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining([DEMO_IDS.mom, DEMO_IDS.dad]));
    expect(ids).not.toContain(DEMO_IDS.jamie);
    expect(ids).not.toContain(DEMO_IDS.grandma);
  });

  it('warns when one person helps two Critical subjects', () => {
    const order = [ranked(DEMO_IDS.grandma, 'critical'), ranked(DEMO_IDS.jamie, 'critical')];
    const w = roleWarnings([task(DEMO_IDS.grandma, DEMO_IDS.mom), task(DEMO_IDS.jamie, DEMO_IDS.mom)], 'fire', order, demo);
    expect(w).toEqual(["Mom can't help Grandma and Baby Jamie at the same time."]);
    expect(roleWarnings([task(DEMO_IDS.grandma, DEMO_IDS.mom), task(DEMO_IDS.jamie, DEMO_IDS.dad)], 'fire', order, demo)).toEqual([]);
  });

  it('only counts Critical subjects', () => {
    const order = [ranked(DEMO_IDS.grandma, 'critical'), ranked(DEMO_IDS.jamie, 'urgent')];
    expect(roleWarnings([task(DEMO_IDS.grandma, DEMO_IDS.mom), task(DEMO_IDS.jamie, DEMO_IDS.mom)], 'fire', order, demo)).toEqual([]);
  });
});
