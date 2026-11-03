import type { Drill, Hazard, HouseholdSnapshot } from '@/models/types';

import type { RankedSubject } from './priority/types';

export type DrillType = Drill['type'];

export interface DrillMeta {
  type: DrillType;
  title: string;
  detail: string;
  /** Hazard whose playbook the drill uses; evacuation uses the top-risk hazard. */
  hazard: Hazard | null;
  arrivedLabel: string;
  /** Practice goal in ms, only where a common goal exists (fire: 3 minutes, §15.3). */
  targetMs: number | null;
  /** Evacuation drills run the playbook as if leaving were ordered. */
  evacuation?: boolean;
}

/** The five drill types (§15.1). */
export const DRILLS: DrillMeta[] = [
  { type: 'fire-escape', title: 'Fire escape drill', detail: 'Get everyone to the meeting point. Measures time to all out.', hazard: 'fire', arrivedLabel: "I'm at the meeting point", targetMs: 3 * 60_000 },
  { type: 'shelter-in-place', title: 'Shelter-in-place drill', detail: 'Get everyone into the inside room with doors and windows closed.', hazard: 'hazmat', arrivedLabel: "I'm in the safe room", targetMs: null },
  { type: 'flood-move-up', title: 'Flood move-up drill', detail: 'Move everyone and the go-bag to the highest floor or out to the car.', hazard: 'flood', arrivedLabel: "I'm upstairs", targetMs: null },
  { type: 'outage', title: 'Outage drill', detail: 'Walk through the outage steps. Practice moving medicine to the cooler and switching device batteries. No real power cut needed.', hazard: 'outage', arrivedLabel: 'Done', targetMs: null },
  { type: 'evacuation', title: 'Evacuation drill', detail: 'Go-bag, pets in carriers, everyone in the car. Measures time to ready to drive.', hazard: null, arrivedLabel: "I'm in the car", targetMs: null, evacuation: true },
];
export const DRILL_BY_TYPE = Object.fromEntries(DRILLS.map((d) => [d.type, d])) as Record<DrillType, DrillMeta>;

const HAZARD_DRILL: Record<Hazard, DrillType> = {
  fire: 'fire-escape',
  hazmat: 'shelter-in-place',
  flood: 'flood-move-up',
  outage: 'outage',
  winter: 'outage',
  hurricane: 'shelter-in-place',
};

const SIX_MONTHS_MS = 182 * 24 * 3600 * 1000;

export const completed = (drills: Drill[]) =>
  drills.filter((d) => d.startedAt && d.endedAt).sort((a, b) => b.endedAt!.localeCompare(a.endedAt!));

export const elapsedMs = (d: Pick<Drill, 'startedAt' | 'endedAt'>) =>
  d.startedAt && d.endedAt ? Math.max(0, new Date(d.endedAt).getTime() - new Date(d.startedAt).getTime()) : 0;

/**
 * Recommended drill (§15.1 item 2): the top-risk hazard's drill if it has
 * never been run; otherwise fire if it's been 6 months (fire applies to
 * everyone); otherwise the drill run longest ago.
 */
export function recommendDrill(drills: Drill[], topRisk: Hazard, now: Date): { type: DrillType; reason: string } {
  const done = completed(drills);
  const last = (type: DrillType) => done.find((d) => d.type === type);
  const top = HAZARD_DRILL[topRisk];
  if (!last(top)) return { type: top, reason: 'Your top risk, never practiced' };
  const fire = last('fire-escape');
  if (!fire || now.getTime() - new Date(fire.endedAt!).getTime() > SIX_MONTHS_MS) {
    return { type: 'fire-escape', reason: fire ? 'Over 6 months since your last fire drill' : 'Practice a fire drill at least every 6 months' };
  }
  const never = DRILLS.find((d) => !last(d.type));
  if (never) return { type: never.type, reason: 'Not practiced yet' };
  const oldest = [...DRILLS].sort((a, b) => last(a.type)!.endedAt!.localeCompare(last(b.type)!.endedAt!))[0];
  return { type: oldest.type, reason: 'Practiced longest ago' };
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m} min ${s % 60} s` : `${s} s`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface DrillResult {
  totalMs: number;
  /** Negative = faster than the last drill of this type. */
  deltaMs: number | null;
  arrivals: { subjectId: string; subjectType: 'member' | 'pet'; elapsedMs: number | null; tier: RankedSubject['tier'] }[];
  tips: string[];
}

/** PLAN-08 results (§15.3). Tips are rule-based. */
export function drillResult(drill: Drill, history: Drill[], order: RankedSubject[], snap: Pick<HouseholdSnapshot, 'members' | 'pets'>): DrillResult {
  const totalMs = elapsedMs(drill);
  const prev = completed(history).find((d) => d.id !== drill.id && d.type === drill.type && d.endedAt! < (drill.endedAt ?? '9'));
  const arrivals = order.map((o) => ({
    subjectId: o.subjectId,
    subjectType: o.subjectType,
    tier: o.tier,
    elapsedMs: drill.arrivals.find((a) => a.subjectId === o.subjectId)?.elapsedMs ?? null,
  }));
  const tips: string[] = [];
  const nameOf = (id: string) => snap.members.find((m) => m.id === id)?.nickname || snap.members.find((m) => m.id === id)?.firstName || snap.pets.find((p) => p.id === id)?.name || 'Someone';
  const arrived = arrivals.filter((a) => a.elapsedMs != null).sort((a, b) => a.elapsedMs! - b.elapsedMs!);
  const lastIn = arrived[arrived.length - 1];
  if (arrived.length > 1 && lastIn?.tier === 'critical') tips.push(`${nameOf(lastIn.subjectId)} arrived last. Give them a dedicated helper.`);
  const missing = arrivals.filter((a) => a.elapsedMs == null);
  if (missing.length) tips.push(`${missing.map((a) => nameOf(a.subjectId)).join(', ')} didn't check in. Practice again so everyone knows where to go.`);
  const target = DRILL_BY_TYPE[drill.type].targetMs;
  if (target && totalMs > target) tips.push(`Over ${formatDuration(target)}. Clear the exits and practice again.`);
  if (drill.blockedStepIds.length) tips.push('Some steps couldn’t be done. Change who does them, or pick a different exit.');
  return { totalMs, deltaMs: prev ? totalMs - elapsedMs(prev) : null, arrivals, tips };
}
