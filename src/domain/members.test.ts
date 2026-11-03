import type { Member } from '@/models/types';

import { ageBand, ageInYears, displayName, initials, needsHelpEvacuating } from './members';

const NOW = new Date('2026-10-24T12:00:00Z');

function m(partial: Partial<Member>): Member {
  return {
    id: 'm1',
    householdId: 'h1',
    createdAt: '',
    updatedAt: '',
    linkedUserId: null,
    firstName: 'Test',
    birthDate: null,
    role: 'adult',
    conditions: [],
    medicationIds: [],
    deviceIds: [],
    allergies: [],
    primaryLanguage: 'en',
    canDrive: false,
    ...partial,
  };
}

describe('ageInYears', () => {
  it('handles birthdays not yet reached this year', () => {
    expect(ageInYears('1980-10-25', NOW)).toBe(45);
    expect(ageInYears('1980-10-24', NOW)).toBe(46);
  });
  it('returns null for missing or malformed dates', () => {
    expect(ageInYears(null, NOW)).toBeNull();
    expect(ageInYears('not-a-date', NOW)).toBeNull();
  });
});

describe('ageBand (§4.2 boundaries)', () => {
  it.each([
    ['2026-02-24', 'infant'], // 8 months
    ['2025-10-24', 'toddler'], // exactly 1
    ['2022-10-25', 'toddler'], // 3, one day before 4
    ['2022-10-24', 'child'], // exactly 4
    ['2013-10-25', 'child'], // 12
    ['2013-10-24', 'teen'], // exactly 13
    ['2008-10-25', 'teen'], // 17
    ['2008-10-24', 'adult'], // exactly 18
    ['1961-10-25', 'adult'], // 64
    ['1961-10-24', 'older-adult'], // exactly 65
  ] as const)('birthDate %s to %s', (birthDate, band) => {
    expect(ageBand(m({ birthDate }), NOW)).toBe(band);
  });

  it('falls back to role when birth date is unknown', () => {
    expect(ageBand(m({ role: 'older-adult' }), NOW)).toBe('older-adult');
    expect(ageBand(m({ role: 'infant' }), NOW)).toBe('infant');
  });
});

describe('needsHelpEvacuating', () => {
  it('is true for mobility and cognitive conditions', () => {
    expect(
      needsHelpEvacuating(m({ conditions: [{ type: 'mobility-walker', severity: 'moderate' }] }), NOW),
    ).toBe(true);
    expect(
      needsHelpEvacuating(m({ conditions: [{ type: 'cognitive-dementia', severity: 'mild' }] }), NOW),
    ).toBe(true);
  });
  it('is true for infants and toddlers', () => {
    expect(needsHelpEvacuating(m({ birthDate: '2026-02-24' }), NOW)).toBe(true);
    expect(needsHelpEvacuating(m({ birthDate: '2024-06-01' }), NOW)).toBe(true);
  });
  it('is false for an adult with no relevant conditions', () => {
    expect(
      needsHelpEvacuating(m({ conditions: [{ type: 'diabetes-insulin', severity: 'moderate' }] }), NOW),
    ).toBe(false);
  });
  it('respects a user override in both directions', () => {
    expect(needsHelpEvacuating(m({ needsHelpEvacuatingOverride: true }), NOW)).toBe(true);
    expect(
      needsHelpEvacuating(
        m({
          conditions: [{ type: 'mobility-walker', severity: 'mild' }],
          needsHelpEvacuatingOverride: false,
        }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('display helpers', () => {
  it('prefers nickname', () => {
    expect(displayName(m({ firstName: 'Margaret', nickname: 'Grandma' }))).toBe('Grandma');
    expect(displayName(m({ firstName: 'Ben', nickname: '  ' }))).toBe('Ben');
  });
  it('builds initials', () => {
    expect(initials('Grandma')).toBe('GR');
    expect(initials('Baby Jamie')).toBe('JA');
    expect(initials('Baby')).toBe('BA');
    expect(initials('')).toBe('?');
  });
});
