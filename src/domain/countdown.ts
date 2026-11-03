import { deviceBackup } from '@/domain/device-backup';
import { displayName } from '@/domain/members';
import type { Device, Household, HouseholdSnapshot, Medication, StorageRule, Tier } from '@/models/types';
import { FOOD_RULES } from '@/reference/food-rules';

/**
 * Outage countdowns (§11). Every number comes from a stored rule with a
 * source, or from the user (labeled "Your estimate" / "From your label").
 * Nothing is defaulted: missing data produces `no-data`, never a guess.
 */

const H = 3_600_000;
const MIN = 60_000;
const DAY = 24 * H;

/** §11.3 phase 1: fridge holding time, minus 30 min per logged opening. */
export const FRIDGE_HOLD_MS = FOOD_RULES.fridgeHours * H;
export const FRIDGE_OPENING_PENALTY_MS = 30 * MIN;

/** Per-item user actions during an outage (§11.3, §11.4). */
export interface ItemState {
  /** Times the fridge was opened (each shortens phase 1 by 30 min). */
  fridgeOpenings?: number;
  /** When the medicine was moved to a cooler, and the user's cooler estimate. */
  movedToCoolerAt?: string | null;
  coolerHoldHours?: number | null;
  /** Medicine taken out of the fridge to room temperature (§11.1 row 3). */
  removedFromFridgeAt?: string | null;
  /** Device: the stage the user says is running, and when they switched. */
  deviceStageIndex?: number;
  deviceStageSwitchedAt?: string | null;
  /** Freezer is full (48 h) or half full (24 h). */
  freezerFull?: boolean;
}

export interface OutageInput {
  startedAt: string;
  endedAt?: string | null;
  /** User-entered indoor temperature (°F). Never estimated (see CLAUDE.md flagged issue 3). */
  indoorTempF?: number | null;
  items: Record<string, ItemState>;
}

export type TileState = 'running' | 'ready' | 'paused' | 'expired' | 'no-data' | 'unsafe';

export interface Countdown {
  id: string;
  kind: 'medication' | 'device' | 'fridge' | 'freezer';
  name: string;
  ownerName?: string;
  ownerId?: string;
  state: TileState;
  /** Safe time remaining (running) or total (ready). null = no data. */
  remainingMs: number | null;
  totalMs: number | null;
  tier: Tier;
  /** Current phase text: "In fridge · keep door closed", "Spare battery 1 of 2". */
  phase: string;
  /** The one action that fits the phase (§11.4). */
  action: 'moved-to-cooler' | 'switched-backup' | 'none';
  source: { name: string; note?: string; url?: string };
  userEstimate: boolean;
  /** Medicine: user must confirm it stayed cold after power returns (§11.6). */
  lifeSustaining?: boolean;
  isCritical?: boolean;
  /** Absolute time the item becomes unsafe (for scheduling notifications). */
  unsafeAt: string | null;
  /** Absolute time phase 1 (fridge) ends, for the 30-min warning. */
  fridgePhaseEndsAt?: string | null;
  /** Device: index of the backup stage currently running. */
  stageIndex?: number;
}

function elapsedMs(from: string, now: Date): number {
  // Clock moved backwards (§25.4): never count negative time.
  return Math.max(0, now.getTime() - new Date(from).getTime());
}

/** Room-temperature limit in days: verified rule first, then the user's label value. */
export function roomTempDays(
  med: Pick<Medication, 'isOpened' | 'userEnteredRoomTempDays'>,
  rule: StorageRule | null,
): { days: number; source: Countdown['source']; userEstimate: boolean } | null {
  if (rule) {
    const days = med.isOpened ? rule.openedRoomTempDays : rule.unopenedRoomTempDays ?? rule.openedRoomTempDays;
    if (days != null) {
      return { days, source: { name: rule.sourceName, note: `rule reviewed ${formatMonth(rule.reviewedDate)}`, url: rule.sourceUrl }, userEstimate: false };
    }
  }
  if (med.userEnteredRoomTempDays != null && med.userEnteredRoomTempDays > 0) {
    return { days: med.userEnteredRoomTempDays, source: { name: 'From your label' }, userEstimate: true };
  }
  return null;
}

function formatMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function medTier(med: Medication, remainingMs: number | null): Tier {
  if (!med.isCritical) return 'standard';
  return remainingMs != null && remainingMs < 6 * H ? 'critical' : 'urgent';
}

