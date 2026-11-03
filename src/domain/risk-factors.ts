import type { Hazard, Household, HouseholdSnapshot, RiskFactor, RiskLevel } from '@/models/types';

import { HAZARD_LABEL } from './hazards';
import { heatNeedsElectricity } from './priority/rules';
import { floodZoneLevel, hospitalLevel } from './risk';

/**
 * Builds the §9.1 risk factors from raw lookups. Pure: the service does the
 * fetching. A failed or missing lookup is "unknown" and never Low (§9.5).
 */

type Src = { source: string; sourceUrl?: string; fetchedAt: string | null; provenance: RiskFactor['provenance'] };

export const RISK_SOURCES = {
  nfhl: { source: 'FEMA National Flood Hazard Layer', sourceUrl: 'https://www.fema.gov/flood-maps/national-flood-hazard-layer', provenance: 'national' },
  nhd: { source: 'USGS National Hydrography Dataset', sourceUrl: 'https://www.usgs.gov/national-hydrography/national-hydrography-dataset', provenance: 'national' },
  nwps: { source: 'NOAA National Water Prediction Service', sourceUrl: 'https://water.noaa.gov', provenance: 'national' },
  rail: { source: 'U.S. DOT North American Rail Network', sourceUrl: 'https://geodata.bts.gov/datasets/usdot::north-american-rail-network-lines', provenance: 'national' },
  tri: { source: 'EPA Toxics Release Inventory facilities', sourceUrl: 'https://www.epa.gov/toxics-release-inventory-tri-program', provenance: 'national' },
  loudoun: { source: 'Loudoun County GIS', sourceUrl: 'https://logis.loudoun.gov', provenance: 'local' },
  eagle: { source: 'DOE/ORNL EAGLE-I', sourceUrl: 'https://eagle-i.doe.gov', provenance: 'national' },
  user: { source: 'You', provenance: 'user' },
} as const;

const COULDNT = "Couldn't check yet";

function factor(type: string, level: RiskLevel, value: string, explanation: string, src: Omit<Src, 'fetchedAt'>, fetchedAt: string | null): RiskFactor {
  return { type, level, value, explanation, source: src.source, sourceUrl: 'sourceUrl' in src ? src.sourceUrl : undefined, fetchedAt, provenance: src.provenance };
}

/** NFHL point query result; null = lookup failed; undefined zone = outside mapped areas. */
export function floodZoneFactor(r: { zone: string | null; subtype: string | null } | null, fetchedAt: string): RiskFactor {
  if (!r) return factor('flood-zone', 'unknown', COULDNT, 'We could not reach the FEMA flood map.', RISK_SOURCES.nfhl, null);
  if (!r.zone) return factor('flood-zone', 'unknown', 'Not mapped', 'FEMA has no flood map for this spot. That does not mean low risk.', RISK_SOURCES.nfhl, fetchedAt);
  const level = floodZoneLevel(r.zone, r.subtype);
  const label = level === 'high' ? `High (Zone ${r.zone})` : level === 'moderate' ? `Moderate (Zone ${r.zone}, shaded)` : level === 'low' ? `Minimal (Zone ${r.zone})` : `Zone ${r.zone}`;
  const why =
    level === 'high'
      ? 'Your home is in a 1% annual chance flood area. Flood steps come first for this home.'
      : level === 'moderate'
        ? 'Your home is in a 0.2% annual chance flood area.'
        : level === 'low'
          ? 'Your home is outside FEMA’s mapped flood areas. Flash floods can still happen.'
          : 'FEMA lists this zone as undetermined.';
  return factor('flood-zone', level, label, why, RISK_SOURCES.nfhl, fetchedAt);
}

/**
 * Stream distance from "is there a stream within 500 ft / 0.25 mi" counts
 * (§9.2). null = lookup failed.
 */
export function streamFactor(r: { within500ft: number; withinQuarterMile: number } | null, fetchedAt: string): RiskFactor {
  if (!r) return factor('stream-distance', 'unknown', COULDNT, 'We could not reach the stream map.', RISK_SOURCES.nhd, null);
  if (r.within500ft > 0) return factor('stream-distance', 'high', 'Under 500 ft', 'A stream is very close. Creeks can rise in minutes in heavy rain.', RISK_SOURCES.nhd, fetchedAt);
  if (r.withinQuarterMile > 0) return factor('stream-distance', 'moderate', '500 ft – 0.25 mi', 'A stream is nearby. Watch for flash flood warnings.', RISK_SOURCES.nhd, fetchedAt);
  return factor('stream-distance', 'low', 'Over 0.25 mi', 'No mapped stream within a quarter mile. Storm drains can still flood streets.', RISK_SOURCES.nhd, fetchedAt);
}

export function gaugeFactor(g: { name: string; distanceMi: number } | null | undefined, fetchedAt: string): RiskFactor {
  if (g === undefined) return factor('gauge', 'unknown', COULDNT, 'We could not reach the river gauge list.', RISK_SOURCES.nwps, null);
  if (!g) return factor('gauge', 'unknown', 'None within 10 mi', 'No river gauge close enough to watch for you.', RISK_SOURCES.nwps, fetchedAt);
  return factor('gauge', 'unknown', `${g.name}, ${g.distanceMi.toFixed(1)} mi`, 'Emercity watches this gauge for flooding nearby. It measures the stream, not your street.', RISK_SOURCES.nwps, fetchedAt);
}

