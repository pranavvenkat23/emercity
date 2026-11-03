import type {
  Address,
  Condition,
  ConditionType,
  Device,
  DeviceType,
  HeatingType,
  HomeType,
  Household,
  Language,
  Member,
  MemberRole,
  Pet,
  PetSpecies,
} from '@/models/types';

/**
 * Guided setup rules (§5). No AI: every chip maps to fixed fields.
 */

// ───────────── ONB-05 quick-add chips ─────────────

export type PersonChip = 'adult' | 'older-adult' | 'teen' | 'child' | 'toddler' | 'baby' | 'pregnant';

export const PERSON_CHIPS: { id: PersonChip; label: string; role: MemberRole }[] = [
  { id: 'adult', label: 'Adult', role: 'adult' },
  { id: 'older-adult', label: 'Older adult (65+)', role: 'older-adult' },
  { id: 'teen', label: 'Teen (13–17)', role: 'teen' },
  { id: 'child', label: 'Child (4–12)', role: 'child' },
  { id: 'toddler', label: 'Toddler (1–3)', role: 'child' },
  { id: 'baby', label: 'Baby (under 1)', role: 'infant' },
  { id: 'pregnant', label: 'Pregnant person', role: 'adult' },
];

export const PET_CHIPS: { id: PetSpecies; label: string }[] = [
  { id: 'dog', label: 'Dog' },
  { id: 'cat', label: 'Cat' },
  { id: 'bird', label: 'Bird' },
  { id: 'small-mammal', label: 'Small animal' },
  { id: 'reptile', label: 'Reptile' },
  { id: 'fish', label: 'Fish' },
  { id: 'other', label: 'Other pet' },
];

/** Placeholder names ("Older adult 1") until the user names them on ONB-06. */
export function placeholderName(label: string, index: number): string {
  const base = label.replace(/\s*\(.*\)\s*$/, '');
  return `${base} ${index}`;
}

/**
 * Approximate birth date for an age band so age-band rules work before the
 * user enters a real date. Flagged with birthYearOnly and replaced on ONB-06.
 * Toddlers get age 2 (middle of 1–3) so they are not mistaken for infants.
 */
export function defaultBirthDate(chip: PersonChip, now: Date): string | null {
  const y = now.getUTCFullYear();
  switch (chip) {
    case 'toddler':
      return `${y - 2}-01-01`;
    case 'baby':
      return `${y}-01-01`;
    default:
      return null;
  }
}

export function newMemberFromChip(
  chip: PersonChip,
  index: number,
  ids: { id: string; householdId: string },
  now: Date,
): Member {
  const def = PERSON_CHIPS.find((c) => c.id === chip)!;
  const iso = now.toISOString();
  const birth = defaultBirthDate(chip, now);
  return {
    id: ids.id,
    householdId: ids.householdId,
    createdAt: iso,
    updatedAt: iso,
    linkedUserId: null,
    firstName: placeholderName(def.label, index),
    birthDate: birth,
    birthYearOnly: birth != null,
    role: def.role,
    conditions: chip === 'pregnant' ? [{ type: 'pregnancy', severity: 'moderate' }] : [],
    medicationIds: [],
    deviceIds: [],
    allergies: [],
    primaryLanguage: 'en',
    canDrive: false,
  };
}

export function newPetFromChip(
  species: PetSpecies,
  index: number,
  ids: { id: string; householdId: string },
  now: Date,
): Pet {
  const def = PET_CHIPS.find((c) => c.id === species)!;
  const iso = now.toISOString();
  return {
    id: ids.id,
    householdId: ids.householdId,
    createdAt: iso,
    updatedAt: iso,
    name: placeholderName(def.label, index),
    species,
    size: 'medium',
    needsCarrier: species !== 'fish',
    medicationIds: [],
    specialNeeds: [],
  };
}

// ───────────── ONB-06 / HH-03 health chips ─────────────

