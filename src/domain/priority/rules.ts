import { ageBand, ageInYears, needsHelpEvacuating } from '@/domain/members';
import type { AgeBand, ConditionType, Device, Hazard, Household, Medication, Member, Pet, Tier } from '@/models/types';

import type { FiredRule, PriorityContext } from './types';

/**
 * Tier rules from spec §8.4, one function per rule ID. Thresholds are the
 * spec's; where the spec is silent, the choice is the conservative one
 * ("when in doubt, the rule tiers higher") and is noted inline.
 *
 * REVIEW STATUS: NOT REVIEWED. §8.4 requires review by a local emergency
 * manager, nurse, or CERT instructor before release.
 */

export interface MemberFacts {
  member: Member;
  age: number | null;
  band: AgeBand;
  needsHelp: boolean;
  conditions: Set<ConditionType>;
  devices: Device[];
  medications: Medication[];
}

export function memberFacts(member: Member, devices: Device[], medications: Medication[], now: Date): MemberFacts {
  return {
    member,
    age: ageInYears(member.birthDate, now),
    band: ageBand(member, now),
    needsHelp: needsHelpEvacuating(member, now),
    conditions: new Set(member.conditions.map((c) => c.type)),
    devices: devices.filter((d) => d.memberId === member.id),
    medications: medications.filter((m) => m.ownerType === 'member' && m.ownerId === member.id),
  };
}

type Rule = (f: MemberFacts, h: Household, ctx: PriorityContext) => FiredRule | null;
type PetRule = (p: Pet, meds: Medication[], h: Household, ctx: PriorityContext) => FiredRule | null;

const fire = (id: string, tier: Tier, reason: string): FiredRule => ({ id, tier, reason });

// ───────── helpers ─────────

const has = (f: MemberFacts, ...types: ConditionType[]) => types.some((t) => f.conditions.has(t));
const isInfant = (f: MemberFacts) => f.band === 'infant';
const isToddler = (f: MemberFacts) => f.band === 'toddler';
const isOlder = (f: MemberFacts) => f.band === 'older-adult';
const isChildUnder13 = (f: MemberFacts) => f.band === 'infant' || f.band === 'toddler' || f.band === 'child';
const isTempSensitive = (f: MemberFacts) => has(f, 'temperature-sensitive');

const alert = (ctx: PriorityContext, ...events: string[]) =>
  (ctx.activeAlertEvents ?? []).some((e) => events.some((x) => e.toLowerCase() === x.toLowerCase()));

/**
 * Heat that needs electricity (§8.4 OUT-C3): electric, heat pump, gas
 * furnace (blower) and oil (burner/pump). Wood doesn't. "Other" is unknown,
 * so it is treated as needing electricity (conservative).
 */
export function heatNeedsElectricity(h: Household): boolean {
  return h.heatingType !== 'wood';
}

const lifeSustainingElectric = (f: MemberFacts) => f.devices.filter((d) => d.lifeSustaining && d.usesElectricity);

const criticalFridgeMeds = (f: MemberFacts) => f.medications.filter((m) => m.isCritical && m.needsRefrigeration);

const usesOxygen = (f: MemberFacts) =>
  has(f, 'oxygen-dependent') || f.devices.some((d) => d.type === 'oxygen-concentrator');

// ───────── Power outage (also the outage part of winter and hurricane) ─────────

