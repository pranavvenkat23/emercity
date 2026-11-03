import { displayName } from '@/domain/members';
import type { Hazard, HouseholdSnapshot, Pet, Tier } from '@/models/types';

import { backupHours, memberFacts, rulesFor, type MemberFacts } from './rules';
import type { FiredRule, PriorityContext, PriorityPin, PriorityResult, RankedSubject } from './types';

const TIER_ORDER: Tier[] = ['critical', 'urgent', 'important', 'standard'];
const tierIndex = (t: Tier) => TIER_ORDER.indexOf(t);
const highest = (rules: FiredRule[]): Tier =>
  rules.reduce<Tier>((best, r) => (tierIndex(r.tier) < tierIndex(best) ? r.tier : best), 'standard');

/** Stable key of a member's needs; a change resets their pins (§8.8). */
export function conditionsKey(f: Pick<MemberFacts, 'member' | 'devices'>): string {
  const c = f.member.conditions.map((x) => x.type).sort().join(',');
  const d = f.devices.map((x) => `${x.type}:${x.lifeSustaining ? 1 : 0}`).sort().join(',');
  return `${c}|${d}`;
}

/**
 * §8.5 within-tier score (0–1000). Life-sustaining backup uses the live
 * remaining time during an outage, otherwise the total backup the user
 * entered. A device with no runtime entered counts as under 2 h
 * (conservative).
 */
export function withinTierScore(f: MemberFacts, rules: FiredRule[], snap: HouseholdSnapshot, ctx: PriorityContext): number {
  let score = 0;

  const ls = f.devices.filter((d) => d.lifeSustaining && d.usesElectricity);
  if (ls.length) {
    const hours = Math.min(
      ...ls.map((d) => {
        const live = ctx.outage?.active ? ctx.outage.deviceMinutesLeft?.[d.id] : undefined;
        return live != null ? live / 60 : backupHours(d, snap.household);
      }),
    );
    if (hours < 2) score += 400;
    else if (hours <= 8) score += 250;
  }

  // Countdown for a critical item: 400 × (1 − hoursLeft ÷ 24), floored at 0. Only while countdowns run.
  if (ctx.outage?.active) {
    const left: number[] = [];
    for (const m of f.medications) {
      const h = ctx.outage.medicationHoursLeft?.[m.id];
      if (m.isCritical && h != null) left.push(h);
    }
    for (const d of ls) {
      const min = ctx.outage.deviceMinutesLeft?.[d.id];
      if (min != null) left.push(min / 60);
    }
    if (left.length) score += Math.max(0, 400 * (1 - Math.min(...left) / 24));
  }

  if (f.needsHelp) score += 200;
  if (f.band === 'infant') score += 180;
  if (f.age != null && f.age >= 80) score += 150;
  else if (f.band === 'older-adult') score += 100;

  const critical = rules.filter((r) => r.tier === 'critical').length;
  const urgent = rules.filter((r) => r.tier === 'urgent').length;
  score += Math.max(0, critical - 1) * 80;
  score += urgent * 40;

  if (f.member.conditions.some((c) => c.type.startsWith('cognitive'))) score += 60;
  if (f.member.conditions.some((c) => c.type === 'pregnancy')) score += 60;
  if (f.band === 'child' || f.band === 'toddler' || f.band === 'infant') score += 50;

  return Math.min(1000, Math.round(score));
}

interface Scored {
  subjectType: 'member' | 'pet';
  subjectId: string;
  name: string;
  tier: Tier;
  score: number;
  rules: FiredRule[];
  needsHelp: boolean;
  age: number | null;
  isChild: boolean;
  conditionsKey: string;
}

