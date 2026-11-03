import { router } from 'expo-router';
import { BookOpen, Question, X } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { HAZARD_ICON } from '@/components/icons';
import { AppText } from '@/components/text';
import { isActive, mapAlert } from '@/domain/alerts';
import { HAZARD_LABEL, HAZARD_PICKER_ORDER, hazardColor } from '@/domain/hazards';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import type { Hazard } from '@/models/types';
import { GENERAL_STEPS } from '@/reference/playbook-templates';
import { noteEmergencyStarted } from '@/services/alerts';
import { useConditions } from '@/stores/conditions-store';
import { activeSessions, endEmergency, startEmergency } from '@/stores/emergency-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';

/** EM-01 Hazard picker (§12.2). Alert-driven entries skip it (§12.1). */
export function HazardPicker({ preselect, alertId }: { preselect?: Hazard; alertId?: string }) {
  const t = useTheme();
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const alerts = useConditions((s) => s.alerts);
  const user = useSession((s) => s.user);
  const [general, setGeneral] = useState(false);
  const [switchTo, setSwitchTo] = useState<Hazard | null>(null);

  const alertHazards = useMemo(() => {
    const now = new Date();
    return new Set((alerts?.value ?? []).filter((a) => a.affectsAddress && isActive(a, now)).map((a) => mapAlert(a).hazard).filter(Boolean) as Hazard[]);
  }, [alerts]);

  const begin = async (h: Hazard) => {
    await startEmergency(h, { trigger: alertId ? 'alert-prompt' : 'manual', alertId: alertId ?? null });
    if (alertId) noteEmergencyStarted(alertId, user?.email ?? 'this phone').catch(() => {});
    router.replace('/emergency/hub');
  };

  useEffect(() => {
    if (preselect) begin(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  const choose = (h: Hazard) => {
    const running = activeSessions();
    if (running.length && !running.some((s) => s.hazard === h)) setSwitchTo(h);
    else begin(h);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase, paddingTop: insets.top }}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close, don't start Emergency Mode" onPress={() => router.back()} style={styles.close}>
          <X size={28} color={t.colors.textPrimary} weight="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        <AppText variant="title1" accessibilityRole="header">
          What&apos;s happening?
        </AppText>
        <View style={styles.grid}>
          {HAZARD_PICKER_ORDER.map((h) => {
            const color = hazardColor(h, t.colors);
            const IconCmp = HAZARD_ICON[h];
            const alerted = alertHazards.has(h);
            return (
              <Pressable
                key={h}
                accessibilityRole="button"
                accessibilityLabel={`${HAZARD_LABEL[h]}${alerted ? ', alert active' : ''}`}
                accessibilityHint="Starts Emergency Mode for this emergency"
                onPress={() => choose(h)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    borderColor: color,
                    borderWidth: alerted ? 4 : 2,
                    borderRadius: t.radius.card,
                    backgroundColor: pressed ? color + '40' : color + '1F',
                    shadowColor: alerted ? color : 'transparent',
                    shadowOpacity: alerted ? 0.9 : 0,
                    shadowRadius: alerted ? 12 : 0,
                  },
                ]}>
                <IconCmp size={44} color={color} weight="bold" />
                <AppText variant="headline" align="center">
                  {HAZARD_LABEL[h]}
                </AppText>
                {alerted ? (
                  <AppText variant="caption" weight="700" color={color}>
                    ALERT ACTIVE
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Call911Bar />
        <Pressable accessibilityRole="button" accessibilityLabel="Something else" onPress={() => setGeneral(true)} style={[styles.other, { borderColor: t.colors.borderDefault, borderRadius: t.radius.button }]}>
          <Question size={24} color={t.colors.textPrimary} />
          <AppText variant="headline">Something else</AppText>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={general} onClose={() => setGeneral(false)} title="Something else">
        {GENERAL_STEPS.map((s, i) => (
          <AppText key={s.id} variant="body" weight={s.tier === 'critical' ? '700' : '400'}>
            {i + 1}. {s.instruction}
          </AppText>
        ))}
        <Call911Bar />
        <Button
          label="Open the guide library"
          icon={BookOpen}
          variant="secondary"
          onPress={() => {
            setGeneral(false);
            router.push('/guides');
          }}
        />
      </BottomSheet>

      <BottomSheet visible={!!switchTo} onClose={() => setSwitchTo(null)} title={switchTo ? `Switch to ${HAZARD_LABEL[switchTo]} or run both?` : ''}>
        <Button
          label={switchTo ? `Switch to ${HAZARD_LABEL[switchTo]}` : 'Switch'}
          size="emergency"
          onPress={async () => {
            const h = switchTo!;
            setSwitchTo(null);
            for (const s of activeSessions()) await endEmergency(s.id, 'other', `Switched to ${HAZARD_LABEL[h]}`);
            begin(h);
          }}
        />
        <Button
          label="Run both"
          variant="secondary"
          onPress={() => {
            const h = switchTo!;
            setSwitchTo(null);
            begin(h);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', paddingHorizontal: 8 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  tile: { width: '48%', minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  other: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, borderWidth: 1.5 },
});