export type HealthChipId =
  | 'insulin'
  | 'diabetes-oral'
  | 'oxygen'
  | 'ventilator'
  | 'cpap'
  | 'dialysis-home'
  | 'dialysis-center'
  | 'feeding-pump'
  | 'seizures'
  | 'heart'
  | 'respiratory'
  | 'epipen'
  | 'critical-meds'
  | 'wheelchair'
  | 'walker'
  | 'bedbound'
  | 'hearing'
  | 'vision'
  | 'dementia'
  | 'autism'
  | 'pregnant'
  | 'formula'
  | 'limited-english'
  | 'cannot-swim'
  | 'temperature';

export interface HealthChip {
  id: HealthChipId;
  label: string;
  group: 'Medical' | 'Mobility and senses' | 'Other';
  condition?: ConditionType;
  device?: DeviceType;
}

/** §5.6 chip list, in spec order. */
export const HEALTH_CHIPS: HealthChip[] = [
  { id: 'insulin', label: 'Insulin', group: 'Medical', condition: 'diabetes-insulin' },
  { id: 'diabetes-oral', label: 'Other diabetes meds', group: 'Medical', condition: 'diabetes-oral' },
  { id: 'oxygen', label: 'Oxygen', group: 'Medical', condition: 'oxygen-dependent' },
  { id: 'ventilator', label: 'Ventilator', group: 'Medical', condition: 'ventilator', device: 'home-ventilator' },
  { id: 'cpap', label: 'CPAP/BiPAP', group: 'Medical', device: 'cpap-bipap' },
  { id: 'dialysis-home', label: 'Home dialysis', group: 'Medical', condition: 'dialysis-home', device: 'home-dialysis' },
  { id: 'dialysis-center', label: 'Dialysis at a center', group: 'Medical', condition: 'dialysis-center' },
  { id: 'feeding-pump', label: 'Feeding pump', group: 'Medical', device: 'feeding-pump' },
  { id: 'seizures', label: 'Seizures', group: 'Medical', condition: 'seizure-disorder' },
  { id: 'heart', label: 'Heart condition', group: 'Medical', condition: 'heart-condition' },
  { id: 'respiratory', label: 'Asthma/COPD', group: 'Medical', condition: 'respiratory-asthma' },
  { id: 'epipen', label: 'Severe allergy (EpiPen)', group: 'Medical', condition: 'severe-allergy-epipen' },
  { id: 'critical-meds', label: 'Takes daily critical meds', group: 'Medical', condition: 'critical-daily-meds' },
  { id: 'wheelchair', label: 'Wheelchair', group: 'Mobility and senses', condition: 'mobility-wheelchair' },
  { id: 'walker', label: 'Walker/cane', group: 'Mobility and senses', condition: 'mobility-walker' },
  { id: 'bedbound', label: 'Bedbound', group: 'Mobility and senses', condition: 'bedbound' },
  { id: 'hearing', label: 'Hard of hearing / Deaf', group: 'Mobility and senses', condition: 'hearing-loss' },
  { id: 'vision', label: 'Low vision / Blind', group: 'Mobility and senses', condition: 'vision-loss' },
  { id: 'dementia', label: 'Dementia/memory loss', group: 'Other', condition: 'cognitive-dementia' },
  { id: 'autism', label: 'Autism / sensory needs', group: 'Other', condition: 'cognitive-autism' },
  { id: 'pregnant', label: 'Pregnant', group: 'Other', condition: 'pregnancy' },
  { id: 'formula', label: 'Uses formula (babies)', group: 'Other', condition: 'infant-formula' },
  { id: 'limited-english', label: "Doesn't speak English well", group: 'Other', condition: 'limited-english' },
  { id: 'cannot-swim', label: "Can't swim (children)", group: 'Other', condition: 'cannot-swim' },
  { id: 'temperature', label: 'Heat or cold sensitive', group: 'Other', condition: 'temperature-sensitive' },
];

