import type {
  Contact,
  Device,
  Household,
  HouseholdSnapshot,
  Medication,
  MeetingPoint,
  Member,
  Pet,
} from '@/models/types';

/**
 * Built-in demo household (spec §26.3), from the worked example in §8.6:
 * Grandma (82, continuous oxygen concentrator, 4 h battery, walker), Dad (46,
 * insulin, opened pens), Mom (44), Baby Jamie (8 months, formula), teen Ben
 * (15), dog Biscuit. Gas furnace (blower needs electricity), no generator.
 *
 * Everything here is fictional. Phone numbers use the reserved 555-01xx
 * range. The street address is invented; coordinates are a general point
 * just north of Leesburg, VA chosen to match §26.3: inside a FEMA Zone AE
 * flood area, within 500 ft of a stream, about 0.3 mi from the NWPS gauge
 * LBUV2 (Limestone Branch near Leesburg). Verified against FEMA NFHL, USGS
 * NHD and the Census geocoder on 2026-10-24. All screens
 * label this household "Demo" and it is never synced to the cloud.
 *
 * Choices the spec leaves open (documented so they aren't mistaken for spec
 * requirements): the home has a basement; Grandma sleeps on the ground
 * floor; no backup oxygen is recorded yet (so readiness shows that gap, as
 * in the §6.1 example); only the near-home meeting point is set.
 */

export const DEMO_HOUSEHOLD_ID = 'demo-household';
const H = DEMO_HOUSEHOLD_ID;
const CREATED = '2026-10-01T12:00:00.000Z';

const base = { householdId: H, createdAt: CREATED, updatedAt: CREATED };

export const DEMO_IDS = {
  grandma: 'demo-m-grandma',
  dad: 'demo-m-dad',
  mom: 'demo-m-mom',
  jamie: 'demo-m-jamie',
  ben: 'demo-m-ben',
  biscuit: 'demo-p-biscuit',
  insulinPens: 'demo-med-insulin-pens',
  insulinSpare: 'demo-med-insulin-spare',
  concentrator: 'demo-dev-concentrator',
} as const;

