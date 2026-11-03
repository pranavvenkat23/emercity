import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import type { StorageRule } from '@/models/types';
import { device, household, med } from '@/test-utils/household-builder';

import {
  countdownEngineInputs,
  deviceCountdown,
  foodCountdowns,
  householdCountdowns,
  medicationCountdown,
  outageNotifications,
  roomTempDays,
  type OutageInput,
} from './countdown';

const H = 3_600_000;
const START = '2026-10-24T19:42:00.000Z';
const at = (hours: number) => new Date(new Date(START).getTime() + hours * H);
const outage = (items: OutageInput['items'] = {}, extra: Partial<OutageInput> = {}): OutageInput => ({ startedAt: START, items, ...extra });

const RULE: StorageRule = {
  id: 'rule-test',
  productName: 'Test insulin',
  ndcProductCodes: [],
  unopenedRefrigerated: 'Until expiration',
  unopenedRoomTempDays: 28,
  openedRoomTempDays: 28,
  maxRoomTempF: 86,
  minTempF: 32,
  notes: '',
  sourceName: 'Test source',
  sourceUrl: 'https://example.org',
  reviewedDate: '2026-09-01',
};

const fridgeMed = med({ id: 'ins', owner: 'dad', critical: true, fridge: true });
const hh = household({ people: [{ id: 'dad', age: 46 }] }).household;

describe('roomTempDays', () => {
  it('prefers the verified rule and labels its source', () => {
    expect(roomTempDays({ isOpened: true, userEnteredRoomTempDays: 10 }, RULE)).toMatchObject({ days: 28, userEstimate: false });
  });
  it('falls back to the user’s label value, labeled as such', () => {
    expect(roomTempDays({ isOpened: false, userEnteredRoomTempDays: 14 }, null)).toMatchObject({ days: 14, userEstimate: true, source: { name: 'From your label' } });
  });
  it('returns null rather than guessing', () => {
    expect(roomTempDays({ isOpened: false, userEnteredRoomTempDays: null }, null)).toBeNull();
  });
});

describe('medicationCountdown (§11.3)', () => {
  it('shows no-data, not a number, when there is no rule or label value', () => {
    const c = medicationCountdown(fridgeMed, null, 'Dad', null, at(0));
    expect(c.state).toBe('no-data');
    expect(c.remainingMs).toBeNull();
  });

  it('ready state = 4 h fridge hold + room-temperature days', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', null, at(0));
    expect(c.state).toBe('ready');
    expect(c.totalMs).toBe(4 * H + 28 * 24 * H);
  });

  it('runs phase 1 in the fridge, then room temperature', () => {
    const c1 = medicationCountdown(fridgeMed, RULE, 'Dad', outage(), at(1));
    expect(c1.state).toBe('running');
    expect(c1.phase).toMatch(/In fridge/);
    expect(c1.action).toBe('moved-to-cooler');
    const c2 = medicationCountdown(fridgeMed, RULE, 'Dad', outage(), at(5));
    expect(c2.phase).toMatch(/Room temperature · keep below 86°F/);
    expect(c2.remainingMs).toBe(4 * H + 28 * 24 * H - 5 * H);
  });

  it('shortens phase 1 by 30 minutes per fridge opening', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', outage({ ins: { fridgeOpenings: 2 } }), at(0));
    expect(new Date(c.fridgePhaseEndsAt!).getTime() - new Date(START).getTime()).toBe(3 * H);
  });

  it('goes unsafe immediately when indoor temperature exceeds the product maximum', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', outage({}, { indoorTempF: 90 }), at(1));
    expect(c.state).toBe('unsafe');
    expect(c.phase).toBe('Unsafe: move to cooler now');
    expect(c.tier).toBe('critical');
  });

  it('switches to the user’s cooler estimate after "Moved to cooler"', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', outage({ ins: { movedToCoolerAt: at(1).toISOString(), coolerHoldHours: 12 } }), at(3));
    expect(c.phase).toMatch(/cooler/);
    expect(c.userEstimate).toBe(true);
    expect(c.remainingMs).toBe(10 * H);
  });

  it('asks for a cooler estimate instead of inventing one', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', outage({ ins: { movedToCoolerAt: at(1).toISOString() } }), at(2));
    expect(c.state).toBe('no-data');
  });

  it('is Critical under 6 h left and Urgent above (OUT-C2 / OUT-U1 alignment)', () => {
    const short: StorageRule = { ...RULE, openedRoomTempDays: 0.1, unopenedRoomTempDays: 0.1 };
    expect(medicationCountdown(fridgeMed, short, 'Dad', outage(), at(2)).tier).toBe('critical');
    expect(medicationCountdown(fridgeMed, RULE, 'Dad', outage(), at(2)).tier).toBe('urgent');
  });

  it('expires when the limit passes', () => {
    const short: StorageRule = { ...RULE, openedRoomTempDays: 0.1, unopenedRoomTempDays: 0.1 };
    expect(medicationCountdown(fridgeMed, short, 'Dad', outage(), at(10)).state).toBe('expired');
  });

  it('never counts negative time if the clock moves backwards', () => {
    const c = medicationCountdown(fridgeMed, RULE, 'Dad', outage(), at(-2));
    expect(c.remainingMs).toBe(4 * H + 28 * 24 * H);
  });
});

