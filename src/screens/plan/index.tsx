import { router, type Href } from 'expo-router';
import {
  BookOpen,
  CaretRight,
  ChartBar,
  Flag,
  IdentificationCard,
  ListNumbers,
  MapTrifold,
  Package,
  Timer,
  type Icon,
} from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { ReadinessRing } from '@/components/readiness-ring';
import { Screen } from '@/components/screen';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import { useHousehold } from '@/hooks/use-household';
import { useReadiness } from '@/hooks/use-readiness';
import { useTheme } from '@/theme/theme';

import { stepHref } from './readiness';

interface Row {
  title: string;
  subtitle: string;
  icon: Icon;
  href: Href;
  phase?: number;
}

const ROWS: Row[] = [
  { title: 'Priority order', subtitle: 'Who needs help first, by emergency', icon: ListNumbers, href: '/(tabs)/plan/priorities' },
  { title: 'Address risk profile', subtitle: 'Flood zone, streams, rail, hospitals', icon: MapTrifold, href: '/(tabs)/plan/risk' },
  { title: 'Supplies', subtitle: 'Go-bag, home kit, car', icon: Package, href: '/(tabs)/plan/supplies' },
  { title: 'Meeting points', subtitle: 'Near home, neighborhood, out of area', icon: Flag, href: '/(tabs)/plan/meeting-points' },
  { title: 'Drills', subtitle: 'Practice your plan', icon: Timer, href: '/(tabs)/plan/drills' },
  { title: 'Lock-screen card', subtitle: 'Key info without unlocking', icon: IdentificationCard, href: '/(tabs)/plan/card' },
  { title: 'Guides', subtitle: 'Works offline', icon: BookOpen, href: '/(tabs)/plan/guides' },
  { title: 'Readiness breakdown', subtitle: 'What raises your score', icon: ChartBar, href: '/(tabs)/plan/readiness' },
];

/** PLAN-01 Plan home. */
export function PlanHome() {
  const t = useTheme();
  const { snapshot, isDemo } = useHousehold();
  const r = useReadiness();
  return (
    <Screen header={<AppBar title="Plan" subtitle={snapshot?.household.name} badge={isDemo ? 'DEMO' : undefined} />}>
      {r ? (
        <Card onPress={() => router.push('/(tabs)/plan/readiness')} accessibilityLabel={`You're ${r.score}% ready. See the breakdown`}>
          <View style={{ alignItems: 'center', gap: t.space.sm }}>
            <ReadinessRing size="large" score={r.score} criticalGap={r.criticalGap} />
            <AppText variant="title2" align="center">
              You&apos;re {r.score}% ready
            </AppText>
          </View>
        </Card>
      ) : null}
      {r?.steps.length ? (
        <Card padded={false}>
          {r.steps.slice(0, 3).map((s, i) => (
            <Pressable
              key={s.text}
              accessibilityRole="button"
              onPress={() => router.push(stepHref(s))}
              style={[styles.row, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault }]}>
              <TierIcon tier={s.tier} size={18} />
              <AppText variant="callout" style={{ flex: 1 }}>
                {s.text}
              </AppText>
              <CaretRight size={18} color={t.colors.textSecondary} />
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card padded={false}>
        {ROWS.map((r, i) => {
          const IconCmp = r.icon;
          return (
            <Pressable
              key={r.title}
              accessibilityRole="button"
              accessibilityLabel={`${r.title}. ${r.subtitle}${r.phase ? `. Built in phase ${r.phase}` : ''}`}
              onPress={() => router.push(r.href)}
              style={({ pressed }) => [
                styles.row,
                {
                  padding: t.space.md,
                  borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                  borderColor: t.colors.borderDefault,
                  backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
                },
              ]}>
              <IconCmp size={26} color={r.phase ? t.colors.textSecondary : t.colors.brandAccent} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline" color={r.phase ? t.colors.textSecondary : undefined}>
                  {r.title}
                </AppText>
                <AppText variant="footnote" secondary>
                  {r.phase ? `Phase ${r.phase} · ` : ''}
                  {r.subtitle}
                </AppText>
              </View>
              <CaretRight size={18} color={t.colors.textSecondary} />
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 },
});
