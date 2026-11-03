import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ClipboardText, House, MapPin, Users, type Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { isActive, mapAlert } from '@/domain/alerts';
import { useConditions } from '@/stores/conditions-store';
import { useActiveSessions, useEmergencyUi } from '@/stores/emergency-store';
import type { StringKey } from '@/i18n/strings';
import { useA11y } from '@/stores/a11y-store';
import { useT } from '@/stores/language-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { EmergencyButton } from './emergency-button';
import { AppText } from './text';

const TABS: Record<string, { label: StringKey; icon: Icon }> = {
  '(home)': { label: 'tab.home', icon: House },
  household: { label: 'tab.household', icon: Users },
  map: { label: 'tab.map', icon: MapPin },
  plan: { label: 'tab.plan', icon: ClipboardText },
};

/** Left pair, center Emergency button, right pair (§3.1). */
const LEFT = ['(home)', 'household'];
const RIGHT = ['map', 'plan'];

/**
 * Four tabs plus the permanent center Emergency button (§2.5, §3.1).
 * Home shows a red dot for an active alert and a gray dot when offline.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const t = useTheme();
  const online = useSession((s) => s.online);
  const active = useActiveSessions().length > 0;
  const alerts = useConditions((s) => s.alerts);
  // §3.1: an active official alert for the address that maps to a hazard.
  const alertActive = (alerts?.value ?? []).some((a) => a.affectsAddress && isActive(a, new Date()) && mapAlert(a).hazard != null);

  const simple = useA11y((s) => s.simpleMode);
  const tr = useT();
  const renderTab = (name: string) => {
    // Simple Mode is view only (§20.3): only Home and the Emergency button.
    if (simple && name !== '(home)') return <View key={name} style={styles.tab} />;
    const route = state.routes.find((r) => r.name === name);
    if (!route) return <View key={name} style={styles.tab} />;
    const focused = state.routes[state.index]?.key === route.key;
    const meta = TABS[name];
    const IconCmp = meta.icon;
    const color = focused ? t.colors.brandPrimary : t.colors.textSecondary;
    const dot = name === '(home)' ? (alertActive ? t.colors.severityCritical : online === false ? t.colors.statusStale : null) : null;
    const dotLabel = name === '(home)' && alertActive ? ', alert active' : name === '(home)' && online === false ? ', offline' : '';
    return (
      <Pressable
        key={name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={`${tr(meta.label)}${dotLabel}`}
        onPress={() => navigateToTab(route.key)}
        style={styles.tab}>
        <View>
          <IconCmp size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          {dot ? <View style={[styles.dot, { backgroundColor: dot, borderColor: t.colors.surfaceCard }]} /> : null}
        </View>
        <AppText variant="caption" weight={focused ? '600' : '400'} color={color} allowFontScaling={false}>
          {tr(meta.label)}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.surfaceCard,
          borderTopColor: t.colors.borderDefault,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {LEFT.map(renderTab)}
      <EmergencyButton
        state={active ? 'active' : alertActive ? 'alert-suggested' : 'idle'}
        onPress={() => {
          if (active) {
            useEmergencyUi.getState().setMinimized(false);
            router.push('/emergency/hub');
          } else {
            router.push('/emergency');
          }
        }}
      />
      {RIGHT.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 2 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
