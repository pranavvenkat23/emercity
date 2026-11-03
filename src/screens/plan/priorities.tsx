import { router } from 'expo-router';
import { ArrowDown, ArrowUp, ListNumbers, PushPin, Users } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { HazardTabs } from '@/components/hazard-tabs';
import { PriorityCard } from '@/components/priority-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { HAZARD_LABEL } from '@/domain/hazards';
import type { RankedSubject } from '@/domain/priority/types';
import { useHousehold } from '@/hooks/use-household';
import { useNow } from '@/hooks/use-now';
import { useConditionsKey, usePins, usePriorities, useTopRiskHazard } from '@/hooks/use-priorities';
import type { Hazard } from '@/models/types';
import { useTheme } from '@/theme/theme';

const ago = (iso: string, now: Date) => {
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  return min < 1 ? 'just now' : `${min} min ago`;
};

/**
 * PLAN-02 Priority order by hazard (§8.7): order only, no reasons on cards.
 * Critical subjects sit in a red "Act on these first" group and pulse;
 * long-press (or the "Why this rank" screen-reader action) reveals reasons
 * and the Move up / Move down pins (§8.8).
 */
export function Priorities({ initialHazard }: { initialHazard?: Hazard }) {
  const t = useTheme();
  const now = useNow(30_000);
  const { snapshot, subjects } = useHousehold();
  const topRisk = useTopRiskHazard();
  const [hazard, setHazard] = useState<Hazard>(initialHazard ?? topRisk);
  const result = usePriorities(hazard);
  const { pins, setPins } = usePins(hazard);
  const keyFor = useConditionsKey();
  const [why, setWhy] = useState<RankedSubject | null>(null);

  const order = result?.order ?? [];
  const critical = order.filter((p) => p.tier === 'critical');
  const rest = order.filter((p) => p.tier !== 'critical');

  const pin = (s: RankedSubject, direction: 'up' | 'down') => {
    const idx = order.findIndex((o) => o.subjectId === s.subjectId);
    const below = order[idx + 1];
    const apply = (confirmedCriticalDown?: boolean) => {
      setPins([...pins.filter((p) => p.subjectId !== s.subjectId), { subjectId: s.subjectId, direction, conditionsKey: keyFor(s.subjectId), confirmedCriticalDown }]);
      setWhy(null);
    };
    if (direction === 'down' && s.tier === 'critical' && below && below.tier !== 'critical') {
      const name = subjects.get(s.subjectId)?.name ?? 'This person';
      Alert.alert(`Move ${name} down anyway?`, `Emercity flagged ${name} as critical in ${HAZARD_LABEL[hazard].toLowerCase()}.`, [
        { text: 'Keep', style: 'cancel' },
        { text: 'Move down', style: 'destructive', onPress: () => apply(true) },
      ]);
    } else apply();
  };

  const renderCard = (p: RankedSubject, rank: number) => {
    const s = subjects.get(p.subjectId);
    if (!s) return null;
    return <PriorityCard key={p.subjectId} rank={rank} name={s.name} kind={s.kind} tier={p.tier} pinned={!!p.pinned} conditions={s.conditions.map((c) => c.type)} onWhy={() => setWhy(p)} />;
  };

  const whyName = why ? subjects.get(why.subjectId)?.name : '';
  const whyIsMember = why ? snapshot?.members.some((m) => m.id === why.subjectId) : false;
  const hasPin = why ? pins.some((p) => p.subjectId === why.subjectId) : false;

  return (
    <Screen header={<AppBar title="Priority order" subtitle={snapshot?.household.name} back />}>
      <HazardTabs value={hazard} onChange={setHazard} topRisk={topRisk} />

      {order.length <= 1 ? (
        <EmptyState icon={ListNumbers} title={HAZARD_LABEL[hazard]} message="Your order will appear once you add your household." action={{ label: 'Add people', onPress: () => router.push('/(tabs)/household') }} />
      ) : (
        <>
          {critical.length > 0 ? (
            <View accessibilityRole="summary" accessibilityLabel="Act on these first" style={[styles.group, { borderColor: t.colors.severityCritical, borderRadius: t.radius.card + 4, padding: t.space.sm }]}>
              <AppText variant="headline" color={t.colors.severityCritical} style={{ paddingHorizontal: 4 }}>
                Act on these first
              </AppText>
              {critical.map((p, i) => renderCard(p, i + 1))}
            </View>
          ) : null}
          <View style={{ gap: t.space.sm }}>{rest.map((p, i) => renderCard(p, critical.length + i + 1))}</View>
          <View style={[styles.divider, { backgroundColor: t.colors.borderDefault }]} />
          <AppText variant="footnote" secondary>
            Updated {ago(result!.computedAt, now)} · Changes with weather and time
          </AppText>
          {result!.unknowns.length ? (
            <AppText variant="footnote" secondary>
              Not checked yet: {result!.unknowns.map((u) => u.replace('-', ' ')).join(', ')}. Rules that need these didn’t run.
            </AppText>
          ) : null}
          <AppText variant="footnote" secondary>
            Press and hold a person to see why they rank where they do.
          </AppText>
        </>
      )}

      <Button label="Practice this order" variant="secondary" onPress={() => router.push('/(tabs)/plan/drills')} />
      <Button label="Edit roles" icon={Users} variant="ghost" onPress={() => router.push({ pathname: '/(tabs)/plan/roles', params: { hazard } })} />
      <Button label="Something's off" variant="ghost" onPress={() => router.push('/(tabs)/household')} />

      <BottomSheet visible={!!why} onClose={() => setWhy(null)} title={`Why ${whyName} is here`}>
        {why && why.reasons.length > 0 ? (
          why.reasons.map((r) => (
            <AppText key={r} variant="body">
              • {r}
            </AppText>
          ))
        ) : (
          <AppText variant="body">No special needs for this emergency.</AppText>
        )}
        {why?.pinned ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <PushPin size={16} color={t.colors.textSecondary} />
            <AppText variant="footnote" secondary>
              Moved {why.pinned} by you
            </AppText>
          </View>
        ) : null}
        {why ? (
          <View style={{ flexDirection: 'row', gap: t.space.sm }}>
            <Button style={{ flex: 1 }} label="Move up" icon={ArrowUp} variant="secondary" onPress={() => pin(why, 'up')} />
            <Button style={{ flex: 1 }} label="Move down" icon={ArrowDown} variant="secondary" onPress={() => pin(why, 'down')} />
          </View>
        ) : null}
        {hasPin ? (
          <Button
            label="Undo my change"
            variant="ghost"
            onPress={() => {
              setPins(pins.filter((p) => p.subjectId !== why!.subjectId));
              setWhy(null);
            }}
          />
        ) : null}
        {whyIsMember ? (
          <Button
            label="Something's off? Edit their needs"
            variant="ghost"
            onPress={() => {
              const id = why!.subjectId;
              setWhy(null);
              router.push({ pathname: '/(tabs)/household/member/edit/[id]', params: { id } });
            }}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 2, gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
});
