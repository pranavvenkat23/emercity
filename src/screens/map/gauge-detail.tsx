import { Waves } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SwitchRow } from '@/components/form';
import { CATEGORY_LABEL, CATEGORY_MEANING, gaugeCategory, gaugeSummary } from '@/components/gauge-bar';
import { Hydrograph } from '@/components/hydrograph';
import { Screen, SectionHeader } from '@/components/screen';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { fetchGauge, followGauge, nearbyGauges, type NearbyGauge } from '@/services/gauges';
import { useConditions, type GaugeState } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** MAP-03 River gauge detail (§10.4). */
export function GaugeDetail({ id }: { id: string }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const snapshot = useSession((s) => s.snapshot);
  const db = useSession((s) => s.db);
  const followed = useConditions((s) => s.gauge);
  const [gauge, setGauge] = useState<GaugeState | null>(followed?.value.id === id ? followed.value : null);
  const [error, setError] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyGauge[]>([]);
  const [notify, setNotify] = useState(true);
  const home = snapshot?.household.address.lat != null ? { lat: snapshot.household.address.lat, lng: snapshot.household.address.lng! } : null;
  const simulated = followed?.simulated && followed.value.id === id;

  useEffect(() => {
    if (!home || simulated) return;
    fetchGauge(id, home).then(setGauge).catch(() => setError('River gauge data is unavailable right now.'));
    nearbyGauges(home.lat, home.lng).then((g) => setNearby(g.slice(0, 3))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (db && snapshot) db.kv.get(`gauge.notify.${snapshot.household.id}`).then((v) => setNotify(v !== '0'));
  }, [db, snapshot]);

  if (!gauge) {
    return (
      <Screen header={<AppBar title="River gauge" back />}>
        {error ? <EmptyState icon={Waves} message={error} /> : <ActivityIndicator style={{ marginTop: 48 }} />}
      </Screen>
    );
  }
  const cat = gaugeCategory(gauge.stageFt, gauge.flood);

  return (
    <Screen header={<AppBar title={gauge.name} subtitle={gauge.direction} back />}>
      <SourceChip source={simulated ? 'Demo · NOAA NWPS' : 'NOAA NWPS'} fetchedAt={gauge.observedAt} kind="gauge" />
      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText variant="display" tabular>
          {gauge.stageFt != null ? `${gauge.stageFt.toFixed(1)} ft` : 'No reading'}
        </AppText>
        <AppText variant="headline">{CATEGORY_LABEL[cat]}</AppText>
        <AppText variant="subhead" secondary>
          {gaugeSummary(gauge)} · {gauge.trend}
        </AppText>
      </View>
      <Card padded={false} style={{ paddingVertical: 8 }}>
        <Hydrograph gauge={gauge} width={width - 32} />
      </Card>
      <AppText variant="footnote" secondary>
        Solid: observed, past 72 hours. Dashed: NWS forecast{gauge.forecast.length ? '' : ' (none issued for this gauge)'}.
      </AppText>

      <SectionHeader title="What the stages mean" />
      <Card>
        <View style={{ gap: 6 }}>
          {(['action', 'minor', 'moderate', 'major'] as const).map((k) => (
            <AppText key={k} variant="callout">
              <AppText variant="callout" weight="700">
                {CATEGORY_LABEL[k]}
                {gauge.flood[k] != null ? ` (${gauge.flood[k]} ft)` : ''}:{' '}
              </AppText>
              {CATEGORY_MEANING[k]}
            </AppText>
          ))}
        </View>
      </Card>

      <SwitchRow
        label="Notify me when this gauge reaches Action stage or is forecast to reach Minor"
        hint="Checked while Emercity is open. Background push needs a server (not on the free plan)."
        value={notify}
        onChange={async (v) => {
          setNotify(v);
          if (db && snapshot) await db.kv.set(`gauge.notify.${snapshot.household.id}`, v ? '1' : '0');
        }}
      />

      {nearby.length > 1 ? (
        <>
          <SectionHeader title="Gauges near you" />
          {nearby.map((g) => (
            <Button key={g.id} label={`${g.name} · ${g.distanceMi.toFixed(1)} mi ${g.direction}`} variant={g.id === followed?.value.id ? 'primary' : 'secondary'} onPress={() => followGauge(g.id)} />
          ))}
        </>
      ) : null}

      <AppText variant="footnote" secondary>
        River gauges measure the stream, not your street. Small creeks and storm drains can flood faster than gauges show.
      </AppText>
    </Screen>
  );
}
