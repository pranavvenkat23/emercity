import { DEMO_OUTAGE_AGO_MS, DEMO_WINTER_WEATHER, demoFlashFloodWarning, demoWinterStormWarning } from '@/domain/demo-scenarios';
import { useConditions } from '@/stores/conditions-store';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';

import { checkNow, useAlertHistoryStore } from './alerts';

/**
 * Hidden demo menu actions (§26.3). Only run for the built-in demo household;
 * every value is marked simulated and labeled "Demo" on screen.
 */
function demoHouseholdId(): string | null {
  const h = useSession.getState().snapshot?.household;
  return h?.isDemo ? h.id : null;
}

export function simulateFlashFlood(): void {
  const id = demoHouseholdId();
  if (!id) return;
  const alert = demoFlashFloodWarning(id, new Date());
  useConditions.getState().setAlerts({ value: [alert], source: 'Demo', fetchedAt: new Date().toISOString(), simulated: true });
  useAlertHistoryStore.getState().setPending(alert);
}

export async function simulateWinterOutage(): Promise<void> {
  const id = demoHouseholdId();
  if (!id) return;
  const now = new Date();
  const fetchedAt = now.toISOString();
  useConditions.getState().setWeather({ value: { ...DEMO_WINTER_WEATHER }, source: 'Demo', fetchedAt, simulated: true });
  useConditions.getState().setAlerts({ value: [demoWinterStormWarning(id, now)], source: 'Demo', fetchedAt, simulated: true });
  await useOutage.getState().start(new Date(now.getTime() - DEMO_OUTAGE_AGO_MS), { simulated: true });
}

/** Clears every simulated value and goes back to live checks. */
export async function clearDemoScenario(): Promise<void> {
  useConditions.getState().clearSimulated();
  useAlertHistoryStore.getState().setPending(null);
  await useOutage.getState().discardSimulated();
  await checkNow();
}
