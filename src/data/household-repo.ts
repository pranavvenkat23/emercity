import type { Household, HouseholdSnapshot } from '@/models/types';

import { buildDemoHousehold, DEMO_HOUSEHOLD_ID } from './demo-household';
import type { RecordStore } from './record-store';

/** Reads a full household snapshot from the local database. */
export async function loadSnapshot(
  records: RecordStore,
  householdId: string,
): Promise<HouseholdSnapshot | null> {
  const household = await records.get<Household>('households', householdId);
  if (!household) return null;
  const [members, pets, medications, devices, contacts, meetingPoints, supplies, tasks, sessions, drills, checkIns] =
    await Promise.all([
      records.list<HouseholdSnapshot['members'][number]>('members', householdId),
      records.list<HouseholdSnapshot['pets'][number]>('pets', householdId),
      records.list<HouseholdSnapshot['medications'][number]>('medications', householdId),
      records.list<HouseholdSnapshot['devices'][number]>('devices', householdId),
      records.list<HouseholdSnapshot['contacts'][number]>('contacts', householdId),
      records.list<HouseholdSnapshot['meetingPoints'][number]>('meetingPoints', householdId),
      records.list<HouseholdSnapshot['supplies'][number]>('supplies', householdId),
      records.list<HouseholdSnapshot['tasks'][number]>('tasks', householdId),
      records.list<HouseholdSnapshot['sessions'][number]>('sessions', householdId),
      records.list<HouseholdSnapshot['drills'][number]>('drills', householdId),
      records.list<HouseholdSnapshot['checkIns'][number]>('checkIns', householdId),
    ]);
  return {
    household,
    members: members.filter((m) => !m.archived),
    pets,
    medications,
    devices,
    contacts,
    meetingPoints,
    supplies,
    tasks,
    sessions,
    drills,
    checkIns,
  };
}

/** Writes a whole snapshot. Used for the demo seed; demo writes never sync. */
export async function writeSnapshot(
  records: RecordStore,
  snap: HouseholdSnapshot,
  opts: { sync: boolean },
): Promise<void> {
  const id = snap.household.id;
  await records.upsert('households', id, snap.household, opts);
  const groups = [
    ['members', snap.members],
    ['pets', snap.pets],
    ['medications', snap.medications],
    ['devices', snap.devices],
    ['contacts', snap.contacts],
    ['meetingPoints', snap.meetingPoints],
    ['supplies', snap.supplies],
    ['tasks', snap.tasks],
    ['sessions', snap.sessions],
    ['drills', snap.drills],
    ['checkIns', snap.checkIns],
  ] as const;
  for (const [collection, items] of groups) {
    for (const item of items) await records.upsert(collection, id, item, opts);
  }
}

/** Replaces the demo household with a fresh copy (also used by "Reset demo"). */
export async function seedDemoHousehold(records: RecordStore): Promise<HouseholdSnapshot> {
  await records.deleteHousehold(DEMO_HOUSEHOLD_ID);
  const snap = buildDemoHousehold();
  await writeSnapshot(records, snap, { sync: false });
  return snap;
}
