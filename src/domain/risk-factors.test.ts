import { buildDemoHousehold } from '@/data/demo-household';

import { computeHazardScores } from './risk';
import { floodZoneFactor, hazardExplanation, mergeWithCache, planAdjustments, gaugeFactor, hazmatFactor, hospitalFactor, outageFrequencyFactor, railFactor, streamFactor, userFactors } from './risk-factors';

const at = '2026-10-24T12:00:00Z';

describe('risk factors (§9.1–9.2, §9.5)', () => {
  it('flood zone levels and the unknown cases', () => {
    expect(floodZoneFactor({ zone: 'AE', subtype: null }, at)).toMatchObject({ level: 'high', value: 'High (Zone AE)' });
    expect(floodZoneFactor({ zone: 'X', subtype: '0.2 PCT ANNUAL CHANCE FLOOD HAZARD' }, at).level).toBe('moderate');
    expect(floodZoneFactor({ zone: 'X', subtype: 'AREA OF MINIMAL FLOOD HAZARD' }, at)).toMatchObject({ level: 'low', value: 'Minimal (Zone X)' });
    expect(floodZoneFactor({ zone: null, subtype: null }, at).level).toBe('unknown');
    expect(floodZoneFactor(null, at)).toMatchObject({ level: 'unknown', value: "Couldn't check yet", fetchedAt: null });
  });

  it('stream, rail and hazmat thresholds', () => {
    expect(streamFactor({ within500ft: 1, withinQuarterMile: 1 }, at).level).toBe('high');
    expect(streamFactor({ within500ft: 0, withinQuarterMile: 2 }, at).level).toBe('moderate');
    expect(streamFactor({ within500ft: 0, withinQuarterMile: 0 }, at).level).toBe('low');
    expect(railFactor({ withinHalfMile: 0, withinOneMile: 0 }, at)).toMatchObject({ level: 'low', value: 'No rail line within 1 mile' });
    expect(railFactor({ withinHalfMile: 0, withinOneMile: 1 }, at).level).toBe('moderate');
    expect(hazmatFactor({ withinHalfMile: 0, withinTwoMiles: 2 }, at)).toMatchObject({ level: 'moderate', value: '2 within 2 mi' });
  });

  it('failed lookups are never Low', () => {
    for (const f of [streamFactor(null, at), railFactor(null, at), hazmatFactor(null, at), gaugeFactor(undefined, at), hospitalFactor(null, at, true), outageFrequencyFactor()]) {
      expect(f.level).toBe('unknown');
    }
  });

  it('hospital: farther is riskier; outside Loudoun is not checked', () => {
    expect(hospitalFactor({ name: 'Inova Loudoun', distanceMi: 4.3 }, at, true)).toMatchObject({ level: 'low', value: 'Inova Loudoun, 4.3 mi' });
    expect(hospitalFactor({ name: 'Far', distanceMi: 20 }, at, true).level).toBe('high');
    expect(hospitalFactor(null, at, false).value).toBe('Not checked here');
  });

  it('feeds the §9.3 scores: the demo flood zone makes flood a top risk', () => {
    const demo = buildDemoHousehold();
    const factors = [floodZoneFactor({ zone: 'AE', subtype: null }, at), streamFactor({ within500ft: 1, withinQuarterMile: 1 }, at), ...userFactors(demo.household, at)];
    const scores = computeHazardScores(demo, factors);
    expect(scores.flood).toBe(100); // 25 + 45 + 20 + 10 basement
  });

  it('a failed lookup keeps the cached value with its old date', () => {
    const old = railFactor({ withinHalfMile: 0, withinOneMile: 1 }, '2026-09-01T00:00:00Z');
    const merged = mergeWithCache([railFactor(null, at), floodZoneFactor({ zone: 'X', subtype: 'AREA OF MINIMAL FLOOD HAZARD' }, at)], [old]);
    expect(merged[0].type).toBe('flood-zone');
    expect(merged[1]).toEqual(old);
    expect(mergeWithCache([railFactor(null, at)], undefined)[0].level).toBe('unknown');
  });

  it('explains each hazard in one plain line', () => {
    const demo = buildDemoHousehold();
    const f = [floodZoneFactor({ zone: 'AE', subtype: null }, at), streamFactor({ within500ft: 1, withinQuarterMile: 1 }, at)];
    expect(hazardExplanation('outage', f, demo)).toBe('Power outages are common in Northern Virginia, and your heat needs electricity and someone relies on a powered medical device.');
    expect(hazardExplanation('flood', f, demo)).toBe('Your home is in a FEMA flood zone and very close to a stream.');
    expect(hazardExplanation('fire', f, demo)).toMatch(/oxygen/);
  });

  it('plan adjustments only mention supplies the rules added', () => {
    expect(planAdjustments('flood', new Set(['sandbags']))).toEqual(['Home and your priority order start with flood.', 'Your supply list includes sandbags and a sump pump check.']);
    expect(planAdjustments('outage', new Set())).toHaveLength(1);
  });
});
