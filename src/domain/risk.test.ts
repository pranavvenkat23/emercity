import { buildDemoHousehold } from '@/data/demo-household';
import type { RiskFactor } from '@/models/types';

import {
  computeHazardScores,
  floodZoneLevel,
  hazmatLevel,
  hospitalLevel,
  outageLevel,
  railLevel,
  rankedHazards,
  streamLevel,
  topRiskHazard,
} from './risk';

const factor = (type: string, level: RiskFactor['level'], value = ''): RiskFactor => ({
  type,
  level,
  value,
  source: 'test',
  fetchedAt: null,
  explanation: '',
  provenance: 'national',
});

describe('§9.2 factor levels', () => {
  it.each([
    ['AE', null, 'high'],
    ['A', null, 'high'],
    ['AO', null, 'high'],
    ['VE', null, 'high'],
    ['X', '0.2 PCT ANNUAL CHANCE FLOOD HAZARD', 'moderate'],
    ['X', 'AREA OF MINIMAL FLOOD HAZARD', 'low'],
    ['D', null, 'unknown'],
    [null, null, 'unknown'],
  ] as const)('flood zone %s / %s to %s', (z, sub, lvl) => expect(floodZoneLevel(z, sub)).toBe(lvl));

  it('stream distance thresholds: <500 ft high, ≤0.25 mi moderate', () => {
    expect(streamLevel(499)).toBe('high');
    expect(streamLevel(500)).toBe('moderate');
    expect(streamLevel(1320)).toBe('moderate');
    expect(streamLevel(1321)).toBe('low');
    expect(streamLevel(null)).toBe('unknown');
  });

  it('rail, hazmat and hospital thresholds', () => {
    expect([railLevel(0.4), railLevel(0.8), railLevel(1.5)]).toEqual(['high', 'moderate', 'low']);
    expect([hazmatLevel(0.4), hazmatLevel(1.5), hazmatLevel(3)]).toEqual(['high', 'moderate', 'low']);
    expect([hospitalLevel(20), hospitalLevel(10), hospitalLevel(2)]).toEqual(['high', 'moderate', 'low']);
    expect(hospitalLevel(undefined)).toBe('unknown');
  });

  it('outage quartiles', () => {
    expect([outageLevel(80), outageLevel(50), outageLevel(10), outageLevel(null)]).toEqual(['high', 'moderate', 'low', 'unknown']);
  });
});

describe('§9.3 hazard scores', () => {
  const demo = buildDemoHousehold();

  it('demo household with no address data: outage is the top risk', () => {
    const scores = computeHazardScores(demo, []);
    // Outage: 50 + gas heat needs power 10 + life-sustaining 10 = 70
    expect(scores.outage).toBe(70);
    // Winter: 50 + 15 = 65
    expect(scores.winter).toBe(65);
    // Flood: 25 + basement 10 = 35
    expect(scores.flood).toBe(35);
    // Fire: 30 + oxygen 20 + walker 10 + no smoke alarm confirmed 20 = 80
    expect(scores.fire).toBe(80);
    expect(scores.hazmat).toBe(10);
    // Hurricane: 25 + 35×0.4 + 70×0.3 = 60
    expect(scores.hurricane).toBe(60);
    expect(topRiskHazard(scores)).toBe('fire');
  });

  it('flood risk adds zone and stream factors', () => {
    const scores = computeHazardScores(demo, [factor('flood-zone', 'high'), factor('stream-distance', 'high')]);
    expect(scores.flood).toBe(100); // 25 + 45 + 20 + 10
  });

  it('outage frequency High adds 30 to outage and 10 to winter', () => {
    const scores = computeHazardScores(demo, [factor('outage-frequency', 'high')]);
    expect(scores.outage).toBe(100);
    expect(scores.winter).toBe(75);
  });

  it('hazmat adds rail, facility, and highway under 0.5 mi', () => {
    const scores = computeHazardScores(demo, [factor('rail', 'high'), factor('hazmat-facility', 'moderate'), factor('highway', 'low', '0.3 mi')]);
    expect(scores.hazmat).toBe(65);
  });

  it('ranks hazards highest first with tab-order ties', () => {
    expect(rankedHazards({ outage: 50, winter: 50, flood: 90, fire: 10, hazmat: 10, hurricane: 10 }).slice(0, 3)).toEqual([
      'flood',
      'outage',
      'winter',
    ]);
  });
});
