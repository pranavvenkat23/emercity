import { useCallback, useEffect } from 'react';

import { distanceMi } from '@/domain/geo';
import { computeHazardScores } from '@/domain/risk';
import {
  fireStationFactor,
  floodZoneFactor,
  gaugeFactor,
  hazmatFactor,
  hospitalFactor,
  mergeWithCache,
  outageFrequencyFactor,
  railFactor,
  streamFactor,
  userFactors,
} from '@/domain/risk-factors';
import type { Household, RiskFactor, RiskProfile } from '@/models/types';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

import { nearbyGauges } from './gauges';
import { fetchJson } from './nws';
import { fetchLoudoun } from './places';

/**
 * Address risk profile (§9). Every lookup is a public, keyless service
 * queried directly from the phone. Results are cached on the device;
 * refreshed monthly or when the address changes. A lookup that fails keeps
 * the last cached value (with its date, so it shows as stale) or is
 * "Couldn't check yet", never assumed Low (§9.5).
 */

const H = { Accept: 'application/json' };
const NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
const RAIL = 'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query';
const TRI = 'https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer/23/query';
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';
const MONTH_MS = 30 * 24 * 3600 * 1000;

const point = (lat: number, lng: number) => `geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects`;

async function countWithin(base: string, lat: number, lng: number, distance: number, units: 'esriSRUnit_Foot' | 'esriSRUnit_StatuteMile', where?: string): Promise<number> {
  const w = where ? `where=${encodeURIComponent(where)}&` : '';
  const r = await fetchJson<{ count?: number; error?: unknown }>(`${base}?${w}${point(lat, lng)}&distance=${distance}&units=${units}&returnCountOnly=true&f=json`, { headers: H, retries: 1, timeoutMs: 20000 });
  if (typeof r.count !== 'number') throw new Error('Bad count response');
  return r.count;
}

async function floodZone(lat: number, lng: number) {
  const r = await fetchJson<{ features?: { attributes: { FLD_ZONE: string | null; ZONE_SUBTY: string | null } }[] }>(
    `${NFHL}?${point(lat, lng)}&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json`,
    { headers: H, retries: 1, timeoutMs: 20000 },
  );
  if (!r.features) throw new Error('Bad flood response');
  const a = r.features[0]?.attributes;
  return { zone: a?.FLD_ZONE ?? null, subtype: a?.ZONE_SUBTY ?? null };
}

/** County name from the Census geocoder, e.g. "Loudoun County". */
export async function countyAt(lat: number, lng: number): Promise<string | null> {
  const r = await fetchJson<{ result: { geographies: { Counties?: { NAME: string; STATE: string }[] } } }>(
    `${CENSUS}?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`,
    { headers: H, retries: 1, timeoutMs: 20000 },
  );
  return r.result.geographies.Counties?.[0]?.NAME ?? null;
}

