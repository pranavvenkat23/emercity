import type { Alert } from '@/models/types';

/**
 * Simulated conditions for the demo household's hidden demo menu (§26.3).
 * Every value is marked `isDemo` / source "demo" and the UI labels it
 * "Demo". These never run for a real household.
 */

const HOUR = 3600_000;

function demoAlert(householdId: string, now: Date, p: Pick<Alert, 'event' | 'headline' | 'description' | 'instruction' | 'mappedHazard'> & { hours: number; id: string }): Alert {
  return {
    id: `demo-${p.id}`,
    householdId,
    source: 'demo',
    event: p.event,
    severity: 'Severe',
    urgency: 'Immediate',
    certainty: 'Observed',
    headline: `DEMO: ${p.headline}`,
    description: `This is a simulated alert for the demo household. It is not real. ${p.description}`,
    instruction: p.instruction,
    areaDesc: 'Loudoun, VA (demo)',
    effective: new Date(now.getTime() - 5 * 60_000).toISOString(),
    expires: new Date(now.getTime() + p.hours * HOUR).toISOString(),
    mappedHazard: p.mappedHazard,
    affectsAddress: true,
    isDemo: true,
    senderName: 'Demo (not the National Weather Service)',
    url: undefined,
    polygon: null,
    seenAt: null,
  };
}

export function demoFlashFloodWarning(householdId: string, now: Date): Alert {
  return demoAlert(householdId, now, {
    id: 'flash-flood',
    event: 'Flash Flood Warning',
    headline: 'Flash Flood Warning for the demo household area',
    description: 'Heavy rain is causing creeks to rise quickly near the demo address.',
    instruction: 'Move to higher ground now. Do not drive through flooded roads.',
    mappedHazard: 'flood',
    hours: 3,
  });
}

export function demoWinterStormWarning(householdId: string, now: Date): Alert {
  return demoAlert(householdId, now, {
    id: 'winter-storm',
    event: 'Winter Storm Warning',
    headline: 'Winter Storm Warning for the demo household area',
    description: 'Snow and ice are bringing down power lines across the county.',
    instruction: 'Stay off roads. Keep warm and check on people who need help.',
    mappedHazard: 'winter',
    hours: 18,
  });
}

/** Demo winter-storm weather: very cold, so cold-weather rules fire (§8.4). */
export const DEMO_WINTER_WEATHER = { tempF: 18, heatIndexF: null, summary: 'Demo: snow and ice' } as const;

/** The demo outage started this long before the scenario is triggered. */
export const DEMO_OUTAGE_AGO_MS = 2 * HOUR;
