import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';

import { ThemeScope, useTheme } from '@/theme/theme';

function EmergencyStack() {
  const t = useTheme();
  // §12.9: screen stays awake while Emergency Mode is open. (User toggle: Phase 5 settings.)
  useKeepAwake();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.surfaceBase } }} />;
}

/** Emergency flow: always the dark palette (§2.1), tab bar hidden (§3.1). */
export default function EmergencyLayout() {
  return (
    <ThemeScope mode="emergency">
      <EmergencyStack />
    </ThemeScope>
  );
}
