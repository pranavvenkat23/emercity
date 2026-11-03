import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import type { Drill } from '@/models/types';

import { drillResult, formatClock, formatDuration, recommendDrill } from './drills';
import type { RankedSubject } from './priority/types';

const now = new Date('2026-10-24T12:00:00Z');
const drill = (p: Partial<Drill>): Drill => ({
  id: 'd',
  householdId: 'h',
  createdAt: '',
  updatedAt: '',
  type: 'fire-escape',
  hazard: 'fire',
  startedAt: '2026-10-01T19:00:00Z',
  endedAt: '2026-10-01T19:03:40Z',
  arrivals: [],
  skippedStepIds: [],
  blockedStepIds: [],
  ...p,
});

describe('recommendDrill (§15.1)', () => {
  it('picks the top-risk drill when never practiced', () => {
    expect(recommendDrill([], 'flood', now).type).toBe('flood-move-up');
    expect(recommendDrill([], 'winter', now).type).toBe('outage');
  });
  it('then fire if 6 months have passed', () => {
    const r = recommendDrill([drill({ id: 'a', type: 'flood-move-up' })], 'flood', now);
    expect(r.type).toBe('fire-escape');
    const old = recommendDrill([drill({ id: 'a', type: 'flood-move-up' }), drill({ id: 'b', endedAt: '2026-01-01T00:00:00Z', startedAt: '2026-01-01T00:00:00Z' })], 'flood', now);
    expect(old.type).toBe('fire-escape');
    expect(old.reason).toMatch(/6 months/);
  });
  it('then an unpracticed type', () => {
    expect(recommendDrill([drill({ id: 'a', type: 'flood-move-up' }), drill({ id: 'b' })], 'flood', now).type).toBe('shelter-in-place');
  });
  it('ignores drills that never finished', () => {
    expect(recommendDrill([drill({ type: 'flood-move-up', endedAt: null })], 'flood', now).type).toBe('flood-move-up');
  });
});

describe('drillResult (§15.3)', () => {
  const demo = buildDemoHousehold();
  const order: RankedSubject[] = [DEMO_IDS.grandma, DEMO_IDS.jamie, DEMO_IDS.biscuit].map((id, i) => ({
    subjectType: id === DEMO_IDS.biscuit ? 'pet' : 'member',
    subjectId: id,
    rank: i + 1,
    tier: i === 0 ? 'critical' : 'urgent',
    score: 0,
    ruleIds: [],
    reasons: [],
    computedAt: '',
    pinned: null,
  }));

  it('compares to last time and flags a Critical subject arriving last and over-target fire drills', () => {
    const prev = drill({ id: 'p', startedAt: '2026-09-01T19:00:00Z', endedAt: '2026-09-01T19:04:18Z' });
    const cur = drill({
      id: 'c',
      arrivals: [
        { subjectType: 'member', subjectId: DEMO_IDS.jamie, elapsedMs: 60_000 },
        { subjectType: 'pet', subjectId: DEMO_IDS.biscuit, elapsedMs: 90_000 },
        { subjectType: 'member', subjectId: DEMO_IDS.grandma, elapsedMs: 175_000 },
      ],
    });
    const r = drillResult(cur, [prev, cur], order, demo);
    expect(r.totalMs).toBe(220_000);
    expect(r.deltaMs).toBe(-38_000);
    expect(r.tips.join(' ')).toMatch(/arrived last/);
    expect(r.tips.join(' ')).toMatch(/Over 3 min/);
  });

  it('lists who did not check in, never as unsafe', () => {
    const r = drillResult(drill({ arrivals: [], endedAt: '2026-10-01T19:01:00Z' }), [], order, demo);
    expect(r.deltaMs).toBeNull();
    expect(r.tips[0]).toMatch(/didn't check in/);
    expect(r.tips.join(' ')).not.toMatch(/unsafe/i);
  });

  it('formats times', () => {
    expect(formatDuration(220_000)).toBe('3 min 40 s');
    expect(formatDuration(38_000)).toBe('38 s');
    expect(formatClock(65_400)).toBe('01:05');
  });
});
