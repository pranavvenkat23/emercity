import { Stack } from 'expo-router';

import { useTheme } from '@/theme/theme';

export default function SettingsStack() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.surfaceBase } }} />;
}
