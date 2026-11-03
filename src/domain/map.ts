import type * as GeoJSON from 'geojson';
import type { Alert } from '@/models/types';

/**
 * Pure helpers for the Map tab (§16). Coordinates follow GeoJSON:
 * [longitude, latitude]; bounds are [west, south, east, north].
 */
export type Bounds = [number, number, number, number];

/** A square around home, `miles` from the center each way (offline area is 10 mi, §16.1). */
export function boundsAround(lat: number, lng: number, miles: number): Bounds {
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((lat * Math.PI) / 180));
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return [r(lng - dLng), r(lat - dLat), r(lng + dLng), r(lat + dLat)];
}

/** FEMA only draws flood zones closer than 1:36,112 (about zoom 14). */
export const NFHL_MIN_ZOOM = 14;

/** FEMA flood zones (NFHL layer 28) as raster tiles MapLibre fills in per tile. */
export const NFHL_TILES =
  'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:28&f=image';

/** Free vector basemap with no key (OpenFreeMap, OpenStreetMap data). */
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Active alert areas with polygons as a GeoJSON collection (§16.1 Live layer). */
export function alertAreas(alerts: Alert[], now: Date): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: alerts
      .filter((a) => a.polygon && a.polygon.length >= 3 && new Date(a.expires) > now)
      .map((a) => ({
        type: 'Feature',
        properties: { id: a.id, event: a.event, demo: !!a.isDemo },
        geometry: { type: 'Polygon', coordinates: [closeRing(a.polygon!)] },
      })),
  };
}

function closeRing(ring: [number, number][]): [number, number][] {
  const [f, l] = [ring[0], ring[ring.length - 1]];
  return f[0] === l[0] && f[1] === l[1] ? ring : [...ring, f];
}

/** Rough tile count for an offline pack, to show the size before downloading. */
export function tileCount(b: Bounds, minZoom: number, maxZoom: number): number {
  const x = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
  const y = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
  };
  let n = 0;
  for (let z = minZoom; z <= maxZoom; z++) n += (x(b[2], z) - x(b[0], z) + 1) * (y(b[1], z) - y(b[3], z) + 1);
  return n;
}