export function buildDemoHousehold(): HouseholdSnapshot {
  const household: Household = {
    id: H,
    createdAt: CREATED,
    updatedAt: CREATED,
    name: 'The Doe Household',
    address: {
      line1: '100 Example Creek Lane',
      city: 'Leesburg',
      state: 'VA',
      zip: '20175',
      county: 'Loudoun County',
      lat: 39.1633,
      lng: -77.5377,
      geocodeSource: 'demo',
    },
    homeType: 'single-family',
    floorLevel: null,
    hasBasement: true,
    heatingType: 'gas',
    hasGenerator: false,
    hasBatteryBackup: false,
    vehicleCount: 2,
    vehicleSeats: 10,
    ownerUserId: null,
    inviteCode: null,
    readinessScore: null,
    roles: {},
    isDemo: true,
    defaultHazard: null,
  };

  const members: Member[] = [
    {
      ...base,
      id: DEMO_IDS.grandma,
      linkedUserId: null,
      firstName: 'Margaret',
      lastName: 'Doe',
      nickname: 'Grandma',
      birthDate: '1944-03-15',
      role: 'older-adult',
      conditions: [
        {
          type: 'oxygen-dependent',
          severity: 'severe',
          oxygenUsage: 'continuous',
          oxygenSource: 'concentrator',
        },
        { type: 'mobility-walker', severity: 'moderate' },
      ],
      medicationIds: [],
      deviceIds: [DEMO_IDS.concentrator],
      allergies: ['penicillin'],
      primaryLanguage: 'en',
      canDrive: false,
      sleepsIn: 'ground-floor',
      notes: 'Gets confused in the dark. Keep a flashlight by her bed.',
    },
    {
      ...base,
      id: DEMO_IDS.dad,
      linkedUserId: null,
      firstName: 'John',
      lastName: 'Doe',
      nickname: 'Dad',
      phone: '703-555-0102',
      birthDate: '1980-05-02',
      role: 'adult',
      conditions: [{ type: 'diabetes-insulin', severity: 'moderate', insulinForm: 'pens' }],
      medicationIds: [DEMO_IDS.insulinPens, DEMO_IDS.insulinSpare],
      deviceIds: [],
      allergies: [],
      primaryLanguage: 'en',
      canDrive: true,
      sleepsIn: 'upper-floor',
    },
    {
      ...base,
      id: DEMO_IDS.mom,
      linkedUserId: null,
      firstName: 'Jennifer',
      lastName: 'Doe',
      nickname: 'Mom',
      phone: '703-555-0101',
      birthDate: '1982-08-19',
      role: 'adult',
      conditions: [],
      medicationIds: [],
      deviceIds: [],
      allergies: [],
      primaryLanguage: 'en',
      canDrive: true,
      sleepsIn: 'upper-floor',
    },
    {
      ...base,
      id: DEMO_IDS.jamie,
      linkedUserId: null,
      firstName: 'Jamie',
      lastName: 'Doe',
      nickname: 'Baby Jamie',
      birthDate: '2026-02-10',
      role: 'infant',
      conditions: [{ type: 'infant-formula', severity: 'moderate' }],
      medicationIds: [],
      deviceIds: [],
      allergies: [],
      primaryLanguage: 'en',
      canDrive: false,
      sleepsIn: 'upper-floor',
      readyToFeedFormulaDays: 1,
    },
    {
      ...base,
      id: DEMO_IDS.ben,
      linkedUserId: null,
      firstName: 'Ben',
      lastName: 'Doe',
      phone: '703-555-0103',
      birthDate: '2011-06-30',
      role: 'teen',
      conditions: [],
      medicationIds: [],
      deviceIds: [],
      allergies: ['peanuts'],
      primaryLanguage: 'en',
      canDrive: false,
      canSwim: true,
      sleepsIn: 'upper-floor',
    },
  ];

  const pets: Pet[] = [
    {
      ...base,
      id: DEMO_IDS.biscuit,
      name: 'Biscuit',
      species: 'dog',
      size: 'medium',
      microchipId: '985000000012345',
      needsCarrier: true,
      carrierLocation: 'Garage shelf',
      medicationIds: [],
      specialNeeds: [],
      foodDaysOnHand: 5,
    },
  ];

  const medications: Medication[] = [
    {
      ...base,
      id: DEMO_IDS.insulinPens,
      ownerType: 'member',
      ownerId: DEMO_IDS.dad,
      ndcProductCode: null,
      brandName: 'Humalog KwikPen (in use)',
      genericName: 'insulin lispro',
      strength: '100 units/mL',
      dosageForm: 'injection, solution',
      route: 'subcutaneous',
      dose: '10 units',
      frequency: 'twice daily',
      isCritical: true,
      needsRefrigeration: true,
      // Verified label rule (src/reference/storage-rules.ts): 28 days ≤ 86°F.
      storageRuleId: 'humalog',
      isOpened: true,
      openedDate: '2026-10-15',
      quantityOnHand: 2,
      quantityUnit: 'pens',
      daysOfSupply: 18,
      refillDate: '2026-11-05',
      pharmacyName: 'Example Pharmacy',
      pharmacyPhone: '703-555-0150',
      packedInGoBag: false,
    },
    {
      ...base,
      id: DEMO_IDS.insulinSpare,
      ownerType: 'member',
      ownerId: DEMO_IDS.dad,
      ndcProductCode: null,
      brandName: 'Humalog KwikPen (spare box)',
      genericName: 'insulin lispro',
      strength: '100 units/mL',
      dosageForm: 'injection, solution',
      route: 'subcutaneous',
      isCritical: true,
      needsRefrigeration: true,
      storageRuleId: 'humalog',
      isOpened: false,
      quantityOnHand: 5,
      quantityUnit: 'pens',
      daysOfSupply: 45,
      packedInGoBag: false,
    },
  ];

  const devices: Device[] = [
    {
      ...base,
      id: DEMO_IDS.concentrator,
      memberId: DEMO_IDS.grandma,
      type: 'oxygen-concentrator',
      label: 'Oxygen concentrator',
      usesElectricity: true,
      lifeSustaining: true,
      powerWatts: 300,
      hasInternalBattery: true,
      // User-entered estimate from the demo scenario (§8.6), not a manufacturer figure.
      batteryRuntimeMinutes: 240,
      backupBatteryCount: 0,
      backupRuntimeMinutes: null,
      backupNonElectric: '',
      backupNonElectricMinutes: null,
      supplierName: 'Example Medical Supply',
      supplierPhone: '703-555-0177',
      registeredWithUtility: 'not-sure',
    },
  ];

  const contacts: Contact[] = [
    {
      ...base,
      id: 'demo-c-mom',
      name: 'Jennifer (Mom)',
      relationship: 'Parent',
      phone: '703-555-0101',
      type: 'emergency',
      isOutOfArea: false,
    },
    {
      ...base,
      id: 'demo-c-uncle',
      name: 'Uncle Mike',
      relationship: 'Uncle',
      phone: '404-555-0199',
      type: 'out-of-area',
      isOutOfArea: true,
    },
    {
      ...base,
      id: 'demo-c-doctor',
      name: 'Dr. Example (family doctor)',
      phone: '703-555-0120',
      type: 'doctor',
      isOutOfArea: false,
    },
    {
      ...base,
      id: 'demo-c-pharmacy',
      name: 'Example Pharmacy',
      phone: '703-555-0150',
      type: 'pharmacy',
      isOutOfArea: false,
    },
    {
      ...base,
      id: 'demo-c-supplier',
      name: 'Example Medical Supply',
      phone: '703-555-0177',
      type: 'medical-supplier',
      isOutOfArea: false,
    },
  ];

  const meetingPoints: MeetingPoint[] = [
    {
      ...base,
      id: 'demo-mp-near',
      type: 'near-home',
      name: 'The mailbox',
      description: 'By the mailbox at the end of the driveway',
      lat: 39.1631,
      lng: -77.5381,
    },
  ];

  return {
    household,
    members,
    pets,
    medications,
    devices,
    contacts,
    meetingPoints,
    supplies: [],
    tasks: [],
    sessions: [],
    drills: [],
    checkIns: [],
  };
}
