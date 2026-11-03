import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import { HAZARDS, type Hazard, type HouseholdSnapshot } from '@/models/types';
import { FIXTURE_NOW, household } from '@/test-utils/household-builder';

import { conditionsKey, mergeOrders, rankHousehold, topTierAcrossHazards } from './engine';
import { memberFacts } from './rules';
import type { PriorityContext } from './types';

const WINTER_CTX: PriorityContext = { now: new Date('2026-10-24T19:42:00Z'), outdoorTempF: 24 };

const names = (snap: HouseholdSnapshot, hazard: Hazard, ctx: PriorityContext) =>
  rankHousehold(snap, hazard, ctx).order.map((s) => s.subjectId);

describe('§8.6 worked example (demo household, winter-storm outage, 24°F)', () => {
  const snap = buildDemoHousehold();
  const result = rankHousehold(snap, 'winter', WINTER_CTX);
  const byId = Object.fromEntries(result.order.map((s) => [s.subjectId, s]));

  it('ranks Grandma, Baby Jamie, Dad, Ben, Mom, Biscuit', () => {
    expect(result.order.map((s) => s.subjectId)).toEqual([
      DEMO_IDS.grandma,
      DEMO_IDS.jamie,
      DEMO_IDS.dad,
      DEMO_IDS.ben,
      DEMO_IDS.mom,
      DEMO_IDS.biscuit,
    ]);
  });

  it('assigns the spec tiers', () => {
    expect(result.order.map((s) => s.tier)).toEqual(['critical', 'critical', 'urgent', 'standard', 'standard', 'standard']);
  });

  it('fires the spec rules', () => {
    expect(byId[DEMO_IDS.grandma].ruleIds).toEqual(expect.arrayContaining(['OUT-C1', 'OUT-C3', 'WIN-I1']));
    expect(byId[DEMO_IDS.jamie].ruleIds).toEqual(expect.arrayContaining(['OUT-C3', 'OUT-U3']));
    expect(byId[DEMO_IDS.dad].ruleIds).toEqual(['OUT-U1']);
    expect(byId[DEMO_IDS.mom].ruleIds).toEqual(['OUT-S1']);
  });

  it('moves Dad into the Critical group at rank 3 when his insulin drops under 6 h (OUT-C2)', () => {
    const later = rankHousehold(snap, 'winter', {
      ...WINTER_CTX,
      outage: { active: true, medicationHoursLeft: { [DEMO_IDS.insulinPens]: 5 } },
    });
    const dad = later.order.find((s) => s.subjectId === DEMO_IDS.dad)!;
    expect(dad.tier).toBe('critical');
    expect(dad.rank).toBe(3);
    expect(dad.ruleIds).toContain('OUT-C2');
  });

  it('reports temperature as unknown when no weather is available', () => {
    const r = rankHousehold(snap, 'outage', { now: WINTER_CTX.now });
    expect(r.unknowns).toContain('temperature');
    // Without temperature, OUT-C3 can't fire; Grandma is still Critical via OUT-C1.
    expect(r.order[0].subjectId).toBe(DEMO_IDS.grandma);
    expect(r.order[0].tier).toBe('critical');
  });

  it('places Grandma #1 in an outage but lower in a fire (HH-02 example)', () => {
    const fire = rankHousehold(snap, 'fire', { now: new Date('2026-10-24T14:00:00') });
    const g = fire.order.find((s) => s.subjectId === DEMO_IDS.grandma)!;
    expect(g.tier).toBe('critical'); // home oxygen, FIR-C2
    const jamie = fire.order.find((s) => s.subjectId === DEMO_IDS.jamie)!;
    expect(jamie.tier).toBe('critical'); // infant, FIR-C1
  });
});

