import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CountdownView } from '@/components/countdown-view';
import { PowerOutSheet } from '@/components/power-out-sheet';
import { AppText } from '@/components/text';
import { useCountdowns } from '@/hooks/use-countdowns';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { EmergencyTopBar } from './top-bar';

/** EM-05 Countdowns, emergency view (§12.7): sorted by time left, Critical first, larger tiles. */
export function EmergencyCountdowns() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { countdowns, running } = useCountdowns();
  const [sheet, setSheet] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <EmergencyTopBar onBack={() => router.back()} />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        {!running ? (
          <>
            <AppText variant="body" secondary>
              Not running yet. These are the times if the power went out now.
            </AppText>
            <Button label="Power is out" variant="critical" size="emergency" onPress={() => setSheet(true)} />
          </>
        ) : null}
        {countdowns.map((c) => (
          <CountdownView key={c.id} c={c} size="large" />
        ))}
      </ScrollView>
      <PowerOutSheet visible={sheet} onClose={() => setSheet(false)} openSteps={false} />
    </View>
  );
}
