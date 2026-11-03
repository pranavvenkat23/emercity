import type { Href } from 'expo-router';
import { createContext, useContext } from 'react';

/**
 * Household editing screens (scan, add medication, medication and device
 * detail, member edit) are mounted twice: under the Household tab and inside
 * guided setup, where the tabs aren't reachable yet. Screens build their
 * links from this base instead of hard-coding the tab path.
 */
export type HouseholdBase = '/(tabs)/household' | '/(onboarding)/hh';

export const HouseholdPathsContext = createContext<HouseholdBase>('/(tabs)/household');

export function useHouseholdPaths() {
  const base = useContext(HouseholdPathsContext);
  // Typed routes can't express a runtime base; both bases have the same children.
  const href = (path: string, params?: Record<string, string>): Href => (params ? { pathname: `${base}${path}`, params } : `${base}${path}`) as Href;
  return {
    inSetup: base === '/(onboarding)/hh',
    scan: (ownerId?: string | null) => href('/scan', { ownerId: ownerId ?? '' }),
    addMedication: (ownerId?: string | null) => href('/add-medication', { ownerId: ownerId ?? '' }),
    medication: (params: Record<string, string>) => href('/medication/[id]', params),
    device: (id: string) => href('/device/[id]', { id }),
    home: href(''),
  };
}
