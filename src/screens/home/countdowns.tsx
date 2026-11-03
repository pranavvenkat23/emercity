import { LightningSlash, Timer } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { CountdownView } from '@/components/countdown-view';
import { EmptyState } from '@/components/empty-state';
import { Stepper, SwitchRow } from '@/components/form';
import { PowerOutSheet } from '@/components/power-out-sheet';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText } from '@/components/text';
import type { Countdown } from '@/domain/countdown';
import { useCountdowns } from '@/hooks/use-countdowns';
import { openSource } from '@/services/links';
import { useOutage } from '@/stores/outage-store';
import { useTheme } from '@/theme/theme';

type Segment = 'running' | 'ready' | 'all';

/** HOME-03 All countdowns (§6.6). */
export function Countdowns({ focusItemId }: { focusItemId?: string }) {
  const t = useTheme();
  const { countdowns, running } = useCountdowns();
  const outage = useOutage((s) => s.current);
  const setIndoorTemp = useOutage((s) => s.setIndoorTemp);
  const updateItem = useOutage((s) => s.updateItem);
  const [segment, setSegment] = useState<Segment>(running ? 'running' : 'ready');
  const [powerSheet, setPowerSheet] = useState(false);
  const [detail, setDetail] = useState<Countdown | null>(null);
  const [tempSheet, setTempSheet] = useState(false);
  const [temp, setTemp] = useState<number | null>(outage?.indoorTempF ?? null);

  const ordered = useMemo(() => {
    const list = focusItemId ? [...countdowns.filter((c) => c.id === focusItemId), ...countdowns.filter((c) => c.id !== focusItemId)] : countdowns;
    if (segment === 'running') return running ? list : [];
    if (segment === 'ready') return running ? [] : list;
    return list;
  }, [countdowns, focusItemId, segment, running]);

  const freezerFull = outage?.items['food-freezer']?.freezerFull ?? true;

  return (
    <Screen header={<AppBar title="Countdowns" back />}>
      <SegmentedControl
        accessibilityLabel="Which countdowns"
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'running', label: 'Running' },
          { value: 'ready', label: 'Ready' },
          { value: 'all', label: 'All' },
        ]}
      />

      {running ? (
        <View style={{ gap: t.space.xs }}>
          <Button label={outage?.indoorTempF != null ? `Indoor temperature: ${outage.indoorTempF}°F` : 'Enter indoor temperature'} variant="secondary" onPress={() => setTempSheet(true)} />
          <SwitchRow label="Freezer is full" hint="Full: about 48 h. Half full: about 24 h." value={freezerFull} onChange={(v) => updateItem('food-freezer', { freezerFull: v })} />
        </View>
      ) : null}

      {segment === 'running' && !running ? (
        <EmptyState
          icon={Timer}
          message="Nothing is counting down. Countdowns start when someone in your household taps “Power is out.”"
          action={{ label: 'Power is out', onPress: () => setPowerSheet(true) }}
        />
      ) : ordered.length === 0 ? (
        <EmptyState icon={Timer} message="Nothing in your home needs a countdown. Food timers start when power goes out." />
      ) : (
        <>
          {!running ? (
            <AppText variant="subhead" secondary>
              How long each item stays safe if the power went out now. Tap a tile for details.
            </AppText>
          ) : null}
          {ordered.map((c) => (
            <View key={c.id}>
              <CountdownView c={c} />
              <Button label="Details" variant="ghost" onPress={() => setDetail(c)} />
            </View>
          ))}
          {!running ? <Button label="Power is out" icon={LightningSlash} variant="secondary" onPress={() => setPowerSheet(true)} /> : null}
        </>
      )}

      <PowerOutSheet visible={powerSheet} onClose={() => setPowerSheet(false)} />

      <BottomSheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail ? (
          <View style={{ gap: t.space.sm }}>
            <AppText variant="body">{detail.phase}</AppText>
            <AppText variant="subhead" secondary>
              Rule: {detail.userEstimate ? 'your own estimate' : detail.source.name}
              {detail.source.note ? ` · ${detail.source.note}` : ''}
            </AppText>
            {detail.source.url ? (
              <Button label="Open source" variant="secondary" onPress={() => openSource(detail.source.url!)} />
            ) : null}
            <AppText variant="subhead">
              {detail.kind === 'medication'
                ? 'When time runs low: move it to a cooler (never directly on ice), or call your pharmacist.'
                : detail.kind === 'device'
                  ? 'When time runs low: switch to backup, call your equipment supplier, or go somewhere with power. Call 911 if you have no other source.'
                  : 'Keep the door closed. When in doubt, throw it out.'}
            </AppText>
            <AppText variant="footnote" secondary>
              Confirm with your pharmacist or device supplier. Times are estimates, not guarantees.
            </AppText>
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={tempSheet} onClose={() => setTempSheet(false)} title="Indoor temperature">
        <View style={{ gap: t.space.md }}>
          <AppText variant="body">
            Some medicines become unsafe above a set temperature. Enter the temperature inside your home from a thermometer. Emercity does not estimate it.
          </AppText>
          <Stepper label="Indoor temperature" value={temp} onChange={setTemp} step={1} min={30} max={120} format={(v) => `${v}°F`} allowUnknown />
          <Button
            label="Save"
            onPress={() => {
              setIndoorTemp(temp);
              setTempSheet(false);
            }}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}
