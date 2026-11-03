/**
 * §8.9 fixture households: expected orders per hazard, hand-derived from the
 * §8.4 rules and §8.5 scores. Every rule must fire in at least two fixtures.
 */
import type { Hazard, HouseholdSnapshot, Tier } from '@/models/types';
import { FIXTURE_NOW, household } from '@/test-utils/household-builder';

import { rankHousehold } from './engine';
import type { PriorityContext } from './types';

interface Fixture {
  name: string;
  snap: HouseholdSnapshot;
  hazard: Hazard;
  ctx?: Partial<PriorityContext>;
  expect: [string, Tier][];
}

const NIGHT = new Date('2026-10-24T23:30:00'); // local 11:30 PM

const FIXTURES: Fixture[] = [
  // ───── Outage ─────
  {
    name: '1. Ventilator user with short battery leads; no-needs adult last',
    snap: household({
      people: [{ id: 'vent', age: 55, conditions: ['ventilator'] }, { id: 'adult', age: 50 }],
      devices: [{ id: 'v', member: 'vent', type: 'home-ventilator', lifeSustaining: true, batteryMin: 90 }],
    }),
    hazard: 'outage',
    expect: [['vent', 'critical'], ['adult', 'standard']],
  },
  {
    name: '2. Two life-sustaining devices: shorter backup first',
    snap: household({
      people: [{ id: 'long', age: 60 }, { id: 'short', age: 60 }],
      devices: [
        { id: 'd1', member: 'long', type: 'home-dialysis', lifeSustaining: true, batteryMin: 600 },
        { id: 'd2', member: 'short', type: 'feeding-pump', lifeSustaining: true, batteryMin: 60 },
      ],
    }),
    hazard: 'outage',
    expect: [['short', 'critical'], ['long', 'critical']],
  },
  {
    name: '3. Refrigerated insulin under 6 h is Critical (OUT-C2), otherwise Urgent (OUT-U1)',
    snap: household({
      people: [{ id: 'low', age: 30 }, { id: 'ok', age: 30 }],
      meds: [
        { id: 'm1', owner: 'low', critical: true, fridge: true },
        { id: 'm2', owner: 'ok', critical: true, fridge: true },
      ],
    }),
    hazard: 'outage',
    ctx: { outage: { active: true, medicationHoursLeft: { m1: 3, m2: 20 } } },
    expect: [['low', 'critical'], ['ok', 'urgent']],
  },
  {
    name: '4. Freezing, electric heat, no generator: infant and older adult Critical (OUT-C3)',
    snap: household(
      { people: [{ id: 'baby', age: 0, months: 6 }, { id: 'gpa', age: 70 }, { id: 'mom', age: 35 }] },
      { heatingType: 'electric' },
    ),
    hazard: 'outage',
    ctx: { outdoorTempF: 20 },
    expect: [['baby', 'critical'], ['gpa', 'critical'], ['mom', 'standard']],
  },
  {
    name: '5. Freezing but generator on hand: OUT-C3 does not fire',
    snap: household({ people: [{ id: 'gpa', age: 70 }, { id: 'mom', age: 35 }] }, { heatingType: 'electric', hasGenerator: true }),
    hazard: 'outage',
    ctx: { outdoorTempF: 20 },
    expect: [['gpa', 'standard'], ['mom', 'standard']],
  },
  {
    name: '6. Wood heat: freezing does not trigger no-heat rules',
    snap: household({ people: [{ id: 'gma', age: 80 }] }, { heatingType: 'wood' }),
    hazard: 'outage',
    ctx: { outdoorTempF: 15 },
    expect: [['gma', 'standard']],
  },
  {
    name: '7. Heat index 100°F: pregnant and temperature-sensitive Critical (OUT-C4)',
    snap: household({
      people: [{ id: 'preg', age: 30, conditions: ['pregnancy'] }, { id: 'ms', age: 45, conditions: ['temperature-sensitive'] }, { id: 'dad', age: 40 }],
    }),
    hazard: 'outage',
    ctx: { heatIndexF: 100 },
    expect: [['preg', 'critical'], ['ms', 'critical'], ['dad', 'standard']],
  },
  {
    name: '8. CPAP and power wheelchair users are Urgent (OUT-U2)',
    snap: household({
      people: [{ id: 'cpap', age: 50 }, { id: 'chair', age: 40, conditions: ['mobility-wheelchair'] }, { id: 'x', age: 40 }],
      devices: [
        { id: 'c', member: 'cpap', type: 'cpap-bipap' },
        { id: 'w', member: 'chair', type: 'power-wheelchair' },
      ],
    }),
    hazard: 'outage',
    expect: [['chair', 'urgent'], ['cpap', 'urgent'], ['x', 'standard']],
  },
  {
    name: '9. Formula-fed infant with 1 day ready-to-feed is Urgent (OUT-U3); 5 days is Important only',
    snap: household({
      people: [
        { id: 'low', age: 0, months: 5, conditions: ['infant-formula'], readyToFeedFormulaDays: 1 },
        { id: 'ok', age: 0, months: 5, conditions: ['infant-formula'], readyToFeedFormulaDays: 5 },
      ],
    }),
    hazard: 'outage',
    expect: [['low', 'urgent'], ['ok', 'important']],
  },
  {
    name: '10. 40°F, gas heat: infant and older adult Urgent (OUT-U4)',
    snap: household({ people: [{ id: 'gma', age: 75 }, { id: 'baby', age: 0, months: 10 }, { id: 'teen', age: 15 }] }),
    hazard: 'outage',
    ctx: { outdoorTempF: 40 },
    expect: [['baby', 'urgent'], ['gma', 'urgent'], ['teen', 'standard']],
  },
  {
    name: '11. Children and dementia are Important in darkness (OUT-I1); pets with fridge meds too (OUT-I2)',
    snap: household({
      people: [{ id: 'kid', age: 7 }, { id: 'pop', age: 60, conditions: ['cognitive-dementia'] }, { id: 'mom', age: 36 }],
      pets: [{ id: 'cat', species: 'cat' }],
      meds: [{ id: 'pm', owner: 'cat', ownerType: 'pet', fridge: true }],
    }),
    hazard: 'outage',
    expect: [['pop', 'important'], ['kid', 'important'], ['cat', 'important'], ['mom', 'standard']],
  },
  {
    name: '12. Heat-sensitive dog is Important (OUT-I2); plain dog Standard and after humans',
    snap: household({
      people: [{ id: 'adult', age: 30 }],
      pets: [{ id: 'pug', specialNeeds: ['Heat-sensitive'] }, { id: 'lab' }],
    }),
    hazard: 'outage',
    expect: [['pug', 'important'], ['adult', 'standard'], ['lab', 'standard']],
  },
  // ───── Winter ─────
  {
    name: '13. Center dialysis + Winter Storm Warning is Critical (WIN-C1)',
    snap: household({ people: [{ id: 'dia', age: 62, conditions: ['dialysis-center'] }, { id: 'spouse', age: 60 }] }),
    hazard: 'winter',
    ctx: { activeAlertEvents: ['Winter Storm Warning'] },
    expect: [['dia', 'critical'], ['spouse', 'standard']],
  },
  {
    name: '14. Ice Storm Warning + daily critical meds is Critical (WIN-C1); heart condition Urgent (WIN-U1)',
    snap: household({
      people: [{ id: 'crit', age: 50, conditions: ['critical-daily-meds'] }, { id: 'heart', age: 58, conditions: ['heart-condition'] }],
    }),
    hazard: 'winter',
    ctx: { activeAlertEvents: ['Ice Storm Warning'] },
    expect: [['crit', 'critical'], ['heart', 'urgent']],
  },
  {
    name: '15. COPD Urgent in winter (WIN-U1); walker Important (WIN-I1)',
    snap: household({
      people: [{ id: 'copd', age: 66, conditions: ['respiratory-copd'] }, { id: 'walk', age: 50, conditions: ['mobility-walker'] }, { id: 'x', age: 30 }],
    }),
    hazard: 'winter',
    expect: [['copd', 'urgent'], ['walk', 'important'], ['x', 'standard']],
  },
  {
    name: '16. Under 5 days of a critical med during a Winter Storm Watch is Urgent (WIN-U2)',
    snap: household({
      people: [{ id: 'low', age: 40 }, { id: 'ok', age: 40 }],
      meds: [
        { id: 'a', owner: 'low', critical: true, daysOfSupply: 3 },
        { id: 'b', owner: 'ok', critical: true, daysOfSupply: 20 },
      ],
    }),
    hazard: 'winter',
    ctx: { activeAlertEvents: ['Winter Storm Watch'] },
    expect: [['low', 'urgent'], ['ok', 'standard']],
  },
  {
    name: '17. Winter: wheelchair Important (WIN-I1); asthma Urgent (WIN-U1)',
    snap: household({
      people: [{ id: 'chair', age: 35, conditions: ['mobility-wheelchair'] }, { id: 'asthma', age: 12, conditions: ['respiratory-asthma'] }],
    }),
    hazard: 'winter',
    expect: [['asthma', 'urgent'], ['chair', 'important']],
  },
  // ───── Flood ─────
  {
    name: '18. Flash Flood Warning, high-risk zone: ground-floor wheelchair user Critical (FLD-C1)',
    snap: household({
      people: [{ id: 'chair', age: 70, conditions: ['mobility-wheelchair'], sleepsIn: 'ground-floor' }, { id: 'son', age: 40 }],
    }),
    hazard: 'flood',
    ctx: { activeAlertEvents: ['Flash Flood Warning'], floodZoneLevel: 'high', streamDistanceFt: 300 },
    expect: [['chair', 'critical'], ['son', 'standard']],
  },
  {
    name: '19. Flood Warning near a stream: ground-floor dementia patient Critical (FLD-C1)',
    snap: household({
      people: [{ id: 'dem', age: 80, conditions: ['cognitive-dementia'], sleepsIn: 'ground-floor' }, { id: 'kid', age: 9, canSwim: true }],
    }),
    hazard: 'flood',
    ctx: { activeAlertEvents: ['Flood Warning'], floodZoneLevel: 'low', streamDistanceFt: 200 },
    expect: [['dem', 'critical'], ['kid', 'standard']],
  },
  {
    name: '20. Basement sleeper during a Flash Flood Warning is Critical (FLD-C2)',
    snap: household({ people: [{ id: 'base', age: 22, sleepsIn: 'basement' }, { id: 'up', age: 50 }] }, { hasBasement: true }),
    hazard: 'flood',
    ctx: { activeAlertEvents: ['Flash Flood Warning'], floodZoneLevel: 'low', streamDistanceFt: 5000 },
    expect: [['base', 'critical'], ['up', 'standard']],
  },
  {
    name: '21. Basement sleeper with mobility needs fires FLD-C1 and FLD-C2',
    snap: household({ people: [{ id: 'gpa', age: 78, conditions: ['mobility-walker'], sleepsIn: 'basement' }, { id: 'kid', age: 5, canSwim: false }] }, { hasBasement: true }),
    hazard: 'flood',
    ctx: { activeAlertEvents: ['Flash Flood Warning'], floodZoneLevel: 'high', streamDistanceFt: 100 },
    expect: [['gpa', 'critical'], ['kid', 'urgent']],
  },
  {
    name: '22. Life-sustaining device in a flood zone is Critical even without an alert (FLD-C3)',
    snap: household({
      people: [{ id: 'o2', age: 68, conditions: ['oxygen-dependent'] }, { id: 'x', age: 40 }],
      devices: [{ id: 'c', member: 'o2', type: 'oxygen-concentrator', lifeSustaining: true, batteryMin: 300 }],
    }),
    hazard: 'flood',
    ctx: { floodZoneLevel: 'moderate', streamDistanceFt: 2000 },
    expect: [['o2', 'critical'], ['x', 'standard']],
  },
  {
    name: '23. Unknown flood zone counts as risky for FLD-C3 (never assume low)',
    snap: household({
      people: [{ id: 'vent', age: 30 }],
      devices: [{ id: 'v', member: 'vent', type: 'home-ventilator', lifeSustaining: true, batteryMin: 60 }],
    }),
    hazard: 'flood',
    expect: [['vent', 'critical']],
  },
  {
    name: '24. Flood: walker user Urgent (FLD-U1), non-swimmer child Urgent (FLD-U2), toddler Urgent (FLD-U3), pet Important (FLD-I2)',
    snap: household({
      people: [{ id: 'walk', age: 60, conditions: ['mobility-walker'] }, { id: 'kid', age: 6, canSwim: false }, { id: 'tod', age: 2 }, { id: 'mom', age: 33 }],
      pets: [{ id: 'dog' }],
    }),
    hazard: 'flood',
    ctx: { floodZoneLevel: 'low', streamDistanceFt: 3000 },
    // tod 290 (help +200, child +50, U +40) > walk 240 (help +200, U +40) > kid 90
    expect: [['tod', 'urgent'], ['walk', 'urgent'], ['kid', 'urgent'], ['dog', 'important'], ['mom', 'standard']],
  },
  {
    name: '25. Flood: older adult without mobility needs and pregnant person Important (FLD-I1); infant Urgent (FLD-U3)',
    snap: household({
      people: [{ id: 'gma', age: 72 }, { id: 'preg', age: 29, conditions: ['pregnancy'] }, { id: 'baby', age: 0, months: 3 }],
      pets: [{ id: 'cat', species: 'cat' }],
    }),
    hazard: 'flood',
    ctx: { floodZoneLevel: 'low', streamDistanceFt: 3000 },
    expect: [['baby', 'urgent'], ['gma', 'important'], ['preg', 'important'], ['cat', 'important']],
  },
  // ───── Fire ─────
  {
    name: '26. Fire: bedbound, infant and oxygen user Critical (FIR-C1, FIR-C2)',
    snap: household({
      people: [{ id: 'bed', age: 85, conditions: ['bedbound'] }, { id: 'baby', age: 0, months: 9 }, { id: 'o2', age: 66, conditions: ['oxygen-dependent'] }, { id: 'adult', age: 40 }],
    }),
    hazard: 'fire',
    // baby 430 (help +200, infant +180, child +50) > bed 390 (help +200, 80+ +150, FIR-U2 +40) > o2
    expect: [['baby', 'critical'], ['bed', 'critical'], ['o2', 'critical'], ['adult', 'standard']],
  },
  {
    name: '27. Fire at night: Deaf teen Critical (FIR-C3); autistic child Critical (FIR-C4)',
    snap: household({
      people: [{ id: 'deaf', age: 16, conditions: ['hearing-loss'] }, { id: 'aut', age: 10, conditions: ['cognitive-autism'] }, { id: 'dad', age: 45 }],
    }),
    hazard: 'fire',
    ctx: { now: NIGHT },
    expect: [['aut', 'critical'], ['deaf', 'critical'], ['dad', 'standard']],
  },
  {
    name: '28. Fire by day: Deaf member not Critical; dementia Critical (FIR-C4); toddler Critical (FIR-C1)',
    snap: household({
      people: [{ id: 'deaf', age: 40, conditions: ['hearing-loss'] }, { id: 'dem', age: 77, conditions: ['cognitive-dementia'] }, { id: 'tod', age: 2 }],
    }),
    hazard: 'fire',
    expect: [['dem', 'critical'], ['tod', 'critical'], ['deaf', 'standard']],
  },
  {
    name: '29. Fire: child Urgent (FIR-U1), older adult and low vision Urgent (FIR-U2), asthma Urgent (FIR-U3), dog Important (FIR-I1)',
    snap: household({
      people: [{ id: 'kid', age: 9 }, { id: 'gpa', age: 70 }, { id: 'blind', age: 50, conditions: ['vision-loss'] }, { id: 'asth', age: 30, conditions: ['respiratory-asthma'] }],
      pets: [{ id: 'dog' }],
    }),
    hazard: 'fire',
    // asth and blind tie at 40; tie-break puts the older adult first
    expect: [['gpa', 'urgent'], ['kid', 'urgent'], ['blind', 'urgent'], ['asth', 'urgent'], ['dog', 'important']],
  },
  {
    name: '30. Fire: walker and pregnancy Urgent (FIR-U2); two pets Important after humans (FIR-I1)',
    snap: household({
      people: [{ id: 'walk', age: 55, conditions: ['mobility-walker'] }, { id: 'preg', age: 31, conditions: ['pregnancy'] }],
      pets: [{ id: 'cat', species: 'cat' }, { id: 'bird', species: 'bird' }],
    }),
    hazard: 'fire',
    expect: [['walk', 'urgent'], ['preg', 'urgent'], ['bird', 'important'], ['cat', 'important']],
  },
  // ───── Hazmat ─────
  {
    name: '31. Hazmat: severe COPD and oxygen Critical (HAZ-C1); older adult Urgent (HAZ-U1); heart Urgent (HAZ-U2)',
    snap: household({
      people: [
        { id: 'copd', age: 60, conditions: [{ type: 'respiratory-copd', severity: 'severe' }] },
        { id: 'o2', age: 50, conditions: ['oxygen-dependent'] },
        { id: 'gma', age: 81 },
        { id: 'heart', age: 52, conditions: ['heart-condition'] },
      ],
    }),
    hazard: 'hazmat',
    expect: [['copd', 'critical'], ['o2', 'critical'], ['gma', 'urgent'], ['heart', 'urgent']],
  },
  {
    name: '32. Hazmat evacuation ordered: wheelchair user Critical (HAZ-C2); mild asthma not Critical',
    snap: household({
      people: [{ id: 'chair', age: 45, conditions: ['mobility-wheelchair'] }, { id: 'asth', age: 20, conditions: [{ type: 'respiratory-asthma', severity: 'mild' }] }],
    }),
    hazard: 'hazmat',
    ctx: { evacuationOrdered: true },
    expect: [['chair', 'critical'], ['asth', 'standard']],
  },
  {
    name: '33. Hazmat: dementia + evacuation (HAZ-C2); away member Important (HAZ-I1); pregnant Urgent (HAZ-U1); outdoor pet Important (HAZ-I2)',
    snap: household({
      people: [{ id: 'dem', age: 60, conditions: ['cognitive-dementia'] }, { id: 'away', age: 40 }, { id: 'preg', age: 28, conditions: ['pregnancy'] }],
      pets: [{ id: 'dog' }],
    }),
    hazard: 'hazmat',
    ctx: { evacuationOrdered: true, awayMemberIds: ['away'], outdoorPetIds: ['dog'] },
    expect: [['dem', 'critical'], ['preg', 'urgent'], ['away', 'important'], ['dog', 'important']],
  },
  {
    name: '34. Hazmat: toddler Urgent (HAZ-U1); away teen Important (HAZ-I1); indoor cat Standard',
    snap: household({ people: [{ id: 'tod', age: 3 }, { id: 'teen', age: 14 }], pets: [{ id: 'cat', species: 'cat' }] }),
    hazard: 'hazmat',
    ctx: { awayMemberIds: ['teen'], outdoorPetIds: [] },
    expect: [['tod', 'urgent'], ['teen', 'important'], ['cat', 'standard']],
  },
  // ───── Hurricane ─────
  {
    name: '35. Mobile home + Tornado Warning: everyone Critical (HUR-C1)',
    snap: household({ people: [{ id: 'mom', age: 40 }, { id: 'kid', age: 8 }] }, { homeType: 'mobile-manufactured' }),
    hazard: 'hurricane',
    ctx: { activeAlertEvents: ['Tornado Warning'], floodZoneLevel: 'low', streamDistanceFt: 5000 },
    expect: [['kid', 'critical'], ['mom', 'critical']],
  },
  {
    name: '36. Mobile home + High Wind Warning (HUR-C1); window bedroom Important (HUR-I1)',
    snap: household(
      { people: [{ id: 'a', age: 30, sleepsNearLargeWindows: true }, { id: 'b', age: 30 }] },
      { homeType: 'mobile-manufactured' },
    ),
    hazard: 'hurricane',
    ctx: { activeAlertEvents: ['High Wind Warning'], floodZoneLevel: 'low', streamDistanceFt: 5000 },
    expect: [['a', 'critical'], ['b', 'critical']],
  },
  {
    name: '37. Hurricane: device backup under 72 h is Urgent (HUR-U1); large windows Important (HUR-I1)',
    snap: household({
      people: [{ id: 'cpap', age: 50 }, { id: 'win', age: 40, sleepsNearLargeWindows: true }, { id: 'x', age: 40 }],
      devices: [{ id: 'c', member: 'cpap', type: 'cpap-bipap', batteryMin: 480 }],
    }),
    hazard: 'hurricane',
    ctx: { floodZoneLevel: 'low', streamDistanceFt: 5000 },
    expect: [['cpap', 'urgent'], ['win', 'important'], ['x', 'standard']],
  },
  {
    name: '38. Hurricane: critical med with 2 days supply Urgent (HUR-U1); life-sustaining device Critical via FLD-C3/OUT-C1',
    snap: household({
      people: [{ id: 'med', age: 45 }, { id: 'vent', age: 45 }],
      meds: [{ id: 'm', owner: 'med', critical: true, daysOfSupply: 2 }],
      devices: [{ id: 'v', member: 'vent', type: 'home-ventilator', lifeSustaining: true, batteryMin: 120 }],
    }),
    hazard: 'hurricane',
    ctx: { floodZoneLevel: 'low', streamDistanceFt: 5000 },
    expect: [['vent', 'critical'], ['med', 'urgent']],
  },
  // ───── Households with no special needs ─────
  {
    name: '39. Two healthy adults: Standard, ordered oldest first, then by name',
    snap: household({ people: [{ id: 'b', name: 'Bea', age: 30 }, { id: 'a', name: 'Al', age: 30 }, { id: 'c', name: 'Cy', age: 50 }] }),
    hazard: 'outage',
    expect: [['c', 'standard'], ['a', 'standard'], ['b', 'standard']],
  },
  {
    name: '40. Hazmat with no sensitivities: everyone Standard (HAZ-S1)',
    snap: household({ people: [{ id: 'a', age: 30 }, { id: 'b', age: 35 }] }),
    hazard: 'hazmat',
    expect: [['b', 'standard'], ['a', 'standard']],
  },
  // ───── Second coverage for rules ─────
  {
    name: '41. 28°F heat pump: older adult with a critical fridge med under 6 h (OUT-C2, OUT-C3, OUT-U1); formula baby (OUT-U3)',
    snap: household(
      {
        people: [{ id: 'gma', age: 81 }, { id: 'baby', age: 0, months: 4, conditions: ['infant-formula'] }],
        meds: [
          { id: 'low', owner: 'gma', critical: true, fridge: true },
          { id: 'ok', owner: 'gma', critical: true, fridge: true },
        ],
      },
      { heatingType: 'heat-pump' },
    ),
    hazard: 'outage',
    ctx: { outdoorTempF: 28, outage: { active: true, medicationHoursLeft: { low: 4, ok: 10 } } },
    // gma 603 (81 +150, 2nd Critical +80, U +40, countdown 333) > baby 470
    expect: [['gma', 'critical'], ['baby', 'critical']],
  },
  {
    name: '42. Heat index 96°F: older adult Critical (OUT-C4)',
    snap: household({ people: [{ id: 'gpa', age: 70 }, { id: 'adult', age: 40 }] }),
    hazard: 'outage',
    ctx: { heatIndexF: 96 },
    expect: [['gpa', 'critical'], ['adult', 'standard']],
  },
  {
    name: '43. 35°F electric heat: 90-year-old Urgent (OUT-U4); toddler only Important',
    snap: household({ people: [{ id: 'gma', age: 90 }, { id: 'tod', age: 2 }] }, { heatingType: 'electric' }),
    hazard: 'outage',
    ctx: { outdoorTempF: 35 },
    expect: [['gma', 'urgent'], ['tod', 'important']],
  },
  {
    name: '44. Winter Storm Warning with unknown supply of a critical med is Urgent (WIN-U2)',
    snap: household({ people: [{ id: 'a', age: 40 }], meds: [{ id: 'm', owner: 'a', critical: true, daysOfSupply: null }] }),
    hazard: 'winter',
    ctx: { activeAlertEvents: ['Winter Storm Warning'] },
    expect: [['a', 'urgent']],
  },
  {
    name: '45. Fire at night: concentrator user (FIR-C2), Deaf older adult (FIR-C3), child with asthma (FIR-U1, FIR-U3)',
    snap: household({
      people: [{ id: 'o2', age: 60 }, { id: 'deaf', age: 75, conditions: ['hearing-loss'] }, { id: 'kid', age: 10, conditions: ['respiratory-asthma'] }],
      devices: [{ id: 'c', member: 'o2', type: 'oxygen-concentrator', lifeSustaining: true, batteryMin: 300 }],
    }),
    hazard: 'fire',
    ctx: { now: NIGHT },
    // o2 250 (backup 5 h) > deaf 140 (65–79 +100, U +40); kid 130 (2 U +80, child +50)
    expect: [['o2', 'critical'], ['deaf', 'critical'], ['kid', 'urgent']],
  },
  {
    name: '46. Hazmat: child with severe asthma (HAZ-C1), heart condition (HAZ-U2), outdoor cat (HAZ-I2)',
    snap: household({
      people: [{ id: 'kid', age: 12, conditions: [{ type: 'respiratory-asthma', severity: 'severe' }] }, { id: 'heart', age: 50, conditions: ['heart-condition'] }],
      pets: [{ id: 'cat', species: 'cat' }],
    }),
    hazard: 'hazmat',
    ctx: { outdoorPetIds: ['cat'] },
    expect: [['kid', 'critical'], ['heart', 'urgent'], ['cat', 'important']],
  },
];

