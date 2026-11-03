import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Countdown } from '@/domain/countdown';
import { useOutage } from '@/stores/outage-store';
import { useTheme } from '@/theme/theme';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { CountdownTile } from './countdown-tile';
import { Stepper } from './form';
import { AppText } from './text';

/**
 * A live countdown (§11.4) with its phase action wired to the outage
 * store: "Moved to cooler" asks for the user's own cooler estimate (the app
 * has no sourced cooler hold times, so it never supplies one), and
 * "Switched to next backup" records the stage change.
 */
export function CountdownView({ c, size }: { c: Countdown; size?: 'default' | 'large' }) {
  const t = useTheme();
  const updateItem = useOutage((s) => s.updateItem);
  const [cooler, setCooler] = useState(false);
  const [hours, setHours] = useState<number | null>(null);

  const action =
    c.action === 'moved-to-cooler'
      ? { label: 'Moved to cooler', onPress: () => setCooler(true) }
      : c.action === 'switched-backup'
        ? {
            label: 'Switched to next backup',
            onPress: () => {
              updateItem(c.id, { deviceStageIndex: (c.stageIndex ?? 0) + 1, deviceStageSwitchedAt: new Date().toISOString() });
            },
          }
        : undefined;

  const whatToDo =
    c.kind === 'medication'
      ? { label: 'What to do', onPress: () => router.push({ pathname: '/guide/[id]', params: { id: 'insulin-outage' } }) }
      : c.kind === 'device'
        ? { label: 'What to do', onPress: () => router.push({ pathname: '/guide/[id]', params: { id: 'devices-outage' } }) }
        : { label: 'What to throw out', onPress: () => router.push({ pathname: '/guide/[id]', params: { id: 'food-outage' } }) };

  return (
    <>
      <CountdownTile
        kind={c.kind}
        name={c.name}
        state={c.state}
        remainingMs={c.remainingMs}
        totalMs={c.totalMs}
        phase={c.phase}
        tier={c.tier}
        source={c.source}
        userEstimate={c.userEstimate}
        action={action}
        whatToDo={whatToDo}
        size={size}
      />
      <BottomSheet visible={cooler} onClose={() => setCooler(false)} title="Moved to the cooler">
        <View style={{ gap: t.space.md }}>
          <AppText variant="body" weight="600" color={t.colors.severityUrgent}>
            Never let insulin touch ice directly. Wrap it in a towel.
          </AppText>
          <Stepper
            label="How long will your ice keep the cooler cold?"
            hint="Your estimate. It depends on the cooler, the ice, and how often it's opened. Check with a thermometer if you have one."
            value={hours}
            onChange={setHours}
            step={1}
            min={1}
            max={96}
            format={(v) => `${v} h`}
            allowUnknown
          />
          <Button
            label="Save"
            onPress={() => {
              updateItem(c.id, { movedToCoolerAt: new Date().toISOString(), coolerHoldHours: hours });
              setCooler(false);
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

