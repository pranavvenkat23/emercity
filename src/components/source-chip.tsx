import { CloudSlash, Clock } from 'phosphor-react-native';
import { View } from 'react-native';

import { formatAge, freshness, type FreshnessKind } from '@/domain/freshness';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export interface SourceChipProps {
  source: string;
  /** When the value was fetched/observed. null = never fetched. */
  fetchedAt?: string | null;
  /** Freshness window to judge staleness (§21.4). Omit for reference data. */
  kind?: FreshnessKind;
  /** Showing a cached value because the device is offline. */
  offlineCached?: boolean;
  /** Free-form suffix instead of an age, e.g. "rule reviewed Sep 2026". */
  note?: string;
  now?: Date;
}

/**
 * Small "NWS · 4 min ago" label (§2.5). Turns gray and says "stale" past the
 * freshness window, and "saved" when offline, never pretends to be current.
 */
export function SourceChip({ source, fetchedAt, kind, offlineCached, note, now = new Date() }: SourceChipProps) {
  const t = useTheme();
  const state = kind && fetchedAt !== undefined ? freshness(kind, fetchedAt, now) : 'fresh';
  const stale = state !== 'fresh' || offlineCached;
  const color = stale ? t.colors.statusStale : t.colors.textSecondary;

  let suffix = note ?? '';
  if (!note && fetchedAt) suffix = formatAge(fetchedAt, now);
  if (!note && fetchedAt === null) suffix = 'not checked yet';
  if (state === 'stale') suffix = `stale · ${suffix}`;
  if (offlineCached) suffix = `saved · ${suffix}`;

  const label = suffix ? `${source} · ${suffix}` : source;
  return (
    <View
      accessible
      accessibilityLabel={`Source: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: t.radius.chip,
        backgroundColor: t.colors.surfaceSunken,
      }}>
      {offlineCached ? (
        <CloudSlash size={12} color={color} weight="bold" />
      ) : stale ? (
        <Clock size={12} color={color} weight="bold" />
      ) : null}
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}
