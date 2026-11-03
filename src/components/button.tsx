import type { Icon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'critical' | 'ghost' | 'safe' | 'inverse';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** 'emergency' = 64 pt primary action height (§2.4). Default 48 pt. */
  size?: 'default' | 'emergency';
  icon?: Icon;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
  fullWidth?: boolean;
}

/** One button component for the whole app; 12 pt radius (§2.4). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon: IconCmp,
  disabled,
  loading,
  accessibilityHint,
  style,
  fullWidth = true,
}: ButtonProps) {
  const t = useTheme();
  const c = t.colors;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.brandPrimary, fg: c.onBrandPrimary },
    critical: { bg: c.severityCritical, fg: c.onCritical },
    safe: { bg: c.statusSafe, fg: c.onSafe },
    secondary: { bg: 'transparent', fg: c.brandPrimary, border: c.brandPrimary },
    ghost: { bg: 'transparent', fg: c.brandPrimary },
    // For actions placed on a filled red (Critical) surface.
    inverse: { bg: c.surfaceCard, fg: c.textPrimary },
  };
  const p = palette[variant];
  const height = size === 'emergency' ? t.touch.emergencyPrimary : t.touch.min;
  // Headline is 17 pt in Prepare and 22 pt in Emergency, so actionable text
  // never drops below 17 pt (§2.3).
  const textVariant = 'headline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          borderRadius: t.radius.button,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: t.space.md,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {IconCmp ? <IconCmp size={22} color={p.fg} weight="bold" /> : null}
          <AppText variant={textVariant} color={p.fg} align="center">
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