describe('§8.9 properties', () => {
  const snap = buildDemoHousehold();

  it('is deterministic: identical results across runs', () => {
    for (const h of HAZARDS) {
      const a = rankHousehold(snap, h, WINTER_CTX);
      const b = rankHousehold(structuredClone(snap), h, WINTER_CTX);
      expect(b.order).toEqual(a.order);
    }
  });

  it('never lets a pet outrank a human in the same tier, and never above Important', () => {
    const fx = household({
      people: [{ id: 'adult', age: 40 }],
      pets: [{ id: 'dog', specialNeeds: ['Heat-sensitive'] }],
      meds: [{ id: 'pm', owner: 'dog', ownerType: 'pet', fridge: true, critical: true }],
    });
    for (const h of HAZARDS) {
      const order = rankHousehold(fx, h, { now: FIXTURE_NOW, outdoorTempF: 10 }).order;
      for (const s of order.filter((x) => x.subjectType === 'pet')) {
        expect(['important', 'standard']).toContain(s.tier);
        const humansSameTier = order.filter((x) => x.subjectType === 'member' && x.tier === s.tier);
        humansSameTier.forEach((hu) => expect(hu.rank).toBeLessThan(s.rank));
      }
    }
  });

  it('adding a Critical condition never moves a subject down', () => {
    const base = household({ people: [{ id: 'a', age: 40 }, { id: 'b', age: 70 }, { id: 'c', age: 8 }] });
    const additions = ['oxygen-dependent', 'bedbound', 'mobility-wheelchair', 'cognitive-dementia'] as const;
    for (const h of HAZARDS) {
      for (const add of additions) {
        for (const target of ['a', 'b', 'c']) {
          const before = rankHousehold(base, h, { now: FIXTURE_NOW }).order.find((s) => s.subjectId === target)!;
          const changed = structuredClone(base);
          const m = changed.members.find((x) => x.id === target)!;
          m.conditions.push({ type: add, severity: 'severe' });
          const after = rankHousehold(changed, h, { now: FIXTURE_NOW }).order.find((s) => s.subjectId === target)!;
          expect(after.rank).toBeLessThanOrEqual(before.rank);
        }
      }
    }
  });

  it('keeps Critical subjects above everyone else unless a confirmed pin moves them', () => {
    for (const h of HAZARDS) {
      const order = rankHousehold(snap, h, WINTER_CTX).order;
      const lastCritical = Math.max(0, ...order.filter((s) => s.tier === 'critical').map((s) => s.rank));
      const firstOther = Math.min(99, ...order.filter((s) => s.tier !== 'critical').map((s) => s.rank));
      expect(lastCritical).toBeLessThan(firstOther);
    }
  });

  it('caps scores at 1000', () => {
    for (const h of HAZARDS) rankHousehold(snap, h, WINTER_CTX).order.forEach((s) => expect(s.score).toBeLessThanOrEqual(1000));
  });
});

describe('pins (§8.8)', () => {
  const fx = household({ people: [{ id: 'mom', age: 44 }, { id: 'dad', age: 46 }, { id: 'gma', age: 82, conditions: ['oxygen-dependent'] }], devices: [{ id: 'o2', member: 'gma', type: 'oxygen-concentrator', lifeSustaining: true, batteryMin: 240 }] });
  const ctx = { now: FIXTURE_NOW };
  const key = (id: string) => {
    const m = fx.members.find((x) => x.id === id)!;
    return conditionsKey(memberFacts(m, fx.devices, fx.medications, FIXTURE_NOW));
  };

  it('moves a subject within its tier', () => {
    const before = names(fx, 'outage', ctx);
    expect(before).toEqual(['gma', 'dad', 'mom']);
    const after = rankHousehold(fx, 'outage', ctx, [{ subjectId: 'mom', direction: 'up', conditionsKey: key('mom') }]);
    expect(after.order.map((s) => s.subjectId)).toEqual(['gma', 'mom', 'dad']);
    expect(after.order[1].pinned).toBe('up');
  });

  it('blocks moving Critical below non-Critical without confirmation', () => {
    const blocked = rankHousehold(fx, 'outage', ctx, [{ subjectId: 'gma', direction: 'down', conditionsKey: key('gma') }]);
    expect(blocked.order[0].subjectId).toBe('gma');
    const confirmed = rankHousehold(fx, 'outage', ctx, [
      { subjectId: 'gma', direction: 'down', confirmedCriticalDown: true, conditionsKey: key('gma') },
    ]);
    expect(confirmed.order[1].subjectId).toBe('gma');
  });

  it('ignores a pin after the subject’s conditions change', () => {
    const stale = rankHousehold(fx, 'outage', ctx, [{ subjectId: 'mom', direction: 'up', conditionsKey: 'old|' }]);
    expect(stale.order.map((s) => s.subjectId)).toEqual(['gma', 'dad', 'mom']);
  });
});

describe('mergeOrders (§25.4 two hazards at once)', () => {
  it('takes each subject’s highest tier across hazards', () => {
    const fx = household({ people: [{ id: 'kid', age: 8, canSwim: false }, { id: 'adult', age: 40 }] });
    const ctx = { now: FIXTURE_NOW, activeAlertEvents: ['Flash Flood Warning'] };
    const merged = mergeOrders([rankHousehold(fx, 'flood', ctx), rankHousehold(fx, 'outage', ctx)]);
    expect(merged[0].subjectId).toBe('kid');
    expect(merged[0].tier).toBe('urgent'); // FLD-U2 beats OUT-I1
    expect(merged.map((s) => s.rank)).toEqual([1, 2]);
  });
});

describe('topTierAcrossHazards (HH-01 ring)', () => {
  it('returns each subject’s highest tier over all hazards', () => {
    const tiers = topTierAcrossHazards(buildDemoHousehold(), { now: FIXTURE_NOW });
    expect(tiers.get(DEMO_IDS.grandma)).toBe('critical');
    expect(tiers.get(DEMO_IDS.jamie)).toBe('critical');
    expect(tiers.get(DEMO_IDS.biscuit)).toBe('important');
  });
});
