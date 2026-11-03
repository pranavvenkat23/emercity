/**
 * @jest-environment node
 */
import { ageBand } from '@/domain/members';
import { STORAGE_RULES_BY_ID } from '@/reference/storage-rules';
import { createNodeDriver } from '@/test-utils/node-driver';

import { buildDemoHousehold, DEMO_HOUSEHOLD_ID, DEMO_IDS } from './demo-household';
import { loadSnapshot, seedDemoHousehold } from './household-repo';
import { RecordStore } from './record-store';
import { migrate } from './schema';

const NOW = new Date('2026-10-24T12:00:00Z');

describe('demo household (§26.3 / §8.6)', () => {
  const demo = buildDemoHousehold();

  it('is flagged as demo and never owned by a real user', () => {
    expect(demo.household.isDemo).toBe(true);
    expect(demo.household.ownerUserId).toBeNull();
  });

  it('matches the worked-example people and ages', () => {
    const byId = Object.fromEntries(demo.members.map((m) => [m.id, m]));
    expect(ageBand(byId[DEMO_IDS.grandma], NOW)).toBe('older-adult');
    expect(ageBand(byId[DEMO_IDS.jamie], NOW)).toBe('infant');
    expect(ageBand(byId[DEMO_IDS.ben], NOW)).toBe('teen');
    expect(ageBand(byId[DEMO_IDS.dad], NOW)).toBe('adult');
    expect(demo.pets.map((p) => p.name)).toEqual(['Biscuit']);
  });

  it('has a gas furnace and no generator (OUT-C3 scenario)', () => {
    expect(demo.household.heatingType).toBe('gas');
    expect(demo.household.hasGenerator).toBe(false);
  });

  it("models Grandma's concentrator as life-sustaining with a user-entered 4 h battery", () => {
    const dev = demo.devices.find((d) => d.id === DEMO_IDS.concentrator)!;
    expect(dev.lifeSustaining).toBe(true);
    expect(dev.batteryRuntimeMinutes).toBe(240);
  });

  it('links insulin only to verified, sourced storage rules (§11.2)', () => {
    for (const med of demo.medications) {
      const rule = med.storageRuleId ? STORAGE_RULES_BY_ID[med.storageRuleId] : null;
      expect(rule).toBeTruthy();
      expect(rule!.sourceUrl).toMatch(/^https:\/\/dailymed\.nlm\.nih\.gov/);
      expect(med.userEnteredRoomTempDays ?? null).toBeNull();
    }
  });

  it('uses only reserved 555-01xx phone numbers', () => {
    for (const c of demo.contacts) expect(c.phone).toMatch(/555-01\d\d$/);
  });

  it('has internally consistent references', () => {
    const memberIds = new Set(demo.members.map((m) => m.id));
    const medIds = new Set(demo.medications.map((m) => m.id));
    const devIds = new Set(demo.devices.map((d) => d.id));
    for (const m of demo.members) {
      m.medicationIds.forEach((id) => expect(medIds.has(id)).toBe(true));
      m.deviceIds.forEach((id) => expect(devIds.has(id)).toBe(true));
    }
    demo.medications.forEach((med) => expect(memberIds.has(med.ownerId)).toBe(true));
    demo.devices.forEach((d) => expect(memberIds.has(d.memberId)).toBe(true));
  });
});

describe('seed + load', () => {
  it('round-trips the demo household without queuing any sync ops', async () => {
    const db = createNodeDriver();
    await migrate(db);
    const records = new RecordStore(db);
    await seedDemoHousehold(records);
    await seedDemoHousehold(records); // reset is idempotent

    const snap = await loadSnapshot(records, DEMO_HOUSEHOLD_ID);
    expect(snap?.household.name).toBe('The Doe Household');
    expect(snap?.members).toHaveLength(5);
    expect(snap?.devices).toHaveLength(1);
    expect(await records.pendingSyncCount()).toBe(0);
  });

  it('returns null for an unknown household', async () => {
    const db = createNodeDriver();
    await migrate(db);
    expect(await loadSnapshot(new RecordStore(db), 'nope')).toBeNull();
  });
});
