import { router } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useTheme } from '@/theme/theme';

import { Button } from './button';
import { Screen } from './screen';
import { AppText } from './text';

/** §5: 12 steps shown as 5 labeled stages. */
export const SETUP_STAGES = ['Account', 'Home', 'People', 'Health', 'Ready'] as const;
export type SetupStage = (typeof SETUP_STAGES)[number];

/**
 * Guided setup frame (§5): stage progress across the top, a title, the
 * step's content, a primary button and an optional "Skip for now".
 */
export function SetupFrame({
  stage,
  title,
  subtitle,
  children,
  primary,
  skip,
  notice,
  back = true,
}: {
  stage: SetupStage;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primary?: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  skip?: { label?: string; onPress: () => void };
  /** Pinned above the buttons so it's always visible (e.g. an undo toast). */
  notice?: ReactNode;
  back?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle(t.scheme === 'dark' ? 'light' : 'dark');
  const at = SETUP_STAGES.indexOf(stage);

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        {back && router.canGoBack() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <CaretLeft size={24} color={t.colors.textPrimary} />
          </Pressable>
        ) : null}
        <AppText variant="footnote" secondary style={{ flex: 1 }} accessibilityLabel={`Step ${at + 1} of ${SETUP_STAGES.length}: ${stage}`}>
          {stage}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SETUP_STAGES.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= at ? t.colors.brandAccent : t.colors.surfaceSunken }} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen
      header={header}
      footer={
        primary || skip || notice ? (
          <View style={{ gap: 4 }}>
            {notice}
            {primary ? <Button label={primary.label} onPress={primary.onPress} disabled={primary.disabled} loading={primary.loading} /> : null}
            {skip ? <Button label={skip.label ?? 'Skip for now'} variant="ghost" onPress={skip.onPress} /> : null}
          </View>
        ) : undefined
      }>
      <View style={{ gap: 6 }}>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" secondary>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}
