import { HAZARD_TAB_ORDER } from '@/domain/hazards';
import { heatNeedsElectricity } from '@/domain/priority/rules';
import type { Hazard, HouseholdSnapshot, RiskFactor, RiskLevel } from '@/models/types';

/**
 * Address risk levels (§9.2) and per-hazard risk scores (§9.3).
 * Unknown is a real answer: it never counts as Low (§9.5).
 */

export const FT_PER_MILE = 5280;

/** FEMA flood zone to level. A/AE/AH/AO (and V zones) High; shaded X Moderate; unshaded X Low. */
export function floodZoneLevel(zone: string | null | undefined, subtype?: string | null): RiskLevel {
  if (!zone) return 'unknown';
  const z = zone.trim().toUpperCase();
  if (/^(A|AE|AH|AO|AR|A99|V|VE)$/.test(z) || /^A\d+$/.test(z)) return 'high';
  if (z === 'X' || z === 'B' || z === 'C') {
    const shaded = /0\.2|500|SHADED|MODERATE/i.test(subtype ?? '') || z === 'B';
    return shaded ? 'moderate' : 'low';
  }
  if (z === 'D') return 'unknown'; // Zone D = undetermined risk
  return 'unknown';
}

export function streamLevel(ft: number | null | undefined): RiskLevel {
  if (ft == null || !Number.isFinite(ft)) return 'unknown';
  if (ft < 500) return 'high';
  if (ft <= 0.25 * FT_PER_MILE) return 'moderate';
  return 'low';
}

export function railLevel(mi: number | null | undefined): RiskLevel {
  if (mi == null || !Number.isFinite(mi)) return 'unknown';
  if (mi < 0.5) return 'high';
  if (mi <= 1) return 'moderate';
  return 'low';
}

export function hazmatLevel(mi: number | null | undefined): RiskLevel {
  if (mi == null || !Number.isFinite(mi)) return 'unknown';
  if (mi < 0.5) return 'high';
  if (mi <= 2) return 'moderate';
  return 'low';
}

/** Hospital distance: farther is riskier. */
export function hospitalLevel(mi: number | null | undefined): RiskLevel {
  if (mi == null || !Number.isFinite(mi)) return 'unknown';
  if (mi > 15) return 'high';
  if (mi >= 5) return 'moderate';
  return 'low';
}

/** Outage frequency by national quartile of county events per year (§9.2). */
export function outageLevel(percentile: number | null | undefined): RiskLevel {
  if (percentile == null || !Number.isFinite(percentile)) return 'unknown';
  if (percentile >= 75) return 'high';
  if (percentile >= 25) return 'moderate';
  return 'low';
}

const level = (factors: RiskFactor[], type: string): RiskLevel => factors.find((f) => f.type === type)?.level ?? 'unknown';
const hml = (l: RiskLevel, high: number, mod: number) => (l === 'high' ? high : l === 'moderate' ? mod : 0);

/** §9.3 per-hazard risk scores, each capped at 100. */
export function computeHazardScores(snap: HouseholdSnapshot, factors: RiskFactor[]): Record<Hazard, number> {
  const h = snap.household;
  const electricHeat = heatNeedsElectricity(h);
  const lifeSustaining = snap.devices.some((d) => d.lifeSustaining && d.usesElectricity);
  const oxygen = snap.members.some((m) => m.conditions.some((c) => c.type === 'oxygen-dependent')) || snap.devices.some((d) => d.type === 'oxygen-concentrator');
  const mobility = snap.members.some((m) => m.conditions.some((c) => ['mobility-wheelchair', 'mobility-walker', 'bedbound'].includes(c.type)));
  const smokeAlarmConfirmed = snap.supplies.some((s) => /smoke alarm/i.test(s.name) && s.quantityHave >= s.quantityNeeded && !!s.lastCheckedDate);
  const outageFreq = level(factors, 'outage-frequency');

  const outage = 50 + hml(outageFreq, 30, 15) + (electricHeat ? 10 : 0) + (lifeSustaining ? 10 : 0);
  const winter = 50 + (electricHeat ? 15 : 0) + (h.ruralOrLongDriveway ? 10 : 0) + (outageFreq === 'high' ? 10 : 0);
  const flood = 25 + hml(level(factors, 'flood-zone'), 45, 20) + hml(level(factors, 'stream-distance'), 20, 10) + (h.hasBasement ? 10 : 0);
  const fire = 30 + (oxygen ? 20 : 0) + (mobility ? 10 : 0) + (smokeAlarmConfirmed ? 0 : 20);
  const highwayMi = Number(factors.find((f) => f.type === 'highway')?.value.match(/[\d.]+/)?.[0]);
  const hazmat = 10 + hml(level(factors, 'rail'), 30, 15) + hml(level(factors, 'hazmat-facility'), 30, 15) + (Number.isFinite(highwayMi) && highwayMi < 0.5 ? 10 : 0);
  const cap = (n: number) => Math.min(100, Math.round(n));
  const hurricane = 25 + cap(flood) * 0.4 + cap(outage) * 0.3 + (h.homeType === 'mobile-manufactured' ? 20 : 0);

  return {
    outage: cap(outage),
    winter: cap(winter),
    flood: cap(flood),
    fire: cap(fire),
    hazmat: cap(hazmat),
    hurricane: cap(hurricane),
  };
}

/** Highest score wins; ties go to the spec's tab order (outage first). */
export function topRiskHazard(scores: Record<Hazard, number>): Hazard {
  return HAZARD_TAB_ORDER.reduce((best, h) => (scores[h] > scores[best] ? h : best), HAZARD_TAB_ORDER[0]);
}

/** The top three hazards for PLAN-03, highest first. */
export function rankedHazards(scores: Record<Hazard, number>): Hazard[] {
  return [...HAZARD_TAB_ORDER].sort((a, b) => scores[b] - scores[a] || HAZARD_TAB_ORDER.indexOf(a) - HAZARD_TAB_ORDER.indexOf(b));
}

/** Plain bucket for the PLAN-03 level bar. */
export function scoreBucket(score: number): 'Low' | 'Moderate' | 'High' {
  return score >= 70 ? 'High' : score >= 40 ? 'Moderate' : 'Low';
}
