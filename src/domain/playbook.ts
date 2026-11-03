import { deviceBackup } from '@/domain/device-backup';
import { displayName, hasCondition } from '@/domain/members';
import type { Device, Hazard, HouseholdSnapshot, Member, Task, Tier } from '@/models/types';
import { PLAYBOOK_TEMPLATES, type TemplateStep } from '@/reference/playbook-templates';

import type { PriorityResult } from './priority/types';

/**
 * Emergency Mode playbook generation (§12.5). Built at runtime from three
 * layers: the hazard template (§12.8), steps for each Critical and Urgent
 * subject in rank order, and household conditions. Deterministic.
 *
 * REVIEW STATUS: NOT REVIEWED (§12.8).
 */

export type StepCategory = 'life-safety' | 'subject' | 'protective' | 'recovery';

export interface PlaybookStep {
  id: string;
  instruction: string;
  tier: Tier;
  category: StepCategory;
  embed?: TemplateStep['embed'] | 'call-911' | 'meeting-point' | 'family-checklist';
  subjectId?: string;
  /** Member responsible (from Tasks, §15.4). */
  assigneeId?: string | null;
  /** Inserted after this step when the user taps "Can't do this" (§12.4). */
  fallback?: { id: string; instruction: string; tier: Tier };
  /** Offline guide behind the "How" expander. */
  guideId?: string;
  /** True for steps added from household conditions or subjects (not in the base template). */
  personalized?: boolean;
}

export interface PlaybookContext {
  priorities: PriorityResult;
  evacuationOrdered?: boolean;
  outageActive?: boolean;
  /** Extra first step from the alert (§10.3): tornado, Evacuation Immediate. */
  alertFirstStep?: string | null;
  tasks?: Task[];
}

const H = 60;

/** Template steps that are life-safety (get out, take shelter, call 911) per §12.5. */
const LIFE_SAFETY = new Set(['fld-1', 'fld-2', 'fir-1', 'fir-5', 'fir-8', 'haz-1', 'hur-4', 'out-1']);
/** Template steps that are recovery / comfort, which go last. */
const RECOVERY = new Set(['fld-10', 'fld-11', 'win-10', 'out-10', 'out-11', 'fir-6', 'fir-7', 'hur-7', 'haz-7']);
const GUIDE_FOR: Record<string, string> = {
  'fld-1': 'flash-floods',
  'fld-8': 'turn-around',
  'fld-11': 'after-flood',
  'win-1': 'winter-driving',
  'win-5': 'frozen-pipes',
  'win-6': 'stay-warm',
  'win-8': 'generator-safety',
  'out-4': 'food-outage',
  'out-11': 'power-back',
  'fir-1': 'fire-escape-plan',
  'fir-5': 'fire-escape-plan',
  'haz-1': 'shelter-in-place',
  'haz-2': 'seal-room',
  'haz-8': 'hazmat-car',
  'hur-1': 'inland-hurricane',
  'hur-4': 'tornado',
};

const tierRank = (t: Tier) => ['critical', 'urgent', 'important', 'standard'].indexOf(t);
const upgrade = (t: Tier, to: Tier): Tier => (tierRank(to) < tierRank(t) ? to : t);

function assignee(tasks: Task[] | undefined, hazard: Hazard, subjectId?: string, stepId?: string): string | null {
  if (!tasks) return null;
  const match = tasks.find(
    (t) => (t.hazard === hazard || t.hazard === 'all') && ((subjectId && t.linkedSubjectId === subjectId) || (stepId && t.title === stepId)),
  );
  return match?.assignedMemberId ?? null;
}

