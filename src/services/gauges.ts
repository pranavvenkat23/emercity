import { describeFromHome, distanceMi, bearingDeg, compass } from '@/domain/geo';
import { gaugeTrend } from '@/domain/gauge';
import { useConditions, type GaugeState } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

import { fetchJson } from './nws';

/**
 * NOAA National Water Prediction Service gauges (§10.4). Public, no key.
 * Only the household's coordinates (as a bounding box) are sent.
 */
const NWPS = 'https://api.water.noaa.gov/nwps/v1';
const JSON_HEADERS = { Accept: 'application/json' };

export interface NearbyGauge {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMi: number;
  direction: string;
}

/** Gauges within `radiusMi` (default 10, §10.4), nearest first. */
export async function nearbyGauges(lat: number, lng: number, radiusMi = 10): Promise<NearbyGauge[]> {
  const dLat = radiusMi / 69;
  const dLng = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));
  const data = await fetchJson<{ gauges: { lid: string; name: string; latitude: number; longitude: number }[] }>(
    `${NWPS}/gauges?bbox.xmin=${lng - dLng}&bbox.ymin=${lat - dLat}&bbox.xmax=${lng + dLng}&bbox.ymax=${lat + dLat}&srid=EPSG_4326`,
    { headers: JSON_HEADERS, retries: 1 },
  );
  return data.gauges
    .map((g) => ({
      id: g.lid,
      name: g.name,
      lat: g.latitude,
      lng: g.longitude,
      distanceMi: distanceMi({ lat, lng }, { lat: g.latitude, lng: g.longitude }),
      direction: compass(bearingDeg({ lat, lng }, { lat: g.latitude, lng: g.longitude })),
    }))
    .filter((g) => g.distanceMi <= radiusMi)
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

interface StageFlow {
  observed?: { primaryUnits?: string; data: { validTime: string; primary: number }[] };
  forecast?: { primaryUnits?: string; data: { validTime: string; primary: number }[] } | null;
}

/** Current reading, flood categories, past 72 h and forecast for one gauge. */
export async function fetchGauge(id: string, home: { lat: number; lng: number }): Promise<GaugeState> {
  const [meta, flow] = await Promise.all([
    fetchJson<{ name: string; latitude: number; longitude: number; flood?: { categories?: Record<string, { stage: number }> }; status?: { observed?: { primary: number; validTime: string } } }>(`${NWPS}/gauges/${id}`, { headers: JSON_HEADERS, retries: 1 }),
    fetchJson<StageFlow>(`${NWPS}/gauges/${id}/stageflow`, { headers: JSON_HEADERS, retries: 1 }),
  ]);
  const cat = meta.flood?.categories ?? {};
  const stage = (k: string) => (cat[k]?.stage != null && cat[k].stage > -999 ? cat[k].stage : null);
  const since = Date.now() - 72 * 3_600_000;
  const observed = (flow.observed?.data ?? [])
    .filter((p) => p.primary > -999 && new Date(p.validTime).getTime() >= since)
    .map((p) => ({ t: p.validTime, ft: p.primary }));
  const forecast = (flow.forecast?.data ?? []).filter((p) => p.primary > -999).map((p) => ({ t: p.validTime, ft: p.primary }));
  const loc = { lat: meta.latitude, lng: meta.longitude };
  return {
    id,
    name: meta.name,
    distanceMi: distanceMi(home, loc),
    direction: describeFromHome(home, loc),
    stageFt: meta.status?.observed?.primary != null && meta.status.observed.primary > -999 ? meta.status.observed.primary : observed.at(-1)?.ft ?? null,
    observedAt: meta.status?.observed?.validTime ?? observed.at(-1)?.t ?? null,
    flood: { action: stage('action'), minor: stage('minor'), moderate: stage('moderate'), major: stage('major') },
    trend: gaugeTrend(observed),
    observed,
    forecast,
  };
}

const followKey = (h: string) => `gauge.follow.${h}`;

/** Loads the followed (or nearest) gauge into the conditions store. */
export async function refreshGauge(): Promise<void> {
  const { snapshot, db, online } = useSession.getState();
  const a = snapshot?.household.address;
  if (!snapshot || a?.lat == null || a.lng == null || online === false) return;
  if (useConditions.getState().gauge?.simulated) return;
  const home = { lat: a.lat, lng: a.lng };
  let id = db ? await db.kv.get(followKey(snapshot.household.id)) : null;
  if (!id) {
    const near = await nearbyGauges(home.lat, home.lng);
    id = near[0]?.id ?? null;
  }
  if (!id) {
    useConditions.getState().setGauge(null);
    return;
  }
  const g = await fetchGauge(id, home);
  useConditions.getState().setGauge({ value: g, source: 'NOAA NWPS', fetchedAt: new Date().toISOString() });
}

export async function followGauge(id: string): Promise<void> {
  const { snapshot, db } = useSession.getState();
  if (!snapshot || !db) return;
  await db.kv.set(followKey(snapshot.household.id), id);
  await refreshGauge();
}
