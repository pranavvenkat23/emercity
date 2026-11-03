import { bearingDeg, compass, describeFromHome, distanceMi, distanceToPolylineMi, pointInRing } from './geo';

const leesburg = { lat: 39.1157, lng: -77.5636 };

describe('geo', () => {
  it('measures distance (Leesburg to Goose Creek gauge ≈ 6.7 mi)', () => {
    expect(distanceMi(leesburg, { lat: 39.0194, lng: -77.5778 })).toBeCloseTo(6.7, 0);
    expect(distanceMi(leesburg, leesburg)).toBe(0);
  });

  it('gives compass directions', () => {
    expect(compass(bearingDeg(leesburg, { lat: 39.2, lng: -77.5636 }))).toBe('north');
    expect(compass(bearingDeg(leesburg, { lat: 39.0, lng: -77.5636 }))).toBe('south');
    expect(compass(315)).toBe('northwest');
  });

  it('describes a place from home', () => {
    expect(describeFromHome(leesburg, { lat: 39.0194, lng: -77.5778 })).toBe('6.7 mi south of home');
  });

  it('measures distance to a line', () => {
    // East-west line one mile north (~1/69 degree).
    const line: [number, number][] = [[-77.6, 39.1157 + 1 / 69], [-77.5, 39.1157 + 1 / 69]];
    expect(distanceToPolylineMi(leesburg, line)).toBeCloseTo(1, 1);
  });

  it('tests points in polygons', () => {
    const ring: [number, number][] = [[-77.6, 39.1], [-77.5, 39.1], [-77.5, 39.2], [-77.6, 39.2], [-77.6, 39.1]];
    expect(pointInRing(leesburg, ring)).toBe(true);
    expect(pointInRing({ lat: 38, lng: -77 }, ring)).toBe(false);
  });
});