export function generatePlaybook(snap: HouseholdSnapshot, hazard: Hazard, ctx: PlaybookContext): PlaybookStep[] {
  const h = snap.household;
  const byId = new Map(snap.members.map((m) => [m.id, m]));
  const name = (m: Member) => displayName(m);
  const ranked = ctx.priorities.order;
  const rankedMembers = ranked.filter((s) => s.subjectType === 'member').map((s) => ({ s, m: byId.get(s.subjectId)! })).filter((x) => x.m);
  const critical = rankedMembers.filter((x) => x.s.tier === 'critical');
  const urgent = rankedMembers.filter((x) => x.s.tier === 'urgent');
  const firedFor = (id: string, rule: string) => ranked.find((r) => r.subjectId === id)?.ruleIds.includes(rule) ?? false;
  const devicesOf = (m: Member) => snap.devices.filter((d) => d.memberId === m.id);
  const lifeSustaining = snap.devices.filter((d) => d.lifeSustaining && d.usesElectricity);

  const subject: PlaybookStep[] = [];
  const add = (step: Omit<PlaybookStep, 'personalized'>) => subject.push({ ...step, personalized: true });

  // ───── Layer 2: per-subject steps, in rank order (§12.5, §12.8 brackets) ─────
  for (const { s, m } of [...critical, ...urgent]) {
    const n = name(m);
    const tier = s.tier;
    const help911 = { id: `fb-${m.id}`, instruction: `Call 911 for help moving ${n}.`, tier: 'critical' as Tier };
    switch (hazard) {
      case 'flood': {
        const infantOrToddler = m.role === 'infant' || /toddler/.test(s.ruleIds.join()) || s.ruleIds.includes('FLD-U3');
        add({
          id: `fld-sub-${m.id}`,
          instruction: infantOrToddler ? `Carry ${n} to higher ground.` : s.ruleIds.some((r) => r === 'FLD-U2') ? `Keep ${n} with an adult, away from water.` : `Help ${n} to higher ground.`,
          tier,
          category: 'subject',
          subjectId: m.id,
          fallback: help911,
        });
        break;
      }
      case 'winter': {
        for (const d of devicesOf(m).filter((x) => x.lifeSustaining)) {
          add({ id: `win-dev-${d.id}`, instruction: `Charge ${n}'s ${(d.label ?? 'device').toLowerCase()} batteries and spares now.`, tier: 'critical', category: 'subject', subjectId: m.id, embed: 'countdown', guideId: 'devices-outage' });
        }
        for (const med of snap.medications.filter((x) => x.ownerId === m.id && x.isCritical)) {
          add({ id: `win-med-${med.id}`, instruction: `Confirm ${n} has 7+ days of ${med.genericName ?? med.brandName}.`, tier: 'urgent', category: 'subject', subjectId: m.id });
        }
        if (firedFor(m.id, 'WIN-C1') && hasCondition(m, 'dialysis-center')) {
          add({ id: `win-dial-${m.id}`, instruction: `Call ${n}'s dialysis center about schedule changes.`, tier: 'critical', category: 'subject', subjectId: m.id, embed: 'call' });
        }
        break;
      }
      case 'outage':
      case 'hurricane': {
        for (const d of devicesOf(m).filter((x) => x.lifeSustaining && x.usesElectricity)) {
          const b = deviceBackup(d, h);
          const label = (d.label ?? 'device').toLowerCase();
          add({
            id: `out-dev-${d.id}`,
            instruction: b.totalMinutes ? `Check ${n}'s ${label}: ${fmtH(b.totalMinutes)} of backup.` : `Check ${n}'s ${label} battery.`,
            tier: 'critical',
            category: 'subject',
            subjectId: m.id,
            embed: 'countdown',
            guideId: 'devices-outage',
            fallback: { id: `fb-dev-${d.id}`, instruction: `Call 911 if ${n} has under 30 minutes of backup and no other source.`, tier: 'critical' },
          });
        }
        for (const med of snap.medications.filter((x) => x.ownerId === m.id && x.isCritical && x.needsRefrigeration)) {
          add({
            id: `out-cool-${med.id}`,
            instruction: `Move ${n}'s ${med.genericName ?? med.brandName} to a cooler before the 4-hour mark. Never put it directly on ice.`,
            tier: s.ruleIds.includes('OUT-C2') ? 'critical' : 'urgent',
            category: 'subject',
            subjectId: m.id,
            embed: 'countdown',
            guideId: 'insulin-outage',
          });
        }
        if (firedFor(m.id, 'OUT-U3')) {
          add({ id: `out-formula-${m.id}`, instruction: `Use ready-to-feed formula for ${n} first.`, tier: 'urgent', category: 'subject', subjectId: m.id, guideId: 'babies' });
        }
        break;
      }
      case 'fire': {
        if (firedFor(m.id, 'FIR-C2')) {
          add({ id: `fir-o2-${m.id}`, instruction: `Shut off ${n}'s oxygen if safe, then get ${n} out.`, tier: 'critical', category: 'subject', subjectId: m.id, guideId: 'oxygen-fire', fallback: help911 });
        }
        if (firedFor(m.id, 'FIR-C3')) {
          add({ id: `fir-wake-${m.id}`, instruction: `Wake ${n}. They may not hear the alarm.`, tier: 'critical', category: 'subject', subjectId: m.id, guideId: 'smoke-alarms-deaf' });
        }
        if (firedFor(m.id, 'FIR-C1') || firedFor(m.id, 'FIR-C4')) {
          // Babies and toddlers (FIR-C1 for the 'child' role means a toddler) get carried.
          const carry = m.role === 'infant' || (m.role === 'child' && s.ruleIds.includes('FIR-C1'));
          add({ id: `fir-get-${m.id}`, instruction: carry ? `Get ${n}.` : `Help ${n} get out.`, tier: 'critical', category: 'subject', subjectId: m.id, fallback: { id: `fb-${m.id}`, instruction: `Tell firefighters where ${n} is.`, tier: 'critical' } });
        } else if (tier === 'urgent') {
          add({ id: `fir-get-${m.id}`, instruction: `Make sure ${n} gets out.`, tier: 'urgent', category: 'subject', subjectId: m.id });
        }
        break;
      }
      case 'hazmat': {
        if (firedFor(m.id, 'HAZ-C1')) {
          add({ id: `haz-o2-${m.id}`, instruction: `Keep ${n}'s oxygen and inhalers within reach.`, tier: 'critical', category: 'subject', subjectId: m.id });
        }
        if (firedFor(m.id, 'HAZ-C2')) {
          add({ id: `haz-evac-${m.id}`, instruction: `Help ${n} get to the car.`, tier: 'critical', category: 'subject', subjectId: m.id, fallback: help911 });
        }
        break;
      }
    }
  }

  // ───── Layer 3: household conditions ─────
  const extra: PlaybookStep[] = [];
  if (hazard === 'flood' && h.hasBasement) {
    extra.push({ id: 'fld-3', instruction: 'Get everyone out of the basement.', tier: 'critical', category: 'life-safety', personalized: true, guideId: 'basements' });
  }
  if (hazard === 'flood') {
    for (const p of snap.pets) extra.push({ id: `fld-pet-${p.id}`, instruction: p.needsCarrier ? `Put ${p.name} in the carrier.` : `Leash ${p.name} and keep them close.`, tier: 'important', category: 'protective', subjectId: p.id, personalized: true, guideId: 'pets-evacuation' });
  }
  if (hazard === 'outage' || hazard === 'hurricane') {
    const short = lifeSustaining.filter((d) => deviceBackup(d, h).totalMinutes < 8 * H);
    if (short.length) {
      extra.push({
        id: 'out-3',
        instruction: 'Line up more power or a place to go: generator, a neighbor with power, your equipment supplier, or a hospital as a last resort.',
        tier: 'critical',
        category: 'subject',
        personalized: true,
        guideId: 'devices-outage',
        embed: 'call',
      });
    }
    if (ranked.some((r) => r.ruleIds.includes('OUT-C3'))) {
      extra.push({ id: 'out-7', instruction: 'Gather everyone in one room, close doors, layer clothing, and use blankets. Watch babies and older adults for cold signs.', tier: 'critical', category: 'protective', personalized: true, guideId: 'stay-warm' });
    }
    if (h.hasGenerator) {
      extra.push({ id: 'out-8', instruction: 'Run the generator outside, at least 20 ft from windows and doors.', tier: 'critical', category: 'protective', personalized: true, guideId: 'generator-safety' });
    }
  }
  if (hazard === 'hurricane' && lifeSustaining.length) {
    extra.push({ id: 'hur-2', instruction: 'Check that every life-sustaining device has 72+ hours of backup, or a place to go.', tier: 'critical', category: 'subject', personalized: true, guideId: 'device-72h' });
  }
  if (hazard === 'fire' && snap.pets.length) {
    extra.push({ id: 'fir-9', instruction: 'Tell firefighters where pets may be hiding.', tier: 'important', category: 'recovery', personalized: true, guideId: 'kids-pets-fire' });
  }

  // ───── Layer 1: hazard template ─────
  const base: PlaybookStep[] = PLAYBOOK_TEMPLATES[hazard]
    .filter((s) => (s.id === 'haz-6' ? snap.pets.length > 0 : true))
    .map((s) => {
      let tier = s.tier;
      let instruction = s.instruction;
      if (/evacuation alert/i.test(s.conditionalNote ?? '') && ctx.evacuationOrdered) tier = upgrade(tier, 'critical');
      if (/outage active/i.test(s.conditionalNote ?? '') && ctx.outageActive) tier = upgrade(tier, 'critical');
      if (s.id === 'hur-4' && h.homeType === 'mobile-manufactured') instruction = 'Mobile home: leave for a sturdy building before winds arrive.';
      return {
        id: s.id,
        instruction,
        tier,
        category: LIFE_SAFETY.has(s.id) ? 'life-safety' : RECOVERY.has(s.id) ? 'recovery' : 'protective',
        embed: s.embed,
        guideId: GUIDE_FOR[s.id],
      } satisfies PlaybookStep;
    });

  // Alert-specific first step (§10.3).
  const first: PlaybookStep[] = ctx.alertFirstStep
    ? [{ id: 'alert-first', instruction: ctx.alertFirstStep, tier: 'critical', category: 'life-safety', personalized: true }]
    : [];

  // ───── Ordering (§12.5) ─────
  const lifeSafety = [...first, ...base.filter((s) => s.category === 'life-safety'), ...extra.filter((s) => s.category === 'life-safety')];
  const subjectSteps = [
    ...subject.filter((s) => s.tier === 'critical'),
    ...extra.filter((s) => s.category === 'subject'),
    ...subject.filter((s) => s.tier !== 'critical'),
  ];
  const protective = [...extra.filter((s) => s.category === 'protective' && s.tier === 'critical'), ...base.filter((s) => s.category === 'protective'), ...extra.filter((s) => s.category === 'protective' && s.tier !== 'critical')];
  const recovery = [...base.filter((s) => s.category === 'recovery'), ...extra.filter((s) => s.category === 'recovery')];

  const steps = [...lifeSafety, ...subjectSteps, ...protective, ...recovery];
  const seen = new Set<string>();
  return steps
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .map((s) => ({ ...s, assigneeId: assignee(ctx.tasks ?? snap.tasks, hazard, s.subjectId, s.id) }));
}

