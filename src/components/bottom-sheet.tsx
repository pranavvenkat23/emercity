import { X } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeScope, useTheme } from '@/theme/theme';

import { AppText } from './text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 'half' sits at the bottom; 'full' uses the native page sheet. */
  height?: 'half' | 'full';
}

/** Modal sheet for details and edits (§2.5). Keeps the caller's theme mode. */
export function BottomSheet({ visible, onClose, title, children, height = 'half' }: BottomSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const full = height === 'full';

  const body = (
    <View
      style={[
        full ? styles.full : styles.half,
        {
          backgroundColor: t.colors.surfaceBase,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopLeftRadius: full ? 0 : t.radius.card + 4,
          borderTopRightRadius: full ? 0 : t.radius.card + 4,
        },
      ]}>
      <View style={[styles.header, { paddingHorizontal: t.space.md }]}>
        <AppText variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={8}
          style={[styles.close, { backgroundColor: t.colors.surfaceSunken }]}>
          <X size={20} color={t.colors.textPrimary} weight="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.sm }}>{children}</ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={!full}
      presentationStyle={full ? 'pageSheet' : 'overFullScreen'}>
      <ThemeScope mode={t.mode}>
        {full ? (
          body
        ) : (
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close sheet" onPress={onClose} />
            {body}
          </View>
        )}
      </ThemeScope>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  half: { maxHeight: '75%', minHeight: 240 },
  full: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 4, gap: 12 },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
