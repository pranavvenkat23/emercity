import { isActive, mapAlert } from '@/domain/alerts';
import { heatIndexF } from '@/domain/heat-index';
import type { Alert } from '@/models/types';

/**
 * National Weather Service API (§10.1, §24.3). No key; NWS asks for a
 * User-Agent that identifies the app. Only coordinates are sent, no
 * household data (§22.4).
 */
const HEADERS = {
  'User-Agent': '(Emercity household emergency app; contact via app store listing)',
  Accept: 'application/geo+json',
};

const BACKOFF_MS = [2000, 4000, 8000, 16000];

/** Fetch with retry and backoff (2, 4, 8, 16 s, §25.3). */
export async function fetchJson<T>(url: string, opts: { retries?: number; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? BACKOFF_MS.length;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
    try {
      const res = await fetch(url, { headers: opts.headers ?? HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 404) throw Object.assign(new Error('Not found'), { status: 404 });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if ((e as { status?: number }).status === 404 || attempt === retries) break;
      await new Promise((r) => setTimeout(r, BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Request failed');
}

interface NwsAlertFeature {
  id?: string;
  geometry: { type: string; coordinates: number[][][] } | null;
  properties: {
    id: string;
    '@id'?: string;
    event: string;
    severity: string;
    urgency: string;
    certainty: string;
    headline: string | null;
    description: string | null;
    instruction: string | null;
    areaDesc: string;
    effective: string;
    onset?: string | null;
    expires: string;
    ends?: string | null;
    senderName?: string;
    status?: string;
    messageType?: string;
  };
}

/** Converts an NWS CAP feature to an Emercity Alert (§4.2). */
export function toAlert(f: NwsAlertFeature, householdId: string): Alert {
  const p = f.properties;
  const base = {
    event: p.event,
    headline: p.headline ?? p.event,
    description: p.description ?? '',
  };
  const ring = f.geometry?.type === 'Polygon' ? (f.geometry.coordinates[0] as [number, number][]) : null;
  return {
    id: p.id,
    householdId,
    source: 'NWS',
    event: p.event,
    severity: p.severity,
    urgency: p.urgency,
    certainty: p.certainty,
    headline: base.headline,
    description: base.description,
    instruction: p.instruction ?? '',
    areaDesc: p.areaDesc,
    effective: p.onset ?? p.effective,
    expires: p.ends ?? p.expires,
    mappedHazard: mapAlert(base).hazard,
    // NWS point queries return only alerts whose polygon or zone contains the point.
    affectsAddress: true,
    senderName: p.senderName,
    url: p['@id'] ?? `https://api.weather.gov/alerts/${encodeURIComponent(p.id)}`,
    polygon: ring,
  };
}

/** Active alerts for a point (§10.2 step 5). Test messages are ignored. */
export async function fetchAlerts(lat: number, lng: number, householdId: string, now = new Date()): Promise<Alert[]> {
  const data = await fetchJson<{ features: NwsAlertFeature[] }>(
    `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`,
  );
  return data.features
    .filter((f) => f.properties.status !== 'Test' && f.properties.status !== 'Exercise')
    .map((f) => toAlert(f, householdId))
    .filter((a) => isActive(a, now) || new Date(a.effective) > now);
}

interface HourlyPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  relativeHumidity?: { value: number | null };
  shortForecast: string;
}

/** Current-hour temperature and heat index (§8.1 "Live conditions"). */
export async function fetchWeather(lat: number, lng: number): Promise<{ tempF: number; heatIndexF: number | null; summary: string } | null> {
  const point = await fetchJson<{ properties: { forecastHourly: string } }>(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`);
  const hourly = await fetchJson<{ properties: { periods: HourlyPeriod[] } }>(point.properties.forecastHourly);
  const now = hourly.properties.periods[0];
  if (!now) return null;
  const tempF = now.temperatureUnit === 'C' ? now.temperature * 1.8 + 32 : now.temperature;
  const rh = now.relativeHumidity?.value;
  // The engine reads the lowest upcoming temperature for cold rules (forecast or current, §8.4 OUT-C3).
  const next24 = hourly.properties.periods.slice(0, 24).map((p) => (p.temperatureUnit === 'C' ? p.temperature * 1.8 + 32 : p.temperature));
  const minF = Math.min(tempF, ...next24);
  return {
    tempF: tempF <= 45 ? minF : tempF,
    heatIndexF: rh != null && tempF >= 80 ? heatIndexF(tempF, rh) : null,
    summary: now.shortForecast,
  };
}