const settle = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/** Runs every lookup; never throws. */
export async function lookupRiskFactors(h: Household, lat: number, lng: number): Promise<{ factors: RiskFactor[]; county: string | null }> {
  const now = new Date().toISOString();
  const [flood, s500, s1320, r05, r1, t05, t2, gauges, county] = await Promise.all([
    settle(floodZone(lat, lng)),
    settle(countWithin(NHD, lat, lng, 500, 'esriSRUnit_Foot', 'ftype IN (460,558)')),
    settle(countWithin(NHD, lat, lng, 1320, 'esriSRUnit_Foot', 'ftype IN (460,558)')),
    settle(countWithin(RAIL, lat, lng, 0.5, 'esriSRUnit_StatuteMile')),
    settle(countWithin(RAIL, lat, lng, 1, 'esriSRUnit_StatuteMile')),
    settle(countWithin(TRI, lat, lng, 0.5, 'esriSRUnit_StatuteMile')),
    settle(countWithin(TRI, lat, lng, 2, 'esriSRUnit_StatuteMile')),
    settle(nearbyGauges(lat, lng, 10)),
    settle(countyAt(lat, lng)),
  ]);
  const loudoun = /loudoun/i.test(county ?? h.address.county ?? '');
  const local = loudoun ? await settle(fetchLoudoun(lat, lng)) : null;
  // The county list marks behavioral-health and rehabilitation hospitals 'H' too;
  // they don't take emergencies, so they never count as the nearest hospital.
  const hospitals = (local?.places ?? []).filter((p) => p.type === 'hospital' && !/behavioral|rehabilitation/i.test(p.name)).map((p) => ({ name: p.name, distanceMi: distanceMi({ lat, lng }, p) }));
  hospitals.sort((a, b) => a.distanceMi - b.distanceMi);
  const station = local?.firstDue ? local.places.find((p) => p.id === local.firstDue)?.name ?? null : null;

  const factors = [
    floodZoneFactor(flood, now),
    streamFactor(s500 != null && s1320 != null ? { within500ft: s500, withinQuarterMile: s1320 } : null, now),
    gaugeFactor(gauges === null ? undefined : gauges[0] ? { name: gauges[0].name, distanceMi: gauges[0].distanceMi } : null, now),
    outageFrequencyFactor(),
    railFactor(r05 != null && r1 != null ? { withinHalfMile: r05, withinOneMile: r1 } : null, now),
    hazmatFactor(t05 != null && t2 != null ? { withinHalfMile: t05, withinTwoMiles: t2 } : null, now),
    hospitalFactor(local ? hospitals[0] ?? null : null, now, loudoun),
    fireStationFactor(local ? station : null, now, loudoun),
    ...userFactors(h, now),
  ].filter((f): f is RiskFactor => !!f);
  return { factors, county };
}

interface CachedRisk {
  profile: RiskProfile;
  addressKey: string;
}

const key = (householdId: string) => `risk.${householdId}`;
const addressKey = (h: Household) => `${h.address.lat?.toFixed(5)},${h.address.lng?.toFixed(5)}`;

/** Recomputes the profile now (PLAN-03 retry, ONB-09). */
export async function refreshRiskProfile(): Promise<RiskProfile | null> {
  const { snapshot, db, online } = useSession.getState();
  const h = snapshot?.household;
  if (!db || !h || h.address.lat == null || h.address.lng == null || online === false) return null;
  const cached = await db.kv.getJSON<CachedRisk>(key(h.id));
  const { factors } = await lookupRiskFactors(h, h.address.lat, h.address.lng);
  const merged = mergeWithCache(factors, cached?.addressKey === addressKey(h) ? cached.profile.factors : undefined);
  const profile: RiskProfile = { householdId: h.id, computedAt: new Date().toISOString(), factors: merged, hazardScores: computeHazardScores(snapshot!, merged) };
  await db.kv.setJSON(key(h.id), { profile, addressKey: addressKey(h) } satisfies CachedRisk);
  // Ignore if the user switched households while we were fetching.
  if (useSession.getState().householdId === h.id) useConditions.getState().setRisk({ value: profile, source: 'Public data', fetchedAt: profile.computedAt });
  return profile;
}

/** Mount once: loads the cached profile, refreshes when stale or the address moved. */
export function useRiskProfile() {
  const householdId = useSession((s) => s.householdId);
  const online = useSession((s) => s.online);
  const addr = useSession((s) => (s.snapshot ? addressKey(s.snapshot.household) : null));

  const run = useCallback(async () => {
    const { db, snapshot } = useSession.getState();
    if (!db || !snapshot || !householdId) return;
    const cached = await db.kv.getJSON<CachedRisk>(key(householdId));
    if (useConditions.getState().risk?.simulated) return;
    if (cached) useConditions.getState().setRisk({ value: cached.profile, source: 'Public data', fetchedAt: cached.profile.computedAt });
    else useConditions.getState().setRisk(null);
    const stale = !cached || cached.addressKey !== addressKey(snapshot.household) || Date.now() - new Date(cached.profile.computedAt).getTime() > MONTH_MS;
    if (stale && online !== false) await refreshRiskProfile().catch(() => {});
  }, [householdId, online]);

  useEffect(() => {
    run();
  }, [run, addr]);
}