export const OUTAGE_RULES: Rule[] = [
  (f) => {
    const devs = lifeSustainingElectric(f);
    return devs.length ? fire('OUT-C1', 'critical', `Depends on ${devs[0].label?.toLowerCase() ?? 'a life-sustaining device'} that needs power`) : null;
  },
  (f, _h, ctx) => {
    const left = ctx.outage?.medicationHoursLeft ?? {};
    const low = criticalFridgeMeds(f).some((m) => typeof left[m.id] === 'number' && left[m.id] < 6);
    return low ? fire('OUT-C2', 'critical', 'Critical refrigerated medicine has under 6 hours of safe time') : null;
  },
  (f, h, ctx) => {
    if (ctx.outdoorTempF == null || ctx.outdoorTempF > 32) return null;
    if (!heatNeedsElectricity(h) || h.hasGenerator) return null;
    return isInfant(f) || isOlder(f) || isTempSensitive(f) ? fire('OUT-C3', 'critical', 'Very cold with no heat') : null;
  },
  (f, h, ctx) => {
    if (ctx.heatIndexF == null || ctx.heatIndexF < 95) return null;
    // Cooling needs power; without a generator, assume it isn't working during an outage.
    if (h.hasGenerator) return null;
    return isInfant(f) || isOlder(f) || has(f, 'pregnancy') || isTempSensitive(f)
      ? fire('OUT-C4', 'critical', 'Dangerous heat with no cooling')
      : null;
  },
  (f, _h, ctx) => {
    const left = ctx.outage?.medicationHoursLeft ?? {};
    // Fires when the medicine is not (yet) under 6 h, including before an outage, when no countdown exists.
    const meds = criticalFridgeMeds(f).filter((m) => !(typeof left[m.id] === 'number' && left[m.id] < 6));
    return meds.length ? fire('OUT-U1', 'urgent', 'Critical medicine needs to stay cold') : null;
  },
  (f) => {
    const nightly = f.devices.filter((d) => d.usesElectricity && !d.lifeSustaining);
    return nightly.length ? fire('OUT-U2', 'urgent', `Needs power for ${nightly[0].label?.toLowerCase() ?? 'a medical device'}`) : null;
  },
  (f) => {
    if (!isInfant(f) || !has(f, 'infant-formula')) return null;
    // Unknown ready-to-feed supply counts as under 2 days (conservative).
    const days = f.member.readyToFeedFormulaDays;
    return days == null || days < 2 ? fire('OUT-U3', 'urgent', 'Formula needs preparing; little ready-to-feed on hand') : null;
  },
  (f, h, ctx) => {
    if (ctx.outdoorTempF == null || ctx.outdoorTempF < 33 || ctx.outdoorTempF > 45) return null;
    if (!heatNeedsElectricity(h) || h.hasGenerator) return null;
    return isInfant(f) || isOlder(f) ? fire('OUT-U4', 'urgent', 'Cold with no heat') : null;
  },
  (f) => {
    if (isChildUnder13(f)) return fire('OUT-I1', 'important', 'Young child: darkness and disruption');
    if (has(f, 'cognitive-dementia', 'cognitive-autism')) return fire('OUT-I1', 'important', 'Darkness and disruption can be hard');
    return null;
  },
];

export const OUTAGE_PET_RULES: PetRule[] = [
  (p, meds) => {
    const fridge = meds.some((m) => m.ownerType === 'pet' && m.ownerId === p.id && m.needsRefrigeration);
    const sensitive = p.specialNeeds.some((s) => /heat|cold/i.test(s));
    return fridge || sensitive ? fire('OUT-I2', 'important', fridge ? 'Medicine needs to stay cold' : 'Sensitive to heat or cold') : null;
  },
];

// ───────── Winter storm (all outage rules plus these) ─────────

export const WINTER_RULES: Rule[] = [
  (f, _h, ctx) => {
    const roadsOut = alert(ctx, 'Winter Storm Warning', 'Ice Storm Warning', 'Blizzard Warning');
    return roadsOut && has(f, 'dialysis-center', 'critical-daily-meds')
      ? fire('WIN-C1', 'critical', "Needs treatment that can't be skipped; roads may close")
      : null;
  },
  (f) =>
    has(f, 'heart-condition')
      ? fire('WIN-U1', 'urgent', 'Heart condition (snow shoveling risk)')
      : has(f, 'respiratory-asthma', 'respiratory-copd')
        ? fire('WIN-U1', 'urgent', 'Breathing condition (cold air)')
        : null,
  (f, _h, ctx) => {
    if (!alert(ctx, 'Winter Storm Watch', 'Winter Storm Warning')) return null;
    // Unknown supply counts as under 5 days (conservative).
    const low = f.medications.some((m) => m.isCritical && (m.daysOfSupply == null || m.daysOfSupply < 5));
    return low ? fire('WIN-U2', 'urgent', 'Under 5 days of a critical medicine') : null;
  },
  (f) => (has(f, 'mobility-walker', 'mobility-wheelchair') ? fire('WIN-I1', 'important', 'Uses a walker or wheelchair (falls on ice)') : null),
];

// ───────── Flood ─────────

