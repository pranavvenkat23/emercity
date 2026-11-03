import * as Haptics from 'expo-haptics';

import { useA11y } from '@/stores/a11y-store';

/** Haptics that honor the SET-05 setting (§20.2 "can be disabled"). */
export const haptic = {
  success: () => useA11y.getState().haptics && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => useA11y.getState().haptics && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  critical: () => useA11y.getState().haptics && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  tap: () => useA11y.getState().haptics && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
};