function fmtH(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} m` : ''}` : `${m} min`;
}

/** Step progress for one subject (EM-04 "2 of 3 steps done"). */
export function subjectProgress(steps: PlaybookStep[], status: Record<string, { status: string }>, subjectId: string): { done: number; total: number } {
  const mine = steps.filter((s) => s.subjectId === subjectId);
  return { done: mine.filter((s) => status[s.id]?.status === 'done').length, total: mine.length };
}

/**
 * "Can't do this" (§12.4): mark blocked and insert the step's fallback
 * right after it. Returns the new list.
 */
export function insertFallback(steps: PlaybookStep[], stepId: string): PlaybookStep[] {
  const i = steps.findIndex((s) => s.id === stepId);
  const fb = steps[i]?.fallback;
  if (i < 0 || !fb || steps.some((s) => s.id === fb.id)) return steps;
  return [...steps.slice(0, i + 1), { id: fb.id, instruction: fb.instruction, tier: fb.tier, category: 'life-safety', personalized: true, embed: 'call-911' }, ...steps.slice(i + 1)];
}

/** After-action suggestions (§12.7 EM-08), rule-based. */
export function afterActionSuggestions(steps: PlaybookStep[], status: Record<string, { status: string }>, snap: HouseholdSnapshot): string[] {
  const out: string[] = [];
  const skipped = steps.filter((s) => status[s.id]?.status === 'skipped' || status[s.id]?.status === 'blocked');
  const missingGoBag = snap.supplies.filter((s) => s.location === 'go-bag' && s.quantityHave < s.quantityNeeded).length;
  if (skipped.some((s) => /go-bag/i.test(s.instruction)) && missingGoBag) out.push(`You skipped "${skipped.find((s) => /go-bag/i.test(s.instruction))!.instruction}". Your go-bag is missing ${missingGoBag} item${missingGoBag === 1 ? '' : 's'}.`);
  for (const s of skipped.filter((x) => x.tier === 'critical' && x.subjectId)) {
    out.push(`A Critical step was not done: "${s.instruction}" Consider assigning a dedicated helper.`);
  }
  if (!snap.meetingPoints.length) out.push('Pick a meeting point so everyone knows where to go.');
  const noBackup = snap.devices.filter((d: Device) => d.lifeSustaining && deviceBackup(d, snap.household).stages.every((x) => x.kind === 'internal'));
  if (noBackup.length) out.push('Add backup power details for life-sustaining equipment.');
  return out;
}