/** "High-risk flood zone or within 500 ft of a stream". Unknown risk counts (never assume low, §9.5). */
function floodProne(ctx: PriorityContext): boolean {
  const zone = ctx.floodZoneLevel ?? 'unknown';
  const dist = ctx.streamDistanceFt;
  return zone === 'high' || zone === 'unknown' || dist == null || dist < 500;
}

/** "In a flood zone" for FLD-C3: high or moderate, or unknown (conservative). */
function inFloodZone(ctx: PriorityContext): boolean {
  const zone = ctx.floodZoneLevel ?? 'unknown';
  return zone === 'high' || zone === 'moderate' || zone === 'unknown';
}

export const FLOOD_RULES: Rule[] = [
  (f, _h, ctx) => {
    if (!alert(ctx, 'Flash Flood Warning', 'Flood Warning')) return null;
    const lowSleep = f.member.sleepsIn === 'basement' || f.member.sleepsIn === 'ground-floor';
    return floodProne(ctx) && lowSleep && f.needsHelp
      ? fire('FLD-C1', 'critical', 'Sleeps on a low floor and needs help getting out')
      : null;
  },
  (f, _h, ctx) =>
    alert(ctx, 'Flash Flood Warning') && f.member.sleepsIn === 'basement'
      ? fire('FLD-C2', 'critical', 'Sleeps in the basement')
      : null,
  (f, _h, ctx) =>
    lifeSustainingElectric(f).length && inFloodZone(ctx)
      ? fire('FLD-C3', 'critical', 'Life-sustaining device; floods often cut power')
      : null,
  (f) =>
    has(f, 'mobility-wheelchair', 'mobility-walker', 'bedbound', 'cognitive-dementia', 'cognitive-intellectual') || (f.needsHelp && !isInfant(f) && !isToddler(f))
      ? fire('FLD-U1', 'urgent', 'Needs help evacuating')
      : null,
  (f) =>
    isChildUnder13(f) && (has(f, 'cannot-swim') || f.member.canSwim === false) && !isInfant(f) && !isToddler(f)
      ? fire('FLD-U2', 'urgent', "Child who can't swim")
      : null,
  (f) => (isInfant(f) || isToddler(f) ? fire('FLD-U3', 'urgent', 'Baby or toddler') : null),
  (f) => {
    const mobility = has(f, 'mobility-wheelchair', 'mobility-walker', 'bedbound');
    if (isOlder(f) && !mobility) return fire('FLD-I1', 'important', 'Older adult');
    if (has(f, 'pregnancy')) return fire('FLD-I1', 'important', 'Pregnant');
    return null;
  },
];

export const FLOOD_PET_RULES: PetRule[] = [() => fire('FLD-I2', 'important', 'Needs a carrier and a pet-friendly shelter')];

// ───────── Fire ─────────

/** 9 PM – 7 AM local time (FIR-C3). */
export function isNight(now: Date): boolean {
  const h = now.getHours();
  return h >= 21 || h < 7;
}

export const FIRE_RULES: Rule[] = [
  (f) =>
    has(f, 'bedbound', 'mobility-wheelchair') || isInfant(f) || isToddler(f)
      ? fire('FIR-C1', 'critical', "Can't get out alone")
      : null,
  (f) => (usesOxygen(f) ? fire('FIR-C2', 'critical', 'Uses home oxygen (fire spreads faster)') : null),
  (f, _h, ctx) =>
    has(f, 'hearing-loss') && isNight(ctx.now) ? fire('FIR-C3', 'critical', 'May not hear a smoke alarm while asleep') : null,
  (f) =>
    has(f, 'cognitive-dementia', 'cognitive-intellectual', 'cognitive-autism')
      ? fire('FIR-C4', 'critical', 'May hide, freeze, or go back inside')
      : null,
  (f) => (f.band === 'child' ? fire('FIR-U1', 'urgent', 'Child aged 4–12') : null),
  (f) => {
    if (isOlder(f)) return fire('FIR-U2', 'urgent', 'Older adult');
    if (has(f, 'mobility-walker')) return fire('FIR-U2', 'urgent', 'Uses a walker or cane');
    if (has(f, 'vision-loss')) return fire('FIR-U2', 'urgent', 'Low vision');
    if (has(f, 'pregnancy')) return fire('FIR-U2', 'urgent', 'Pregnant');
    return null;
  },
  (f) => (has(f, 'respiratory-asthma', 'respiratory-copd') ? fire('FIR-U3', 'urgent', 'Asthma or COPD (smoke)') : null),
];

