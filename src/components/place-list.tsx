import { Cross, FireTruck, Flag, HouseLine, Phone, Wheelchair, PawPrint, NavigationArrow, Pill } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { describeFromHome, distanceMi } from '@/domain/geo';
import { formatAge } from '@/domain/freshness';
import type { MeetingPoint, Place } from '@/models/types';
import { effectiveStatus } from '@/services/places';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { QuickAddChip } from './quick-add-chip';
import { SourceChip } from './source-chip';
import { AppText } from './text';

export type PlaceFilter = 'open' | 'pet' | 'ada';

export const PLACE_LABEL: Record<Place['type'], string> = {
  shelter: 'Shelter',
  hospital: 'Hospital',
  'urgent-care': 'Urgent care',
  'fire-station': 'Fire station',
  pharmacy: 'Pharmacy',
  police: 'Police',
  'cooling-center': 'Cooling center',
  'warming-center': 'Warming center',
};

export function directionsUrl(lat: number, lng: number, label: string): string {
  return Platform.OS === 'ios' ? `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}` : `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`;
}

function PlaceIcon({ type, color }: { type: Place['type'] | 'meeting'; color: string }) {
  switch (type) {
    case 'shelter':
      return <HouseLine size={24} color={color} weight="bold" />;
    case 'hospital':
    case 'urgent-care':
      return <Cross size={24} color={color} weight="bold" />;
    case 'fire-station':
      return <FireTruck size={24} color={color} weight="bold" />;
    case 'pharmacy':
      return <Pill size={24} color={color} weight="bold" />;
    case 'meeting':
      return <Flag size={24} color={color} weight="bold" />;
    default:
      return <HouseLine size={24} color={color} weight="bold" />;
  }
}

