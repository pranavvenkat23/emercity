import * as Location from 'expo-location';

import { addressFromCensus, type CensusMatch } from '@/domain/onboarding';
import type { Address } from '@/models/types';

import { fetchJson } from './nws';
import { countyAt } from './risk-profile';

const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

/**
 * Address lookup (§5.4, §24) with the U.S. Census Bureau geocoder: free, no
 * key, U.S. addresses only. It has no autocomplete, so the app searches
 * when the user taps Find. The address is sent only to the geocoder and
 * never logged.
 */
export async function searchAddress(q: string): Promise<Address[]> {
  const r = await fetchJson<{ result: { addressMatches: CensusMatch[] } }>(
    `${CENSUS}?address=${encodeURIComponent(q.trim())}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`,
    { headers: { Accept: 'application/json' }, retries: 1, timeoutMs: 20000 },
  );
  return r.result.addressMatches.slice(0, 5).map(addressFromCensus);
}

/** "Use my current location": GPS point, street address from the phone, county from Census. */
export async function addressFromCurrentLocation(): Promise<Address | 'denied'> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return 'denied';
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude: lat, longitude: lng } = pos.coords;
  const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
  const county = await countyAt(lat, lng).catch(() => null);
  return {
    line1: [place?.streetNumber, place?.street].filter(Boolean).join(' ') || 'Current location',
    city: place?.city ?? '',
    state: place?.region ?? '',
    zip: place?.postalCode ?? '',
    county: county ?? place?.subregion ?? undefined,
    lat,
    lng,
    geocodeSource: 'Phone location',
  };
}
