/**
 * Data model, spec §4. Field names follow §4.2 exactly so the spec can be
 * used as the reference for every record. Timestamps are ISO-8601 strings
 * (portable across SQLite, Firestore and JSON export). Dates without a time
 * (birthDate, expirationDate) are `YYYY-MM-DD`.
 */

export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;

// ───────────────────────── Enumerations ─────────────────────────

export const HAZARDS = ['outage', 'winter', 'flood', 'fire', 'hazmat', 'hurricane'] as const;
/** §1.6: Flood, Hurricane (inland), Winter storm, Power outage, Fire, Chemical/hazmat. */
export type Hazard = (typeof HAZARDS)[number];

export const TIERS = ['critical', 'urgent', 'important', 'standard'] as const;
/** §2.2 / §8: severity tier. Order matters: index 0 is the highest. */
export type Tier = (typeof TIERS)[number];

export const LANGUAGES = ['en', 'es', 'ko', 'vi', 'zh-Hans', 'ar', 'hi', 'ur', 'am', 'fa'] as const;
export type Language = (typeof LANGUAGES)[number];

export type HomeType =
  | 'single-family'
  | 'townhouse'
  | 'apartment-low'
  | 'apartment-high'
  | 'mobile-manufactured';

export type HeatingType = 'electric' | 'gas' | 'oil' | 'heat-pump' | 'wood' | 'other';

/** §4.2 Member.role */
export type MemberRole = 'adult' | 'teen' | 'child' | 'infant' | 'older-adult';

/** §4.2 Member.birthDate age bands. Toddler is distinct from infant for rules. */
export type AgeBand = 'infant' | 'toddler' | 'child' | 'teen' | 'adult' | 'older-adult';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export const CONDITION_TYPES = [
  'mobility-wheelchair',
  'mobility-walker',
  'bedbound',
  'hearing-loss',
  'vision-loss',
  'cognitive-dementia',
  'cognitive-autism',
  'cognitive-intellectual',
  'pregnancy',
  'infant-formula',
  'diabetes-insulin',
  'diabetes-oral',
  'dialysis-home',
  'dialysis-center',
  'oxygen-dependent',
  'ventilator',
  'seizure-disorder',
  'severe-allergy-epipen',
  'heart-condition',
  'respiratory-asthma',
  'respiratory-copd',
  'temperature-sensitive',
  'mental-health',
  'limited-english',
  'cannot-swim',
  'critical-daily-meds',
  'other',
] as const;
/**
 * §4.2 Condition.type. The spec groups "cognitive (dementia, autism,
 * intellectual disability)" and "respiratory (asthma, COPD)"; they are split
 * here because rules treat them differently (e.g. FIR-C4 dementia vs OUT-I1
 * autism/sensory). `limited-english`, `cannot-swim` and `critical-daily-meds`
 * back the §5.6 chips "Doesn't speak English well", "Can't swim (children)"
 * and "Takes daily critical meds". The single "Asthma/COPD" chip maps to
 * `respiratory-asthma`; rules treat asthma and COPD identically.
 */
export type ConditionType = (typeof CONDITION_TYPES)[number];

export type ConditionSeverity = 'mild' | 'moderate' | 'severe';

export type OxygenUsage = 'continuous' | 'night-or-activity';

export type DeviceType =
  | 'oxygen-concentrator'
  | 'home-ventilator'
  | 'cpap-bipap'
  | 'power-wheelchair'
  | 'feeding-pump'
  | 'iv-infusion-pump'
  | 'suction-machine'
  | 'home-dialysis'
  | 'nebulizer'
  | 'hospital-bed'
  | 'apnea-monitor'
  | 'insulin-pump'
  | 'cgm-receiver'
  | 'other';

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'small-mammal' | 'reptile' | 'fish' | 'other';
export type PetSize = 'small' | 'medium' | 'large';

export type ContactType =
  | 'emergency'
  | 'out-of-area'
  | 'doctor'
  | 'vet'
  | 'pharmacy'
  | 'utility'
  | 'school'
  | 'employer'
  | 'medical-supplier';

export type MeetingPointType = 'near-home' | 'neighborhood' | 'out-of-area';

export type SupplyCategory =
  | 'water'
  | 'food'
  | 'medical'
  | 'pet'
  | 'documents'
  | 'tools'
  | 'light-power'
  | 'hygiene'
  | 'clothing'
  | 'baby'
  | 'comfort';

export type SupplyLocation = 'go-bag' | 'home-kit' | 'car';

export type CheckInStatus = 'safe' | 'need-help' | 'on-my-way' | 'no-response';

