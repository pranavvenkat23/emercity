import type { Hazard, RiskLevel, Tier, UUID } from '@/models/types';

/**
 * Live conditions the engine reads (§8.1 "Live conditions", §21.4).
 * Everything is optional: unknown inputs never lower a tier, and rules that
 * need a value that is unknown simply don't fire (and are reported in
 * `unknowns` so the UI can say what wasn't checked).
 */
export interface PriorityContext {
  now: Date;
  /** Outdoor temperature (°F), forecast or current. null = unknown. */
  outdoorTempF?: number | null;
  /** Heat index (°F). null = unknown. */
  heatIndexF?: number | null;
  /** Official alert event names active for the address, e.g. "Flash Flood Warning". */
  activeAlertEvents?: string[];
  /** An official evacuation order is in effect. */
  evacuationOrdered?: boolean;
  /** Address risk (§9). Unknown is never treated as low. */
  floodZoneLevel?: RiskLevel;
  /** Distance from home to the nearest stream, in feet. null = unknown. */
  streamDistanceFt?: number | null;
  /** Power outage confirmed, with live countdown state (§11). */
  outage?: {
    active: boolean;
    /** Hours of safe time left per critical refrigerated medication id. */
    medicationHoursLeft?: Record<UUID, number>;
    /** Minutes of backup left per device id. */
    deviceMinutesLeft?: Record<UUID, number>;
  } | null;
  /** Members known to be outdoors or away from home (HAZ-I1, from check-ins). */
  awayMemberIds?: UUID[];
  /** Pets known to be outdoors (HAZ-I2). */
  outdoorPetIds?: UUID[];
}

export interface FiredRule {
  id: string;
  tier: Tier;
  /** Plain-words reason for the hidden long-press sheet (§8.7). */
  reason: string;
}

export interface RankedSubject {
  subjectType: 'member' | 'pet';
  subjectId: UUID;
  rank: number;
  tier: Tier;
  /** 0–1000; orders subjects within a tier only (§8.5). */
  score: number;
  ruleIds: string[];
  reasons: string[];
  computedAt: string;
  pinned: 'up' | 'down' | null;
}

export interface PriorityResult {
  hazard: Hazard;
  order: RankedSubject[];
  /** Inputs that were unknown, so cold/heat/flood rules could not be checked. */
  unknowns: ('temperature' | 'heat-index' | 'flood-zone' | 'stream-distance')[];
  computedAt: string;
}

/** A user pin (§8.8): move a subject one place up or down within its tier. */
export interface PriorityPin {
  subjectId: UUID;
  direction: 'up' | 'down';
  /** Required to move a Critical subject below a non-Critical one. */
  confirmedCriticalDown?: boolean;
  /** Pins reset when the subject's conditions change (§8.8). */
  conditionsKey: string;
}