/** Refrigerated medicine (§11.1 rows 1–3, §11.3). */
export function medicationCountdown(
  med: Medication,
  rule: StorageRule | null,
  ownerName: string | undefined,
  outage: OutageInput | null,
  now: Date,
): Countdown {
  const room = roomTempDays(med, rule);
  const st = outage?.items[med.id] ?? {};
  const name = `${ownerName ? `${ownerName}'s ` : ''}${med.brandName}`;
  const base = {
    id: med.id,
    kind: 'medication' as const,
    name,
    ownerName,
    ownerId: med.ownerId,
    isCritical: med.isCritical,
    source: room?.source ?? { name: 'No safe-time data', note: 'check the package insert' },
    userEstimate: room?.userEstimate ?? false,
  };
  const maxF = rule?.maxRoomTempF ?? null;

  // Not in an outage: "if power went out now" = fridge hold + room-temp window.
  if (!outage || outage.endedAt) {
    if (!room) {
      return { ...base, state: 'no-data', remainingMs: null, totalMs: null, tier: medTier(med, null), phase: 'No safe-time data for this product', action: 'none', unsafeAt: null };
    }
    const total = FRIDGE_HOLD_MS + room.days * DAY;
    return { ...base, state: outage?.endedAt ? 'paused' : 'ready', remainingMs: total, totalMs: total, tier: medTier(med, total), phase: 'If power went out now', action: 'none', unsafeAt: null };
  }

  // Too warm right now: unsafe immediately (§11.3).
  if (outage.indoorTempF != null && maxF != null && outage.indoorTempF > maxF && !st.movedToCoolerAt) {
    return { ...base, state: 'unsafe', remainingMs: 0, totalMs: null, tier: med.isCritical ? 'critical' : 'standard', phase: 'Unsafe: move to cooler now', action: 'moved-to-cooler', unsafeAt: now.toISOString() };
  }

  // Moved to a cooler: count down the user's own cooler estimate.
  if (st.movedToCoolerAt) {
    if (st.coolerHoldHours == null || st.coolerHoldHours <= 0) {
      return { ...base, state: 'no-data', remainingMs: null, totalMs: null, tier: medTier(med, null), phase: 'In cooler · add how long your ice lasts', action: 'none', source: { name: 'Your estimate' }, userEstimate: true, unsafeAt: null };
    }
    const total = st.coolerHoldHours * H;
    const remaining = total - elapsedMs(st.movedToCoolerAt, now);
    const unsafeAt = new Date(new Date(st.movedToCoolerAt).getTime() + total).toISOString();
    return {
      ...base,
      state: remaining <= 0 ? 'expired' : 'running',
      remainingMs: Math.max(0, remaining),
      totalMs: total,
      tier: medTier(med, remaining),
      phase: 'In cooler · never directly on ice',
      action: 'none',
      source: { name: 'Your estimate', note: 'cooler hold time' },
      userEstimate: true,
      unsafeAt,
    };
  }

  if (!room) {
    // Still show the fridge window: it is a food-safety rule, not a product limit.
    const hold = Math.max(0, FRIDGE_HOLD_MS - (st.fridgeOpenings ?? 0) * FRIDGE_OPENING_PENALTY_MS);
    const remaining = hold - elapsedMs(outage.startedAt, now);
    const endsAt = new Date(new Date(outage.startedAt).getTime() + hold).toISOString();
    return {
      ...base,
      state: remaining <= 0 ? 'no-data' : 'running',
      remainingMs: remaining > 0 ? remaining : null,
      totalMs: hold,
      tier: medTier(med, null),
      phase: remaining > 0 ? 'In fridge · keep door closed · no product limit on file' : 'No safe-time data for this product',
      action: 'moved-to-cooler',
      unsafeAt: null,
      fridgePhaseEndsAt: endsAt,
    };
  }

  const hold = Math.max(0, FRIDGE_HOLD_MS - (st.fridgeOpenings ?? 0) * FRIDGE_OPENING_PENALTY_MS);
  const start = new Date(st.removedFromFridgeAt ?? outage.startedAt).getTime();
  const phase1Ends = st.removedFromFridgeAt ? start : start + hold;
  const unsafeAt = phase1Ends + room.days * DAY;
  // Clock earlier than the outage start (§25.4): treat as the start, never extra time.
  const t = Math.max(now.getTime(), new Date(outage.startedAt).getTime());
  const remaining = unsafeAt - t;
  const inFridge = t < phase1Ends;
  return {
    ...base,
    state: remaining <= 0 ? 'expired' : 'running',
    remainingMs: Math.max(0, remaining),
    totalMs: unsafeAt - new Date(outage.startedAt).getTime(),
    tier: medTier(med, remaining),
    phase: inFridge ? `In fridge · keep door closed · ${formatShort(phase1Ends - t)} until cooler` : `Room temperature${maxF ? ` · keep below ${maxF}°F` : ''}`,
    action: inFridge ? 'moved-to-cooler' : 'none',
    unsafeAt: new Date(unsafeAt).toISOString(),
    fridgePhaseEndsAt: new Date(phase1Ends).toISOString(),
  };
}

