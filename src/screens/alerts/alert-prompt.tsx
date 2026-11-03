import { router } from 'expo-router';
import { Warning } from 'phosphor-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HAZARD_ICON } from '@/components/icons';
import { AppText } from '@/components/text';
import { mapAlert } from '@/domain/alerts';
import { displayName } from '@/domain/members';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useAlertHistoryStore } from '@/services/alerts';
import { useActiveSessions } from '@/stores/emergency-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const firstSentence = (s: string) => s.replace(/\s+/g, ' ').trim().split(/(?<=[.!])\s/)[0] ?? '';

/**
 * ALERT-PROMPT (§10.3): full-screen, dark. Shown once per warning that maps
 * to a full-screen prompt. Never starts Emergency Mode by itself.
 */
export function AlertPrompt() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');
  const alert = useAlertHistoryStore((s) => s.pending);
  const snapshot = useSession((s) => s.snapshot);
  const sessions = useActiveSessions();
  if (!alert) return null;
  const mapping = mapAlert(alert);
  const hazard = mapping.hazard ?? alert.mappedHazard;
  const Icon = hazard ? HAZARD_ICON[hazard] : Warning;
  const existing = hazard ? sessions.find((s) => s.hazard === hazard) : undefined;
  const starter = existing?.startedBy ? snapshot?.members.find((m) => m.id === existing.startedBy || m.linkedUserId === existing.startedBy) : null;
  const minAgo = existing ? Math.max(0, Math.round((Date.now() - new Date(existing.startedAt).getTime()) / 60000)) : 0;
  const until = new Date(alert.expires).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const excerpt = mapping.firstStep ?? firstSentence(alert.instruction || alert.headline);

  const close = () => {
    useAlertHistoryStore.getState().setPending(null);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, gap: 20 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }} accessible accessibilityRole="alert">
        {alert.isDemo ? (
          <View style={{ alignSelf: 'flex-start', borderWidth: 2, borderColor: t.colors.textPrimary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <AppText variant="headline" weight="800" style={{ letterSpacing: 2 }}>
              DEMO · NOT A REAL ALERT
            </AppText>
          </View>
        ) : null}
        <Icon size={96} color={t.colors.severityCritical} weight="bold" />
        <AppText variant="display">{alert.event}</AppText>
        <AppText variant="title2">Until {until}</AppText>
        {excerpt ? <AppText variant="headline">{excerpt}</AppText> : null}
        <AppText variant="footnote" secondary>
          {alert.senderName ?? 'National Weather Service'}
        </AppText>
        {existing ? (
          <AppText variant="headline" color={t.colors.statusSafe}>
            {starter ? displayName(starter) : 'Someone'} started Emergency Mode {minAgo < 1 ? 'just now' : `${minAgo} min ago`}
          </AppText>
        ) : null}
      </View>
      {hazard ? (
        <Button
          label={existing ? 'Join' : 'Start Emergency Mode'}
          variant="critical"
          size="emergency"
          onPress={() => {
            useAlertHistoryStore.getState().setPending(null);
            if (existing) {
              router.replace('/emergency/hub');
            } else {
              router.replace({ pathname: '/emergency', params: { hazard, alertId: alert.id } });
            }
          }}
        />
      ) : null}
      <Button label="Not now" variant="secondary" onPress={close} />
      <Button
        label="Read the alert"
        variant="ghost"
        onPress={() => {
          useAlertHistoryStore.getState().setPending(null);
          router.replace({ pathname: '/alert/[alertId]', params: { alertId: alert.id } });
        }}
      />
    </View>
  );
}
