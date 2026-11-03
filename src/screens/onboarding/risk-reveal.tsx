import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { RiskChip } from '@/components/risk-chip';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { HAZARD_LABEL } from '@/domain/hazards';
import { computeHazardScores, rankedHazards } from '@/domain/risk';
import { FACTOR_LABEL, INFO_FACTORS } from '@/domain/risk-factors';
import { refreshRiskProfile } from '@/services/risk-profile';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** The ONB-09 chips, in the spec's order (§5.9). */
const REVEAL = ['flood-zone', 'gauge', 'outage-frequency', 'rail', 'hospital'];

/** ONB-09 Risk profile reveal (§5.9). */
export function RiskReveal() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const risk = useConditions((s) => s.risk);
  const [tried, setTried] = useState(false);

  // The lookup normally runs in the background from ONB-04; start it if it hasn't.
  useEffect(() => {
    if (risk || tried || online === false) return;
    setTried(true);
    refreshRiskProfile().catch(() => {});
  }, [risk, tried, online]);

  if (!snapshot) return null;
  const factors = (risk?.value.factors ?? []).filter((f) => REVEAL.includes(f.type)).sort((a, b) => REVEAL.indexOf(a.type) - REVEAL.indexOf(b.type));
  const top = rankedHazards(computeHazardScores(snapshot, risk?.value.factors ?? [])).slice(0, 3);
  const waiting = !risk && online !== false;

  return (
    <SetupFrame stage="Health" title="What we found" subtitle="From public maps for your address." primary={{ label: 'See who needs help first', onPress: () => router.push('/order') }}>
      {waiting ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ActivityIndicator color={t.colors.brandAccent} />
          <AppText variant="body">Checking your address…</AppText>
        </View>
      ) : !risk ? (
        <AppText variant="body">We’ll finish checking your address when you’re back online.</AppText>
      ) : null}
      {factors.map((f, i) => (
        <Animated.View key={f.type} entering={t.reduceMotion ? undefined : FadeInDown.delay(i * 250).duration(350)}>
          <RiskChip label={FACTOR_LABEL[f.type] ?? f.type} value={f.value} level={f.level} source={f.source} fetchedAt={f.fetchedAt} info={INFO_FACTORS.has(f.type) && !!f.fetchedAt} />
        </Animated.View>
      ))}
      {risk ? (
        <Animated.View entering={t.reduceMotion ? undefined : FadeInDown.delay(factors.length * 250 + 200)}>
          <AppText variant="title2">Your top risks: {top.map((h) => HAZARD_LABEL[h]).join(', ')}.</AppText>
        </Animated.View>
      ) : null}
    </SetupFrame>
  );
}