export type SessionOutcome = 'safe-at-home' | 'evacuated' | 'sheltered' | 'other';

export type RiskLevel = 'high' | 'moderate' | 'low' | 'unknown';

export type HouseholdRole = 'owner' | 'adult' | 'teen';

export type UtilityRegistration = 'yes' | 'no' | 'not-sure';

// ───────────────────────── Shared record fields ─────────────────────────

/** Every synced record carries these for sync, conflict rules (§19.5) and soft delete. */
export interface RecordMeta {
  id: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Soft delete (§19.5): kept 30 days before purge. */
  deletedAt?: ISODateTime | null;
}

export interface HouseholdScoped extends RecordMeta {
  householdId: UUID;
}

// ───────────────────────── Entities ─────────────────────────

export interface NotificationPrefs {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHours?: { start: string; end: string } | null;
}

export interface User extends RecordMeta {
  email: string;
  displayName: string;
  language: Language;
  householdIds: UUID[];
  memberIdByHousehold: Record<UUID, UUID>;
  notificationPrefs: NotificationPrefs;
  /** §5.2 age gate answer; under-13 never reaches account creation. */
  ageConfirmed13Plus: boolean;
  /** Owners must be 18+ (§5.2, §19.1). */
  isAdult18Plus: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  lat: number | null;
  lng: number | null;
  geocodeSource?: string;
}

export interface Household extends RecordMeta {
  name: string;
  address: Address;
  homeType: HomeType;
  floorLevel?: number | null;
  hasBasement: boolean;
  heatingType: HeatingType;
  hasGenerator: boolean;
  generatorWatts?: number | null;
  generatorFuelHours?: number | null;
  hasBatteryBackup: boolean;
  batteryWh?: number | null;
  vehicleCount: number;
  vehicleSeats: number;
  ownerUserId: UUID | null;
  inviteCode: string | null;
  /** HH-10: invites expire after 7 days (§7.8). */
  inviteExpiresAt?: ISODateTime | null;
  /** HH-10: which member the open invite is for; null = someone new. */
  inviteForMemberId?: UUID | null;
  /** Computed (§6.4); null until the readiness engine has run. */
  readinessScore: number | null;
  /** Map of account user id to household role (§19.3). Drives security rules. */
  roles: Record<UUID, HouseholdRole>;
  /** True for the built-in demo household (§26.3); never synced. */
  isDemo: boolean;
  /** User override of the top-risk hazard (§9.3); null = auto. */
  defaultHazard?: Hazard | null;
  /**
   * The household's current power outage, shared between phones (§19.5:
   * earliest start wins). endedAt set = someone marked power restored.
   */
  sharedOutage?: { startedAt: ISODateTime; endedAt: ISODateTime | null } | null;
  /** §9.3 winter rule input: rural home or long driveway (user flag). */
  ruralOrLongDriveway?: boolean;
}

export interface Condition {
  type: ConditionType;
  severity: ConditionSeverity;
  notes?: string;
  /** Follow-up for oxygen (§5.6). */
  oxygenUsage?: OxygenUsage;
  oxygenSource?: 'concentrator' | 'tanks' | 'both';
  /** Follow-up for insulin (§5.6). */
  insulinForm?: 'pens' | 'vials' | 'pump';
}

export interface Member extends HouseholdScoped {
  linkedUserId: UUID | null;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photo?: string | null;
  /** Full date, or `YYYY-01-01` when only a birth year is known (see birthYearOnly). */
  birthDate: ISODate | null;
  birthYearOnly?: boolean;
  role: MemberRole;
  conditions: Condition[];
  medicationIds: UUID[];
  deviceIds: UUID[];
  bloodType?: BloodType;
  allergies: string[];
  primaryLanguage: Language;
  /** Mobile number, for SMS check-in fallback (§12.7) and the lock-screen card. */
  phone?: string;
  canDrive: boolean;
  canSwim?: boolean | null;
  /** Null = derive from conditions; boolean = user override (§4.2). */
  needsHelpEvacuatingOverride?: boolean | null;
  doctorContactId?: UUID | null;
  /** Private notes, max 500 chars. */
  notes?: string;
  /** §8.4 FLD-C1/C2: where this member sleeps. */
  sleepsIn?: 'basement' | 'ground-floor' | 'upper-floor' | null;
  /** §8.4 HUR-I1: user-marked room with large windward windows. */
  sleepsNearLargeWindows?: boolean;
  /** Ready-to-feed formula on hand, in days (OUT-U3). */
  readyToFeedFormulaDays?: number | null;
  /** "Archive member" (§25.4) keeps history but removes from plans. */
  archived?: boolean;
}