/** Sorted place list with filters and a detail sheet (EM-06, MAP-01 sheet, MAP-02). */
export function PlaceList({
  places,
  meetingPoints = [],
  meetingFirst,
  firstDueStation,
  types,
  initialFilters = [],
}: {
  places: Place[];
  meetingPoints?: MeetingPoint[];
  meetingFirst?: boolean;
  firstDueStation?: string | null;
  types?: Place['type'][];
  initialFilters?: PlaceFilter[];
}) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const [filters, setFilters] = useState<Set<PlaceFilter>>(new Set(initialFilters));
  const [open, setOpen] = useState<Place | null>(null);
  const home = snapshot?.household.address.lat != null ? { lat: snapshot.household.address.lat, lng: snapshot.household.address.lng! } : null;
  const now = new Date();

  const list = useMemo(() => {
    return places
      .filter((p) => !types || types.includes(p.type))
      .filter((p) => !filters.has('open') || effectiveStatus(p, now) === 'open')
      .filter((p) => !filters.has('pet') || p.petFriendly === true)
      .filter((p) => !filters.has('ada') || p.adaCompliant === true)
      .map((p) => ({ p, d: home ? distanceMi(home, p) : null }))
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, types, filters, home?.lat, home?.lng]);

  const toggle = (f: PlaceFilter) => setFilters((s) => new Set(s.has(f) ? [...s].filter((x) => x !== f) : [...s, f]));
  const statusColor = (s: Place['status']) => (s === 'open' ? t.colors.statusSafe : s === 'closed' ? t.colors.severityCritical : t.colors.statusStale);

  const meeting = meetingPoints.map((m) => (
    <View key={m.id} style={[styles.row, { borderColor: t.colors.borderDefault }]}>
      <PlaceIcon type="meeting" color={t.colors.brandPrimary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline">{m.name}</AppText>
        <AppText variant="footnote" secondary>
          {m.type === 'near-home' ? 'Meeting point near home' : m.type === 'neighborhood' ? 'Neighborhood meeting point' : 'Out-of-area meeting point'}
          {m.description ? ` · ${m.description}` : ''}
        </AppText>
      </View>
      {m.lat != null && m.lng != null ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Directions to ${m.name}`} onPress={() => Linking.openURL(directionsUrl(m.lat!, m.lng!, m.name)).catch(() => {})} style={styles.icon}>
          <NavigationArrow size={22} color={t.colors.brandPrimary} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  ));

  return (
    <View style={{ gap: t.space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <QuickAddChip label="Open now" selected={filters.has('open')} onPress={() => toggle('open')} />
        <QuickAddChip label="Pet-friendly" icon={PawPrint} selected={filters.has('pet')} onPress={() => toggle('pet')} />
        <QuickAddChip label="Accessible" icon={Wheelchair} selected={filters.has('ada')} onPress={() => toggle('ada')} />
      </View>
      {meetingFirst ? meeting : null}
      {list.length === 0 ? (
        <AppText variant="body" secondary>
          {filters.size ? 'Nothing matches these filters.' : places.length ? 'Nothing nearby of this type.' : online === false ? 'No saved places yet. Connect to load nearby places.' : 'Loading nearby places…'}
        </AppText>
      ) : null}
      {list.map(({ p, d }) => {
        const st = effectiveStatus(p, now);
        const color = statusColor(st);
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${PLACE_LABEL[p.type]}${d != null ? `, ${d.toFixed(1)} miles` : ''}${p.type === 'shelter' ? `, ${st === 'open' ? 'open' : st === 'closed' ? 'closed' : 'status unknown'}` : ''}`}
            onPress={() => setOpen(p)}
            style={({ pressed }) => [styles.row, { borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' }]}>
            <PlaceIcon type={p.type} color={p.type === 'shelter' ? color : p.type === 'fire-station' ? t.colors.severityUrgent : t.colors.severityCritical} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="headline">{p.name}</AppText>
              <AppText variant="footnote" secondary>
                {PLACE_LABEL[p.type]}
                {d != null ? ` · ${d.toFixed(1)} mi` : ''}
                {p.id === firstDueStation ? ' · responds first to your home' : ''}
              </AppText>
              {p.type === 'shelter' ? (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View style={{ borderWidth: 1.5, borderColor: color, borderRadius: t.radius.chip, paddingHorizontal: 8 }}>
                    <AppText variant="caption" weight="700" color={color}>
                      {st === 'open' ? 'OPEN' : st === 'closed' ? 'CLOSED' : 'MAY NOT BE OPEN'}
                    </AppText>
                  </View>
                  {p.fetchedAt ? (
                    <AppText variant="caption" secondary>
                      updated {formatAge(p.fetchedAt, now)}
                    </AppText>
                  ) : null}
                  {p.petFriendly ? <PawPrint size={16} color={t.colors.textSecondary} /> : null}
                  {p.adaCompliant ? <Wheelchair size={16} color={t.colors.textSecondary} /> : null}
                  {p.capacity ? (
                    <AppText variant="caption" secondary>
                      {p.currentPopulation ?? '?'} / {p.capacity}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      {!meetingFirst ? meeting : null}

      <PlaceSheet place={open} onClose={() => setOpen(null)} firstDueStation={firstDueStation} />
    </View>
  );
}

/** MAP-02 Place detail sheet (§16.2). */
export function PlaceSheet({ place: open, onClose, firstDueStation }: { place: Place | null; onClose: () => void; firstDueStation?: string | null }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const home = snapshot?.household.address.lat != null ? { lat: snapshot.household.address.lat, lng: snapshot.household.address.lng! } : null;
  const now = new Date();
  return (
    <BottomSheet visible={!!open} onClose={onClose} title={open?.name ?? ''}>
      {open ? (
        <View style={{ gap: t.space.sm }}>
          <AppText variant="subhead" secondary>
            {PLACE_LABEL[open.type]}
            {open.id === firstDueStation ? ' · This station responds first to your home' : ''}
          </AppText>
          <AppText variant="body" selectable>
            {open.address}
          </AppText>
          {home ? <AppText variant="callout">{describeFromHome(home, open)}</AppText> : null}
          {open.type === 'shelter' ? (
            <AppText variant="callout">
              {effectiveStatus(open, now) === 'open'
                ? `Reported open${open.capacity ? ` · ${open.currentPopulation ?? 'unknown'} of ${open.capacity} people` : ''}.`
                : 'May not be open. Check official updates before you go.'}
            </AppText>
          ) : null}
          <SourceChip source={open.source} fetchedAt={open.fetchedAt} kind={open.type === 'shelter' ? 'shelter' : undefined} offlineCached={online === false} />
          {open.phone ? <Button label={`Call ${open.phone}`} icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${open.phone!.replace(/[^\d+]/g, '')}`).catch(() => {})} /> : null}
          <Button
            label={online === false ? 'Directions (map may be limited offline)' : 'Directions'}
            icon={NavigationArrow}
            onPress={() => Linking.openURL(directionsUrl(open.lat, open.lng, open.name)).catch(() => {})}
          />
          <AppText variant="footnote" secondary>
            Routes can't see flooded or closed roads. Follow official directions.
          </AppText>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
