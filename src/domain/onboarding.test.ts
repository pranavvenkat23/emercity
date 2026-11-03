import type { Device, Member } from '@/models/types';

import { ageBand } from './members';
import {
  addressFromCensus,
  type CensusMatch,
  isLoudoun,
  newHousehold,
  applyHealthChips,
  chipsForMember,
  impliedItems,
  isLifeSustaining,
  newMemberFromChip,
  newPetFromChip,
  placeholderName,
  removesLifeSustaining,
  type HealthChipId,
} from './onboarding';

const NOW = new Date('2026-10-24T12:00:00Z');
const ids = (id: string) => ({ id, householdId: 'h1' });

describe('quick-add chips (§5.5)', () => {
  it('names placeholders like "Older adult 1"', () => {
    expect(placeholderName('Older adult (65+)', 1)).toBe('Older adult 1');
    expect(placeholderName('Dog', 2)).toBe('Dog 2');
  });

  it('creates members whose age band matches the chip', () => {
    expect(ageBand(newMemberFromChip('older-adult', 1, ids('a'), NOW), NOW)).toBe('older-adult');
    expect(ageBand(newMemberFromChip('baby', 1, ids('b'), NOW), NOW)).toBe('infant');
    expect(ageBand(newMemberFromChip('toddler', 1, ids('c'), NOW), NOW)).toBe('toddler');
    expect(ageBand(newMemberFromChip('teen', 1, ids('d'), NOW), NOW)).toBe('teen');
  });

  it('marks the pregnant chip with a pregnancy condition', () => {
    const m = newMemberFromChip('pregnant', 1, ids('p'), NOW);
    expect(m.conditions.map((c) => c.type)).toEqual(['pregnancy']);
  });

  it('creates pets with sensible carrier defaults', () => {
    expect(newPetFromChip('dog', 1, ids('d'), NOW).needsCarrier).toBe(true);
    expect(newPetFromChip('fish', 1, ids('f'), NOW).needsCarrier).toBe(false);
  });
});

function member(conditions: Member['conditions'] = []): Pick<Member, 'conditions'> {
  return { conditions };
}

describe('applyHealthChips (§5.6)', () => {
  it('maps chips to conditions', () => {
    const r = applyHealthChips(member(), [], new Set<HealthChipId>(['insulin', 'walker', 'hearing']), {});
    expect(r.conditions.map((c) => c.type).sort()).toEqual(['diabetes-insulin', 'hearing-loss', 'mobility-walker']);
    expect(r.addDevices).toEqual([]);
  });

  it('adds a life-sustaining concentrator for continuous oxygen', () => {
    const r = applyHealthChips(member(), [], new Set<HealthChipId>(['oxygen']), {
      oxygenUsage: 'continuous',
      oxygenSource: 'concentrator',
    });
    expect(r.addDevices).toHaveLength(1);
    expect(r.addDevices[0].type).toBe('oxygen-concentrator');
    expect(r.addDevices[0].lifeSustaining).toBe(true);
  });

  it('treats night-only oxygen as not life-sustaining, and tanks-only as needing no powered device', () => {
    const night = applyHealthChips(member(), [], new Set<HealthChipId>(['oxygen']), {
      oxygenUsage: 'night-or-activity',
      oxygenSource: 'concentrator',
    });
    expect(night.addDevices[0].lifeSustaining).toBe(false);
    const tanks = applyHealthChips(member(), [], new Set<HealthChipId>(['oxygen']), { oxygenSource: 'tanks' });
    expect(tanks.addDevices).toEqual([]);
  });

  it('defaults unknown oxygen usage to life-sustaining (conservative)', () => {
    const r = applyHealthChips(member(), [], new Set<HealthChipId>(['oxygen']), {});
    expect(r.addDevices[0].lifeSustaining).toBe(true);
  });

  it('records battery runtime from the follow-up, and "not sure" as no runtime', () => {
    const r = applyHealthChips(member(), [], new Set<HealthChipId>(['ventilator', 'feeding-pump']), {
      batteryMinutes: { ventilator: 120, 'feeding-pump': null },
    });
    const vent = r.addDevices.find((d) => d.type === 'home-ventilator')!;
    const pump = r.addDevices.find((d) => d.type === 'feeding-pump')!;
    expect(vent.batteryRuntimeMinutes).toBe(120);
    expect(vent.hasInternalBattery).toBe(true);
    expect(pump.batteryRuntimeMinutes).toBeNull();
    expect(pump.lifeSustaining).toBe(true);
  });

  it('removes a chip-created device when its chip is cleared, and keeps others', () => {
    const existing = [
      { id: 'd1', type: 'cpap-bipap' as const },
      { id: 'd2', type: 'nebulizer' as const },
    ];
    const r = applyHealthChips(member(), existing, new Set<HealthChipId>(), {});
    expect(r.removeDeviceIds).toEqual(['d1']);
  });

  it('keeps severity and notes of conditions that stay, and non-chip conditions', () => {
    const r = applyHealthChips(
      member([
        { type: 'heart-condition', severity: 'severe', notes: 'pacemaker' },
        { type: 'other', severity: 'mild', notes: 'x' },
      ]),
      [],
      new Set<HealthChipId>(['heart']),
      {},
    );
    expect(r.conditions).toEqual([
      { type: 'other', severity: 'mild', notes: 'x' },
      { type: 'heart-condition', severity: 'severe', notes: 'pacemaker' },
    ]);
  });

  it('round-trips chips through chipsForMember', () => {
    const selected = new Set<HealthChipId>(['insulin', 'cpap', 'dementia']);
    const r = applyHealthChips(member(), [], selected, {});
    const devices = r.addDevices.map((d) => ({ type: d.type }));
    expect(chipsForMember({ conditions: r.conditions }, devices)).toEqual(selected);
  });

  it('flags removal of life-sustaining chips for confirmation (HH-03)', () => {
    expect(removesLifeSustaining(new Set<HealthChipId>(['oxygen', 'insulin']), new Set<HealthChipId>(['insulin']))).toEqual(['oxygen']);
    expect(removesLifeSustaining(new Set<HealthChipId>(['insulin']), new Set<HealthChipId>())).toEqual([]);
  });
});

