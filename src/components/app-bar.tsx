import { router } from 'expo-router';
import { CaretLeft, UserCircle } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hazardColor } from '@/domain/hazards';
import type { Hazard } from '@/models/types';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export interface AppBarProps {
  title: string;
  subtitle?: string;
  /** Show a back chevron. Defaults to router.back(). */
  back?: boolean | (() => void);
  /** Settings avatar on the right (§3.4). Default true in Prepare mode. */
  showAvatar?: boolean;
  right?: ReactNode;
  /** Label shown beside the title, e.g. "DEMO" for the demo household. */
  badge?: string;
  /** Emergency variant: black bar with a hazard color stripe (§2.5). */
  hazard?: Hazard;
  /** Rendered inside a modal sheet: no status-bar inset (the sheet starts below it). */
  sheet?: boolean;
}

/**
 * Top app bar (§2.5). Prepare: navy in light mode. In dark mode the spec's
 * dark brand.primary (#8FB8E8) is too bright for a full bar, so the bar uses
 * the card surface with brand-colored text instead. Emergency: near-black
 * with the hazard color stripe along the bottom.
 */
export function AppBar({ title, subtitle, back, showAvatar, right, badge, hazard, sheet }: AppBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const emergency = t.mode === 'emergency';
  const navy = !emergency && t.scheme === 'light';
  const bg = emergency ? '#000000' : navy ? t.colors.brandPrimary : t.colors.surfaceCard;
  const fg = navy ? t.colors.onBrandPrimary : t.colors.textPrimary;
  const avatar = showAvatar ?? !emergency;
  // Navy bar (light scheme), dark card bar (dark scheme) and the black
  // Emergency bar all need light status bar text.
  useStatusBarStyle(navy || emergency || t.scheme === 'dark' ? 'light' : 'dark');

  const onBack = typeof back === 'function' ? back : () => router.back();

  return (
    <View style={{ backgroundColor: bg, paddingTop: sheet ? 4 : insets.top }}>
      <View style={[styles.row, { paddingHorizontal: t.space.xs, minHeight: 56 }]}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.iconBtn}>
            <CaretLeft size={26} color={fg} weight="bold" />
          </Pressable>
        ) : (
          <View style={{ width: t.space.xs }} />
        )}
        <View style={{ flex: 1, paddingVertical: 8 }}>
          <View style={styles.titleRow}>
            <AppText variant="headline" color={fg} accessibilityRole="header" style={{ flexShrink: 1 }}>
              {title}
            </AppText>
            {badge ? (
              <View
                style={[
                  styles.badge,
                  { borderColor: navy ? t.colors.onBrandPrimary : t.colors.brandAccent, borderRadius: t.radius.chip },
                ]}>
                <AppText
                  variant="caption"
                  weight="700"
                  color={navy ? t.colors.onBrandPrimary : t.colors.brandAccent}
                  style={{ letterSpacing: 0.6 }}>
                  {badge}
                </AppText>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <AppText variant="footnote" color={navy ? t.colors.onBrandPrimary : t.colors.textSecondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
        {avatar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings and households"
            onPress={() => router.push('/settings')}
            style={styles.iconBtn}>
            <UserCircle size={30} color={fg} weight="regular" />
          </Pressable>
        ) : null}
      </View>
      {hazard ? <View style={{ height: 4, backgroundColor: hazardColor(hazard, t.colors) }} /> : null}
      {!hazard && !navy ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.borderDefault }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: { borderWidth: 1.5, paddingHorizontal: 6, paddingVertical: 1 },
});