function formatShort(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} m` : `${m} min`;
}

/** Medical device on battery (§11.1 row 4, §11.3). */
export function deviceCountdown(device: Device, household: Household, ownerName: string | undefined, outage: OutageInput | null, now: Date): Countdown {
  const backup = deviceBackup(device, household);
  const total = backup.totalMinutes * MIN;
  const label = (device.label ?? device.type).toLowerCase();
  const base = {
    id: device.id,
    kind: 'device' as const,
    name: `${ownerName ? `${ownerName}'s ` : ''}${label}`,
    ownerName,
    ownerId: device.memberId,
    lifeSustaining: device.lifeSustaining,
    source: { name: 'Your estimate', note: 'entered by you' },
    userEstimate: true,
  };
  const tierFor = (ms: number | null): Tier => (device.lifeSustaining ? (ms != null && ms < 2 * H ? 'critical' : ms == null ? 'critical' : 'urgent') : 'standard');

  if (total <= 0) {
    return { ...base, state: 'no-data', remainingMs: null, totalMs: null, tier: tierFor(null), phase: 'Add battery runtime to see backup time', action: 'none', unsafeAt: null };
  }
  if (!outage || outage.endedAt) {
    return { ...base, state: outage?.endedAt ? 'paused' : 'ready', remainingMs: total, totalMs: total, tier: tierFor(total), phase: backup.stages.map((s) => s.label).join(', then '), action: 'none', unsafeAt: null };
  }

  const st = outage.items[device.id] ?? {};
  let remaining: number;
  let stageIndex: number;
  if (st.deviceStageSwitchedAt != null && st.deviceStageIndex != null && st.deviceStageIndex < backup.stages.length) {
    // User says stage k started at time s: remaining = stages k..end − (now − s).
    stageIndex = st.deviceStageIndex;
    const rest = backup.stages.slice(stageIndex).reduce((s, x) => s + x.minutes, 0) * MIN;
    remaining = rest - elapsedMs(st.deviceStageSwitchedAt, now);
  } else {
    const used = elapsedMs(outage.startedAt, now);
    remaining = total - used;
    let acc = 0;
    stageIndex = backup.stages.findIndex((s) => (acc += s.minutes * MIN) > used);
    if (stageIndex < 0) stageIndex = backup.stages.length - 1;
  }
  const anchor = st.deviceStageSwitchedAt ?? outage.startedAt;
  const anchorTotal = st.deviceStageSwitchedAt != null ? backup.stages.slice(stageIndex).reduce((s, x) => s + x.minutes, 0) * MIN : total;
  const unsafeAt = new Date(new Date(anchor).getTime() + anchorTotal).toISOString();
  const stage = backup.stages[Math.min(stageIndex, backup.stages.length - 1)];
  return {
    ...base,
    state: remaining <= 0 ? 'expired' : 'running',
    remainingMs: Math.max(0, remaining),
    totalMs: total,
    tier: tierFor(remaining),
    phase: stage?.label ?? 'Backup',
    action: stageIndex < backup.stages.length - 1 ? 'switched-backup' : 'none',
    unsafeAt,
    stageIndex,
  };
}

/** Fridge and freezer food (§11.1 rows 5–6). */
export function foodCountdowns(outage: OutageInput | null, now: Date): Countdown[] {
  const freezerFull = outage?.items['food-freezer']?.freezerFull ?? true;
  const items: { id: string; kind: 'fridge' | 'freezer'; name: string; hours: number; phase: string }[] = [
    { id: 'food-fridge', kind: 'fridge', name: 'Fridge food', hours: FOOD_RULES.fridgeHours, phase: 'Door closed' },
    {
      id: 'food-freezer',
      kind: 'freezer',
      name: 'Freezer food',
      hours: freezerFull ? FOOD_RULES.freezerFullHours : FOOD_RULES.freezerHalfHours,
      phase: freezerFull ? 'Full freezer · door closed' : 'Half-full freezer · door closed',
    },
  ];
  return items.map((f) => {
    const total = f.hours * H;
    const source = { name: FOOD_RULES.sourceName, url: FOOD_RULES.sourceUrl };
    if (!outage || outage.endedAt) {
      return { id: f.id, kind: f.kind, name: f.name, state: outage?.endedAt ? 'paused' : 'ready', remainingMs: total, totalMs: total, tier: 'standard', phase: f.phase, action: 'none', source, userEstimate: false, unsafeAt: null } satisfies Countdown;
    }
    const remaining = total - elapsedMs(outage.startedAt, now);
    return {
      id: f.id,
      kind: f.kind,
      name: f.name,
      state: remaining <= 0 ? 'expired' : 'running',
      remainingMs: Math.max(0, remaining),
      totalMs: total,
      tier: remaining < 4 * H ? 'important' : 'standard',
      phase: f.phase,
      action: 'none',
      source,
      userEstimate: false,
      unsafeAt: new Date(new Date(outage.startedAt).getTime() + total).toISOString(),
    } satisfies Countdown;
  });
}

const TIER_ORDER: Tier[] = ['critical', 'urgent', 'important', 'standard'];

/**
 * Every countdown for the household, Critical first then least time left
 * (§6.3, §12.7 EM-05). `rules` maps storageRuleId to rule.
 */
export function householdCountdowns(
  snap: HouseholdSnapshot,
  rules: Record<string, StorageRule>,
  outage: OutageInput | null,
  now: Date,
): Countdown[] {
  const memberName = new Map(snap.members.map((m) => [m.id, displayName(m)]));
  const petName = new Map(snap.pets.map((p) => [p.id, p.name]));
  const out: Countdown[] = [];
  for (const d of snap.devices) {
    if (!d.usesElectricity) continue;
    out.push(deviceCountdown(d, snap.household, memberName.get(d.memberId), outage, now));
  }
  for (const m of snap.medications) {
    if (!m.needsRefrigeration) continue;
    const owner = m.ownerType === 'member' ? memberName.get(m.ownerId) : petName.get(m.ownerId);
    out.push(medicationCountdown(m, m.storageRuleId ? rules[m.storageRuleId] ?? null : null, owner, outage, now));
  }
  out.push(...foodCountdowns(outage, now));
  const rank = (c: Countdown) => (c.state === 'unsafe' || c.state === 'expired' ? -1 : TIER_ORDER.indexOf(c.tier));
  return out.sort((a, b) => rank(a) - rank(b) || (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));
}

/** Engine inputs (§8.1 "Countdown state"): hours left per critical med, minutes per device. */
export function countdownEngineInputs(countdowns: Countdown[]): {
  medicationHoursLeft: Record<string, number>;
  deviceMinutesLeft: Record<string, number>;
} {
  const medicationHoursLeft: Record<string, number> = {};
  const deviceMinutesLeft: Record<string, number> = {};
  for (const c of countdowns) {
    if (c.state !== 'running' && c.state !== 'expired' && c.state !== 'unsafe') continue;
    if (c.kind === 'medication' && c.remainingMs != null) medicationHoursLeft[c.id] = c.remainingMs / H;
    if (c.kind === 'medication' && c.state === 'unsafe') medicationHoursLeft[c.id] = 0;
    if (c.kind === 'device' && c.remainingMs != null) deviceMinutesLeft[c.id] = c.remainingMs / MIN;
  }
  return { medicationHoursLeft, deviceMinutesLeft };
}

/** Notifications to pre-schedule while an outage runs (§11.7, §23 N-CD-*). Copy has no names or medicines (§22.4). */
export interface ScheduledNote {
  id: string;
  at: string;
  title: string;
  body: string;
  priority: 'critical' | 'urgent' | 'important';
  /** Deep link (§3.3). */
  url: string;
}

export function outageNotifications(countdowns: Countdown[], now: Date): ScheduledNote[] {
  const notes: ScheduledNote[] = [];
  const future = (t: number) => t > now.getTime();
  for (const c of countdowns) {
    if (c.kind === 'medication' && c.fridgePhaseEndsAt && c.action === 'moved-to-cooler') {
      const t = new Date(c.fridgePhaseEndsAt).getTime() - 30 * MIN;
      if (future(t)) notes.push({ id: `${c.id}:fridge`, at: new Date(t).toISOString(), title: 'Countdown', body: 'Move refrigerated medicine to the cooler within 30 minutes.', priority: 'urgent', url: `emercity://countdown/${c.id}` });
    }
    if (c.kind === 'device' && c.lifeSustaining && c.unsafeAt) {
      const end = new Date(c.unsafeAt).getTime();
      if (future(end - 2 * H)) notes.push({ id: `${c.id}:2h`, at: new Date(end - 2 * H).toISOString(), title: 'Medical device', body: 'About 2 hours of backup left for a medical device.', priority: 'critical', url: `emercity://countdown/${c.id}` });
      if (future(end - 30 * MIN)) notes.push({ id: `${c.id}:30m`, at: new Date(end - 30 * MIN).toISOString(), title: 'Medical device', body: 'Under 30 minutes of device backup. Call 911 if you have no other source.', priority: 'critical', url: `emercity://countdown/${c.id}` });
    }
    if (c.kind === 'freezer' && c.unsafeAt) {
      const t = new Date(c.unsafeAt).getTime() - 4 * H;
      if (future(t)) notes.push({ id: `${c.id}:4h`, at: new Date(t).toISOString(), title: 'Countdown', body: 'Freezer food: about 4 hours left if closed.', priority: 'important', url: `emercity://countdown/${c.id}` });
    }
  }
  return notes.sort((a, b) => a.at.localeCompare(b.at));
}
