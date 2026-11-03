import { deviceBackup } from '@/domain/device-backup';
import { displayName, hasCondition, needsHelpEvacuating } from '@/domain/members';
import type { Drill, HouseholdSnapshot, Tier } from '@/models/types';

/**
 * Household readiness score 0–100 (§6.4). Fully rule-based; the breakdown
 * is shown on PLAN-13. If any Critical-tier need is open, the score is
 * capped at 69 and the ring shows a red notch.
 */

export type ReadinessCategoryId =
  | 'critical'
  | 'profile'
  | 'supplies'
  | 'contacts'
  | 'meeting'
  | 'drills'
  | 'connected'
  | 'alerts';

export interface ReadinessCategory {
  id: ReadinessCategoryId;
  label: string;
  weight: number;
  points: number;
  detail: string;
}

export interface ReadinessStep {
  tier: Tier;
  text: string;
  /** Where the step is fixed in the app. */
  target: 'device' | 'medication' | 'member' | 'supplies' | 'contacts' | 'meeting' | 'drills' | 'invite' | 'settings';
  targetId?: string;
}

export interface ReadinessResult {
  score: number;
  /** Uncapped score, for the breakdown screen. */
  rawScore: number;
  criticalGap: boolean;
  categories: ReadinessCategory[];
  /** Every open item, Critical first. */
  steps: ReadinessStep[];
}

export interface ReadinessContext {
  now: Date;
  drills: Pick<Drill, 'endedAt'>[];
  notificationsEnabled: boolean;
  offlinePackageDate: string | null;
}

const PLACEHOLDER_NAME = /^(Adult|Older adult|Teen|Child|Toddler|Baby|Pregnant person|Dog|Cat|Bird|Small animal|Reptile|Fish|Other pet) \d+$/;

const TIER_ORDER: Tier[] = ['critical', 'urgent', 'important', 'standard'];

