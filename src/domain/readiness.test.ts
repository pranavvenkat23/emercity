import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import type { HouseholdSnapshot, SupplyItem } from '@/models/types';
import { FIXTURE_NOW, household } from '@/test-utils/household-builder';

import { computeReadiness, type ReadinessContext } from './readiness';

const ctx: ReadinessContext = { now: FIXTURE_NOW, drills: [], notificationsEnabled: false, offlinePackageDate: null };

function supply(p: Partial<SupplyItem>): SupplyItem {
  return {
    id: p.id ?? 's',
    householdId: 'hh',
    createdAt: '',
    updatedAt: '',
    category: 'medical',
    name: 'Item',
    quantityNeeded: 1,
    quantityHave: 1,
    unit: 'each',
    location: 'home-kit',
    isTemplateItem: true,
    ...p,
  };
}

function complete(snap: HouseholdSnapshot): HouseholdSnapshot {
  const s = structuredClone(snap);
  s.contacts = [
    { id: 'c1', householdId: 'hh', createdAt: '', updatedAt: '', name: 'A', phone: '1', type: 'emergency', isOutOfArea: false },
    { id: 'c2', householdId: 'hh', createdAt: '', updatedAt: '', name: 'B', phone: '2', type: 'out-of-area', isOutOfArea: true },
    { id: 'c3', householdId: 'hh', createdAt: '', updatedAt: '', name: 'Dr', phone: '3', type: 'doctor', isOutOfArea: false },
  ];
  s.meetingPoints = [
    { id: 'm1', householdId: 'hh', createdAt: '', updatedAt: '', type: 'near-home', name: 'Mailbox', lat: null, lng: null },
    { id: 'm2', householdId: 'hh', createdAt: '', updatedAt: '', type: 'neighborhood', name: 'Library', lat: null, lng: null },
  ];
  s.supplies = [supply({ id: 'water', name: 'Water' }), supply({ id: 'cooler', name: 'Cooler and ice packs' })];
  s.members = s.members.map((m) => ({ ...m, linkedUserId: m.role === 'adult' || m.role === 'older-adult' ? `u-${m.id}` : null }));
  return s;
}

const fullCtx: ReadinessContext = {
  now: FIXTURE_NOW,
  drills: [{ endedAt: '2026-09-01T00:00:00Z' }],
  notificationsEnabled: true,
  offlinePackageDate: '2026-10-20T00:00:00Z',
};

describe('computeReadiness (§6.4)', () => {
  it('caps the demo household at ≤ 69 because Grandma has no oxygen backup listed', () => {
    const r = computeReadiness(buildDemoHousehold(), ctx);
    expect(r.criticalGap).toBe(true);
    expect(r.score).toBeLessThanOrEqual(69);
    expect(r.steps[0]).toMatchObject({ tier: 'critical', target: 'device', targetId: DEMO_IDS.concentrator });
    expect(r.steps[0].text).toMatch(/Grandma's oxygen concentrator backup/);
  });

  it('suggests a cooler for insulin as an Urgent step', () => {
    const r = computeReadiness(buildDemoHousehold(), ctx);
    expect(r.steps.find((s) => /cooler/.test(s.text))?.tier).toBe('urgent');
  });

  it('reaches 100 when every category is complete', () => {
    const fx = complete(
      household({
        people: [{ id: 'a', name: 'Ann', age: 40 }, { id: 'b', name: 'Ben', age: 42 }],
        meds: [{ id: 'm', owner: 'a', critical: true, daysOfSupply: 30 }],
      }),
    );
    const r = computeReadiness(fx, fullCtx);
    expect(r.criticalGap).toBe(false);
    expect(r.score).toBe(100);
    expect(r.steps).toEqual([]);
  });

  it('a Critical gap caps an otherwise-complete household at 69', () => {
    const fx = complete(
      household({
        people: [{ id: 'a', name: 'Ann', age: 40 }],
        devices: [{ id: 'v', member: 'a', type: 'home-ventilator', lifeSustaining: true, batteryMin: 120 }],
      }),
    );
    const r = computeReadiness(fx, fullCtx);
    expect(r.rawScore).toBeGreaterThan(69);
    expect(r.score).toBe(69);
  });

  it('counts a device as covered once a spare battery or other backup is listed', () => {
    const fx = household({
      people: [{ id: 'a', name: 'Ann', age: 40 }],
      devices: [{ id: 'v', member: 'a', type: 'home-ventilator', lifeSustaining: true, batteryMin: 120, spares: 1, spareMin: 120 }],
    });
    expect(computeReadiness(fx, ctx).criticalGap).toBe(false);
  });

  it('treats unknown days of supply for a critical med as a gap', () => {
    const fx = household({ people: [{ id: 'a', name: 'Ann', age: 40 }], meds: [{ id: 'm', owner: 'a', critical: true, daysOfSupply: null }] });
    const r = computeReadiness(fx, ctx);
    expect(r.criticalGap).toBe(true);
  });

  it('counts expired supplies as not ready', () => {
    const fx = household({ people: [{ id: 'a', name: 'Ann', age: 40 }] });
    fx.supplies = [supply({ id: 'w', expirationDate: '2026-01-01' }), supply({ id: 'x' })];
    const supplies = computeReadiness(fx, ctx).categories.find((c) => c.id === 'supplies')!;
    expect(supplies.points).toBe(10);
  });

  it('halves meeting-point credit when the path has stairs and someone needs help evacuating', () => {
    const fx = household({ people: [{ id: 'a', name: 'Ann', age: 70, conditions: ['mobility-walker'] }] });
    fx.meetingPoints = [
      { id: 'm1', householdId: 'hh', createdAt: '', updatedAt: '', type: 'near-home', name: 'Hill', lat: null, lng: null, pathHasStairsOrSlopes: true },
    ];
    const meeting = computeReadiness(fx, ctx).categories.find((c) => c.id === 'meeting')!;
    expect(meeting.points).toBe(2.5);
  });

  it('flags placeholder names as an incomplete profile', () => {
    const fx = household({ people: [{ id: 'a', name: 'Older adult 1', age: 70 }, { id: 'b', name: 'Ann', age: 40 }] });
    const profile = computeReadiness(fx, ctx).categories.find((c) => c.id === 'profile')!;
    expect(profile.points).toBe(5);
  });

  it('weights sum to 100', () => {
    const r = computeReadiness(buildDemoHousehold(), ctx);
    expect(r.categories.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });
});
