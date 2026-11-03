import type { Hazard, Tier } from '@/models/types';

/**
 * Hazard playbook templates, general steps from spec §12.8, wording kept
 * verbatim. Bracketed per-subject and per-household steps from §12.8
 * ("[Help Grandma upstairs]", "[If generator: …]") are inserted by the
 * playbook generator in Phase 5 and are not listed here.
 *
 * REVIEW STATUS: NOT REVIEWED. §12.8 requires review by a qualified local
 * reviewer (emergency manager, nurse, or CERT instructor) before release.
 * Content basis per spec: Ready.gov, CDC, NWS, American Red Cross.
 */
export interface TemplateStep {
  id: string;
  instruction: string;
  tier: Tier;
  /**
   * Tier as listed in §12.8. Where the spec lists no tier, 'standard' is
   * used. Where the spec makes the tier conditional (e.g. "Critical when an
   * evacuation alert is active") and gives no base tier, the base is
   * 'standard' and the condition is noted for the Phase 5 generator.
   */
  conditionalNote?: string;
  /** Embedded tool from §12.4, wired up in Phase 5. */
  embed?: 'checklist' | 'map' | 'status' | 'countdown' | 'power-out' | 'power-back' | 'call' | 'timer' | 'gauge';
}

export const PLAYBOOK_REVIEW = {
  reviewed: false,
  reviewer: null as string | null,
  reviewedDate: null as string | null,
};

export const PLAYBOOK_TEMPLATES: Record<Hazard, TemplateStep[]> = {
  flood: [
    { id: 'fld-1', instruction: 'If water is rising around your home, get to higher ground now. Do not wait for instructions.', tier: 'critical' },
    { id: 'fld-2', instruction: 'Call 911 if anyone is trapped.', tier: 'critical' },
    { id: 'fld-5', instruction: 'Grab the go-bag and critical meds.', tier: 'urgent', embed: 'checklist' },
    { id: 'fld-7', instruction: 'Turn off electricity at the main breaker only if you can do it without standing in water.', tier: 'important' },
    {
      id: 'fld-8',
      instruction: 'If told to evacuate, leave now. Never drive or walk through floodwater.',
      tier: 'standard',
      conditionalNote: 'Critical when an evacuation alert is active',
    },
    { id: 'fld-9', instruction: 'Go to your meeting point or a shelter.', tier: 'standard', embed: 'map' },
    { id: 'fld-10', instruction: 'Check in with your family.', tier: 'standard', embed: 'status' },
    { id: 'fld-11', instruction: 'Stay away from floodwater; it can hide hazards and carry contamination.', tier: 'standard' },
  ],
  winter: [
    { id: 'win-1', instruction: 'Stay home and off the roads.', tier: 'important' },
    { id: 'win-4', instruction: 'Charge phones and power banks.', tier: 'important' },
    { id: 'win-5', instruction: 'Fill water containers in case pipes freeze.', tier: 'important' },
    { id: 'win-6', instruction: 'Gather blankets and warm clothes in one room.', tier: 'important' },
    { id: 'win-7', instruction: 'If power goes out: tap "Power is out" to start countdowns.', tier: 'urgent', embed: 'power-out' },
    {
      id: 'win-8',
      instruction: 'Never use a grill, camp stove, or generator indoors or in a garage.',
      tier: 'standard',
      conditionalNote: 'Critical when outage active',
    },
    { id: 'win-10', instruction: 'Check on everyone every few hours.', tier: 'standard' },
  ],
  outage: [
    { id: 'out-1', instruction: 'Confirm the outage and note the time.', tier: 'standard', embed: 'power-out' },
    { id: 'out-4', instruction: 'Keep the fridge and freezer closed.', tier: 'urgent', embed: 'countdown' },
    { id: 'out-6', instruction: 'Report the outage to Dominion Energy.', tier: 'important', embed: 'call' },
    { id: 'out-9', instruction: 'Use flashlights, not candles.', tier: 'important' },
    { id: 'out-10', instruction: 'Unplug sensitive electronics to protect them from surges.', tier: 'standard' },
    { id: 'out-11', instruction: 'When power returns: tap "Power\'s back" and run the medication and food check.', tier: 'standard', embed: 'power-back' },
  ],
  fire: [
    { id: 'fir-1', instruction: 'Get out, stay out. Call 911 from outside.', tier: 'critical' },
    { id: 'fir-5', instruction: 'Crawl low under smoke. Feel doors before opening; use another way out if hot.', tier: 'critical' },
    { id: 'fir-6', instruction: 'Go to the meeting point.', tier: 'standard', embed: 'map' },
    { id: 'fir-7', instruction: 'Count everyone.', tier: 'standard', embed: 'checklist' },
    { id: 'fir-8', instruction: 'Never go back inside, even for pets. Tell firefighters who is missing.', tier: 'critical' },
  ],
  hazmat: [
    { id: 'haz-1', instruction: 'Get inside now and stay inside.', tier: 'critical' },
    { id: 'haz-2', instruction: 'Close and lock all windows and doors.', tier: 'urgent' },
    { id: 'haz-3', instruction: 'Turn off heating, AC, and fans that pull in outside air.', tier: 'urgent' },
    { id: 'haz-4', instruction: 'Go to an interior room with few windows, above ground.', tier: 'urgent' },
    { id: 'haz-6', instruction: 'Bring pets inside.', tier: 'important' },
    { id: 'haz-7', instruction: "Listen for official updates and stay until told it's safe.", tier: 'urgent', embed: 'timer' },
    {
      id: 'haz-8',
      instruction: 'If told to evacuate: follow official routes, leave immediately, keep windows closed and air on recirculate in the car.',
      tier: 'standard',
      conditionalNote: 'Critical if evacuation alert',
    },
  ],
  hurricane: [
    { id: 'hur-1', instruction: 'Before it arrives: charge everything, fill water, gather meds for 7+ days.', tier: 'urgent' },
    { id: 'hur-3', instruction: 'Bring in or tie down outdoor furniture.', tier: 'standard' },
    { id: 'hur-4', instruction: 'During tornado warnings: go to the lowest floor, interior room, away from windows.', tier: 'critical' },
    { id: 'hur-5', instruction: 'Expect power outages: open the outage steps when power goes out.', tier: 'standard', embed: 'power-out' },
    { id: 'hur-6', instruction: 'Watch for flooding: follow flood steps if water rises.', tier: 'standard', embed: 'gauge' },
    { id: 'hur-7', instruction: 'After: stay away from downed power lines and report them.', tier: 'critical' },
  ],
};

/** §12.2 "Something else" general steps. */
export const GENERAL_STEPS: TemplateStep[] = [
  { id: 'gen-1', instruction: 'Stay calm.', tier: 'standard' },
  { id: 'gen-2', instruction: 'Check on everyone.', tier: 'standard' },
  { id: 'gen-3', instruction: 'Call 911 if anyone is in danger.', tier: 'critical' },
  { id: 'gen-4', instruction: 'Open the guide library.', tier: 'standard' },
];
