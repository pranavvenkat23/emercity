import { router, type Href } from 'expo-router';
import { ArrowCounterClockwise, Bell, CaretRight, CloudCheck, Code, Database, Globe, Info, PersonSimple, ShieldCheck, SignOut, Siren, UsersThree, type Icon } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { flushQueue } from '@/services/cloud-sync';
import { clearDemoScenario, simulateFlashFlood, simulateWinterOutage } from '@/services/demo';
import { isFirebaseConfigured } from '@/services/firebase';
import { useT } from '@/stores/language-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/**
 * SET-01 Settings home (§22.1). Language and accessibility (SET-04/05)
 * arrive with translations; everything else links to its screen.
 */
export function SettingsHome() {
  const t = useTheme();
  const mode = useSession((s) => s.mode);
  const user = useSession((s) => s.user);
  const snapshot = useSession((s) => s.snapshot);
  const db = useSession((s) => s.db);
  const pending = useSession((s) => s.pendingSync);
  const resetDemo = useSession((s) => s.resetDemo);
  const exit = useSession((s) => s.exitToWelcome);
  const [demoMenu, setDemoMenu] = useState(false);
  const tr = useT();

  return (
    <Screen header={<AppBar title={tr('settings.title')} back showAvatar={false} sheet />}>
      <Pressable
        onLongPress={mode === 'demo' ? () => setDemoMenu(true) : undefined}
        accessibilityActions={mode === 'demo' ? [{ name: 'demo', label: 'Demo scenarios' }] : undefined}
        onAccessibilityAction={() => setDemoMenu(true)}>
        <Card>
          <View style={{ gap: 4 }}>
            <AppText variant="headline">
              {mode === 'demo' ? 'Demo household' : user?.email ?? 'Not signed in'}
            </AppText>
            <AppText variant="subhead" secondary>
              {snapshot?.household.name ?? 'No household yet'}
              {mode === 'demo' ? ' · not signed in, nothing is synced' : ''}
            </AppText>
          </View>
        </Card>
      </Pressable>

      <Card padded={false}>
        {mode === 'demo' ? (
          <Row icon={ArrowCounterClockwise} title={tr('settings.resetDemo')} onPress={() => resetDemo()} />
        ) : null}
        <Row icon={UsersThree} title={tr('settings.account')} href="/settings/account" divider={mode === 'demo'} />
        <Row icon={Bell} title={tr('settings.notifications')} href="/settings/notifications" divider />
        <Row icon={PersonSimple} title={tr('settings.accessibility')} href="/settings/accessibility" divider />
        <Row icon={Globe} title={tr('settings.language')} href="/settings/language" divider />
        <Row icon={Siren} title={tr('settings.emergency')} href="/settings/emergency" divider />
        <Row icon={ShieldCheck} title={tr('settings.privacy')} href="/settings/privacy" divider />
        <Row icon={CloudCheck} title={tr('settings.offline')} href="/settings/offline" divider />
        <Row icon={Database} title={tr('settings.sources')} href="/settings/sources" divider />
        <Row icon={Info} title={tr('settings.about')} href="/settings/about" divider />
        <Row
          icon={SignOut}
          title={mode === 'demo' ? tr('settings.leaveDemo') : tr('settings.signOut')}
          divider
          onPress={async () => {
            if (mode !== 'account') return exit();
            // Push anything waiting, then sign out (which removes this phone's copy).
            await flushQueue().catch(() => {});
            const left = useSession.getState().pendingSync;
            if (!left) return exit();
            Alert.alert(`${left} change${left === 1 ? '' : 's'} not synced yet`, 'Signing out now deletes them from this phone. Connect to the internet first to keep them.', [
              { text: 'Stay signed in', style: 'cancel' },
              { text: 'Sign out anyway', style: 'destructive', onPress: () => exit() },
            ]);
          }}
        />
      </Card>

      <AppText variant="footnote" secondary>
        Emercity checks alerts while the app is open.
      </AppText>

      {__DEV__ ? (
        <>
          <SectionHeader title="Developer" />
          <Card padded={false}>
            <Row icon={Code} title="Component gallery" href="/settings/gallery" />
          </Card>
          <Card>
            <View style={{ gap: 6 }}>
              <Diag label="Local database encryption" value={db?.cipherVersion ? `SQLCipher ${db.cipherVersion}` : 'NOT ENCRYPTED'} bad={!db?.cipherVersion} />
              <Diag label="Firebase configured" value={isFirebaseConfigured ? 'Yes' : 'No (.env missing)'} />
              <Diag label="Queued sync changes" value={String(pending)} />
            </View>
          </Card>
        </>
      ) : null}
      <BottomSheet visible={demoMenu} onClose={() => setDemoMenu(false)} title="Demo scenarios">
        <AppText variant="body" secondary>
          Simulated for the demo household only. Everything they change is labeled Demo.
        </AppText>
        <Button
          label="Flash flood warning"
          variant="secondary"
          onPress={() => {
            setDemoMenu(false);
            router.back();
            setTimeout(simulateFlashFlood, 400);
          }}
        />
        <Button
          label="Winter storm power outage"
          variant="secondary"
          onPress={async () => {
            await simulateWinterOutage();
            setDemoMenu(false);
            router.back();
          }}
        />
        <Button
          label="Clear demo scenario"
          variant="ghost"
          onPress={async () => {
            await clearDemoScenario();
            setDemoMenu(false);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

function Row({
  icon: IconCmp,
  title,
  href,
  onPress,
  divider,
}: {
  icon: Icon;
  title: string;
  href?: Href;
  onPress?: () => void;
  divider?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress ?? (() => href && router.push(href))}
      style={({ pressed }) => [
        styles.row,
        {
          padding: t.space.md,
          borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderColor: t.colors.borderDefault,
          backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
        },
      ]}>
      <IconCmp size={24} color={t.colors.brandPrimary} />
      <AppText variant="body" style={{ flex: 1 }}>
        {title}
      </AppText>
      {href ? <CaretRight size={18} color={t.colors.textSecondary} /> : null}
    </Pressable>
  );
}

function Diag({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText variant="subhead" secondary style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="subhead" weight="600" color={bad ? t.colors.severityCritical : undefined}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
});
