import { create } from 'zustand';

import { distanceMi } from '@/domain/geo';
import type { Place } from '@/models/types';
import { useSession } from '@/stores/session-store';

import { fetchJson } from './nws';

/**
 * Places (§16.3): live FEMA open shelters, Loudoun County hospitals/urgent
 * care and fire-rescue stations. Cached on the device so the list works
 * offline (labeled stale / "may not be open"). A shelter is shown as Open
 * only if a live source reported it open within 6 hours.
 */
const FEMA_SHELTERS = 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query';
const LOUDOUN = 'https://logis.loudoun.gov/gis/rest/services/COL';
const JSON_HEADERS = { Accept: 'application/json' };

export interface PlacesState {
  places: Place[];
  fetchedAt: string | null;
  firstDueStation: string | null;
  error: string | null;
  loading: boolean;
}

export const usePlaces = create<PlacesState & { refresh(): Promise<void>; load(): Promise<void> }>((set, get) => ({
  places: [],
  fetchedAt: null,
  firstDueStation: null,
  error: null,
  loading: false,
  async load() {
    const { db, householdId } = useSession.getState();
    if (!db || !householdId) return;
    const cached = await db.kv.getJSON<PlacesState>(`places.${householdId}`);
    if (cached) set({ places: cached.places, fetchedAt: cached.fetchedAt, firstDueStation: cached.firstDueStation });
  },
  async refresh() {
    const { snapshot, db, householdId, online } = useSession.getState();
    const lat = snapshot?.household.address.lat;
    const lng = snapshot?.household.address.lng;
    if (lat == null || lng == null || online === false || get().loading) return;
    set({ loading: true });
    try {
      const [shelters, local] = await Promise.all([fetchShelters(lat, lng), fetchLoudoun(lat, lng).catch(() => ({ places: [] as Place[], firstDue: null }))]);
      const fetchedAt = new Date().toISOString();
      const places = [...shelters, ...local.places];
      set({ places, fetchedAt, firstDueStation: local.firstDue, error: null });
      if (db && householdId) await db.kv.setJSON(`places.${householdId}`, { places, fetchedAt, firstDueStation: local.firstDue });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Places unavailable' });
    } finally {
      set({ loading: false });
    }
  },
}));

interface ShelterAttrs {
  shelter_id: number | string;
  shelter_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  shelter_status: string;
  evacuation_capacity: number | null;
  total_population: number | null;
  ada_compliant: string | null;
  wheelchair_accessible: string | null;
  pet_accommodations_code: string | null;
  latitude: number;
  longitude: number;
}

const yesNo = (v: string | null | undefined): boolean | null => {
  const s = (v ?? '').trim().toUpperCase();
  if (!s || s === 'UNK') return null;
  if (s === 'NONE' || s === 'NO' || s === 'N') return false;
  return true;
};

export async function fetchShelters(lat: number, lng: number): Promise<Place[]> {
  const url = `${FEMA_SHELTERS}?where=1%3D1&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&distance=50&units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
  const data = await fetchJson<{ features: { attributes: ShelterAttrs }[] }>(url, { headers: JSON_HEADERS, retries: 1 });
  const fetchedAt = new Date().toISOString();
  return data.features.map(({ attributes: a }) => ({
    id: `fema-${a.shelter_id}`,
    type: 'shelter' as const,
    name: a.shelter_name,
    address: `${a.address}, ${a.city}, ${a.state} ${a.zip}`,
    lat: a.latitude,
    lng: a.longitude,
    petFriendly: yesNo(a.pet_accommodations_code),
    adaCompliant: yesNo(a.ada_compliant) ?? yesNo(a.wheelchair_accessible),
    status: a.shelter_status?.toUpperCase() === 'OPEN' ? ('open' as const) : a.shelter_status?.toUpperCase() === 'CLOSED' ? ('closed' as const) : ('unknown' as const),
    capacity: a.evacuation_capacity,
    currentPopulation: a.total_population,
    source: 'FEMA National Shelter System',
    fetchedAt,
    provenance: 'national' as const,
  }));
}

export async function fetchLoudoun(lat: number, lng: number): Promise<{ places: Place[]; firstDue: string | null }> {
  const fetchedAt = new Date().toISOString();
  const [hosp, stations, due] = await Promise.all([
    fetchJson<{ features: { attributes: { OBJECTID: number; FACILITY_NAME: string; FACILITY: string; Address: string }; geometry: { x: number; y: number } }[] }>(
      `${LOUDOUN}/HospitalsUrgentCare/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=json`,
      { headers: JSON_HEADERS, retries: 1 },
    ),
    fetchJson<{ features: { attributes: { PS_CO: string; PS_TYPE_HP: string; PS_NAME: string; PS_STATUS: string; PS_ADDRESS: string; PS_PHONE: string }; geometry: { x: number; y: number } }[] }>(
      `${LOUDOUN}/PublicSafety/MapServer/0/query?where=1%3D1&outFields=PS_CO,PS_TYPE_HP,PS_NAME,PS_STATUS,PS_ADDRESS,PS_PHONE&outSR=4326&returnGeometry=true&f=json`,
      { headers: JSON_HEADERS, retries: 1 },
    ),
    fetchJson<{ features: { attributes: { RS_FDISTRICT: string; RS_FDISTRICT_NAME: string } }[] }>(
      `${LOUDOUN}/PublicSafety/MapServer/10/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=RS_FDISTRICT,RS_FDISTRICT_NAME&returnGeometry=false&f=json`,
      { headers: JSON_HEADERS, retries: 1 },
    ),
  ]);
  const places: Place[] = [
    ...hosp.features.map((f) => ({
      id: `lc-h-${f.attributes.OBJECTID}`,
      type: (f.attributes.FACILITY === 'H' ? 'hospital' : 'urgent-care') as Place['type'],
      name: f.attributes.FACILITY_NAME,
      address: f.attributes.Address,
      lat: f.geometry.y,
      lng: f.geometry.x,
      status: 'unknown' as const,
      source: 'Loudoun County GIS',
      fetchedAt,
      provenance: 'local' as const,
    })),
    ...stations.features
      .filter((f) => /F/.test(f.attributes.PS_TYPE_HP))
      .map((f) => ({
        id: `lc-fs-${f.attributes.PS_CO}`,
        type: 'fire-station' as const,
        name: `Station ${Number(f.attributes.PS_CO)} · ${titleCase(f.attributes.PS_NAME)}`,
        address: titleCase(f.attributes.PS_ADDRESS),
        lat: f.geometry.y,
        lng: f.geometry.x,
        phone: f.attributes.PS_PHONE?.replace(/\./g, '-'),
        status: 'unknown' as const,
        source: 'Loudoun County GIS',
        fetchedAt,
        provenance: 'local' as const,
      })),
  ];
  const d = due.features[0]?.attributes.RS_FDISTRICT;
  const firstDue = d ? `lc-fs-${Number(d)}` : null;
  return { places: places.filter((p) => distanceMi({ lat, lng }, p) <= 25), firstDue };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bVa\b/, 'VA');
}

/** §16.3: "open" only if a live source said so within the last 6 hours. */
export function effectiveStatus(p: Place, now: Date): Place['status'] {
  if (p.status !== 'open') return p.status;
  if (!p.fetchedAt || now.getTime() - new Date(p.fetchedAt).getTime() > 6 * 3_600_000) return 'unknown';
  return 'open';
}
