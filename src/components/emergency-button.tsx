import { ExclamationMark } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '@/stores/language-store';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export type EmergencyButtonState = 'idle' | 'alert-suggested' | 'active';

const SIZE = 64;

/**
 * Large red circle in the center of the tab bar (§2.5, §3.1).
 * idle · alert-suggested (slow glowing ring) · active ("Return", pulsing ring).
 * The ring holds still when Reduce Motion is on; the "Return" label and
 * accessibility text carry the state regardless.
 */
export function EmergencyButton({ state, onPress }: { state: EmergencyButtonState; onPress: () => void }) {
  const tr = useT();
  const t = useTheme();
  const glow = useSharedValue(0);
  const animate = state !== 'idle' && !t.reduceMotion;

  useEffect(() => {
    if (animate) {
      glow.value = withRepeat(
        withTiming(1, { duration: state === 'active' ? 1000 : 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(glow);
      glow.value = state === 'idle' ? 0 : 0.6;
    }
    return () => cancelAnimation(glow);
  }, [animate, state, glow]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.55,
    transform: [{ scale: 1 + glow.value * 0.12 }],
  }));

  const label =
    state === 'active'
      ? 'Return to Emergency Mode'
      : state === 'alert-suggested'
        ? 'Emergency. An alert is active for your address'
        : 'Emergency';

  return (
    <View style={styles.wrap}>
      {state !== 'idle' ? (
        <Animated.View
          importantForAccessibility="no"
          style={[styles.ring, { borderColor: t.colors.severityCritical }, ringStyle]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={state === 'active' ? undefined : 'Opens Emergency Mode'}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: t.colors.severityCritical,
            borderColor: t.colors.surfaceCard,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}>
        <ExclamationMark size={34} color={t.colors.onCritical} weight="bold" />
      </Pressable>
      <AppText
        variant="caption"
        weight="700"
        color={t.colors.severityCritical}
        allowFontScaling={false}
        style={{ marginTop: 2 }}>
        {state === 'active' ? 'Return' : tr('tab.emergency')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: -26, width: 84 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  ring: {
    position: 'absolute',
    top: -6,
    width: SIZE + 12,
    height: SIZE + 12,
    borderRadius: (SIZE + 12) / 2,
    borderWidth: 3,
  },
});
