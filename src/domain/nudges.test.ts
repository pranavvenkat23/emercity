import { buildDemoHousehold } from '@/data/demo-household';
import type { Hazard } from '@/models/types';

import { computeNudges } from './nudges';

const scores = (s: Partial<Record<Hazard, number>> = {}): Record<Hazard, number> => ({
  outage: 0,
  winter: 0,
  flood: 0,
  fire: 0,
  hazmat: 0,
  hurricane: 0,
  ...s,
});

describe('computeNudges (§17.4)', () => {
  const demo = buildDemoHousehold();

  it('mid-October with winter ≥ 40 nudges winter prep', () => {
    const n = computeNudges(demo, { now: new Date(2026, 9, 24), scores: scores({ winter: 65 }), drills: [] });
    expect(n.some((x) => x.type === 'season-winter')).toBe(true);
    expect(computeNudges(demo, { now: new Date(2026, 9, 24), scores: scores({ winter: 30 }), drills: [] }).some((x) => x.type === 'season-winter')).toBe(false);
  });

  it('early June nudges hurricane season for households with a life-sustaining device', () => {
    const n = computeNudges(demo, { now: new Date(2026, 5, 3), scores: scores(), drills: [] });
    expect(n.some((x) => x.type === 'season-hurricane')).toBe(true);
  });

  it('March and September nudge smoke and CO alarm tests', () => {
    expect(computeNudges(demo, { now: new Date(2026, 2, 10), scores: scores(), drills: [] }).some((x) => x.type === 'season-dst')).toBe(true);
    expect(computeNudges(demo, { now: new Date(2026, 3, 10), scores: scores(), drills: [] }).some((x) => x.type === 'season-dst')).toBe(false);
  });

  it('nudges a fire drill when none happened in 6 months', () => {
    expect(computeNudges(demo, { now: new Date(2026, 9, 24), scores: scores(), drills: [] }).some((x) => x.type === 'drill')).toBe(true);
    expect(computeNudges(demo, { now: new Date(2026, 9, 24), scores: scores(), drills: [{ endedAt: '2026-08-01T00:00:00Z' }] }).some((x) => x.type === 'drill')).toBe(false);
  });

  it('reminds to refill 5 days before the refill date, as Urgent for critical meds', () => {
    // Demo refill date 2026-11-05 to reminder from 2026-10-31.
    expect(computeNudges(demo, { now: new Date(2026, 9, 30), scores: scores(), drills: [] }).some((x) => x.type === 'refill')).toBe(false);
    const n = computeNudges(demo, { now: new Date(2026, 9, 31), scores: scores(), drills: [] }).find((x) => x.type === 'refill');
    expect(n?.tier).toBe('urgent');
    expect(n?.text).toMatch(/^Refill Dad's insulin lispro by Nov 5$/);
  });

  it('warns 30 days before a supply expires', () => {
    const snap = buildDemoHousehold();
    snap.supplies = [
      { id: 'f', householdId: 'h', createdAt: '', updatedAt: '', category: 'baby', name: 'Formula', quantityNeeded: 1, quantityHave: 1, unit: 'can', location: 'go-bag', isTemplateItem: true, expirationDate: '2026-11-20', linkedMemberId: snap.members[3].id },
    ];
    const n = computeNudges(snap, { now: new Date(2026, 9, 24), scores: scores(), drills: [] }).find((x) => x.type === 'supply-expiry');
    expect(n?.text).toBe("Baby Jamie's Formula expires Nov 20");
  });

  it('keeps names and medicines out of notification copy (§22.4)', () => {
    const all = computeNudges(demo, { now: new Date(2026, 10, 2), scores: scores({ winter: 90 }), drills: [] });
    for (const n of all) expect(n.notification.body).not.toMatch(/Grandma|Dad|Jamie|insulin|oxygen/i);
  });

  it('nudges monthly battery charging, Urgent for life-sustaining devices', () => {
    const n = computeNudges(demo, { now: new Date(2026, 9, 24), scores: scores(), drills: [] }).find((x) => x.type === 'device-charge');
    expect(n?.tier).toBe('urgent');
  });
});

describe('nudgeNotes (§23)', () => {
  it('groups by category at 9 AM on the due day; overdue fires tomorrow', () => {
    const { nudgeNotes } = require('./nudges') as typeof import('./nudges');
    const now = new Date(2026, 9, 24, 14, 0);
    const mk = (id: string, type: import('./nudges').NudgeType, due: string) =>
      ({ id, type, due, tier: 'standard', text: '', target: 'supplies', notification: { body: `b-${id}`, url: 'emercity://plan', priority: 'low' } }) as import('./nudges').Nudge;
    const g = nudgeNotes([mk('a', 'supply-expiry', '2026-11-01'), mk('b', 'refill', '2026-10-20'), mk('c', 'season-winter', '2026-11-05')], now);
    expect(new Date(g.supplies[0].at)).toEqual(new Date(2026, 10, 1, 9, 0));
    expect(new Date(g.medications[0].at)).toEqual(new Date(2026, 9, 25, 9, 0));
    expect(g.nudges).toHaveLength(1);
    expect(g.supplies[0].body).toBe('b-a');
  });
});
