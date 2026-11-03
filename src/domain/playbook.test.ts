import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import { HAZARDS, type Hazard, type HouseholdSnapshot } from '@/models/types';
import { FIXTURE_NOW, household } from '@/test-utils/household-builder';

import { afterActionSuggestions, generatePlaybook, insertFallback, subjectProgress } from './playbook';
import { rankHousehold } from './priority/engine';
import type { PriorityContext } from './priority/types';

const play = (snap: HouseholdSnapshot, hazard: Hazard, ctx: Partial<PriorityContext> = {}, extra = {}) =>
  generatePlaybook(snap, hazard, { priorities: rankHousehold(snap, hazard, { now: FIXTURE_NOW, ...ctx }), ...extra });

describe('generatePlaybook (§12.5)', () => {
  const demo = buildDemoHousehold();

  it('outage: confirm first, then Grandma’s oxygen, then the power plan, then Dad’s insulin', () => {
    const steps = play(demo, 'outage', { outdoorTempF: 24 });
    const ids = steps.map((s) => s.id);
    expect(ids[0]).toBe('out-1');
    expect(ids[1]).toBe(`out-dev-${DEMO_IDS.concentrator}`);
    expect(steps[1].instruction).toBe("Check Grandma's oxygen concentrator: 4 h of backup.");
    expect(ids).toContain('out-3'); // under 8 h of backup to line up more power
    expect(ids.indexOf('out-3')).toBeLessThan(ids.indexOf(`out-cool-${DEMO_IDS.insulinPens}`));
    expect(ids).toContain('out-7'); // freezing with no heat (OUT-C3)
    expect(ids).not.toContain('out-8'); // no generator
    expect(ids[ids.length - 1]).toBe('out-11'); // recovery last
  });

  it('keeps life-safety steps before everything else in every hazard', () => {
    for (const h of HAZARDS) {
      const steps = play(demo, h);
      const lastLife = Math.max(-1, ...steps.map((s, i) => (s.category === 'life-safety' ? i : -1)));
      const firstOther = steps.findIndex((s) => s.category !== 'life-safety');
      if (lastLife >= 0 && firstOther >= 0) expect(lastLife).toBeLessThan(firstOther);
    }
  });

  it('orders Critical subject steps by priority rank', () => {
    const steps = play(demo, 'fire');
    const subjectIds = steps.filter((s) => s.category === 'subject' && s.tier === 'critical').map((s) => s.subjectId);
    const order = rankHousehold(demo, 'fire', { now: FIXTURE_NOW }).order.map((o) => o.subjectId);
    const positions = subjectIds.map((id) => order.indexOf(id!));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('flood: basement step only with a basement; pet carrier per pet', () => {
    const steps = play(demo, 'flood');
    expect(steps.some((s) => s.id === 'fld-3')).toBe(true);
    expect(steps.find((s) => s.id === `fld-pet-${DEMO_IDS.biscuit}`)?.instruction).toBe('Put Biscuit in the carrier.');
    const noBasement = household({ people: [{ id: 'a', age: 40 }] });
    expect(play(noBasement, 'flood').some((s) => s.id === 'fld-3')).toBe(false);
  });

  it('upgrades "leave now" to Critical when an evacuation is ordered', () => {
    expect(play(demo, 'flood').find((s) => s.id === 'fld-8')?.tier).toBe('standard');
    expect(play(demo, 'flood', {}, { evacuationOrdered: true }).find((s) => s.id === 'fld-8')?.tier).toBe('critical');
  });

  it('winter: indoor-generator warning becomes Critical when the power is out', () => {
    expect(play(demo, 'winter', {}, { outageActive: true }).find((s) => s.id === 'win-8')?.tier).toBe('critical');
  });

  it('adds the generator step only for households with a generator', () => {
    const gen = { ...demo, household: { ...demo.household, hasGenerator: true } };
    expect(play(gen, 'outage').some((s) => s.id === 'out-8')).toBe(true);
  });

  it('skips hazmat "Bring pets inside" for households without pets', () => {
    const noPets = household({ people: [{ id: 'a', age: 40 }] });
    expect(play(noPets, 'hazmat').some((s) => s.id === 'haz-6')).toBe(false);
    expect(play(demo, 'hazmat').some((s) => s.id === 'haz-6')).toBe(true);
  });

  it('mobile homes replace the tornado shelter step', () => {
    const mobile = { ...demo, household: { ...demo.household, homeType: 'mobile-manufactured' as const } };
    expect(play(mobile, 'hurricane').find((s) => s.id === 'hur-4')?.instruction).toMatch(/^Mobile home: leave/);
  });

  it('puts the alert first step (tornado) at the very top', () => {
    const steps = play(demo, 'hurricane', {}, { alertFirstStep: 'Take shelter now.' });
    expect(steps[0]).toMatchObject({ id: 'alert-first', tier: 'critical' });
  });

  it('assigns helpers from household tasks', () => {
    const snap = structuredClone(demo);
    snap.tasks = [
      { id: 't1', householdId: 'h', createdAt: '', updatedAt: '', hazard: 'fire', assignedMemberId: DEMO_IDS.ben, title: 'Get Grandma', order: 1, linkedSubjectType: 'member', linkedSubjectId: DEMO_IDS.grandma, tier: 'critical' },
    ];
    const steps = play(snap, 'fire');
    expect(steps.filter((s) => s.subjectId === DEMO_IDS.grandma).every((s) => s.assigneeId === DEMO_IDS.ben)).toBe(true);
  });

  it('is deterministic', () => {
    for (const h of HAZARDS) expect(play(demo, h)).toEqual(play(structuredClone(demo), h));
  });

  it('every step instruction is short and imperative-sized (§2.8 ≤ ~20 words)', () => {
    for (const h of HAZARDS) for (const s of play(demo, h)) expect(s.instruction.split(/\s+/).length).toBeLessThanOrEqual(26);
  });
});

describe('fallbacks and progress', () => {
  const demo = buildDemoHousehold();
  it('"Can’t do this" inserts the fallback right after the step', () => {
    const steps = play(demo, 'flood');
    const target = steps.find((s) => s.subjectId === DEMO_IDS.grandma)!;
    const next = insertFallback(steps, target.id);
    const i = next.findIndex((s) => s.id === target.id);
    expect(next[i + 1].instruction).toBe('Call 911 for help moving Grandma.');
    expect(insertFallback(next, target.id)).toHaveLength(next.length); // not inserted twice
  });

  it('counts per-subject progress', () => {
    const steps = play(demo, 'outage');
    const mine = steps.filter((s) => s.subjectId === DEMO_IDS.dad);
    const status = Object.fromEntries(mine.slice(0, 1).map((s) => [s.id, { status: 'done' }]));
    expect(subjectProgress(steps, status, DEMO_IDS.dad)).toEqual({ done: 1, total: mine.length });
  });

  it('suggests a helper when a Critical subject step was skipped', () => {
    const steps = play(demo, 'fire');
    const crit = steps.find((s) => s.subjectId && s.tier === 'critical')!;
    const tips = afterActionSuggestions(steps, { [crit.id]: { status: 'skipped' } }, demo);
    expect(tips.some((x) => /dedicated helper/.test(x))).toBe(true);
  });
});
