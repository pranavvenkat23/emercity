import { router } from 'expo-router';
import { ListBullets } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAZARD_ICON } from '@/components/icons';
import { AppText } from '@/components/text';
import { HAZARD_SHORT_LABEL, hazardColor } from '@/domain/hazards';
import { useNow } from '@/hooks/use-now';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useActiveSessions, useCurrentSession, useEmergencyUi } from '@/stores/emergency-store';
import { useTheme } from '@/theme/theme';

export function elapsedLabel(startIso: string, now: Date): string {
  const min = Math.max(0, Math.floor((now.getTime() - new Date(startIso).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} m`;
}

/** EM-02 top bar (§12.3): hazard stripe, "Flood · 12 min", Minimize, End; switcher when two hazards run (§12.1). */
export function EmergencyTopBar({ showStepList, onBack, practice }: { showStepList?: boolean; onBack?: () => void; practice?: boolean }) {
  const t = useTheme();
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const now = useNow(15_000);
  const session = useCurrentSession();
  const active = useActiveSessions();
  const setFocus = useEmergencyUi((s) => s.setFocus);
  if (!session) return null;
  const color = hazardColor(session.hazard, t.colors);
  const IconCmp = HAZARD_ICON[session.hazard];

  const minimize = () => {
    useEmergencyUi.getState().setMinimized(true);
    router.dismissTo('/(tabs)/(home)');
  };

  return (
    <View style={{ backgroundColor: '#000000', paddingTop: insets.top }}>
      {practice ? (
        <View style={{ backgroundColor: t.colors.practice, paddingVertical: 4 }}>
          <AppText variant="headline" weight="700" align="center" color={t.colors.onPractice}>
            PRACTICE
          </AppText>
        </View>
      ) : null}
      <View style={[styles.row, { paddingHorizontal: t.space.xs }]}>
        {onBack ? <BarButton label="Hub" onPress={onBack} /> : <BarButton label="Minimize" onPress={minimize} />}
        <View style={styles.center} accessible accessibilityLabel={`${HAZARD_SHORT_LABEL[session.hazard]}, started ${elapsedLabel(session.startedAt, now)} ago`}>
          <IconCmp size={22} color={color} weight="bold" />
          <AppText variant="headline" weight="700">
            {HAZARD_SHORT_LABEL[session.hazard]} · {elapsedLabel(session.startedAt, now)}
          </AppText>
        </View>
        {showStepList ? (
          <Pressable accessibilityRole="button" accessibilityLabel="All steps" onPress={() => router.push({ pathname: '/emergency/steps', params: { list: '1' } })} style={styles.icon}>
            <ListBullets size={26} color={t.colors.textPrimary} weight="bold" />
          </Pressable>
        ) : null}
        <BarButton label="End" onPress={() => router.push('/emergency/end')} />
      </View>
      {active.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: t.space.sm, paddingBottom: 8 }}>
          {active.map((s) => {
            const Ic = HAZARD_ICON[s.hazard];
            const selected = s.id === session.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={HAZARD_SHORT_LABEL[s.hazard]}
                onPress={() => setFocus(s.hazard)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: t.radius.chip, borderWidth: 2, borderColor: selected ? hazardColor(s.hazard, t.colors) : t.colors.borderDefault }}>
                <Ic size={18} color={hazardColor(s.hazard, t.colors)} weight="bold" />
                <AppText variant="callout">{HAZARD_SHORT_LABEL[s.hazard]}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={{ height: 4, backgroundColor: color }} />
    </View>
  );
}

function BarButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.btn}>
      <AppText variant="callout" weight="600" color={t.colors.brandPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btn: { minHeight: 48, minWidth: 64, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
