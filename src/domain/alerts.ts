import type { Alert, Hazard } from '@/models/types';

/**
 * Official alert handling (§10.3): event to hazard, banner level, and
 * whether it earns the full-screen prompt.
 */

export type AlertLevel = 'warning' | 'watch' | 'advisory' | 'statement';
export type PromptKind = 'full-screen' | 'banner';

export interface AlertMapping {
  hazard: Hazard | null;
  prompt: PromptKind;
  /** First step override, e.g. tornado "Take shelter now" (§10.3). */
  firstStep?: string;
}

const RULES: { match: RegExp; map: AlertMapping }[] = [
  { match: /^(flash flood warning|flood warning)$/i, map: { hazard: 'flood', prompt: 'full-screen' } },
  { match: /^(flash flood watch|flood watch|flood advisory|flash flood statement|flood statement|hydrologic outlook)$/i, map: { hazard: 'flood', prompt: 'banner' } },
  { match: /^(winter storm warning|ice storm warning|blizzard warning)$/i, map: { hazard: 'winter', prompt: 'full-screen' } },
  { match: /^(winter storm watch|winter weather advisory|wind chill warning|wind chill advisory|cold weather advisory)$/i, map: { hazard: 'winter', prompt: 'banner' } },
  { match: /^(extreme cold warning|extreme cold watch|extreme heat warning|extreme heat watch|heat advisory)$/i, map: { hazard: 'outage', prompt: 'banner' } },
  { match: /^(high wind warning|severe thunderstorm warning)$/i, map: { hazard: 'outage', prompt: 'banner' } },
  { match: /^tornado warning$/i, map: { hazard: 'hurricane', prompt: 'full-screen', firstStep: 'Take shelter now: lowest floor, interior room, away from windows.' } },
  { match: /^(tropical storm warning|hurricane warning|extreme wind warning)$/i, map: { hazard: 'hurricane', prompt: 'full-screen' } },
  { match: /^(tropical storm watch|hurricane watch|tornado watch)$/i, map: { hazard: 'hurricane', prompt: 'banner' } },
  { match: /^(hazardous materials warning|shelter in place warning|civil emergency message|radiological hazard warning)$/i, map: { hazard: 'hazmat', prompt: 'full-screen' } },
  { match: /^(fire warning)$/i, map: { hazard: 'fire', prompt: 'full-screen' } },
  { match: /^(red flag warning|fire weather watch)$/i, map: { hazard: 'fire', prompt: 'banner' } },
];

/** "Evacuation Immediate": match the alert text's hazard, else fire/hazmat (§10.3). */
function evacuationHazard(text: string): Hazard {
  if (/flood|water|dam|levee/i.test(text)) return 'flood';
  if (/chemical|hazardous|gas leak|toxic|spill|release/i.test(text)) return 'hazmat';
  if (/hurricane|tropical/i.test(text)) return 'hurricane';
  return 'fire';
}

export function mapAlert(a: Pick<Alert, 'event' | 'headline' | 'description'>): AlertMapping {
  if (/^evacuation immediate$/i.test(a.event)) {
    return { hazard: evacuationHazard(`${a.headline} ${a.description}`), prompt: 'full-screen', firstStep: 'Leave now. Take only your go-bag.' };
  }
  const rule = RULES.find((r) => r.match.test(a.event.trim()));
  return rule?.map ?? { hazard: null, prompt: 'banner' };
}

export function alertLevel(event: string): AlertLevel {
  if (/warning|emergency|immediate/i.test(event)) return 'warning';
  if (/watch/i.test(event)) return 'watch';
  if (/advisory/i.test(event)) return 'advisory';
  return 'statement';
}

const LEVEL_RANK: Record<AlertLevel, number> = { warning: 0, watch: 1, advisory: 2, statement: 3 };

/** Most severe first (Warning > Watch > Advisory), then soonest-expiring (§6.2). */
export function sortAlerts<T extends Pick<Alert, 'event' | 'expires'>>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => LEVEL_RANK[alertLevel(a.event)] - LEVEL_RANK[alertLevel(b.event)] || a.expires.localeCompare(b.expires));
}

/** Active = effective now and not expired. */
export function isActive(a: Pick<Alert, 'effective' | 'expires'>, now: Date): boolean {
  const t = now.getTime();
  return new Date(a.effective).getTime() <= t && new Date(a.expires).getTime() > t;
}

/** One-line instruction excerpt for the hero card. */
export function instructionExcerpt(a: Pick<Alert, 'instruction' | 'description'>, max = 120): string {
  const text = (a.instruction || a.description || '').replace(/\s+/g, ' ').trim();
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

/** NWS office from senderName, e.g. "NWS Sterling VA" to "NWS Sterling, VA". */
export function issuingOffice(sender: string | null | undefined): string {
  if (!sender) return 'National Weather Service';
  const m = sender.match(/^NWS (.+) ([A-Z]{2})$/);
  return m ? `NWS ${m[1]}, ${m[2]}` : sender;
}
