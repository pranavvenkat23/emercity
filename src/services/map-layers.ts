import type * as GeoJSON from 'geojson';
import { create } from 'zustand';

import { boundsAround } from '@/domain/map';
import { useSession } from '@/stores/session-store';

import { nearbyGauges, type NearbyGauge } from './gauges';
import { fetchJson } from './nws';

/**
 * Map overlay data (§16.1): rail lines (U.S. DOT), facilities that report
 * hazardous chemicals (EPA TRI), and nearby river gauges (NOAA NWPS), all
 * within 10 miles of home. Cached on the phone with their fetch time.
 */
const RAIL = 'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query';
const TRI = 'https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer/23/query';
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface MapLayersState {
  rail: GeoJSON.FeatureCollection;
  hazmat: GeoJSON.FeatureCollection;
  gauges: NearbyGauge[];
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
}

const key = (hid: string) => `mapLayers.${hid}`;

async function query(base: string, bounds: number[], fields: string): Promise<GeoJSON.FeatureCollection> {
  return fetchJson<GeoJSON.FeatureCollection>(
    `${base}?where=1%3D1&geometry=${bounds.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${fields}&outSR=4326&resultRecordCount=1000&f=geojson`,
    { headers: { Accept: 'application/json' }, retries: 1, timeoutMs: 25000 },
  );
}

export const useMapLayers = create<MapLayersState & { load(): Promise<void>; refresh(): Promise<void> }>((set, get) => ({
  rail: EMPTY,
  hazmat: EMPTY,
  gauges: [],
  fetchedAt: null,
  loading: false,
  error: null,
  async load() {
    const { db, householdId } = useSession.getState();
    if (!db || !householdId) return;
    const cached = await db.kv.getJSON<MapLayersState>(key(householdId));
    if (cached) set({ rail: cached.rail, hazmat: cached.hazmat, gauges: cached.gauges, fetchedAt: cached.fetchedAt });
  },
  async refresh() {
    const { db, householdId, snapshot, online } = useSession.getState();
    const a = snapshot?.household.address;
    if (!db || !householdId || a?.lat == null || a.lng == null || online === false || get().loading) return;
    set({ loading: true, error: null });
    const b = boundsAround(a.lat, a.lng, 10);
    const [rail, hazmat, gauges] = await Promise.all([
      // Each layer fails independently; a failed one keeps its cached copy.
      query(RAIL, b, 'RROWNER1').catch(() => null),
      query(TRI, b, 'PRIMARY_NAME,LOCATION_ADDRESS,CITY_NAME').catch(() => null),
      nearbyGauges(a.lat, a.lng, 10).catch(() => null),
    ]);
    const next = {
      rail: rail ?? get().rail,
      hazmat: hazmat ?? get().hazmat,
      gauges: gauges ?? get().gauges,
      fetchedAt: rail && hazmat && gauges ? new Date().toISOString() : get().fetchedAt,
    };
    set({ ...next, loading: false, error: rail && hazmat && gauges ? null : 'Some map layers couldn’t load.' });
    await db.kv.setJSON(key(householdId), next);
  },
}));
