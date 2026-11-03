import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { HazardTabs } from '@/components/hazard-tabs';
import { PriorityCard } from '@/components/priority-card';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { useHousehold } from '@/hooks/use-household';
import { usePriorities, useTopRiskHazard } from '@/hooks/use-priorities';
import type { Hazard } from '@/models/types';
import { useTheme } from '@/theme/theme';

/** ONB-10 Your first priority order (§5.10). */
export function FirstOrder() {
  const t = useTheme();
  const { snapshot, subjects } = useHousehold();
  const topRisk = useTopRiskHazard();
  const [hazard, setHazard] = useState<Hazard>(topRisk);
  const result = usePriorities(hazard);
  const [off, setOff] = useState(false);
  if (!snapshot || !result) return null;

  return (
    <SetupFrame stage="Ready" title="Who needs help first" primary={{ label: 'Looks right', onPress: () => router.push('/permissions') }} skip={{ label: "Something's off", onPress: () => setOff(true) }}>
      <HazardTabs value={hazard} onChange={setHazard} topRisk={topRisk} />
      <View style={{ gap: t.space.sm }}>
        {result.order.map((o, i) => {
          const s = subjects.get(o.subjectId);
          return s ? <PriorityCard key={o.subjectId} rank={i + 1} name={s.name} kind={s.kind} tier={o.tier} conditions={s.conditions.map((c) => c.type)} /> : null;
        })}
      </View>
      <AppText variant="body" secondary>
        This order changes with each emergency. Tap a tab to see.
      </AppText>

      <BottomSheet visible={off} onClose={() => setOff(false)} title="Who looks wrong?">
        <AppText variant="body" secondary>
          Wrong ranks almost always mean a missing or wrong health need.
        </AppText>
        {snapshot.members
          .filter((m) => !m.archived)
          .map((m) => (
            <Button
              key={m.id}
              label={`Edit ${m.firstName}`}
              variant="secondary"
              onPress={() => {
                setOff(false);
                router.push({ pathname: '/hh/member/[id]', params: { id: m.id } });
              }}
            />
          ))}
      </BottomSheet>
    </SetupFrame>
  );
}
