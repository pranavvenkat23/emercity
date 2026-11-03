import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        backgroundColor: t.colors.surfaceSunken,
        borderRadius: t.radius.button,
        padding: 3,
      }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.radius.button - 3,
              backgroundColor: selected ? t.colors.surfaceCard : 'transparent',
            }}>
            <AppText variant="subhead" weight={selected ? '600' : '400'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
