import { router } from 'expo-router';
import { ArrowDown, ArrowRight, ArrowUp, Waves } from 'phosphor-react-native';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { GaugeBar, gaugeSummary } from '@/components/gauge-bar';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { useConditions } from '@/stores/conditions-store';
import { useTheme } from '@/theme/theme';

/** River gauge mini-card (§6.1 item 5, §10.4): only when a gauge is within 10 miles. */
export function GaugeMiniCard() {
  const t = useTheme();
  const gauge = useConditions((s) => s.gauge);
  if (!gauge || gauge.value.distanceMi > 10) return null;
  const g = gauge.value;
  const Trend = g.trend === 'rising' ? ArrowUp : g.trend === 'falling' ? ArrowDown : ArrowRight;
  return (
    <Card
      onPress={() => router.push({ pathname: '/gauge/[gaugeId]', params: { gaugeId: g.id } })}
      accessibilityLabel={`${g.name}, ${gaugeSummary(g)}, ${g.trend}`}>
      <View style={{ gap: t.space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Waves size={22} color={t.colors.hazardFlood} weight="bold" />
          <AppText variant="headline" style={{ flex: 1 }}>
            {g.name}
          </AppText>
          <Trend size={18} color={t.colors.textSecondary} weight="bold" />
        </View>
        <GaugeBar gauge={g} />
        <AppText variant="subhead">{gaugeSummary(g)}</AppText>
        <SourceChip source={gauge.simulated ? 'Demo · NOAA NWPS' : 'NOAA NWPS'} fetchedAt={g.observedAt ?? gauge.fetchedAt} kind="gauge" />
      </View>
    </Card>
  );
}