/** Follow-up answers for chips that open an inline question (§5.6). */
export interface HealthFollowUps {
  oxygenUsage?: 'continuous' | 'night-or-activity';
  oxygenSource?: 'concentrator' | 'tanks' | 'both';
  insulinForm?: 'pens' | 'vials' | 'pump';
  /** Battery runtime in minutes for ventilator / feeding pump / home dialysis; null = "Not sure". */
  batteryMinutes?: Partial<Record<'ventilator' | 'feeding-pump' | 'dialysis-home', number | null>>;
  language?: Language;
}

/** Selected chips for an existing member, derived from conditions and devices. */
export function chipsForMember(member: Pick<Member, 'conditions'>, devices: Pick<Device, 'type'>[]): Set<HealthChipId> {
  const out = new Set<HealthChipId>();
  for (const chip of HEALTH_CHIPS) {
    if (chip.condition && member.conditions.some((c) => c.type === chip.condition)) out.add(chip.id);
    else if (!chip.condition && chip.device && devices.some((d) => d.type === chip.device)) out.add(chip.id);
  }
  return out;
}

/**
 * Life-sustaining per §4.2: ventilator, continuous oxygen, sole-nutrition
 * feeding pump, home dialysis. Feeding pumps default to life-sustaining
 * (conservative, §8.4 "when in doubt, tier higher") until the user says the
 * pump isn't their only nutrition.
 */
export function isLifeSustaining(type: DeviceType, opts: { oxygenContinuous?: boolean; soleNutrition?: boolean } = {}): boolean {
  switch (type) {
    case 'home-ventilator':
    case 'home-dialysis':
      return true;
    case 'oxygen-concentrator':
      return opts.oxygenContinuous !== false;
    case 'feeding-pump':
      return opts.soleNutrition !== false;
    default:
      return false;
  }
}

export interface HealthChange {
  conditions: Condition[];
  /** Devices to create (type + defaults); the caller assigns ids. */
  addDevices: Omit<Device, 'id' | 'householdId' | 'createdAt' | 'updatedAt' | 'memberId'>[];
  /** Existing device ids to remove because their chip was cleared. */
  removeDeviceIds: string[];
  /** Existing device ids whose fields changed due to follow-ups. */
  updateDevices: { id: string; patch: Partial<Device> }[];
  primaryLanguage?: Language;
}

const DEVICE_LABEL: Partial<Record<DeviceType, string>> = {
  'oxygen-concentrator': 'Oxygen concentrator',
  'home-ventilator': 'Home ventilator',
  'cpap-bipap': 'CPAP/BiPAP',
  'feeding-pump': 'Feeding pump',
  'home-dialysis': 'Home dialysis machine',
};

/**
 * Applies chip selections to a member: rebuilds conditions (keeping severity
 * and notes of conditions that stay), and works out which devices to add or
 * remove. Conditions not represented by any chip (e.g. 'other') are kept.
 */
