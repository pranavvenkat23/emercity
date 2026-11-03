import { displayName } from '@/domain/members';
import type { Drill, Hazard, HouseholdSnapshot, Tier } from '@/models/types';

/**
 * Upcoming tasks and seasonal nudges (§6.1 "This week", §17.4).
 * Pure: the caller supplies today's date and the hazard scores.
 */

export type NudgeType = 'season-winter' | 'season-hurricane' | 'season-dst' | 'season-storms' | 'drill' | 'supply-expiry' | 'refill' | 'device-charge';

export interface Nudge {
  id: string;
  type: NudgeType;
  tier: Tier;
  text: string;
  /** YYYY-MM-DD the task is due (for sorting and "This week"). */
  due: string;
  target: 'supplies' | 'medication' | 'device' | 'drills';
  targetId?: string;
  /** §23 notification copy (no names or medicines). */
  notification: { body: string; url: string; priority: 'normal' | 'low' };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const shortDate = (s: string) => parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function computeNudges(
  snap: HouseholdSnapshot,
  ctx: { now: Date; scores: Record<Hazard, number>; drills: Pick<Drill, 'endedAt'>[] },
): Nudge[] {
  const today = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate());
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const out: Nudge[] = [];
  const memberName = (id: string) => {
    const m = snap.members.find((x) => x.id === id);
    return m ? displayName(m) : snap.pets.find((p) => p.id === id)?.name ?? 'Someone';
  };

  // Seasonal (§17.4)
  if (month === 10 && day >= 10 && ctx.scores.winter >= 40) {
    out.push({ id: `season-winter-${today.getFullYear()}`, type: 'season-winter', tier: 'important', text: 'Winter is coming: test heat backup, check blankets, refill critical meds for snow days.', due: iso(today), target: 'supplies', notification: { body: 'Winter is coming: check heat backup and blankets.', url: 'emercity://supplies/all', priority: 'low' } });
  }
  const lifeSustaining = snap.devices.some((d) => d.lifeSustaining);
  if (month === 6 && day <= 15 && (ctx.scores.hurricane >= 30 || lifeSustaining)) {
    out.push({ id: `season-hurricane-${today.getFullYear()}`, type: 'season-hurricane', tier: 'important', text: 'Hurricane season started. Make sure device backups can last 72 hours.', due: iso(today), target: 'supplies', notification: { body: 'Hurricane season started. Check 72-hour device backups.', url: 'emercity://supplies/all', priority: 'low' } });
  }
  if (month === 3 || month === 9) {
    out.push({ id: `season-dst-${today.getFullYear()}-${month}`, type: 'season-dst', tier: 'standard', text: 'Daylight saving changes: test smoke and CO alarms, swap batteries.', due: iso(today), target: 'supplies', notification: { body: 'Test smoke and CO alarms and swap batteries.', url: 'emercity://supplies/all', priority: 'low' } });
  }
  const lateSpring = (month === 5 && day >= 15) || (month === 6 && day <= 15);
  if (lateSpring && (ctx.scores.flood >= 40 || ctx.scores.outage >= 40)) {
    out.push({ id: `season-storms-${today.getFullYear()}`, type: 'season-storms', tier: 'standard', text: 'Thunderstorm season: check your sump pump and flashlight batteries.', due: iso(today), target: 'supplies', notification: { body: 'Thunderstorm season: check your sump pump and flashlights.', url: 'emercity://supplies/all', priority: 'low' } });
  }

  // Fire drill every 6 months
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const lastDrill = ctx.drills.map((d) => d.endedAt).filter(Boolean).sort().pop();
  if (!lastDrill || new Date(lastDrill) < sixMonthsAgo) {
    out.push({ id: 'drill-fire', type: 'drill', tier: 'important', text: 'Time for a fire drill.', due: iso(today), target: 'drills', notification: { body: 'Time for a fire drill.', url: 'emercity://drill/new', priority: 'normal' } });
  }

