import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme';

import { OfflineBar } from './offline-bar';
import { AppText } from './text';

export interface ScreenProps {
  header?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Sticky content under the scroll area (e.g. a primary button). */
  footer?: ReactNode;
}

/**
 * Standard screen frame: app bar, OfflineBar, then content with 16 pt side
 * margins (24 pt on tablets) and a 640 pt max width (§2.4, §3.4).
 */
export function Screen({ header, children, scroll = true, contentStyle, footer }: ScreenProps) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= 768 ? t.layout.sideMarginTablet : t.layout.sideMarginPhone;
  const inner: ViewStyle = {
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: side,
    gap: t.space.md,
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.surfaceBase }]}>
      {header}
      <OfflineBar />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingTop: t.space.md, paddingBottom: t.space.xl }, inner, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: t.space.md }, inner, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[inner, { paddingVertical: t.space.sm }]}>{footer}</View> : null}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.space.xs }}>
      <AppText variant="title2" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
