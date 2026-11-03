import { useMemo } from 'react';

import { newId } from '@/data/ids';
import { applyHealthChips, type HealthChipId, type HealthFollowUps } from '@/domain/onboarding';
import type { Device, Member } from '@/models/types';
import { useSession } from '@/stores/session-store';

/** Multi-record household edits built on the session store's save/remove. */
export function useHouseholdActions() {
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);

  return useMemo(
    () => ({
      /**
       * Saves a member and reconciles the devices implied by their health
       * chips (§5.6, §7.3). Returns the saved member.
       */
      async saveMemberWithHealth(
        member: Member,
        existingDevices: Device[],
        selected: Set<HealthChipId>,
        follow: HealthFollowUps,
      ): Promise<Member> {
        const change = applyHealthChips(member, existingDevices, selected, follow);
        const now = new Date().toISOString();
        const deviceIds = new Set(member.deviceIds.filter((id) => !change.removeDeviceIds.includes(id)));

        for (const add of change.addDevices) {
          const device: Device = { ...add, id: newId(), householdId: member.householdId, memberId: member.id, createdAt: now, updatedAt: now };
          await save('devices', device);
          deviceIds.add(device.id);
        }
        for (const { id, patch } of change.updateDevices) {
          const d = existingDevices.find((x) => x.id === id);
          if (d) await save('devices', { ...d, ...patch }, Object.keys(patch) as (keyof Device)[]);
        }
        for (const id of change.removeDeviceIds) await remove('devices', id);

        return save('members', {
          ...member,
          conditions: change.conditions,
          deviceIds: [...deviceIds],
          primaryLanguage: change.primaryLanguage ?? member.primaryLanguage,
        });
      },
    }),
    [save, remove],
  );
}
