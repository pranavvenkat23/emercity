import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useTheme } from '@/theme/theme';

/** Shown if an Emergency screen is reached with no active session (e.g. just ended). */
export function NotRunning() {
  const t = useTheme();
  useStatusBarStyle('light');
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase, justifyContent: 'center', padding: t.space.lg, gap: t.space.md }}>
      <AppText variant="title2" align="center">
        Emergency Mode isn&apos;t running
      </AppText>
      <Button label="Choose an emergency" size="emergency" variant="critical" onPress={() => router.replace('/emergency')} />
      <Button label="Back to the app" variant="ghost" onPress={() => router.dismissTo('/(tabs)/(home)')} />
    </View>
  );
}
