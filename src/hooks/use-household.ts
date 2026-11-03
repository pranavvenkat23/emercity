import { useMemo } from 'react';

import { displayName } from '@/domain/members';
import type { HouseholdSnapshot } from '@/models/types';
import { useSession } from '@/stores/session-store';

export interface SubjectInfo {
  id: string;
  name: string;
  kind: 'person' | 'pet';
  conditions: HouseholdSnapshot['members'][number]['conditions'];
}

/** Active household snapshot plus a lookup for member/pet display info. */
export function useHousehold() {
  const snapshot = useSession((s) => s.snapshot);
  const subjects = useMemo(() => {
    const map = new Map<string, SubjectInfo>();
    snapshot?.members.forEach((m) =>
      map.set(m.id, { id: m.id, name: displayName(m), kind: 'person', conditions: m.conditions }),
    );
    snapshot?.pets.forEach((p) => map.set(p.id, { id: p.id, name: p.name, kind: 'pet', conditions: [] }));
    return map;
  }, [snapshot]);
  return { snapshot, subjects, isDemo: snapshot?.household.isDemo ?? false };
}
