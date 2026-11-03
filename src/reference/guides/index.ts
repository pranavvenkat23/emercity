import { ageBand } from '@/domain/members';
import type { Hazard, HouseholdSnapshot } from '@/models/types';

import { HAZARD_GUIDES } from './hazards';
import { OUTAGE_WINTER_GUIDES } from './outage-winter';
import { PEOPLE_GUIDES } from './people';
import type { Guide, GuideTopic } from './types';

export * from './types';

export const GUIDES: Guide[] = [...OUTAGE_WINTER_GUIDES, ...HAZARD_GUIDES, ...PEOPLE_GUIDES];
export const GUIDES_BY_ID: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.id, g]));

export const GUIDE_TOPICS: GuideTopic[] = [
  'Medications',
  'Medical devices',
  'Pets',
  'Kids',
  'Older adults',
  'Disabilities',
  'Food and water',
  'Generators and safety',
  'After the emergency',
];

/** Plain text of a guide, for on-device full-text search (§18.1). */
function haystack(g: Guide): string {
  return [g.title, ...g.doNow, ...g.sections.flatMap((s) => [s.heading, s.body, s.callout?.text ?? ''])].join(' ').toLowerCase();
}

const INDEX = GUIDES.map((g) => ({ g, text: haystack(g) }));

/** Offline search: every word must appear; title hits rank first. */
export function searchGuides(query: string): Guide[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return INDEX.filter(({ text }) => words.every((w) => text.includes(w)))
    .map(({ g }) => ({ g, score: words.filter((w) => g.title.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.score - a.score || a.g.title.localeCompare(b.g.title))
    .map(({ g }) => g);
}

export function guidesForHazard(h: Hazard): Guide[] {
  return GUIDES.filter((g) => g.hazards.includes(h));
}

export function guidesForTopic(t: GuideTopic): Guide[] {
  return GUIDES.filter((g) => g.topics.includes(t));
}

/** "For your household" (§18.1): 4–6 guides matched to members and top risks. */
export function guidesForHousehold(snap: HouseholdSnapshot, topRisks: Hazard[], now = new Date()): Guide[] {
  const conds = new Set(snap.members.flatMap((m) => m.conditions.map((c) => c.type)));
  const devs = new Set(snap.devices.map((d) => d.type));
  const bands = new Set(snap.members.map((m) => ageBand(m, now)));
  const scored = GUIDES.map((g) => {
    const m = g.match;
    // Strongest single household match, plus relevance to the top hazards.
    const hits = [
      m?.conditions?.some((c) => conds.has(c)) ? 3 : 0,
      m?.devices?.some((d) => devs.has(d)) ? 3 : 0,
      m?.pets && snap.pets.length ? 2 : 0,
      m?.infants && (bands.has('infant') || bands.has('toddler')) ? 2 : 0,
      m?.olderAdults && bands.has('older-adult') ? 2 : 0,
      m?.children && (bands.has('child') || bands.has('toddler')) ? 1 : 0,
    ];
    const score = Math.max(...hits) + (g.hazards.some((h) => topRisks.includes(h)) ? 2 : 0);
    return { g, score };
  });
  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score || a.g.title.localeCompare(b.g.title))
    .slice(0, 6)
    .map((s) => s.g);
}

/** Guide of the week (§6.1 item 8): matched to season and top risk, stable within a week. */
export function guideOfTheWeek(snap: HouseholdSnapshot, topRisks: Hazard[], now: Date): Guide | null {
  const month = now.getMonth() + 1;
  const seasonal: Hazard[] = month >= 10 || month <= 2 ? ['winter', 'outage'] : month >= 6 && month <= 9 ? ['hurricane', 'flood'] : ['flood', 'outage'];
  const pool = guidesForHousehold(snap, [...seasonal, ...topRisks], now).filter((g) => g.hazards.some((h) => seasonal.includes(h)));
  const list = pool.length ? pool : GUIDES.filter((g) => g.hazards.some((h) => seasonal.includes(h)));
  if (!list.length) return null;
  const week = Math.floor(now.getTime() / (7 * 86_400_000));
  return list[week % list.length];
}