/** §8.3 step 3 tie-breakers after tier and score; step 4: humans before pets. */
function compare(a: Scored, b: Scored): number {
  if (a.tier !== b.tier) return tierIndex(a.tier) - tierIndex(b.tier);
  if (a.subjectType !== b.subjectType) return a.subjectType === 'member' ? -1 : 1;
  if (a.score !== b.score) return b.score - a.score;
  if (a.needsHelp !== b.needsHelp) return a.needsHelp ? -1 : 1;
  if (a.isChild !== b.isChild) return a.isChild ? -1 : 1;
  if (a.isChild && b.isChild && a.age != null && b.age != null && a.age !== b.age) return a.age - b.age;
  if (!a.isChild && !b.isChild && a.age != null && b.age != null && a.age !== b.age) return b.age - a.age;
  return a.name.localeCompare(b.name);
}

/**
 * §8.8 pins: move one place within the tier. Crossing out of the Critical
 * group requires `confirmedCriticalDown`. Pins whose conditions key no
 * longer matches are ignored (they reset when needs change).
 */
function applyPins(list: Scored[], pins: PriorityPin[]): { list: Scored[]; pinned: Map<string, 'up' | 'down'> } {
  const out = [...list];
  const pinned = new Map<string, 'up' | 'down'>();
  for (const pin of pins) {
    const i = out.findIndex((s) => s.subjectId === pin.subjectId);
    if (i < 0 || out[i].conditionsKey !== pin.conditionsKey) continue;
    const j = pin.direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= out.length) continue;
    const a = out[i];
    const b = out[j];
    const sameTier = a.tier === b.tier;
    const humanPetCross = a.subjectType !== b.subjectType;
    const criticalDown = pin.direction === 'down' && a.tier === 'critical' && b.tier !== 'critical' && !humanPetCross;
    if ((sameTier && !humanPetCross) || (criticalDown && pin.confirmedCriticalDown)) {
      out[i] = b;
      out[j] = a;
      pinned.set(a.subjectId, pin.direction);
    }
  }
  return { list: out, pinned };
}

function petRules(p: Pet, snap: HouseholdSnapshot, hazard: Hazard, ctx: PriorityContext): FiredRule[] {
  const fired = rulesFor(hazard)
    .pet.map((r) => r(p, snap.medications, snap.household, ctx))
    .filter((r): r is FiredRule => !!r);
  // Pets can never exceed Important (§8.3 step 4).
  return fired.map((r) => (tierIndex(r.tier) < tierIndex('important') ? { ...r, tier: 'important' as Tier } : r));
}