  // Supplies expiring within 30 days
  for (const s of snap.supplies) {
    if (!s.expirationDate) continue;
    const exp = parse(s.expirationDate);
    const warnFrom = addDays(exp, -30);
    if (today >= warnFrom) {
      const expired = today > exp;
      out.push({
        id: `supply-${s.id}`,
        type: 'supply-expiry',
        tier: s.tier === 'critical' ? 'urgent' : 'important',
        text: `${s.linkedMemberId ? `${memberName(s.linkedMemberId)}'s ` : ''}${s.name} ${expired ? 'expired' : 'expires'} ${shortDate(s.expirationDate)}`,
        due: iso(warnFrom),
        target: 'supplies',
        targetId: s.id,
        notification: { body: `A supply item ${expired ? 'has expired' : `expires ${shortDate(s.expirationDate)}`}.`, url: `emercity://supplies/${s.id}`, priority: 'low' },
      });
    }
  }

  // Refill date − 5 days
  for (const m of snap.medications) {
    if (!m.refillDate) continue;
    const remind = addDays(parse(m.refillDate), -5);
    if (today >= remind) {
      out.push({
        id: `refill-${m.id}`,
        type: 'refill',
        tier: m.isCritical ? 'urgent' : 'standard',
        text: `Refill ${memberName(m.ownerId)}'s ${m.genericName ?? m.brandName} by ${shortDate(m.refillDate)}`,
        due: iso(remind),
        target: 'medication',
        targetId: m.id,
        notification: { body: `Time to refill a ${m.isCritical ? 'critical ' : ''}medication by ${shortDate(m.refillDate)}.`, url: `emercity://medication/${m.id}`, priority: 'normal' },
      });
    }
  }

  // Monthly: charge spare device batteries
  for (const d of snap.devices) {
    if ((d.backupBatteryCount ?? 0) === 0 && !d.hasInternalBattery) continue;
    const last = d.batteryLastChargedDate ? parse(d.batteryLastChargedDate) : null;
    if (!last || addDays(last, 30) <= today) {
      out.push({
        id: `charge-${d.id}`,
        type: 'device-charge',
        tier: d.lifeSustaining ? 'urgent' : 'standard',
        text: `Charge ${memberName(d.memberId)}'s ${(d.label ?? 'device').toLowerCase()} batteries`,
        due: iso(last ? addDays(last, 30) : today),
        target: 'device',
        targetId: d.id,
        notification: { body: 'Charge spare medical device batteries.', url: `emercity://device/${d.id}`, priority: 'normal' },
      });
    }
  }

  const order: Tier[] = ['critical', 'urgent', 'important', 'standard'];
  return out.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || a.due.localeCompare(b.due));
}

const NUDGE_CATEGORY: Record<NudgeType, 'nudges' | 'drills' | 'supplies' | 'medications' | 'devices'> = {
  'season-winter': 'nudges',
  'season-hurricane': 'nudges',
  'season-dst': 'nudges',
  'season-storms': 'nudges',
  drill: 'drills',
  'supply-expiry': 'supplies',
  refill: 'medications',
  'device-charge': 'devices',
};

/**
 * Local notifications for upcoming nudges (§23 N-SUP-EXP, N-MED-REFILL,
 * N-DEV-CHARGE, N-SEASON, N-DRILL), grouped by notification category.
 * Each fires at 9 AM on its due day; anything already due fires tomorrow.
 */
export function nudgeNotes(nudges: Nudge[], now: Date) {
  const groups: Record<string, { id: string; at: string; title: string; body: string; priority: 'normal' | 'low'; url: string }[]> = {};
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  for (const n of nudges) {
    const [y, m, d] = n.due.split('-').map(Number);
    let at = new Date(y, m - 1, d, 9, 0, 0);
    if (at <= now) at = tomorrow;
    const cat = NUDGE_CATEGORY[n.type];
    (groups[cat] ??= []).push({ id: n.id, at: at.toISOString(), title: 'Emercity', body: n.notification.body, priority: n.notification.priority, url: n.notification.url });
  }
  return groups;
}