describe('deviceCountdown (§11.3)', () => {
  const d = device({ id: 'o2', member: 'gma', type: 'oxygen-concentrator', lifeSustaining: true, batteryMin: 240, spares: 1, spareMin: 120 });

  it('counts down T_backup and tracks the current stage', () => {
    const c = deviceCountdown(d, hh, 'Grandma', outage(), at(1));
    expect(c.remainingMs).toBe(5 * H);
    expect(c.phase).toBe('Internal battery');
    expect(c.action).toBe('switched-backup');
    const later = deviceCountdown(d, hh, 'Grandma', outage(), at(4.5));
    expect(later.phase).toBe('Spare battery 1 of 1');
    expect(later.tier).toBe('critical'); // under 2 h left
  });

  it('uses the user’s "Switched to next backup" time', () => {
    const c = deviceCountdown(d, hh, 'Grandma', outage({ o2: { deviceStageIndex: 1, deviceStageSwitchedAt: at(3).toISOString() } }), at(3.5));
    expect(c.remainingMs).toBe(1.5 * H);
    expect(c.phase).toBe('Spare battery 1 of 1');
  });

  it('is no-data when no runtime is entered', () => {
    const none = device({ id: 'v', member: 'x', type: 'home-ventilator', lifeSustaining: true, batteryMin: null });
    const c = deviceCountdown(none, hh, 'X', outage(), at(1));
    expect(c.state).toBe('no-data');
    expect(c.tier).toBe('critical');
  });
});

describe('food countdowns', () => {
  it('uses 4 h fridge and 48 h / 24 h freezer', () => {
    const [fridge, freezer] = foodCountdowns(outage(), at(1));
    expect(fridge.remainingMs).toBe(3 * H);
    expect(freezer.remainingMs).toBe(47 * H);
    const half = foodCountdowns(outage({ 'food-freezer': { freezerFull: false } }), at(1))[1];
    expect(half.remainingMs).toBe(23 * H);
  });
});

describe('householdCountdowns + engine inputs', () => {
  it('sorts Critical first and feeds the priority engine', () => {
    const snap = buildDemoHousehold();
    snap.medications = snap.medications.map((m) => ({ ...m, storageRuleId: 'rule-test' }));
    const list = householdCountdowns(snap, { 'rule-test': RULE }, outage(), at(1));
    expect(list[0].id).toBe(DEMO_IDS.concentrator);
    const inputs = countdownEngineInputs(list);
    expect(inputs.deviceMinutesLeft[DEMO_IDS.concentrator]).toBe(180);
    expect(inputs.medicationHoursLeft[DEMO_IDS.insulinPens]).toBeGreaterThan(6);
  });
});

describe('outage notifications (§11.7, §23)', () => {
  it('schedules fridge, 2 h, 30 min and freezer warnings without names or medicines', () => {
    const snap = buildDemoHousehold();
    snap.medications = snap.medications.map((m) => ({ ...m, storageRuleId: 'rule-test' }));
    const notes = outageNotifications(householdCountdowns(snap, { 'rule-test': RULE }, outage(), at(0)), at(0));
    const bodies = notes.map((n) => n.body).join(' ');
    expect(bodies).toMatch(/30 minutes/);
    expect(bodies).toMatch(/2 hours of backup/);
    expect(bodies).toMatch(/Call 911/);
    expect(bodies).toMatch(/Freezer food/);
    expect(bodies).not.toMatch(/Grandma|Dad|insulin|oxygen/i);
    // Ordered by time and all in the future.
    expect(notes.map((n) => n.at)).toEqual([...notes.map((n) => n.at)].sort());
  });
});
