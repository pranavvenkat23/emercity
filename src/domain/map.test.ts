import type * as GeoJSON from 'geojson';
import type { Alert } from '@/models/types';

import { alertAreas, boundsAround, tileCount } from './map';

describe('map helpers (§16)', () => {
  it('bounds 10 miles around Leesburg', () => {
    const [w, s, e, n] = boundsAround(39.1157, -77.5636, 10);
    expect(n - s).toBeCloseTo(0.29, 2);
    expect(e - w).toBeGreaterThan(n - s); // longitude degrees are shorter at 39°N
    expect((w + e) / 2).toBeCloseTo(-77.5636, 3);
  });

  it('alert polygons become closed GeoJSON rings; expired or polygon-less alerts are skipped', () => {
    const base = { id: 'a', event: 'Flash Flood Warning', expires: '2099-01-01T00:00:00Z', polygon: [[-77.6, 39.1], [-77.5, 39.1], [-77.5, 39.2]] } as unknown as Alert;
    const fc = alertAreas([base, { ...base, id: 'b', polygon: null }, { ...base, id: 'c', expires: '2000-01-01T00:00:00Z' }], new Date('2026-10-24'));
    expect(fc.features).toHaveLength(1);
    const ring = (fc.features[0].geometry as GeoJSON.Polygon).coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('counts tiles for the offline area', () => {
    const b = boundsAround(39.1157, -77.5636, 10);
    expect(tileCount(b, 10, 10)).toBeGreaterThan(0);
    expect(tileCount(b, 8, 14)).toBeLessThan(3000);
  });
});
