import type { RiskLevel, Tier } from '@/models/types';

/** River gauge rules (§10.4). */

export interface Point {
  t: string;
  ft: number;
}

/** Rising / falling / steady over the last 3 hours (±0.1 ft). */
export function gaugeTrend(observed: Point[]): 'rising' | 'falling' | 'steady' | 'unknown' {
  if (observed.length < 2) return 'unknown';
  const last = observed[observed.length - 1];
  const cutoff = new Date(last.t).getTime() - 3 * 3_600_000;
  const earlier = [...observed].reverse().find((p) => new Date(p.t).getTime() <= cutoff);
  if (!earlier) return 'unknown';
  const d = last.ft - earlier.ft;
  return d > 0.1 ? 'rising' : d < -0.1 ? 'falling' : 'steady';
}

export interface GaugeAlert {
  tier: Tier;
  kind: 'forecast-action' | 'observed-action' | 'minor-flood';
  body: string;
  /** Opens flood Emergency Mode (§12.1 gauge alert Critical). */
  fullScreen: boolean;
}

/**
 * §10.4 gauge alerts:
 *  - forecast to reach Action within 24 h to Important
 *  - observed at Action to Urgent (push + Home banner)
 *  - forecast or observed Minor flood or higher AND household flood risk High to Critical (full-screen)
 * Notification copy names the creek but no household data (§22.4).
 */
export function gaugeAlert(
  g: { name: string; stageFt: number | null; flood: { action: number | null; minor: number | null }; forecast: Point[] },
  householdFloodRisk: RiskLevel,
  now: Date,
): GaugeAlert | null {
  const in24 = g.forecast.filter((p) => {
    const t = new Date(p.t).getTime();
    return t >= now.getTime() && t <= now.getTime() + 24 * 3_600_000;
  });
  const maxForecast = Math.max(-Infinity, ...g.forecast.map((p) => p.ft));
  const maxNext24 = Math.max(-Infinity, ...in24.map((p) => p.ft));
  const { action, minor } = g.flood;
  const observed = g.stageFt;

  if (minor != null && ((observed != null && observed >= minor) || maxForecast >= minor) && householdFloodRisk === 'high') {
    return { tier: 'critical', kind: 'minor-flood', body: `${g.name} is flooding or forecast to flood. Open flood steps.`, fullScreen: true };
  }
  if (action != null && observed != null && observed >= action) {
    return { tier: 'urgent', kind: 'observed-action', body: `${g.name} has reached action stage.`, fullScreen: false };
  }
  if (action != null && maxNext24 >= action) {
    return { tier: 'important', kind: 'forecast-action', body: `${g.name} is forecast to reach action stage within 24 hours.`, fullScreen: false };
  }
  return null;
}