export function applyHealthChips(
  member: Pick<Member, 'conditions'>,
  existingDevices: Pick<Device, 'id' | 'type'>[],
  selected: Set<HealthChipId>,
  follow: HealthFollowUps,
): HealthChange {
  const chipConditions = new Set(HEALTH_CHIPS.map((c) => c.condition).filter(Boolean) as ConditionType[]);
  const kept = member.conditions.filter((c) => !chipConditions.has(c.type));
  const conditions: Condition[] = [...kept];

  for (const chip of HEALTH_CHIPS) {
    if (!selected.has(chip.id) || !chip.condition) continue;
    const prev = member.conditions.find((c) => c.type === chip.condition);
    const cond: Condition = prev ? { ...prev } : { type: chip.condition, severity: 'moderate' };
    if (chip.id === 'oxygen') {
      if (follow.oxygenUsage) cond.oxygenUsage = follow.oxygenUsage;
      if (follow.oxygenSource) cond.oxygenSource = follow.oxygenSource;
    }
    if (chip.id === 'insulin' && follow.insulinForm) cond.insulinForm = follow.insulinForm;
    conditions.push(cond);
  }

  // Which device types the selection implies.
  const wanted = new Map<DeviceType, { lifeSustaining: boolean; battery: number | null | undefined }>();
  for (const chip of HEALTH_CHIPS) {
    if (!selected.has(chip.id)) continue;
    if (chip.device) {
      const key = chip.device === 'home-ventilator' ? 'ventilator' : chip.device === 'home-dialysis' ? 'dialysis-home' : chip.device === 'feeding-pump' ? 'feeding-pump' : null;
      wanted.set(chip.device, {
        lifeSustaining: isLifeSustaining(chip.device),
        battery: key ? follow.batteryMinutes?.[key] : undefined,
      });
    }
    if (chip.id === 'oxygen') {
      const oxygen = conditions.find((c) => c.type === 'oxygen-dependent');
      const source = oxygen?.oxygenSource;
      // Tanks alone don't need power; a concentrator (or unknown source) does.
      if (source !== 'tanks') {
        wanted.set('oxygen-concentrator', {
          lifeSustaining: isLifeSustaining('oxygen-concentrator', { oxygenContinuous: oxygen?.oxygenUsage !== 'night-or-activity' }),
          battery: undefined,
        });
      }
    }
  }

  const addDevices: HealthChange['addDevices'] = [];
  const updateDevices: HealthChange['updateDevices'] = [];
  for (const [type, info] of wanted) {
    const existing = existingDevices.find((d) => d.type === type);
    if (existing) {
      const patch: Partial<Device> = {};
      if (type === 'oxygen-concentrator') patch.lifeSustaining = info.lifeSustaining;
      if (info.battery !== undefined) {
        patch.hasInternalBattery = info.battery != null;
        patch.batteryRuntimeMinutes = info.battery;
      }
      if (Object.keys(patch).length) updateDevices.push({ id: existing.id, patch });
      continue;
    }
    addDevices.push({
      type,
      label: DEVICE_LABEL[type],
      usesElectricity: true,
      lifeSustaining: info.lifeSustaining,
      powerWatts: null,
      hasInternalBattery: info.battery != null,
      batteryRuntimeMinutes: info.battery ?? null,
      backupBatteryCount: 0,
      backupRuntimeMinutes: null,
      backupNonElectric: '',
      backupNonElectricMinutes: null,
      registeredWithUtility: 'not-sure',
    });
  }

  const chipDeviceTypes = new Set<DeviceType>(['oxygen-concentrator', 'home-ventilator', 'cpap-bipap', 'feeding-pump', 'home-dialysis']);
  const removeDeviceIds = existingDevices
    .filter((d) => chipDeviceTypes.has(d.type as DeviceType) && !wanted.has(d.type as DeviceType))
    .map((d) => d.id);

  return {
    conditions,
    addDevices,
    removeDeviceIds,
    updateDevices,
    primaryLanguage: selected.has('limited-english') ? follow.language : undefined,
  };
}

/** True if removing these chips drops a life-sustaining need (HH-03 confirmation). */
export function removesLifeSustaining(before: Set<HealthChipId>, after: Set<HealthChipId>): HealthChipId[] {
  const critical: HealthChipId[] = ['oxygen', 'ventilator', 'dialysis-home', 'feeding-pump'];
  return critical.filter((c) => before.has(c) && !after.has(c));
}

// ───────────── ONB-08 implied items ─────────────

export interface ImpliedItem {
  memberId: string;
  kind: 'medication' | 'device';
  label: string;
  /** Present when the item already exists (device created from chips). */
  deviceId?: string;
  lifeSustaining: boolean;
  complete: boolean;
}

/**
 * What the chips imply still needs details (§5.8): devices without battery
 * info and insulin without a medication record.
 */