/** Rail lines from counts within 0.5 and 1 mi (§9.2). */
export function railFactor(r: { withinHalfMile: number; withinOneMile: number } | null, fetchedAt: string): RiskFactor {
  if (!r) return factor('rail', 'unknown', COULDNT, 'We could not reach the rail map.', RISK_SOURCES.rail, null);
  if (r.withinHalfMile > 0) return factor('rail', 'high', 'Under 0.5 mi', 'Trains near you may carry chemicals. Know how to shelter in place.', RISK_SOURCES.rail, fetchedAt);
  if (r.withinOneMile > 0) return factor('rail', 'moderate', '0.5–1 mi', 'A rail line is within a mile.', RISK_SOURCES.rail, fetchedAt);
  return factor('rail', 'low', 'No rail line within 1 mile', 'No rail line within a mile of home.', RISK_SOURCES.rail, fetchedAt);
}

/** Facilities that report hazardous chemicals, from counts within 0.5 and 2 mi (§9.2). */
export function hazmatFactor(r: { withinHalfMile: number; withinTwoMiles: number } | null, fetchedAt: string): RiskFactor {
  if (!r) return factor('hazmat-facility', 'unknown', COULDNT, 'We could not reach the EPA facility list.', RISK_SOURCES.tri, null);
  if (r.withinHalfMile > 0) return factor('hazmat-facility', 'high', `${r.withinHalfMile} within 0.5 mi`, 'A site that reports hazardous chemicals is very close.', RISK_SOURCES.tri, fetchedAt);
  if (r.withinTwoMiles > 0) return factor('hazmat-facility', 'moderate', `${r.withinTwoMiles} within 2 mi`, 'Sites that report hazardous chemicals are within 2 miles.', RISK_SOURCES.tri, fetchedAt);
  return factor('hazmat-facility', 'low', 'None within 2 mi', 'No reporting sites within 2 miles.', RISK_SOURCES.tri, fetchedAt);
}

/** Nearest hospital (not urgent care). null = lookup failed or outside coverage. */
export function hospitalFactor(nearest: { name: string; distanceMi: number } | null, fetchedAt: string, covered: boolean): RiskFactor {
  if (!nearest) {
    return factor('hospital', 'unknown', covered ? COULDNT : 'Not checked here', covered ? 'We could not reach the county hospital list.' : 'Hospital distance uses Loudoun County data. Elsewhere it is not checked yet.', RISK_SOURCES.loudoun, covered ? null : fetchedAt);
  }
  const level = hospitalLevel(nearest.distanceMi);
  return factor('hospital', level, `${nearest.name}, ${nearest.distanceMi.toFixed(1)} mi`, level === 'high' ? 'The nearest hospital is far. Plan the drive ahead.' : 'Distance in a straight line. Driving is longer.', RISK_SOURCES.loudoun, fetchedAt);
}

export function fireStationFactor(name: string | null, fetchedAt: string, covered: boolean): RiskFactor | null {
  if (!covered) return null;
  if (!name) return factor('fire-station', 'unknown', COULDNT, 'We could not find your first-due station.', RISK_SOURCES.loudoun, null);
  return factor('fire-station', 'unknown', name, 'This station responds first to your address.', RISK_SOURCES.loudoun, fetchedAt);
}

/**
 * EAGLE-I county outage history has no public live API, so this stays
 * Unknown until a dataset is bundled. Never assumed Low.
 */
export function outageFrequencyFactor(): RiskFactor {
  return factor('outage-frequency', 'unknown', 'Not checked yet', 'County outage history isn’t in the app yet. Power outages are still Emercity’s default top risk for Loudoun.', RISK_SOURCES.eagle, null);
}

/** Factors from the household's own answers (§9.1 "User"). */
export function userFactors(h: Pick<Household, 'hasBasement' | 'homeType' | 'heatingType' | 'floorLevel'>, now: string): RiskFactor[] {
  const out: RiskFactor[] = [];
  out.push(factor('basement', h.hasBasement ? 'moderate' : 'low', h.hasBasement ? 'Basement' : 'No basement', h.hasBasement ? 'Basements flood first. Nobody should sleep there during flood warnings.' : 'No basement to flood.', RISK_SOURCES.user, now));
  if (h.homeType === 'mobile-manufactured') out.push(factor('home-type', 'high', 'Mobile or manufactured home', 'These homes are not safe in high winds or tornadoes. Know where to go.', RISK_SOURCES.user, now));
  const electric = heatNeedsElectricity(h as Household);
  out.push(factor('heat-electric', electric ? 'moderate' : 'low', electric ? 'Heat needs electricity' : 'Heat works without power', electric ? 'Your heat stops in a power outage. Plan to stay warm.' : 'Your heat keeps working without electricity.', RISK_SOURCES.user, now));
  if ((h.floorLevel ?? 0) >= 4) out.push(factor('high-floor', 'moderate', `Floor ${h.floorLevel}`, 'Elevators stop in outages. Plan stairs for anyone with mobility needs.', RISK_SOURCES.user, now));
  return out;
}

