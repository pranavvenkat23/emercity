import type {
  Condition,
  ConditionType,
  Device,
  DeviceType,
  Household,
  HouseholdSnapshot,
  Medication,
  Member,
  MemberRole,
  Pet,
} from '@/models/types';

/** Fixed "today" for engine fixtures. Ages below are relative to it. */
export const FIXTURE_NOW = new Date('2026-10-24T14:00:00'); // local 2 PM

const iso = '2026-10-01T00:00:00.000Z';

export function birthForAge(years: number, months = 0): string {
  const d = new Date(FIXTURE_NOW);
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export interface PersonSpec {
  id: string;
  name?: string;
  age: number;
  months?: number;
  role?: MemberRole;
  conditions?: (ConditionType | Condition)[];
  sleepsIn?: Member['sleepsIn'];
  canSwim?: boolean;
  readyToFeedFormulaDays?: number | null;
  sleepsNearLargeWindows?: boolean;
  needsHelpEvacuatingOverride?: boolean;
}

export interface DeviceSpec {
  id: string;
  member: string;
  type: DeviceType;
  lifeSustaining?: boolean;
  batteryMin?: number | null;
  spares?: number;
  spareMin?: number | null;
  nonElectricMin?: number | null;
  watts?: number | null;
  usesElectricity?: boolean;
}

export interface MedSpec {
  id: string;
  owner: string;
  ownerType?: 'member' | 'pet';
  name?: string;
  critical?: boolean;
  fridge?: boolean;
  daysOfSupply?: number | null;
}

export interface PetSpec {
  id: string;
  name?: string;
  species?: Pet['species'];
  specialNeeds?: string[];
}

export function person(p: PersonSpec): Member {
  const role: MemberRole =
    p.role ?? (p.age < 1 ? 'infant' : p.age < 13 ? 'child' : p.age < 18 ? 'teen' : p.age >= 65 ? 'older-adult' : 'adult');
  return {
    id: p.id,
    householdId: 'hh',
    createdAt: iso,
    updatedAt: iso,
    linkedUserId: null,
    firstName: p.name ?? p.id,
    birthDate: birthForAge(p.age, p.months ?? 0),
    role,
    conditions: (p.conditions ?? []).map((c) => (typeof c === 'string' ? { type: c, severity: 'moderate' as const } : c)),
    medicationIds: [],
    deviceIds: [],
    allergies: [],
    primaryLanguage: 'en',
    canDrive: p.age >= 18,
    canSwim: p.canSwim,
    sleepsIn: p.sleepsIn ?? 'upper-floor',
    readyToFeedFormulaDays: p.readyToFeedFormulaDays,
    sleepsNearLargeWindows: p.sleepsNearLargeWindows,
    needsHelpEvacuatingOverride: p.needsHelpEvacuatingOverride,
  };
}

export function device(d: DeviceSpec): Device {
  return {
    id: d.id,
    householdId: 'hh',
    createdAt: iso,
    updatedAt: iso,
    memberId: d.member,
    type: d.type,
    label: d.type,
    usesElectricity: d.usesElectricity ?? true,
    lifeSustaining: d.lifeSustaining ?? false,
    powerWatts: d.watts ?? null,
    hasInternalBattery: d.batteryMin != null,
    batteryRuntimeMinutes: d.batteryMin ?? null,
    backupBatteryCount: d.spares ?? 0,
    backupRuntimeMinutes: d.spareMin ?? null,
    backupNonElectric: '',
    backupNonElectricMinutes: d.nonElectricMin ?? null,
    registeredWithUtility: 'not-sure',
  };
}

export function med(m: MedSpec): Medication {
  return {
    id: m.id,
    householdId: 'hh',
    createdAt: iso,
    updatedAt: iso,
    ownerType: m.ownerType ?? 'member',
    ownerId: m.owner,
    ndcProductCode: null,
    brandName: m.name ?? m.id,
    isCritical: m.critical ?? false,
    needsRefrigeration: m.fridge ?? false,
    storageRuleId: null,
    isOpened: false,
    daysOfSupply: m.daysOfSupply === undefined ? 30 : m.daysOfSupply,
    packedInGoBag: false,
  };
}

export function pet(p: PetSpec): Pet {
  return {
    id: p.id,
    householdId: 'hh',
    createdAt: iso,
    updatedAt: iso,
    name: p.name ?? p.id,
    species: p.species ?? 'dog',
    size: 'medium',
    needsCarrier: true,
    medicationIds: [],
    specialNeeds: p.specialNeeds ?? [],
  };
}

export function household(
  parts: {
    people: PersonSpec[];
    devices?: DeviceSpec[];
    meds?: MedSpec[];
    pets?: PetSpec[];
  },
  home: Partial<Household> = {},
): HouseholdSnapshot {
  const devices = (parts.devices ?? []).map(device);
  const medications = (parts.meds ?? []).map(med);
  const members = parts.people.map(person).map((m) => ({
    ...m,
    deviceIds: devices.filter((d) => d.memberId === m.id).map((d) => d.id),
    medicationIds: medications.filter((x) => x.ownerId === m.id).map((x) => x.id),
  }));
  return {
    household: {
      id: 'hh',
      createdAt: iso,
      updatedAt: iso,
      name: 'Fixture',
      address: { line1: '1 Test St', city: 'Leesburg', state: 'VA', zip: '20175', lat: 39.1, lng: -77.5 },
      homeType: 'single-family',
      hasBasement: false,
      heatingType: 'gas',
      hasGenerator: false,
      hasBatteryBackup: false,
      vehicleCount: 1,
      vehicleSeats: 5,
      ownerUserId: null,
      inviteCode: null,
      readinessScore: null,
      roles: {},
      isDemo: false,
      ...home,
    },
    members,
    pets: (parts.pets ?? []).map(pet),
    medications,
    devices,
    contacts: [],
    meetingPoints: [],
    supplies: [],
    tasks: [],
    sessions: [],
    drills: [],
    checkIns: [],
  };
}
