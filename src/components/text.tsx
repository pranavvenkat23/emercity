import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/theme';
import type { TypeStyleName } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TypeStyleName;
  color?: string;
  /** Use the secondary text color (captions, metadata, "last updated"). */
  secondary?: boolean;
  /** Tabular figures so countdown digits don't jump (§2.3). */
  tabular?: boolean;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

/**
 * All app text. System font (SF Pro / Roboto) with Dynamic Type left on:
 * layouts must reflow rather than truncate (§2.3), so callers should not set
 * numberOfLines on anything a user needs to read in an emergency.
 */
export function AppText({
  variant = 'body',
  color,
  secondary,
  tabular,
  weight,
  align,
  style,
  ...rest
}: AppTextProps) {
  const t = useTheme();
  const v = t.type[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          fontWeight: weight ?? v.fontWeight,
          color: color ?? (secondary ? t.colors.textSecondary : t.colors.textPrimary),
          textAlign: align,
        },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
