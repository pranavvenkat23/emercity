import { router, type Href } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { ReadinessRing } from '@/components/readiness-ring';
import { Screen, SectionHeader } from '@/components/screen';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import type { ReadinessStep } from '@/domain/readiness';
import { useReadiness } from '@/hooks/use-readiness';
import { useTheme } from '@/theme/theme';

/** Where each readiness step is fixed in the app. */
export function stepHref(s: ReadinessStep): Href {
  switch (s.target) {
    case 'device':
      return { pathname: '/(tabs)/household/device/[id]', params: { id: s.targetId ?? '' } };
    case 'medication':
      return { pathname: '/(tabs)/household/medication/[id]', params: { id: s.targetId ?? '' } };
    case 'member':
      return { pathname: '/(tabs)/household/member/[id]', params: { id: s.targetId ?? '' } };
    case 'supplies':
      return '/(tabs)/plan/supplies';
    case 'contacts':
      return '/(tabs)/household/contacts';
    case 'meeting':
      return '/(tabs)/plan/meeting-points';
    case 'drills':
      return '/(tabs)/plan/drills';
    case 'invite':
      return '/(tabs)/household/invite';
    case 'settings':
      return '/settings/notifications';
  }
}

/** PLAN-13 Readiness score breakdown (§6.4). */
export function ReadinessBreakdown() {
  const t = useTheme();
  const r = useReadiness();
  if (!r) return null;
  return (
    <Screen header={<AppBar title="Readiness" back />}>
      <View style={{ alignItems: 'center', gap: t.space.sm }}>
        <ReadinessRing size="large" score={r.score} criticalGap={r.criticalGap} />
        <AppText variant="title2" align="center">
          You&apos;re {r.score}% ready
        </AppText>
        {r.criticalGap ? (
          <AppText variant="subhead" align="center" color={t.colors.severityCritical}>
            Capped at 69 until every Critical need has a backup.
          </AppText>
        ) : null}
      </View>

      <SectionHeader title="How it's calculated" />
      <Card padded={false}>
        {r.categories.map((c, i) => (
          <View
            key={c.id}
            accessible
            accessibilityLabel={`${c.label}: ${Math.round(c.points)} of ${c.weight}. ${c.detail}`}
            style={[styles.row, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="headline">{c.label}</AppText>
              <AppText variant="footnote" secondary>
                {c.detail}
              </AppText>
              <View style={[styles.track, { backgroundColor: t.colors.surfaceSunken }]}>
                <View style={{ width: `${(c.points / c.weight) * 100}%`, height: '100%', backgroundColor: t.colors.brandAccent, borderRadius: 3 }} />
              </View>
            </View>
            <AppText variant="headline" tabular>
              {Math.round(c.points)}/{c.weight}
            </AppText>
          </View>
        ))}
      </Card>

      {r.steps.length ? <SectionHeader title="What to do next" /> : null}
      {r.steps.length ? (
        <Card padded={false}>
          {r.steps.map((s, i) => (
            <Pressable
              key={`${s.text}-${i}`}
              accessibilityRole="button"
              onPress={() => router.push(stepHref(s))}
              style={({ pressed }) => [
                styles.row,
                { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' },
              ]}>
              <TierIcon tier={s.tier} size={20} />
              <AppText variant="body" style={{ flex: 1 }}>
                {s.text}
              </AppText>
              <CaretRight size={16} color={t.colors.textSecondary} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
});
