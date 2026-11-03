import { CloudSlash } from 'phosphor-react-native';
import { View } from 'react-native';

import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

function clockTime(iso: string | null): string {
  if (!iso) return 'earlier';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Thin bar at the top of every screen while offline (§2.5, §21.3):
 * "Offline · showing saved plan from 2:14 PM", plus queued change count.
 */
export function OfflineBar() {
  const t = useTheme();
  const online = useSession((s) => s.online);
  const lastSavedAt = useSession((s) => s.lastSavedAt);
  const pending = useSession((s) => s.pendingSync);
  if (online !== false) return null;
  const waiting = pending > 0 ? ` · ${pending} change${pending === 1 ? '' : 's'} waiting to sync` : '';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: t.space.md,
        paddingVertical: 6,
        backgroundColor: t.colors.statusStale,
      }}>
      <CloudSlash size={16} color={t.colors.onStale} weight="bold" />
      <AppText variant="footnote" color={t.colors.onStale} weight="600" style={{ flex: 1 }}>
        Offline · showing saved plan from {clockTime(lastSavedAt)}
        {waiting}
      </AppText>
    </View>
  );
}