/** Factors that are facts about the area, not a risk level; shown without a level pill. */
export const INFO_FACTORS = new Set(['gauge', 'fire-station']);

/** Display order for PLAN-03. */
export const FACTOR_ORDER = ['flood-zone', 'stream-distance', 'gauge', 'outage-frequency', 'rail', 'hazmat-facility', 'hospital', 'fire-station', 'basement', 'home-type', 'heat-electric', 'high-floor'];

export function sortFactors(f: RiskFactor[]): RiskFactor[] {
  return [...f].sort((a, b) => FACTOR_ORDER.indexOf(a.type) - FACTOR_ORDER.indexOf(b.type));
}

export const FACTOR_LABEL: Record<string, string> = {
  'flood-zone': 'Flood zone',
  'stream-distance': 'Nearest stream',
  gauge: 'Nearest creek gauge',
  'outage-frequency': 'Outage history',
  rail: 'Rail line',
  'hazmat-facility': 'Chemical sites',
  hospital: 'Nearest hospital or ER',
  'fire-station': 'First-due fire station',
  basement: 'Basement',
  'home-type': 'Home type',
  'heat-electric': 'Heating',
  'high-floor': 'Floor',
};

/** A failed lookup keeps the last good value, which shows as stale by its date (§9.5). */
export function mergeWithCache(fresh: RiskFactor[], cached: RiskFactor[] | undefined): RiskFactor[] {
  return sortFactors(
    fresh.map((f) => {
      if (f.fetchedAt) return f;
      const old = cached?.find((c) => c.type === f.type && c.fetchedAt);
      return old ?? f;
    }),
  );
}

const lvl = (f: RiskFactor[], type: string) => f.find((x) => x.type === type)?.level ?? 'unknown';

/** One plain line per hazard for PLAN-03 "Your top risks" (§9.4). Rule-based. */
export function hazardExplanation(hazard: Hazard, factors: RiskFactor[], snap: Pick<HouseholdSnapshot, 'household' | 'devices' | 'members'>): string {
  const electricHeat = heatNeedsElectricity(snap.household as Household);
  const powered = snap.devices.some((d) => d.lifeSustaining && d.usesElectricity);
  switch (hazard) {
    case 'outage': {
      const parts = [electricHeat ? 'your heat needs electricity' : null, powered ? 'someone relies on a powered medical device' : null].filter(Boolean);
      return `Power outages are common in Northern Virginia${parts.length ? `, and ${parts.join(' and ')}` : ''}.`;
    }
    case 'winter':
      return electricHeat ? 'Winter storms often cut power, and your heat needs electricity.' : 'Winter storms bring ice, snow and power outages.';
    case 'flood': {
      const zone = lvl(factors, 'flood-zone');
      const stream = lvl(factors, 'stream-distance');
      if (zone === 'high') return 'Your home is in a FEMA flood zone' + (stream === 'high' ? ' and very close to a stream.' : '.');
      if (stream === 'high' || stream === 'moderate') return 'A stream is close to your home. Creeks rise fast in heavy rain.';
      return snap.household.hasBasement ? 'Flash floods can fill basements quickly.' : 'Flash floods can happen even outside flood zones.';
    }
    case 'fire': {
      const oxygen = snap.devices.some((d) => d.type === 'oxygen-concentrator') || snap.members.some((m) => m.conditions.some((c) => c.type === 'oxygen-dependent'));
      return oxygen ? 'Home fires can happen anywhere, and oxygen makes fire spread faster.' : 'Home fires can happen anywhere. Practice getting out.';
    }
    case 'hazmat': {
      const rail = lvl(factors, 'rail');
      const sites = lvl(factors, 'hazmat-facility');
      if (rail === 'high' || rail === 'moderate') return 'A rail line near you may carry chemicals.';
      if (sites === 'high' || sites === 'moderate') return 'Sites that report hazardous chemicals are nearby.';
      return 'Chemical spills on roads can happen anywhere.';
    }
    case 'hurricane':
      return snap.household.homeType === 'mobile-manufactured' ? 'Storm remnants bring wind, and mobile homes are not safe in high winds.' : 'Storm remnants bring heavy rain, wind and outages inland.';
  }
}

/** What the profile changed in the plan (§9.4 item 4), from the real supply rules. */
export function planAdjustments(top: Hazard, supplyRuleIds: Set<string>): string[] {
  const out = [`Home and your priority order start with ${HAZARD_LABEL[top].toLowerCase()}.`];
  if (supplyRuleIds.has('sandbags')) out.push('Your supply list includes sandbags and a sump pump check.');
  if (supplyRuleIds.has('seal-room')) out.push('Your supply list includes plastic sheeting and duct tape for sheltering in place.');
  if (supplyRuleIds.has('ice-melt')) out.push('Your supply list includes ice melt and a snow shovel.');
  if (supplyRuleIds.has('blankets')) out.push('Your supply list includes extra blankets and warm layers.');
  return out;
}
