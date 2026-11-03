import { router } from 'expo-router';
import { IdentificationCard, ListChecks, Phone, Siren } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useActiveSessions } from '@/stores/emergency-store';
import { useT } from '@/stores/language-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/**
 * Simple Mode home (§20.3): three big buttons, view only. Calls always ask
 * twice ("extra confirmation on calls").
 */
export function SimpleHome() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const active = useActiveSessions().length > 0;
  const [help, setHelp] = useState(false);
  const tr = useT();
  const contacts = (snapshot?.contacts ?? []).filter((c) => c.phone && (c.type === 'emergency' || c.type === 'out-of-area')).slice(0, 2);

  const call = (label: string, number: string) =>
    Alert.alert(`Call ${label}?`, number === '911' ? 'This calls 911 now.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {}) },
    ]);

  const big = (bg: string): ViewStyle => ({ minHeight: 140, borderRadius: 24, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 });

  return (
    <Screen header={<AppBar title={snapshot?.household.name ?? 'Emercity'} />}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('simple.help')} onPress={() => setHelp(true)} style={big(t.colors.severityCritical)}>
        <Siren size={56} color={t.colors.onCritical} weight="fill" />
        <AppText variant="display" color={t.colors.onCritical}>
          {tr('simple.help')}
        </AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('simple.steps')} onPress={() => router.push(active ? '/emergency/hub' : '/emergency')} style={big(t.colors.brandPrimary)}>
        <ListChecks size={56} color={t.colors.onBrandPrimary} weight="bold" />
        <AppText variant="display" color={t.colors.onBrandPrimary}>
          {tr('simple.steps')}
        </AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('simple.card')} onPress={() => router.push('/emergency/card')} style={[big(t.colors.surfaceCard), styles.outline, { borderColor: t.colors.borderDefault }]}>
        <IdentificationCard size={56} color={t.colors.textPrimary} weight="bold" />
        <AppText variant="display">{tr('simple.card')}</AppText>
      </Pressable>

      <BottomSheet visible={help} onClose={() => setHelp(false)} title="Who do you need?">
        <Button label="Call 911" icon={Phone} variant="critical" size="emergency" onPress={() => call('911', '911')} />
        {contacts.map((c) => (
          <Button key={c.id} label={`Call ${c.name}`} icon={Phone} variant="secondary" size="emergency" onPress={() => call(c.name, c.phone)} />
        ))}
        {!contacts.length ? (
          <AppText variant="footnote" secondary>
            Ask someone to add an emergency contact so it shows here.
          </AppText>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({ outline: { borderWidth: 2 } });
