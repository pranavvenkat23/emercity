import type { AgeBand, ConditionType, Member, MemberRole } from '@/models/types';

/**
 * Whole years between birthDate and `now`. Returns null when unknown.
 * With a year-only birth date the result may be one year high for part of
 * the year; age-band rules treat that conservatively via `ageBand`.
 */
export function ageInYears(birthDate: string | null | undefined, now: Date): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * §4.2 age bands: infant <1, toddler 1–3, child 4–12, teen 13–17,
 * adult 18–64, older adult 65+. Falls back to the member's role when the
 * birth date is unknown (onboarding chips set a role before a date is known).
 */
export function ageBand(member: Pick<Member, 'birthDate' | 'role'>, now: Date): AgeBand {
  const age = ageInYears(member.birthDate, now);
  if (age === null) return roleToBand(member.role);
  if (age < 1) return 'infant';
  if (age <= 3) return 'toddler';
  if (age <= 12) return 'child';
  if (age <= 17) return 'teen';
  if (age <= 64) return 'adult';
  return 'older-adult';
}

function roleToBand(role: MemberRole): AgeBand {
  switch (role) {
    case 'infant':
      return 'infant';
    case 'child':
      return 'child';
    case 'teen':
      return 'teen';
    case 'older-adult':
      return 'older-adult';
    default:
      return 'adult';
  }
}

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  infant: 'Baby',
  toddler: 'Toddler',
  child: 'Child',
  teen: 'Teen',
  adult: 'Adult',
  'older-adult': 'Older adult',
};

/** Conditions that mean a member needs help evacuating (§4.2, FLD-U1). */
const EVACUATION_HELP_CONDITIONS: ReadonlySet<ConditionType> = new Set([
  'mobility-wheelchair',
  'mobility-walker',
  'bedbound',
  'cognitive-dementia',
  'cognitive-intellectual',
  'ventilator',
]);

/**
 * Derived from conditions and age, overridable by the user (§4.2).
 * Infants and toddlers always need help (FIR-C1 treats them as unable to
 * self-evacuate).
 */
export function needsHelpEvacuating(
  member: Pick<Member, 'conditions' | 'birthDate' | 'role' | 'needsHelpEvacuatingOverride'>,
  now: Date,
): boolean {
  if (typeof member.needsHelpEvacuatingOverride === 'boolean') {
    return member.needsHelpEvacuatingOverride;
  }
  const band = ageBand(member, now);
  if (band === 'infant' || band === 'toddler') return true;
  return member.conditions.some((c) => EVACUATION_HELP_CONDITIONS.has(c.type));
}

export function hasCondition(member: Pick<Member, 'conditions'>, type: ConditionType): boolean {
  return member.conditions.some((c) => c.type === type);
}

export function displayName(member: Pick<Member, 'firstName' | 'nickname'>): string {
  return member.nickname?.trim() || member.firstName.trim() || 'Unnamed';
}

export function initials(name: string): string {
  // "Baby Jamie" shows "JA": the word "Baby" is a label, not part of the name.
  const parts = name.trim().split(/\s+/).filter(Boolean).filter((w, i, all) => !(i === 0 && all.length > 1 && /^baby$/i.test(w)));
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Role implied by a birth date; keeps the chosen role when the date is unknown. */
export function roleFromBirthDate(m: Pick<Member, 'birthDate' | 'role'>, now: Date): MemberRole {
  if (!m.birthDate) return m.role;
  const age = now.getFullYear() - Number(m.birthDate.slice(0, 4));
  if (age < 1) return 'infant';
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  if (age >= 65) return 'older-adult';
  return 'adult';
}
