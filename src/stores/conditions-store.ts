import { create } from 'zustand';

import type { Alert, RiskProfile } from '@/models/types';

/** A followed river gauge (§10.4). */
export interface GaugeState {
  id: string;
  name: string;
  distanceMi: number;
  direction: string;
  stageFt: number | null;
  observedAt: string | null;
  flood: { action: number | null; minor: number | null; moderate: number | null; major: number | null };
  trend: 'rising' | 'falling' | 'steady' | 'unknown';
  observed: { t: string; ft: number }[];
  forecast: { t: string; ft: number }[];
}

/**
 * Live conditions the priority engine and Home read (§8.1, §10, §11).
 * Every value carries where it came from and when, so the UI can label it
 * (§1.4 "Honest data"). `simulated` values come only from the demo menu
 * (§26.3) and are always labeled "Demo".
 */
export interface Sourced<T> {
  value: T;
  source: string;
  fetchedAt: string;
  simulated?: boolean;
}

export interface Weather {
  tempF: number | null;
  heatIndexF: number | null;
  /** Short description, e.g. "Snow likely". */
  summary?: string;
}

interface ConditionsState {
  weather: Sourced<Weather> | null;
  alerts: Sourced<Alert[]> | null;
  /** When alert checking last failed, so Home can say "Alerts may be delayed". */
  alertsError: string | null;
  risk: Sourced<RiskProfile> | null;
  gauge: Sourced<GaugeState> | null;
  setGauge(g: Sourced<GaugeState> | null): void;
  setWeather(w: Sourced<Weather> | null): void;
  setAlerts(a: Sourced<Alert[]> | null, error?: string | null): void;
  setRisk(r: Sourced<RiskProfile> | null): void;
  clearSimulated(): void;
}

export const useConditions = create<ConditionsState>((set, get) => ({
  weather: null,
  alerts: null,
  alertsError: null,
  risk: null,
  gauge: null,
  setGauge: (gauge) => set({ gauge }),
  setWeather: (weather) => set({ weather }),
  setAlerts: (alerts, error = null) => set({ alerts, alertsError: error }),
  setRisk: (risk) => set({ risk }),
  clearSimulated() {
    const s = get();
    set({
      weather: s.weather?.simulated ? null : s.weather,
      alerts: s.alerts?.simulated ? null : s.alerts,
      risk: s.risk?.simulated ? null : s.risk,
      gauge: s.gauge?.simulated ? null : s.gauge,
    });
  },
}));
