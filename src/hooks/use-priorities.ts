import { useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';

import { conditionsKey, rankHousehold, topTierAcrossHazards } from '@/domain/priority/engine';
import { memberFacts } from '@/domain/priority/rules';
import type { PriorityContext, PriorityPin, PriorityResult } from '@/domain/priority/types';
import { computeHazardScores, topRiskHazard } from '@/domain/risk';
import type { Hazard, Tier } from '@/models/types';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';

import { useCountdownContext } from './use-countdowns';
import { useNow } from './use-now';

/** Builds the engine context from live conditions (§8.1). */
export function usePriorityContext(): PriorityContext {
  const now = useNow(60_000);
  const weather = useConditions((s) => s.weather);
  const alerts = useConditions((s) => s.alerts);
  const risk = useConditions((s) => s.risk);
  const outageCtx = useCountdownContext();
  return useMemo(() => {
    const events = (alerts?.value ?? []).filter((a) => a.affectsAddress).map((a) => a.event);
    const flood = risk?.value.factors.find((f) => f.type === 'flood-zone');
    const stream = risk?.value.factors.find((f) => f.type === 'stream-distance');
    const streamFt = stream && stream.level !== 'unknown' ? Number(stream.value.match(/[\d.]+/)?.[0]) * (/mi/.test(stream.value) ? 5280 : 1) : null;
    return {
      now,
      outdoorTempF: weather?.value.tempF ?? null,
      heatIndexF: weather?.value.heatIndexF ?? null,
      activeAlertEvents: events,
      evacuationOrdered: events.some((e) => /evacuation/i.test(e)),
      floodZoneLevel: flood?.level,
      streamDistanceFt: streamFt != null && Number.isFinite(streamFt) ? streamFt : null,
      outage: outageCtx,
    };
  }, [now, weather, alerts, risk, outageCtx]);
}

const pinKey = (householdId: string, hazard: Hazard) => `pins.${householdId}.${hazard}`;

/** Pins shared by every screen, keyed by household and hazard. */
const usePinStore = create<{ pins: Record<string, PriorityPin[]>; loaded: Record<string, boolean>; set(key: string, pins: PriorityPin[]): void; markLoaded(key: string): void }>((set, get) => ({
  pins: {},
  loaded: {},
  set: (key, pins) => set({ pins: { ...get().pins, [key]: pins } }),
  markLoaded: (key) => set({ loaded: { ...get().loaded, [key]: true } }),
}));
const NO_PINS: PriorityPin[] = [];

/** Pins persisted per household and hazard (§8.8). */
export function usePins(hazard: Hazard) {
  const db = useSession((s) => s.db);
  const householdId = useSession((s) => s.householdId);
  const key = householdId ? pinKey(householdId, hazard) : '';
  const pins = usePinStore((s) => s.pins[key] ?? NO_PINS);
  const loaded = usePinStore((s) => !!s.loaded[key]);

  useEffect(() => {
    if (!db || !key || loaded) return;
    usePinStore.getState().markLoaded(key);
    db.kv.getJSON<PriorityPin[]>(key).then((p) => {
      if (p) usePinStore.getState().set(key, p);
    });
  }, [db, key, loaded]);

  const save = useCallback(
    async (next: PriorityPin[]) => {
      if (!key) return;
      usePinStore.getState().set(key, next);
      if (db) await db.kv.setJSON(key, next);
    },
    [db, key],
  );
  return { pins, setPins: save };
}

export function usePriorities(hazard: Hazard): PriorityResult | null {
  const snapshot = useSession((s) => s.snapshot);
  const ctx = usePriorityContext();
  const { pins } = usePins(hazard);
  return useMemo(() => (snapshot ? rankHousehold(snapshot, hazard, ctx, pins) : null), [snapshot, hazard, ctx, pins]);
}

/** The household's top-risk hazard (§9.3), honoring a user override. */
export function useTopRiskHazard(): Hazard {
  const snapshot = useSession((s) => s.snapshot);
  const risk = useConditions((s) => s.risk);
  return useMemo(() => {
    if (!snapshot) return 'outage';
    if (snapshot.household.defaultHazard) return snapshot.household.defaultHazard;
    return topRiskHazard(computeHazardScores(snapshot, risk?.value.factors ?? []));
  }, [snapshot, risk]);
}

export function useTopTiers(): Map<string, Tier> {
  const snapshot = useSession((s) => s.snapshot);
  const ctx = usePriorityContext();
  return useMemo(() => (snapshot ? topTierAcrossHazards(snapshot, ctx) : new Map()), [snapshot, ctx]);
}

/** Conditions key for building a pin for a member. */
export function useConditionsKey() {
  const snapshot = useSession((s) => s.snapshot);
  return useCallback(
    (subjectId: string) => {
      if (!snapshot) return '';
      const m = snapshot.members.find((x) => x.id === subjectId);
      if (m) return conditionsKey(memberFacts(m, snapshot.devices, snapshot.medications, new Date()));
      const p = snapshot.pets.find((x) => x.id === subjectId);
      return p ? `${p.species}|${p.specialNeeds.join(',')}` : '';
    },
    [snapshot],
  );
}
