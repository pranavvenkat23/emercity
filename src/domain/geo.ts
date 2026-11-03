/** Great-circle distance and bearing (for "2.1 mi northwest of home", §10.4, §16). */

const R_MI = 3958.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const DIRS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

export function compass(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

/** "2.1 mi northwest of home", direction from home to the place. */
export function describeFromHome(home: { lat: number; lng: number }, place: { lat: number; lng: number }): string {
  const d = distanceMi(home, place);
  return `${d < 10 ? d.toFixed(1) : Math.round(d)} mi ${compass(bearingDeg(home, place))} of home`;
}

/** Minimum distance from a point to a polyline (miles), for rail/road proximity. */
export function distanceToPolylineMi(p: { lat: number; lng: number }, line: [number, number][]): number {
  // Local equirectangular projection (miles), accurate at county scale.
  const kx = Math.cos(rad(p.lat)) * 69.172;
  const ky = 69.0;
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = [(line[i][0] - p.lng) * kx, (line[i][1] - p.lat) * ky];
    const [bx, by] = [(line[i + 1][0] - p.lng) * kx, (line[i + 1][1] - p.lat) * ky];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** Point-in-polygon (ray casting), ring of [lng, lat]. */
export function pointInRing(p: { lat: number; lng: number }, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