export const FIRE_PET_RULES: PetRule[] = [() => fire('FIR-I1', 'important', 'Pets hide during fires; carrier needed')];

// ───────── Chemical / hazmat ─────────

export const HAZMAT_RULES: Rule[] = [
  (f) => {
    const severeResp = f.member.conditions.some(
      (c) => (c.type === 'respiratory-asthma' || c.type === 'respiratory-copd') && c.severity === 'severe',
    );
    return severeResp || has(f, 'oxygen-dependent') ? fire('HAZ-C1', 'critical', 'Breathing condition or oxygen') : null;
  },
  (f, _h, ctx) =>
    ctx.evacuationOrdered && f.needsHelp ? fire('HAZ-C2', 'critical', 'Evacuation ordered; needs help getting out') : null,
  (f) =>
    isInfant(f) || isToddler(f) || has(f, 'pregnancy') || isOlder(f) ? fire('HAZ-U1', 'urgent', 'More sensitive to chemicals in the air') : null,
  (f) => (has(f, 'heart-condition') ? fire('HAZ-U2', 'urgent', 'Heart condition') : null),
  (f, _h, ctx) =>
    (ctx.awayMemberIds ?? []).includes(f.member.id) ? fire('HAZ-I1', 'important', 'Outside or away when the alert came') : null,
];

export const HAZMAT_PET_RULES: PetRule[] = [
  (p, _m, _h, ctx) => ((ctx.outdoorPetIds ?? []).includes(p.id) ? fire('HAZ-I2', 'important', 'Pet is outdoors') : null),
];

// ───────── Hurricane (inland): flood + outage + wind ─────────

const backupHours = (d: Device, h: Household): number => {
  let min = 0;
  if (d.hasInternalBattery && d.batteryRuntimeMinutes) min += d.batteryRuntimeMinutes;
  if ((d.backupBatteryCount ?? 0) > 0 && d.backupRuntimeMinutes) min += (d.backupBatteryCount ?? 0) * d.backupRuntimeMinutes;
  if (h.hasGenerator && h.generatorFuelHours && (h.generatorWatts ?? 0) >= (d.powerWatts ?? Infinity)) min += h.generatorFuelHours * 60;
  if (d.backupNonElectricMinutes) min += d.backupNonElectricMinutes;
  return min / 60;
};

export const HURRICANE_RULES: Rule[] = [
  (_f, h, ctx) =>
    h.homeType === 'mobile-manufactured' && alert(ctx, 'High Wind Warning', 'Tornado Warning')
      ? fire('HUR-C1', 'critical', 'Mobile home in high wind: leave for a sturdy building')
      : null,
  (f, h) => {
    // Unknown supply counts as under 72 h (conservative).
    const med = f.medications.some((m) => m.isCritical && (m.daysOfSupply == null || m.daysOfSupply < 3));
    const dev = f.devices.some((d) => d.usesElectricity && backupHours(d, h) < 72);
    return med || dev ? fire('HUR-U1', 'urgent', 'Medicine or device backup lasts under 72 hours') : null;
  },
  (f) => (f.member.sleepsNearLargeWindows ? fire('HUR-I1', 'important', 'Sleeps near large windows') : null),
];

// ───────── Rule sets per hazard ─────────

export function rulesFor(hazard: Hazard): { member: Rule[]; pet: PetRule[] } {
  switch (hazard) {
    case 'outage':
      return { member: OUTAGE_RULES, pet: OUTAGE_PET_RULES };
    case 'winter':
      return { member: [...OUTAGE_RULES, ...WINTER_RULES], pet: OUTAGE_PET_RULES };
    case 'flood':
      return { member: FLOOD_RULES, pet: FLOOD_PET_RULES };
    case 'fire':
      return { member: FIRE_RULES, pet: FIRE_PET_RULES };
    case 'hazmat':
      return { member: HAZMAT_RULES, pet: HAZMAT_PET_RULES };
    case 'hurricane':
      return {
        member: [...FLOOD_RULES, ...OUTAGE_RULES, ...HURRICANE_RULES],
        pet: [...FLOOD_PET_RULES, ...OUTAGE_PET_RULES],
      };
  }
}

export { backupHours };
