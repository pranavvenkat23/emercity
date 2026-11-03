import type { Icon } from 'phosphor-react-native';
import { Check } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export interface QuickAddChipProps {
  label: string;
  icon?: Icon;
  selected?: boolean;
  disabled?: boolean;
  /** Counter badge for chips that add one item per tap (§5.5). */
  count?: number;
  onPress: () => void;
}

/** Tappable setup chip (§2.5): unselected, selected, disabled. Fully rounded. */
export function QuickAddChip({ label, icon: IconCmp, selected, disabled, count, onPress }: QuickAddChipProps) {
  const t = useTheme();
  const active = selected || (count ?? 0) > 0;
  const fg = active ? t.colors.brandPrimary : t.colors.textPrimary;
  return (
    <Pressable
      accessibilityRole={count !== undefined ? 'button' : 'checkbox'}
      accessibilityLabel={count !== undefined ? `${label}, ${count} added` : label}
      accessibilityState={{ checked: count === undefined ? !!selected : undefined, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: t.touch.min,
        paddingHorizontal: 16,
        borderRadius: t.radius.chip,
        borderWidth: 1.5,
        borderColor: active ? t.colors.brandAccent : t.colors.borderDefault,
        backgroundColor: active
          ? t.colors.brandAccent + (t.scheme === 'dark' ? '33' : '1F')
          : pressed
            ? t.colors.surfaceSunken
            : t.colors.surfaceCard,
        opacity: disabled ? 0.45 : 1,
      })}>
      {selected && count === undefined ? <Check size={16} color={fg} weight="bold" /> : null}
      {IconCmp ? <IconCmp size={18} color={fg} weight={active ? 'bold' : 'regular'} /> : null}
      <AppText variant="callout" color={fg} weight={active ? '600' : '400'}>
        {label}
      </AppText>
      {count ? (
        <View
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            paddingHorizontal: 6,
            backgroundColor: t.colors.brandPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AppText variant="caption" weight="700" color={t.colors.onBrandPrimary}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
