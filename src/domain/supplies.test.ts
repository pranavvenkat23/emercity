import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import type { Hazard, SupplyItem } from '@/models/types';
import { FIXTURE_NOW, household } from '@/test-utils/household-builder';

import { expiryState, generateSupplies, mergeSupplies } from './supplies';

const scores = (s: Partial<Record<Hazard, number>> = {}): Record<Hazard, number> => ({ outage: 50, winter: 50, flood: 25, fire: 30, hazmat: 10, hurricane: 25, ...s });

describe('generateSupplies (§17.2)', () => {
  const demo = buildDemoHousehold();
  const list = generateSupplies(demo, scores({ winter: 65, outage: 70 }), FIXTURE_NOW);
  const find = (id: string) => list.find((x) => x.templateRuleId === id);

  it('water: 1 gal per person per day, 7 days home and 3 go-bag', () => {
    expect(find('water:home')?.quantityNeeded).toBe(35);
    expect(find('water:bag')?.quantityNeeded).toBe(15);
  });

  it('adds Critical formula and diapers for the formula-fed baby', () => {
    expect(find(`formula-${DEMO_IDS.jamie}:home`)?.tier).toBe('critical');
    expect(find(`diapers-${DEMO_IDS.jamie}:bag`)?.quantityNeeded).toBe(24);
  });

  it('adds a Critical cooler for insulin and backup kit for the oxygen concentrator', () => {
    expect(find('cooler')?.tier).toBe('critical');
    expect(find(`device-${DEMO_IDS.concentrator}`)?.tier).toBe('critical');
  });

  it('adds critical medicine supply and a pet set', () => {
    expect(find(`med-${DEMO_IDS.insulinPens}:home`)?.quantityNeeded).toBe(7);
    expect(find(`pet-kit-${DEMO_IDS.biscuit}`)?.name).toMatch(/^Biscuit: carrier, leash/);
  });

  it('adds winter and basement items by risk', () => {
    expect(find('ice-melt')).toBeTruthy();
    expect(find('sandbags')).toBeTruthy();
    expect(generateSupplies(household({ people: [{ id: 'a', age: 30 }] }), scores({ winter: 10 }), FIXTURE_NOW).some((x) => x.templateRuleId === 'ice-melt')).toBe(false);
  });

  it('every item has a reason', () => {
    for (const x of list) expect(x.why.length).toBeGreaterThan(0);
  });
});

describe('mergeSupplies', () => {
  const ids = (() => {
    let n = 0;
    return () => `s${++n}`;
  })();
  const base = (p: Partial<SupplyItem>): SupplyItem => ({ id: 'x', householdId: 'h', createdAt: '', updatedAt: '', category: 'water', name: 'n', quantityNeeded: 1, quantityHave: 0, unit: 'u', location: 'home-kit', isTemplateItem: true, ...p });

  it('keeps have-counts, removes items that no longer apply, never removes manual items', () => {
    const existing = [
      base({ id: 'w', templateRuleId: 'water:home', quantityHave: 10, quantityNeeded: 14, name: 'Drinking water' }),
      base({ id: 'old', templateRuleId: 'ice-melt' }),
      base({ id: 'manual', isTemplateItem: false, templateRuleId: null, name: 'Grandma’s quilt' }),
    ];
    const generated = generateSupplies(household({ people: [{ id: 'a', age: 30 }, { id: 'b', age: 30 }, { id: 'c', age: 5 }] }), scores({ winter: 0 }), FIXTURE_NOW);
    const { upsert, remove } = mergeSupplies(existing, generated, ids, 'h', 'now');
    const water = upsert.find((u) => u.templateRuleId === 'water:home')!;
    expect(water.id).toBe('w');
    expect(water.quantityHave).toBe(10);
    expect(water.quantityNeeded).toBe(21);
    expect(remove).toEqual(['old']);
  });
});

describe('expiryState', () => {
  it('flags soon and expired', () => {
    const now = new Date('2026-10-24T12:00:00');
    expect(expiryState({ expirationDate: '2026-11-10' }, now)).toBe('soon');
    expect(expiryState({ expirationDate: '2026-10-01' }, now)).toBe('expired');
    expect(expiryState({ expirationDate: '2027-06-01' }, now)).toBe('ok');
    expect(expiryState({ expirationDate: null }, now)).toBeNull();
  });
});
