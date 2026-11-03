import type { HouseholdSnapshot, MeetingPoint, MeetingPointType } from '@/models/types';

import { displayName } from './members';

/** The three meeting points and their purpose (§16.4). */
export const MEETING_POINT_META: Record<MeetingPointType, { title: string; purpose: string; example: string }> = {
  'near-home': { title: 'Near home', purpose: 'For a fire. A spot just outside.', example: 'The mailbox, or the neighbor’s oak tree' },
  neighborhood: { title: 'Neighborhood', purpose: 'If you can’t get back home.', example: 'The community center or library' },
  'out-of-area': { title: 'Out of area', purpose: 'If the whole area has to leave.', example: 'A relative’s home in another town' },
};
export const MEETING_POINT_TYPES: MeetingPointType[] = ['near-home', 'neighborhood', 'out-of-area'];

const MOBILITY = new Set(['mobility-wheelchair', 'mobility-walker', 'bedbound']);

/**
 * Accessibility check (§16.4): only when the user has marked the path as
 * having stairs or slopes. Terrain is never guessed.
 */
export function meetingPointWarnings(snap: Pick<HouseholdSnapshot, 'members' | 'devices'>, point: Pick<MeetingPoint, 'pathHasStairsOrSlopes'>): string[] {
  if (!point.pathHasStairsOrSlopes) return [];
  return snap.members
    .filter((m) => !m.archived)
    .filter((m) => m.conditions.some((c) => MOBILITY.has(c.type)) || snap.devices.some((d) => d.memberId === m.id && d.type === 'power-wheelchair'))
    .map((m) => `${displayName(m)} may not be able to use a path with stairs or slopes. Pick a level route or a closer spot.`);
}