describe.each(FIXTURES)('$name', (f) => {
  it(`ranks correctly for ${f.hazard}`, () => {
    const r = rankHousehold(f.snap, f.hazard, { now: FIXTURE_NOW, ...f.ctx });
    expect(r.order.map((s) => [s.subjectId, s.tier])).toEqual(f.expect);
  });
});

const ALL_RULES = [
  'OUT-C1', 'OUT-C2', 'OUT-C3', 'OUT-C4', 'OUT-U1', 'OUT-U2', 'OUT-U3', 'OUT-U4', 'OUT-I1', 'OUT-I2', 'OUT-S1',
  'WIN-C1', 'WIN-U1', 'WIN-U2', 'WIN-I1',
  'FLD-C1', 'FLD-C2', 'FLD-C3', 'FLD-U1', 'FLD-U2', 'FLD-U3', 'FLD-I1', 'FLD-I2',
  'FIR-C1', 'FIR-C2', 'FIR-C3', 'FIR-C4', 'FIR-U1', 'FIR-U2', 'FIR-U3', 'FIR-I1',
  'HAZ-C1', 'HAZ-C2', 'HAZ-U1', 'HAZ-U2', 'HAZ-I1', 'HAZ-I2',
  'HUR-C1', 'HUR-U1', 'HUR-I1',
];

describe('§8.9 coverage', () => {
  it('has at least 30 fixture households', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(30);
  });

  it('fires every rule in at least two fixtures', () => {
    const count = new Map<string, number>();
    for (const f of FIXTURES) {
      const fired = new Set(rankHousehold(f.snap, f.hazard, { now: FIXTURE_NOW, ...f.ctx }).order.flatMap((s) => s.ruleIds));
      fired.forEach((id) => count.set(id, (count.get(id) ?? 0) + 1));
    }
    const under = ALL_RULES.filter((id) => (count.get(id) ?? 0) < 2).map((id) => `${id}:${count.get(id) ?? 0}`);
    expect(under).toEqual([]);
  });
});