export interface Pet extends HouseholdScoped {
  name: string;
  species: PetSpecies;
  size: PetSize;
  photo?: string | null;
  microchipId?: string;
  needsCarrier: boolean;
  carrierLocation?: string;
  medicationIds: UUID[];
  specialNeeds: string[];
  vetContactId?: UUID | null;
  vaccinationRecord?: string | null;
  foodDaysOnHand?: number | null;
  /** ONB-07 "Takes medication?"; ONB-08 then asks for the details. */
  takesMedication?: boolean;
}

export interface Medication extends HouseholdScoped {
  ownerType: 'member' | 'pet';
  ownerId: UUID;
  ndcProductCode: string | null;
  brandName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  dose?: string;
  frequency?: string;
  isCritical: boolean;
  needsRefrigeration: boolean;
  storageRuleId: UUID | null;
  /**
   * Room-temperature limit the user typed from the package label when no
   * StorageRule exists (§7.5, §11.2). Always labeled "from your label".
   */
  userEnteredRoomTempDays?: number | null;
  isOpened: boolean;
  openedDate?: ISODate | null;
  quantityOnHand?: number | null;
  quantityUnit?: string;
  daysOfSupply?: number | null;
  refillDate?: ISODate | null;
  pharmacyName?: string;
  pharmacyPhone?: string;
  expirationDate?: ISODate | null;
  packedInGoBag: boolean;
  /** Barcode scanned offline, awaiting lookup (§13.6). */
  pendingLookupBarcode?: string | null;
}

export interface Device extends HouseholdScoped {
  memberId: UUID;
  type: DeviceType;
  label?: string;
  usesElectricity: boolean;
  lifeSustaining: boolean;
  powerWatts?: number | null;
  hasInternalBattery: boolean;
  /** User-entered (from the user or device manual), never a default. */
  batteryRuntimeMinutes?: number | null;
  backupBatteryCount?: number | null;
  backupRuntimeMinutes?: number | null;
  /** e.g. "2 oxygen cylinders, about 5 hours each at 2 L/min" (user-entered). */
  backupNonElectric?: string;
  backupNonElectricMinutes?: number | null;
  supplierName?: string;
  supplierPhone?: string;
  registeredWithUtility: UtilityRegistration;
  batteryLastChargedDate?: ISODate | null;
}

export interface Contact extends HouseholdScoped {
  name: string;
  relationship?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  type: ContactType;
  isOutOfArea: boolean;
  notes?: string;
}

export interface MeetingPoint extends HouseholdScoped {
  type: MeetingPointType;
  name: string;
  lat: number | null;
  lng: number | null;
  address?: string;
  description?: string;
  photo?: string | null;
  /** User-marked: path has stairs or steep slopes (§16.4; never guessed). */
  pathHasStairsOrSlopes?: boolean;
}

export interface SupplyItem extends HouseholdScoped {
  category: SupplyCategory;
  name: string;
  quantityNeeded: number;
  quantityHave: number;
  unit: string;
  location: SupplyLocation;
  expirationDate?: ISODate | null;
  isTemplateItem: boolean;
  templateRuleId?: string | null;
  linkedMemberId?: UUID | null;
  linkedPetId?: UUID | null;
  lastCheckedDate?: ISODate | null;
  locationNote?: string;
  tier?: Tier;
}

export interface Drill extends HouseholdScoped {
  type: 'fire-escape' | 'shelter-in-place' | 'flood-move-up' | 'outage' | 'evacuation';
  hazard: Hazard;
  scheduledFor?: ISODateTime | null;
  startedAt?: ISODateTime | null;
  endedAt?: ISODateTime | null;
  arrivals: { subjectType: 'member' | 'pet'; subjectId: UUID; elapsedMs: number }[];
  skippedStepIds: string[];
  blockedStepIds: string[];
}

export interface Task extends HouseholdScoped {
  hazard: Hazard | 'all';
  assignedMemberId: UUID | null;
  title: string;
  order: number;
  linkedSubjectType?: 'member' | 'pet' | null;
  linkedSubjectId?: UUID | null;
  tier: Tier;
}

export interface StepCompletion {
  stepId: string;
  status: 'done' | 'skipped' | 'blocked';
  at: ISODateTime;
  byMemberId: UUID | null;
}

export interface EmergencySession extends HouseholdScoped {
  hazard: Hazard;
  startedBy: UUID | null;
  startedAt: ISODateTime;
  trigger: 'manual' | 'alert-prompt';
  alertId?: string | null;
  endedAt?: ISODateTime | null;
  stepsCompleted: StepCompletion[];
  notes?: string;
  outcome?: SessionOutcome | null;
  isDrill?: boolean;
  /** Fallback steps inserted by "Can't do this" (§12.4), in order. */
  insertedFallbacks?: string[];
  /** Where the user reassigned a step (§12.4 "Reassign"): stepId to memberId. */
  reassigned?: Record<string, string>;
}

