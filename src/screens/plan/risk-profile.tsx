import { router } from 'expo-router';
import { ArrowClockwise, CheckCircle, MapTrifold } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HAZARD_ICON } from '@/components/icons';
import { RiskChip } from '@/components/risk-chip';
import { Screen, SectionHeader } from '@/components/screen';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { HAZARD_LABEL, hazardColor } from '@/domain/hazards';
import { computeHazardScores, rankedHazards, scoreBucket } from '@/domain/risk';
import { FACTOR_LABEL, hazardExplanation, INFO_FACTORS, planAdjustments } from '@/domain/risk-factors';
import { useSupplies } from '@/hooks/use-supplies';
import type { RiskFactor } from '@/models/types';
import { openSource } from '@/services/links';
import { refreshRiskProfile } from '@/services/risk-profile';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** PLAN-03 Address risk profile (§9.4). */
export function RiskProfileScreen() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const risk = useConditions((s) => s.risk);
  const { generated } = useSupplies();
  const [detail, setDetail] = useState<RiskFactor | null>(null);
  const [busy, setBusy] = useState(false);
  const factors = useMemo(() => risk?.value.factors ?? [], [risk]);
  if (!snapshot) return null;
  const a = snapshot.household.address;
  const scores = computeHazardScores(snapshot, factors);
  const top3 = rankedHazards(scores).slice(0, 3);
  const adjustments = planAdjustments(top3[0], new Set(generated.map((g) => g.templateRuleId)));
  const checked = risk ? new Date(risk.value.computedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const noLocation = a.lat == null || a.lng == null;

  const retry = async () => {
    setBusy(true);
    await refreshRiskProfile().catch(() => {});
    setBusy(false);
  };

  return (
    <Screen header={<AppBar title="Risk profile" back />}>
      <View style={{ gap: 4 }}>
        <AppText variant="headline">{[a.line1, a.city, a.state].filter(Boolean).join(', ')}</AppText>
        <AppText variant="subhead" secondary>
          {a.county ?? 'County unknown'}
          {checked ? ` · Last checked ${checked}` : ''}
          {risk?.simulated ? ' · Demo' : ''}
        </AppText>
      </View>
      {noLocation ? (
        <AppText variant="body">Add your home’s location to check flood zones, streams and nearby hazards.</AppText>
      ) : !risk ? (
        <View style={{ gap: t.space.xs }}>
          <AppText variant="body">{online === false ? 'We’ll check your address when you’re back online.' : 'Checking your address…'}</AppText>
          {online !== false ? <Button label="Check now" icon={ArrowClockwise} variant="secondary" loading={busy} onPress={retry} /> : null}
        </View>
      ) : null}

      <SectionHeader title="Your top risks" />
      {top3.map((h) => {
        const Icon = HAZARD_ICON[h];
        const bucket = scoreBucket(scores[h]);
        return (
          <Card key={h}>
            <View style={{ gap: t.space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon size={26} color={hazardColor(h, t.colors)} />
                <AppText variant="headline" style={{ flex: 1 }}>
                  {HAZARD_LABEL[h]}
                </AppText>
                <AppText variant="subhead" weight="700">
                  {bucket}
                </AppText>
              </View>
              <View accessibilityLabel={`${bucket} risk`} style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceSunken }}>
                <View style={{ width: `${scores[h]}%`, height: 8, borderRadius: 4, backgroundColor: hazardColor(h, t.colors) }} />
              </View>
              <AppText variant="body" secondary>
                {hazardExplanation(h, factors, snapshot)}
              </AppText>
            </View>
          </Card>
        );
      })}

      {factors.length ? (
        <>
          <SectionHeader title="What we found at your address" />
          <View style={{ gap: t.space.xs }}>
            {factors.map((f) => (
              <RiskChip key={f.type} label={FACTOR_LABEL[f.type] ?? f.type} value={f.value} level={f.level} source={f.source} fetchedAt={f.fetchedAt} info={INFO_FACTORS.has(f.type) && !!f.fetchedAt} onPress={() => setDetail(f)} />
            ))}
          </View>
          {online !== false ? <Button label="Check again" icon={ArrowClockwise} variant="ghost" loading={busy} onPress={retry} /> : null}
        </>
      ) : null}

      <SectionHeader title="What this changes in your plan" />
      {adjustments.map((x) => (
        <View key={x} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <CheckCircle size={20} color={t.colors.statusSafe} weight="fill" />
          <AppText variant="body" style={{ flex: 1 }}>
            {x}
          </AppText>
        </View>
      ))}

      <Button label="See on map" icon={MapTrifold} variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/map', params: { risk: '1' } })} />
      <AppText variant="footnote" secondary>
        These are estimates from public data. Always follow official orders.
      </AppText>

      <BottomSheet visible={!!detail} onClose={() => setDetail(null)} title={detail ? FACTOR_LABEL[detail.type] ?? detail.type : ''}>
        {detail ? (
          <>
            <AppText variant="title2">{detail.value}</AppText>
            <AppText variant="body">{detail.explanation}</AppText>
            <SourceChip source={detail.source} fetchedAt={detail.fetchedAt} kind="riskLayers" />
            {detail.provenance === 'modeled' ? (
              <AppText variant="footnote" secondary>
                Modeled on another county’s data.
              </AppText>
            ) : null}
            {detail.sourceUrl ? <Button label="Open source" variant="ghost" onPress={() => openSource(detail.sourceUrl!)} /> : null}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
