import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  padded?: boolean;
}

/** Surface card, 16 pt radius, hairline border (§2.4). */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style, padded = true }: CardProps) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.colors.surfaceCard,
    borderColor: t.colors.borderDefault,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: t.radius.card,
    padding: padded ? t.space.md : 0,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [base, style, pressed && { backgroundColor: t.colors.surfaceSunken }]}>
      {children}
    </Pressable>
  );
}