export function computeReadiness(snap: HouseholdSnapshot, ctx: ReadinessContext): ReadinessResult {
  const steps: ReadinessStep[] = [];
  const memberName = (id: string) => {
    const m = snap.members.find((x) => x.id === id);
    return m ? displayName(m) : 'Someone';
  };

  // ── Critical needs covered (30) ──
  const needs: { met: boolean; step: ReadinessStep }[] = [];
  for (const d of snap.devices) {
    if (!d.lifeSustaining || !d.usesElectricity) continue;
    const b = deviceBackup(d, snap.household);
    const backupBeyondInternal = b.stages.some((s) => s.kind !== 'internal');
    needs.push({
      met: backupBeyondInternal,
      step: {
        tier: 'critical',
        text: `Add ${memberName(d.memberId)}'s ${(d.label ?? 'device').toLowerCase()} backup details`,
        target: 'device',
        targetId: d.id,
      },
    });
  }
  for (const med of snap.medications) {
    if (!med.isCritical) continue;
    const owner = med.ownerType === 'member' ? memberName(med.ownerId) : snap.pets.find((p) => p.id === med.ownerId)?.name ?? 'Pet';
    needs.push({
      met: (med.daysOfSupply ?? 0) >= 7,
      step: { tier: 'critical', text: `Keep 7+ days of ${owner}'s ${med.genericName ?? med.brandName}`, target: 'medication', targetId: med.id },
    });
  }
  const insulinUsers = snap.members.filter(
    (m) => hasCondition(m, 'diabetes-insulin') || snap.medications.some((x) => x.ownerId === m.id && x.needsRefrigeration && x.isCritical),
  );
  if (insulinUsers.length) {
    const cooler = snap.supplies.some((s) => /cooler/i.test(s.name) && s.quantityHave >= Math.max(1, s.quantityNeeded));
    needs.push({
      met: cooler,
      step: { tier: 'urgent', text: 'Get a cooler and ice packs for insulin', target: 'supplies' },
    });
  }
  const critPoints = needs.length ? (30 * needs.filter((n) => n.met).length) / needs.length : 30;
  needs.filter((n) => !n.met).forEach((n) => steps.push(n.step));
  const criticalGap = needs.some((n) => !n.met && n.step.tier === 'critical');

  // ── Household profile complete (10) ──
  const subjects = [...snap.members.map((m) => ({ id: m.id, ok: !PLACEHOLDER_NAME.test(m.firstName) && !!m.birthDate, name: displayName(m) })), ...snap.pets.map((p) => ({ id: p.id, ok: !PLACEHOLDER_NAME.test(p.name), name: p.name }))];
  const profileOk = subjects.filter((s) => s.ok).length;
  const profilePoints = subjects.length ? (10 * profileOk) / subjects.length : 0;
  subjects.filter((s) => !s.ok).forEach((s) => steps.push({ tier: 'standard', text: `Finish ${s.name}'s profile`, target: 'member', targetId: s.id }));

  // ── Supplies (20) ──
  const today = ctx.now.toISOString().slice(0, 10);
  const kitItems = snap.supplies.filter((s) => s.location !== 'car');
  const good = kitItems.filter((s) => s.quantityHave >= s.quantityNeeded && !(s.expirationDate && s.expirationDate < today));
  const supplyPoints = kitItems.length ? (20 * good.length) / kitItems.length : 0;
  if (!kitItems.length) steps.push({ tier: 'important', text: 'Build your go-bag and home kit list', target: 'supplies' });
  else if (good.length < kitItems.length) steps.push({ tier: 'important', text: `${kitItems.length - good.length} supply items missing or expired`, target: 'supplies' });

  // ── Contacts (10) ──
  const emergency = snap.contacts.filter((c) => c.type === 'emergency' || c.type === 'out-of-area').length;
  const outOfArea = snap.contacts.some((c) => c.isOutOfArea || c.type === 'out-of-area');
  const memberMeds = snap.medications.some((m) => m.ownerType === 'member');
  const petMeds = snap.medications.some((m) => m.ownerType === 'pet');
  const doctorOk = !memberMeds || snap.contacts.some((c) => c.type === 'doctor' || c.type === 'pharmacy');
  const vetOk = !petMeds || snap.contacts.some((c) => c.type === 'vet');
  const contactPoints = (emergency >= 2 ? 4 : emergency === 1 ? 2 : 0) + (outOfArea ? 3 : 0) + (doctorOk && vetOk ? 3 : 0);
  if (emergency < 2) steps.push({ tier: 'important', text: 'Add two emergency contacts', target: 'contacts' });
  if (!outOfArea) steps.push({ tier: 'important', text: 'Add an out-of-area contact', target: 'contacts' });
  if (!doctorOk) steps.push({ tier: 'standard', text: 'Add a doctor or pharmacy contact', target: 'contacts' });
  if (!vetOk) steps.push({ tier: 'standard', text: 'Add your vet', target: 'contacts' });

  // ── Meeting points (10) ──
  const near = snap.meetingPoints.find((p) => p.type === 'near-home');
  const away = snap.meetingPoints.find((p) => p.type === 'neighborhood' || p.type === 'out-of-area');
  const mobility = snap.members.some((m) => needsHelpEvacuating(m, ctx.now));
  const reachable = (p: typeof near) => !p || !(p.pathHasStairsOrSlopes && mobility);
  const meetingPoints = (near ? (reachable(near) ? 5 : 2.5) : 0) + (away ? (reachable(away) ? 5 : 2.5) : 0);
  if (!near) steps.push({ tier: 'important', text: 'Pick a meeting spot near home', target: 'meeting' });
  if (!away) steps.push({ tier: 'important', text: 'Pick a neighborhood meeting spot', target: 'meeting' });

  // ── Drills (10) ──
  const sixMonthsAgo = new Date(ctx.now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const drilled = ctx.drills.some((d) => d.endedAt && new Date(d.endedAt) >= sixMonthsAgo);
  const drillPoints = drilled ? 10 : 0;
  if (!drilled) steps.push({ tier: 'important', text: 'Practice a fire drill', target: 'drills' });

  // ── Household connected (5) ──
  const adults = snap.members.filter((m) => m.role === 'adult' || m.role === 'older-adult');
  const joined = adults.filter((m) => !!m.linkedUserId).length;
  const connectedPoints = adults.length ? (5 * joined) / adults.length : 5;
  if (adults.length && joined < adults.length) {
    steps.push({ tier: 'standard', text: `${adults.length - joined} adult${adults.length - joined === 1 ? " hasn't" : "s haven't"} joined yet`, target: 'invite' });
  }

  // ── Alerts and offline (5) ──
  const thirtyDaysAgo = ctx.now.getTime() - 30 * 86_400_000;
  const offlineFresh = !!ctx.offlinePackageDate && new Date(ctx.offlinePackageDate).getTime() >= thirtyDaysAgo;
  const alertPoints = (ctx.notificationsEnabled ? 2.5 : 0) + (offlineFresh ? 2.5 : 0);
  if (!ctx.notificationsEnabled) steps.push({ tier: 'important', text: 'Turn on alerts for your address', target: 'settings' });

  const categories: ReadinessCategory[] = [
    { id: 'critical', label: 'Critical needs covered', weight: 30, points: critPoints, detail: `${needs.filter((n) => n.met).length} of ${needs.length} covered` },
    { id: 'profile', label: 'Household profile complete', weight: 10, points: profilePoints, detail: `${profileOk} of ${subjects.length} complete` },
    { id: 'supplies', label: 'Supplies', weight: 20, points: supplyPoints, detail: kitItems.length ? `${good.length} of ${kitItems.length} ready` : 'No list yet' },
    { id: 'contacts', label: 'Contacts', weight: 10, points: contactPoints, detail: `${emergency} emergency · ${outOfArea ? 'out-of-area set' : 'no out-of-area'}` },
    { id: 'meeting', label: 'Meeting points', weight: 10, points: meetingPoints, detail: `${near ? 'Near home set' : 'No near-home spot'} · ${away ? 'neighborhood set' : 'no neighborhood spot'}` },
    { id: 'drills', label: 'Drills', weight: 10, points: drillPoints, detail: drilled ? 'Drilled in the last 6 months' : 'No drill in 6 months' },
    { id: 'connected', label: 'Household connected', weight: 5, points: connectedPoints, detail: `${joined} of ${adults.length} adults joined` },
    { id: 'alerts', label: 'Alerts and offline', weight: 5, points: alertPoints, detail: `${ctx.notificationsEnabled ? 'Alerts on' : 'Alerts off'} · ${offlineFresh ? 'offline data current' : 'offline data not saved'}` },
  ];
  const rawScore = Math.round(categories.reduce((s, c) => s + c.points, 0));
  const score = criticalGap ? Math.min(69, rawScore) : rawScore;
  steps.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  return { score, rawScore, criticalGap, categories, steps };
}
