import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tierColor } from '@/domain/hazards';
import type { Tier } from '@/models/types';
import { useTheme } from '@/theme/theme';

/**
 * The colored left bar of a tiered card (§2.2): 4 px Critical/Urgent, 3 px
 * Important, none for Standard. Critical pulses slowly on a 1.6 s cycle,
 * and stays still when Reduce Motion is on. Purely decorative for screen
 * readers, the tier is always announced in text.
 */
export function CriticalBar({ tier, pulse = true }: { tier: Tier; pulse?: boolean }) {
  const t = useTheme();
  const opacity = useSharedValue(1);
  const shouldPulse = tier === 'critical' && pulse && !t.reduceMotion;

  useEffect(() => {
    if (shouldPulse) {
      opacity.value = withRepeat(
        withTiming(0.35, { duration: t.motion.criticalPulseMs / 2, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
    return () => cancelAnimation(opacity);
  }, [shouldPulse, opacity, t.motion.criticalPulseMs]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (tier === 'standard') return null;
  return (
    <Animated.View
      importantForAccessibility="no"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: tier === 'important' ? 3 : 4,
          backgroundColor: tierColor(tier, t.colors),
        },
        style,
      ]}
    />
  );
}