/** De-duplicates rules that fire through more than one rule set (hurricane). */
function uniqueRules(rules: FiredRule[]): FiredRule[] {
  const seen = new Set<string>();
  return rules.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/**
 * Ranks every member and pet for a hazard (§8.3). Deterministic: the same
 * inputs always give the same order.
 */
export function rankHousehold(
  snap: HouseholdSnapshot,
  hazard: Hazard,
  ctx: PriorityContext,
  pins: PriorityPin[] = [],
): PriorityResult {
  const computedAt = ctx.now.toISOString();
  const scored: Scored[] = [];

  for (const member of snap.members) {
    if (member.archived) continue;
    const f = memberFacts(member, snap.devices, snap.medications, ctx.now);
    const rules = uniqueRules(rulesFor(hazard).member.map((r) => r(f, snap.household, ctx)).filter((r): r is FiredRule => !!r));
    const tier = highest(rules);
    scored.push({
      subjectType: 'member',
      subjectId: member.id,
      name: displayName(member),
      tier,
      score: withinTierScore(f, rules, snap, ctx),
      rules: rules.length ? rules : [{ id: standardRuleId(hazard), tier: 'standard', reason: 'No special needs for this emergency' }],
      needsHelp: f.needsHelp,
      age: f.age,
      // "Youngest child" tie-breaker covers all minors (the §8.6 example ranks
      // teen Ben ahead of Mom when both are Standard).
      isChild: f.band !== 'adult' && f.band !== 'older-adult',
      conditionsKey: conditionsKey(f),
    });
  }

  for (const pet of snap.pets) {
    const rules = uniqueRules(petRules(pet, snap, hazard, ctx));
    scored.push({
      subjectType: 'pet',
      subjectId: pet.id,
      name: pet.name,
      tier: highest(rules),
      score: 0,
      rules: rules.length ? rules : [{ id: standardRuleId(hazard), tier: 'standard', reason: 'No special needs for this emergency' }],
      needsHelp: false,
      age: null,
      isChild: false,
      conditionsKey: `${pet.species}|${pet.specialNeeds.join(',')}`,
    });
  }

  const sorted = [...scored].sort(compare);
  const { list, pinned } = applyPins(sorted, pins);

  const order: RankedSubject[] = list.map((s, i) => ({
    subjectType: s.subjectType,
    subjectId: s.subjectId,
    rank: i + 1,
    tier: s.tier,
    score: s.score,
    ruleIds: s.rules.map((r) => r.id),
    reasons: s.rules.filter((r) => r.tier !== 'standard' || s.tier === 'standard').map((r) => r.reason),
    computedAt,
    pinned: pinned.get(s.subjectId) ?? null,
  }));

  const unknowns: PriorityResult['unknowns'] = [];
  if (hazard === 'outage' || hazard === 'winter' || hazard === 'hurricane') {
    if (ctx.outdoorTempF == null) unknowns.push('temperature');
    if (ctx.heatIndexF == null) unknowns.push('heat-index');
  }
  if (hazard === 'flood' || hazard === 'hurricane') {
    if (!ctx.floodZoneLevel || ctx.floodZoneLevel === 'unknown') unknowns.push('flood-zone');
    if (ctx.streamDistanceFt == null) unknowns.push('stream-distance');
  }

  return { hazard, order, unknowns, computedAt };
}

function standardRuleId(hazard: Hazard): string {
  return { outage: 'OUT-S1', winter: 'OUT-S1', flood: 'FLD-S1', fire: 'FIR-S1', hazmat: 'HAZ-S1', hurricane: 'OUT-S1' }[hazard];
}

/**
 * Multiple active hazards (§25.4): each subject takes its highest tier
 * across hazards; order by that tier, then the best score, keeping the
 * same tie-breakers.
 */
export function mergeOrders(results: PriorityResult[]): RankedSubject[] {
  const best = new Map<string, RankedSubject>();
  for (const r of results) {
    for (const s of r.order) {
      const prev = best.get(s.subjectId);
      if (!prev) {
        best.set(s.subjectId, { ...s, ruleIds: [...s.ruleIds], reasons: [...s.reasons] });
        continue;
      }
      const tier = tierIndex(s.tier) < tierIndex(prev.tier) ? s.tier : prev.tier;
      best.set(s.subjectId, {
        ...prev,
        tier,
        score: Math.max(prev.score, s.score),
        ruleIds: [...new Set([...prev.ruleIds, ...s.ruleIds])],
        reasons: [...new Set([...prev.reasons, ...s.reasons])],
      });
    }
  }
  const merged = [...best.values()].sort(
    (a, b) =>
      tierIndex(a.tier) - tierIndex(b.tier) ||
      (a.subjectType === b.subjectType ? 0 : a.subjectType === 'member' ? -1 : 1) ||
      b.score - a.score ||
      a.subjectId.localeCompare(b.subjectId),
  );
  return merged.map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Highest tier a subject reaches across every hazard (HH-01 avatar ring, §7.1). */
export function topTierAcrossHazards(snap: HouseholdSnapshot, ctx: PriorityContext): Map<string, Tier> {
  const out = new Map<string, Tier>();
  for (const hz of ['outage', 'winter', 'flood', 'fire', 'hazmat', 'hurricane'] as Hazard[]) {
    for (const s of rankHousehold(snap, hz, ctx).order) {
      const prev = out.get(s.subjectId);
      if (!prev || tierIndex(s.tier) < tierIndex(prev)) out.set(s.subjectId, s.tier);
    }
  }
  return out;
}