describe('isLifeSustaining (§4.2)', () => {
  it.each([
    ['home-ventilator', {}, true],
    ['home-dialysis', {}, true],
    ['cpap-bipap', {}, false],
    ['oxygen-concentrator', { oxygenContinuous: false }, false],
    ['feeding-pump', { soleNutrition: false }, false],
  ] as const)('%s %o to %s', (type, opts, expected) => {
    expect(isLifeSustaining(type, opts)).toBe(expected);
  });
});

describe('impliedItems (§5.8)', () => {
  const dev = (p: Partial<Device>): Device =>
    ({ id: 'd', memberId: 'm1', type: 'oxygen-concentrator', label: 'Oxygen concentrator', lifeSustaining: true, hasInternalBattery: true, batteryRuntimeMinutes: null, ...p }) as Device;

  it('lists devices missing runtime and insulin with no medication', () => {
    const items = impliedItems(
      [{ id: 'm1', conditions: [{ type: 'diabetes-insulin', severity: 'moderate' }], medicationIds: [] }],
      [dev({})],
      [],
    );
    expect(items.map((i) => [i.kind, i.complete])).toEqual([
      ['device', false],
      ['medication', false],
    ]);
  });

  it('marks items complete once details exist', () => {
    const items = impliedItems(
      [{ id: 'm1', conditions: [{ type: 'diabetes-insulin', severity: 'moderate' }], medicationIds: [] }],
      [dev({ batteryRuntimeMinutes: 240 })],
      [{ ownerId: 'm1', brandName: 'Humalog', genericName: 'insulin lispro' }],
    );
    expect(items.every((i) => i.complete)).toBe(true);
  });

  it('a device with no backup recorded is never complete', () => {
    const items = impliedItems([{ id: 'm1', conditions: [], medicationIds: [] }], [dev({ hasInternalBattery: false })], []);
    expect(items[0].complete).toBe(false);
    const spares = impliedItems([{ id: 'm1', conditions: [], medicationIds: [] }], [dev({ hasInternalBattery: false, backupBatteryCount: 2, backupRuntimeMinutes: 120 })], []);
    expect(spares[0].complete).toBe(true);
  });
});

describe('ONB-04 address and household', () => {
  const fixture = require('@/services/__fixtures__/census-geocode-loudoun-gov.json') as { result: { addressMatches: CensusMatch[] } };

  it('parses a Census geocoder match', () => {
    const a = addressFromCensus(fixture.result.addressMatches[0]);
    expect(a).toMatchObject({ line1: '1 Harrison St SE', city: 'Leesburg', state: 'VA', zip: '20175', county: 'Loudoun County' });
    expect(a.lat).toBeCloseTo(39.1139, 3);
    expect(a.lng).toBeCloseTo(-77.5616, 3);
    expect(isLoudoun(a.county)).toBe(true);
    expect(isLoudoun('Fairfax County')).toBe(false);
  });

  it('creates the household with the creator as owner', () => {
    const a = addressFromCensus(fixture.result.addressMatches[0]);
    const home = { homeType: 'apartment-high' as const, floorLevel: 6, hasBasement: false, heatingType: 'electric' as const, hasGenerator: false, generatorWatts: 3000, hasBatteryBackup: false };
    const h = newHousehold(a, home, { id: 'h1', ownerUserId: 'u1' }, new Date('2026-10-24T12:00:00Z'));
    expect(h.roles).toEqual({ u1: 'owner' });
    expect(h.floorLevel).toBe(6);
    expect(h.generatorWatts).toBeNull();
    expect(h.isDemo).toBe(false);
    expect(newHousehold(a, { ...home, homeType: 'single-family' }, { id: 'h2', ownerUserId: null }, new Date()).floorLevel).toBeNull();
  });
});
