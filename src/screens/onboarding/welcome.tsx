import { router } from 'expo-router';
import { Footprints, Globe, ListNumbers, PawPrint, Shield, ShieldCheck, Timer, Users } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { useSession } from '@/stores/session-store';
import { withAlpha } from '@/theme/contrast';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useTheme } from '@/theme/theme';

/** ONB-01 Welcome (§5.1). */
export function Welcome() {
  const t = useTheme();
  useStatusBarStyle(t.scheme === 'dark' ? 'light' : 'dark');
  const insets = useSafeAreaInsets();
  const enterDemo = useSession((s) => s.enterDemo);
  const [langSheet, setLangSheet] = useState(false);
  const [inviteSheet, setInviteSheet] = useState(false);

  const values = [
    { icon: ListNumbers, text: "Ranks who's most at risk for each emergency" },
    { icon: Timer, text: 'Counts down how long meds last without power' },
    { icon: Footprints, text: 'Step-by-step help when it happens' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: t.space.lg,
          gap: t.space.lg,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Language: English"
            onPress={() => setLangSheet(true)}
            style={styles.lang}>
            <Globe size={20} color={t.colors.textSecondary} />
            <AppText variant="subhead" secondary>
              English
            </AppText>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', gap: t.space.sm }}>
          <View style={[styles.logo, { backgroundColor: t.colors.brandPrimary }]}>
            <ShieldCheck size={40} color={t.colors.onBrandPrimary} weight="fill" />
          </View>
          <AppText variant="title1" weight="700" color={t.colors.brandPrimary} accessibilityRole="header">
            Emercity
          </AppText>
        </View>

        {/* Illustration: household inside a shield (built from icons until final artwork exists). */}
        <View
          importantForAccessibility="no-hide-descendants"
          style={[styles.illustration, { backgroundColor: withAlpha(t.colors.brandAccent, 0.1), borderRadius: 80 }]}>
          <Shield size={140} color={withAlpha(t.colors.brandAccent, 0.35)} weight="fill" style={{ position: 'absolute' }} />
          <View style={styles.figures}>
            <Users size={52} color={t.colors.brandPrimary} weight="fill" />
            <PawPrint size={30} color={t.colors.brandPrimary} weight="fill" />
          </View>
        </View>

        <View style={{ gap: t.space.xs }}>
          <AppText variant="display" align="center">
            Know who needs help first.
          </AppText>
          <AppText variant="body" secondary align="center">
            Build your family&apos;s emergency plan in five minutes. It works even without signal.
          </AppText>
        </View>

        <View style={{ gap: t.space.sm }}>
          {values.map(({ icon: IconCmp, text }) => (
            <View key={text} style={styles.valueRow}>
              <View style={[styles.valueIcon, { backgroundColor: withAlpha(t.colors.brandAccent, 0.14) }]}>
                <IconCmp size={22} color={t.colors.brandAccent} weight="bold" />
              </View>
              <AppText variant="callout" style={{ flex: 1 }}>
                {text}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ gap: t.space.xs }}>
          <Button label="Get started" onPress={() => router.push('/sign-in')} />
          <Button label="I have an invite code" variant="ghost" onPress={() => setInviteSheet(true)} />
          <Button
            label="Explore a demo household"
            variant="ghost"
            onPress={async () => {
              await enterDemo();
              router.replace('/(tabs)/(home)');
            }}
          />
        </View>
      </ScrollView>

      <BottomSheet visible={langSheet} onClose={() => setLangSheet(false)} title="Language">
        <AppText variant="body">
          English is available now. Spanish and more languages (human-translated, never machine-translated for safety
          steps) arrive in Phase 13.
        </AppText>
      </BottomSheet>
      <BottomSheet visible={inviteSheet} onClose={() => setInviteSheet(false)} title="Join a household">
        <AppText variant="body">
          Joining needs an account. Create one or sign in, then choose “Join a household” and enter your code.
        </AppText>
        <AppText variant="footnote" secondary>
          Joining with a code turns on with shared plans, which need the app connected to its cloud database.
        </AppText>
        <Button
          label="Continue"
          onPress={() => {
            setInviteSheet(false);
            router.push('/sign-in');
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 8 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  illustration: { height: 160, width: 160, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  figures: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
