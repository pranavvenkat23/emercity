import { router } from 'expo-router';
import { LightningSlash } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useOutage } from '@/stores/outage-store';
import { useTheme } from '@/theme/theme';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { QuickAddChip } from './quick-add-chip';
import { AppText } from './text';

const BACKDATE: { label: string; minutes: number }[] = [
  { label: 'Just now', minutes: 0 },
  { label: '15 min ago', minutes: 15 },
  { label: '30 min ago', minutes: 30 },
  { label: '1 hour ago', minutes: 60 },
  { label: '2 hours ago', minutes: 120 },
];

/**
 * "Power is out" (§11.5): starts every countdown, with an optional
 * backdate ("It went out at…"). Offers the outage steps afterwards.
 */
export function PowerOutSheet({ visible, onClose, openSteps = true }: { visible: boolean; onClose: () => void; openSteps?: boolean }) {
  const t = useTheme();
  const start = useOutage((s) => s.start);
  const [ago, setAgo] = useState(0);

  const confirm = async (thenSteps: boolean) => {
    await start(new Date(Date.now() - ago * 60_000));
    onClose();
    if (thenSteps) router.push({ pathname: '/emergency', params: { hazard: 'outage' } });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Power is out">
      <View style={{ gap: t.space.md }}>
        <AppText variant="body">This starts countdowns for medicines, medical devices, and food. When did it go out?</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BACKDATE.map((b) => (
            <QuickAddChip key={b.minutes} label={b.label} selected={ago === b.minutes} onPress={() => setAgo(b.minutes)} />
          ))}
        </View>
        <Button label="Start countdowns" icon={LightningSlash} onPress={() => confirm(false)} />
        {openSteps ? <Button label="Start and open outage steps" variant="critical" size="emergency" onPress={() => confirm(true)} /> : null}
      </View>
    </BottomSheet>
  );
}