export function impliedItems(
  members: Pick<Member, 'id' | 'conditions' | 'medicationIds'>[],
  devices: (Pick<Device, 'id' | 'memberId' | 'type' | 'label' | 'lifeSustaining' | 'hasInternalBattery' | 'batteryRuntimeMinutes'> &
    Partial<Pick<Device, 'backupBatteryCount' | 'backupRuntimeMinutes' | 'backupNonElectricMinutes'>>)[],
  medications: { ownerId: string; genericName?: string; brandName: string }[],
): ImpliedItem[] {
  const out: ImpliedItem[] = [];
  for (const m of members) {
    for (const d of devices.filter((x) => x.memberId === m.id)) {
      out.push({
        memberId: m.id,
        kind: 'device',
        label: d.label ?? d.type,
        deviceId: d.id,
        lifeSustaining: d.lifeSustaining,
        // Complete once any backup runtime is recorded (internal battery, spares,
        // or a non-electric backup). A device with nothing recorded is never
        // shown as done (§5.8, §6.4).
        complete:
          (d.hasInternalBattery && (d.batteryRuntimeMinutes ?? 0) > 0) ||
          ((d.backupBatteryCount ?? 0) > 0 && (d.backupRuntimeMinutes ?? 0) > 0) ||
          (d.backupNonElectricMinutes ?? 0) > 0,
      });
    }
    if (m.conditions.some((c) => c.type === 'diabetes-insulin')) {
      const has = medications.some(
        (med) => med.ownerId === m.id && /insulin/i.test(`${med.genericName ?? ''} ${med.brandName}`),
      );
      out.push({ memberId: m.id, kind: 'medication', label: 'Insulin', lifeSustaining: false, complete: has });
    }
  }
  return out;
}

// ───────────── ONB-04 address and household ─────────────

export interface CensusMatch {
  matchedAddress: string;
  coordinates: { x: number; y: number };
  addressComponents: { city: string; state: string; zip: string };
  geographies?: { Counties?: { NAME: string }[] };
}

const DIRECTIONS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);
const STATES = /^[A-Z]{2}$/;

/** "1 HARRISON ST SE" to "1 Harrison St SE" (directions and state codes stay upper case). */
export function titleCaseAddress(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (DIRECTIONS.has(w.toUpperCase()) ? w.toUpperCase() : w.replace(/^([a-z])/, (c) => c.toUpperCase())))
    .join(' ');
}

/** Census geocoder match to Address (§5.4, §24). */
export function addressFromCensus(m: CensusMatch): Address {
  const line1 = titleCaseAddress(m.matchedAddress.split(',')[0] ?? '');
  const state = m.addressComponents.state;
  return {
    line1,
    city: titleCaseAddress(m.addressComponents.city),
    state: STATES.test(state) ? state : state.toUpperCase(),
    zip: m.addressComponents.zip,
    county: m.geographies?.Counties?.[0]?.NAME,
    lat: m.coordinates.y,
    lng: m.coordinates.x,
    geocodeSource: 'U.S. Census Bureau geocoder',
  };
}

export const isLoudoun = (county: string | null | undefined) => /loudoun/i.test(county ?? '');

export interface HomeAnswers {
  homeType: HomeType;
  floorLevel: number | null;
  hasBasement: boolean;
  heatingType: HeatingType;
  hasGenerator: boolean;
  generatorWatts: number | null;
  hasBatteryBackup: boolean;
}

/** The household root record created on ONB-04. The creator is the owner (§19.3). */
export function newHousehold(address: Address, home: HomeAnswers, ids: { id: string; ownerUserId: string | null }, now: Date): Household {
  const iso = now.toISOString();
  return {
    id: ids.id,
    createdAt: iso,
    updatedAt: iso,
    name: 'Our household',
    address,
    homeType: home.homeType,
    floorLevel: home.homeType.startsWith('apartment') ? home.floorLevel : null,
    hasBasement: home.hasBasement,
    heatingType: home.heatingType,
    hasGenerator: home.hasGenerator,
    generatorWatts: home.hasGenerator ? home.generatorWatts : null,
    generatorFuelHours: null,
    hasBatteryBackup: home.hasBatteryBackup,
    batteryWh: null,
    vehicleCount: 0,
    vehicleSeats: 0,
    ownerUserId: ids.ownerUserId,
    inviteCode: null,
    readinessScore: null,
    roles: ids.ownerUserId ? { [ids.ownerUserId]: 'owner' } : {},
    isDemo: false,
    defaultHazard: null,
  };
}
