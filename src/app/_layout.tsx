import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppServices } from '@/components/app-services';
import { AppText } from '@/components/text';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Keeps the tabs underneath modal routes (Settings sheet, Emergency Mode),
 * including when the app is opened from a deep link (§3.3).
 */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const t = useTheme();
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const mode = useSession((s) => s.mode);
  const hasHousehold = useSession((s) => !!s.snapshot);
  const onboardingDone = useSession((s) => s.onboardingDone);
  // Protected routes: leaving demo or signing out removes the app screens and
  // Expo Router falls back to onboarding automatically.
  const inApp = mode !== 'none' && hasHousehold && onboardingDone;

  useEffect(() => {
    useSession.getState().init();
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return null;

  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: t.colors.surfaceBase, gap: 12 }}>
        <AppText variant="title2" align="center">
          Emercity couldn&apos;t open your saved plan
        </AppText>
        <AppText variant="body" secondary align="center">
          {error ?? 'Unknown error'}. In an emergency, call 911.
        </AppText>
      </View>
    );
  }

  return (
    <>
      <AppServices />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.surfaceBase } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="invite/[code]" />
        <Stack.Protected guard={!inApp}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="emergency"
            options={{ presentation: 'fullScreenModal', animation: 'fade', animationDuration: 400, gestureEnabled: false }}
          />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="alert-prompt" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="countdown/[itemId]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
