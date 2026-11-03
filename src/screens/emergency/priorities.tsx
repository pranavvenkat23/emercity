import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { PriorityCard } from '@/components/priority-card';
import { AppText } from '@/components/text';
import { subjectProgress } from '@/domain/playbook';
import type { RankedSubject } from '@/domain/priority/types';
import { useHousehold } from '@/hooks/use-household';
import { usePlaybook } from '@/hooks/use-playbook';
import { stepStatusMap, useCurrentSession } from '@/stores/emergency-store';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { NotRunning } from './not-running';
import { EmergencyTopBar } from './top-bar';

/** EM-04 Priority order, emergency view (§12.6). Tap filters the playbook to that subject. */
export function EmergencyPriorities() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const session = useCurrentSession();
  const { steps, priorities } = usePlaybook(session);
  const { subjects } = useHousehold();
  const [why, setWhy] = useState<RankedSubject | null>(null);
  if (!session || !priorities) return <NotRunning />;
  const status = stepStatusMap(session);
  const critical = priorities.order.filter((p) => p.tier === 'critical');
  const rest = priorities.order.filter((p) => p.tier !== 'critical');

  const card = (p: RankedSubject) => {
    const s = subjects.get(p.subjectId);
    if (!s) return null;
    const prog = subjectProgress(steps, status, p.subjectId);
    const helperId = steps.find((x) => x.subjectId === p.subjectId && x.assigneeId)?.assigneeId;
    return (
      <PriorityCard
        key={p.subjectId}
        rank={p.rank}
        name={s.name}
        kind={s.kind}
        tier={p.tier}
        conditions={s.conditions.map((c) => c.type)}
        progressLabel={[prog.total ? `${prog.done} of ${prog.total} steps done` : null, helperId ? `Helper: ${subjects.get(helperId)?.name ?? ''}` : null].filter(Boolean).join(' · ') || undefined}
        onPress={prog.total ? () => router.push({ pathname: '/emergency/steps', params: { subject: p.subjectId } }) : undefined}
        onWhy={() => setWhy(p)}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <EmergencyTopBar onBack={() => router.back()} />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.sm, paddingBottom: insets.bottom + 24 }}>
        {critical.length ? (
          <View style={{ borderWidth: 2, borderColor: t.colors.severityCritical, borderRadius: t.radius.card + 4, padding: t.space.sm, gap: 8 }}>
            <AppText variant="headline" color={t.colors.severityCritical}>
              Act on these first
            </AppText>
            {critical.map(card)}
          </View>
        ) : null}
        {rest.map(card)}
      </ScrollView>
      <BottomSheet visible={!!why} onClose={() => setWhy(null)} title={`Why ${why ? subjects.get(why.subjectId)?.name : ''} is here`}>
        {why?.reasons.map((r) => (
          <AppText key={r} variant="body">
            • {r}
          </AppText>
        ))}
      </BottomSheet>
    </View>
  );
}