export interface CheckIn extends RecordMeta {
  householdId?: UUID;
  sessionId: UUID;
  memberId: UUID;
  status: CheckInStatus;
  /** Only during an active session and only if the member opts in each time (§4.3). */
  location?: { lat: number; lng: number } | null;
  message?: string;
  timestamp: ISODateTime;
  reportedBy: UUID;
}

export interface RiskFactor {
  type: string;
  level: RiskLevel;
  value: string;
  source: string;
  sourceUrl?: string;
  fetchedAt: ISODateTime | null;
  explanation: string;
  /** Honesty rule (§9.1): modeled on another county, or demo-simulated. */
  provenance: 'local' | 'national' | 'modeled' | 'demo' | 'user';
}

export interface RiskProfile {
  householdId: UUID;
  computedAt: ISODateTime;
  factors: RiskFactor[];
  hazardScores: Record<Hazard, number>;
}

export interface Alert {
  id: string;
  householdId: UUID;
  source: 'NWS' | 'IPAWS' | 'county' | 'demo';
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  effective: ISODateTime;
  expires: ISODateTime;
  mappedHazard: Hazard | null;
  affectsAddress: boolean;
  isDemo?: boolean;
  /** Issuing office, e.g. "NWS Sterling VA". */
  senderName?: string;
  /** Link to the official alert (NWS alert page). */
  url?: string;
  /** Alert polygon (GeoJSON ring of [lng, lat]) when provided. */
  polygon?: [number, number][] | null;
  /** When the user tapped "Mark as seen". */
  seenAt?: string | null;
}

export interface GaugeReading {
  gaugeId: string;
  name: string;
  stageFt: number;
  observedAt: ISODateTime;
  floodCategories: { action?: number; minor?: number; moderate?: number; major?: number };
  trend: 'rising' | 'falling' | 'steady' | 'unknown';
  source: string;
  fetchedAt: ISODateTime;
}

/** Reference data, §4.2 StorageRule. Bundled + server-updated, read-only. */
export interface StorageRule {
  id: string;
  productName: string;
  ndcProductCodes: string[];
  unopenedRefrigerated: string;
  unopenedRoomTempDays: number | null;
  openedRoomTempDays: number | null;
  maxRoomTempF: number | null;
  minTempF: number | null;
  notes: string;
  sourceName: string;
  sourceUrl: string;
  reviewedDate: ISODate;
}

export interface Place {
  id: string;
  type:
    | 'shelter'
    | 'hospital'
    | 'urgent-care'
    | 'fire-station'
    | 'pharmacy'
    | 'police'
    | 'cooling-center'
    | 'warming-center';
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  petFriendly?: boolean | null;
  adaCompliant?: boolean | null;
  /** Never "open" unless a live source reported it open within 6 h (§16.3). */
  status: 'open' | 'closed' | 'unknown';
  capacity?: number | null;
  currentPopulation?: number | null;
  source: string;
  fetchedAt: ISODateTime | null;
  provenance: 'local' | 'national' | 'modeled' | 'demo';
}

// ───────────────────────── Priority engine output (§8.2) ─────────────────────────

export interface PrioritySubject {
  subjectType: 'member' | 'pet';
  subjectId: UUID;
  rank: number;
  tier: Tier;
  score: number;
  ruleIds: string[];
  computedAt: ISODateTime;
  pinned?: 'up' | 'down' | null;
}

// ───────────────────────── Snapshot ─────────────────────────

/** Everything the app needs about one household, loaded from the local DB. */
export interface HouseholdSnapshot {
  household: Household;
  members: Member[];
  pets: Pet[];
  medications: Medication[];
  devices: Device[];
  contacts: Contact[];
  meetingPoints: MeetingPoint[];
  supplies: SupplyItem[];
  tasks: Task[];
  sessions: EmergencySession[];
  drills: Drill[];
  checkIns: CheckIn[];
}

/** Synced collections stored under households/{id}/… (§24.5). */
export const HOUSEHOLD_COLLECTIONS = [
  'members',
  'pets',
  'medications',
  'devices',
  'contacts',
  'meetingPoints',
  'supplies',
  'tasks',
  'drills',
  'sessions',
  'checkIns',
] as const;
export type HouseholdCollection = (typeof HOUSEHOLD_COLLECTIONS)[number];
