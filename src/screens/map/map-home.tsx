import { Camera, GeoJSONSource, Layer, Map, Marker, RasterSource, type CameraRef } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { Crosshair, FirstAid, Flag, Flame, HouseLine, Stack, Waves, Warning } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { SwitchRow } from '@/components/form';
import { PLACE_LABEL, PlaceSheet } from '@/components/place-list';
import { AppText } from '@/components/text';
import { distanceMi } from '@/domain/geo';
import { alertAreas, BASEMAP_STYLE, NFHL_MIN_ZOOM, NFHL_TILES } from '@/domain/map';
import { MEETING_POINT_TYPES } from '@/domain/meeting-points';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import type { Place } from '@/models/types';
import { useMapLayers } from '@/services/map-layers';
import { effectiveStatus, usePlaces } from '@/services/places';
import { useConditions } from '@/stores/conditions-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { OfflineMapButton } from './offline-map';

type LayerId = 'flood' | 'rail' | 'hazmat' | 'shelters' | 'medical' | 'fire' | 'alerts' | 'gauges' | 'meeting';
const LAYERS: { id: LayerId; group: string; label: string }[] = [
  { id: 'flood', group: 'Risk', label: 'Flood zones (FEMA)' },
  { id: 'rail', group: 'Risk', label: 'Rail lines' },
  { id: 'hazmat', group: 'Risk', label: 'Sites that report hazardous chemicals' },
  { id: 'shelters', group: 'Places', label: 'Shelters' },
  { id: 'medical', group: 'Places', label: 'Hospitals and urgent care' },
  { id: 'fire', group: 'Places', label: 'Fire stations' },
  { id: 'alerts', group: 'Live', label: 'Active alert areas' },
  { id: 'gauges', group: 'Live', label: 'River gauges' },
  { id: 'meeting', group: 'Mine', label: 'Meeting points' },
];
const DEFAULT_ON: LayerId[] = ['shelters', 'medical', 'fire', 'alerts', 'gauges', 'meeting'];

/** MAP-01 Map home (§16.1). Opens with risk layers on when `risk` is set (MAP-05). */
export function MapHome({ risk }: { risk?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle(t.scheme === 'dark' ? 'light' : 'dark');
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const alerts = useConditions((s) => s.alerts);
  const { places, firstDueStation, load, refresh } = usePlaces();
  const layersData = useMapLayers();
  const camera = useRef<CameraRef>(null);
  const [on, setOn] = useState<Set<LayerId>>(() => new Set(risk ? [...DEFAULT_ON, 'flood', 'rail', 'hazmat'] : DEFAULT_ON));
  const [sheet, setSheet] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const now = new Date();

  useEffect(() => {
    load().then(() => refresh());
    layersData.load().then(() => layersData.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a = snapshot?.household.address;
  const home = a?.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null;
  const visiblePlaces = useMemo(
    () =>
      places.filter(
        (p) => (on.has('shelters') && p.type === 'shelter') || (on.has('medical') && (p.type === 'hospital' || p.type === 'urgent-care')) || (on.has('fire') && p.type === 'fire-station'),
      ),
    [places, on],
  );
  const nearby = home ? [...visiblePlaces].sort((x, y) => distanceMi(home, x) - distanceMi(home, y)).slice(0, 3) : [];
  const areas = useMemo(() => alertAreas(alerts?.value ?? [], now), [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!home) {
    return (
      <View style={[styles.empty, { backgroundColor: t.colors.surfaceBase, paddingTop: insets.top + 40 }]}>
        <AppText variant="title2">Add your home address to see the map.</AppText>
      </View>
    );
  }

  const toggle = (id: LayerId) => setOn((s) => new Set(s.has(id) ? [...s].filter((x) => x !== id) : [...s, id]));
  const placeColor = (p: Place) =>
    p.type === 'shelter' ? (effectiveStatus(p, now) === 'open' ? t.colors.statusSafe : t.colors.statusStale) : p.type === 'fire-station' ? t.colors.severityUrgent : t.colors.severityCritical;
  const PlaceIconCmp = (p: Place) => (p.type === 'shelter' ? HouseLine : p.type === 'fire-station' ? Flame : FirstAid);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <Map style={{ flex: 1 }} mapStyle={BASEMAP_STYLE} logo={false} attribution compass={false}>
        <Camera ref={camera} initialViewState={{ center: [home.lng, home.lat], zoom: 11 }} />

        {on.has('flood') ? (
          <RasterSource id="nfhl" tiles={[NFHL_TILES]} tileSize={256} minzoom={NFHL_MIN_ZOOM} attribution="FEMA NFHL">
            <Layer type="raster" id="nfhl-layer" paint={{ 'raster-opacity': 0.55 }} />
          </RasterSource>
        ) : null}
        {on.has('rail') ? (
          <GeoJSONSource id="rail" data={layersData.rail}>
            <Layer type="line" id="rail-line" paint={{ 'line-color': '#5B4B3A', 'line-width': 2.5, 'line-dasharray': [2, 1] }} />
          </GeoJSONSource>
        ) : null}
        {on.has('hazmat') ? (
          <GeoJSONSource id="hazmat" data={layersData.hazmat}>
            <Layer type="circle" id="hazmat-dot" paint={{ 'circle-color': '#6B7A1F', 'circle-radius': 7, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 }} />
          </GeoJSONSource>
        ) : null}
        {on.has('alerts') && areas.features.length ? (
          <GeoJSONSource id="alerts" data={areas}>
            <Layer type="fill" id="alert-fill" paint={{ 'fill-color': t.colors.severityCritical, 'fill-opacity': 0.18 }} />
            <Layer type="line" id="alert-line" paint={{ 'line-color': t.colors.severityCritical, 'line-width': 2 }} />
          </GeoJSONSource>
        ) : null}

        {visiblePlaces.map((p) => {
          const Icon = PlaceIconCmp(p);
          const color = placeColor(p);
          return (
            <Marker key={p.id} id={p.id} lngLat={[p.lng, p.lat]} onPress={() => setPlace(p)}>
              <View accessible accessibilityLabel={`${p.name}, ${PLACE_LABEL[p.type]}`} style={[styles.pin, { borderColor: color, backgroundColor: t.colors.surfaceCard }]}>
                <Icon size={18} color={color} weight={p.type === 'shelter' && effectiveStatus(p, now) !== 'open' ? 'regular' : 'fill'} />
              </View>
            </Marker>
          );
        })}
        {on.has('gauges')
          ? layersData.gauges.map((g) => (
              <Marker key={g.id} id={`g-${g.id}`} lngLat={[g.lng, g.lat]} onPress={() => router.push({ pathname: '/gauge/[gaugeId]', params: { gaugeId: g.id } })}>
                <View accessible accessibilityLabel={`River gauge: ${g.name}`} style={[styles.pin, { borderColor: t.colors.hazardFlood, backgroundColor: t.colors.surfaceCard }]}>
                  <Waves size={18} color={t.colors.hazardFlood} weight="bold" />
                </View>
              </Marker>
            ))
          : null}
        {on.has('meeting')
          ? snapshot!.meetingPoints
              .filter((m) => m.lat != null && m.lng != null)
              .map((m) => (
                <Marker key={m.id} id={m.id} lngLat={[m.lng!, m.lat!]} onPress={() => router.push({ pathname: '/(tabs)/plan/meeting-point/[type]', params: { type: m.type } })}>
                  <View accessible accessibilityLabel={`Meeting point ${MEETING_POINT_TYPES.indexOf(m.type) + 1}: ${m.name}`} style={[styles.pin, { borderColor: t.colors.brandPrimary, backgroundColor: t.colors.brandPrimary }]}>
                    <Flag size={14} color="#FFFFFF" weight="fill" />
                    <AppText variant="caption" weight="800" color="#FFFFFF">
                      {MEETING_POINT_TYPES.indexOf(m.type) + 1}
                    </AppText>
                  </View>
                </Marker>
              ))
          : null}
        <Marker id="home" lngLat={[home.lng, home.lat]}>
          <View accessible accessibilityLabel="Home" style={[styles.home, { backgroundColor: t.colors.brandPrimary }]}>
            <HouseLine size={22} color="#FFFFFF" weight="fill" />
          </View>
        </Marker>
      </Map>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={[styles.title, { backgroundColor: t.colors.surfaceCard }]}>
          <AppText variant="headline" numberOfLines={1}>
            {snapshot?.household.name}
          </AppText>
          {snapshot?.household.isDemo ? (
            <AppText variant="caption" weight="700" color={t.colors.textSecondary}>
              DEMO
            </AppText>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Map layers" onPress={() => setSheet(true)} style={[styles.round, { backgroundColor: t.colors.surfaceCard }]}>
          <Stack size={24} color={t.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: 96 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Center on home" onPress={() => camera.current?.easeTo({ center: [home.lng, home.lat], zoom: 11, duration: t.reduceMotion ? 0 : 500 })} style={[styles.round, { alignSelf: 'flex-end', backgroundColor: t.colors.surfaceCard }]}>
          <Crosshair size={24} color={t.colors.textPrimary} />
        </Pressable>
        <View style={[styles.nearby, { backgroundColor: t.colors.surfaceCard }]}>
          <AppText variant="footnote" secondary>
            NEARBY{online === false ? ' · saved, may be out of date' : ''}
          </AppText>
          {nearby.length ? (
            nearby.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => setPlace(p)} style={styles.nearRow}>
                <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="subhead" secondary>
                  {distanceMi(home, p).toFixed(1)} mi
                </AppText>
              </Pressable>
            ))
          ) : (
            <AppText variant="body" secondary>
              {online === false ? 'No places saved yet.' : 'Loading places…'}
            </AppText>
          )}
        </View>
      </View>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Map layers">
        {['Risk', 'Places', 'Live', 'Mine'].map((g) => (
          <View key={g} style={{ gap: 2 }}>
            <AppText variant="subhead" secondary>
              {g}
            </AppText>
            {LAYERS.filter((l) => l.group === g).map((l) => (
              <SwitchRow key={l.id} label={l.label} value={on.has(l.id)} onChange={() => toggle(l.id)} />
            ))}
          </View>
        ))}
        {on.has('flood') ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Warning size={18} color={t.colors.textSecondary} />
            <AppText variant="footnote" secondary style={{ flex: 1 }}>
              Zoom in to street level to see FEMA flood zones. Unmapped areas aren’t safe by default; flash floods happen outside zones too.
            </AppText>
          </View>
        ) : null}
        {layersData.error ? (
          <AppText variant="footnote" color={t.colors.severityImportant}>
            {layersData.error}
          </AppText>
        ) : null}
        <OfflineMapButton />
        <Button label="Done" variant="secondary" onPress={() => setSheet(false)} />
      </BottomSheet>

      <PlaceSheet place={place} onClose={() => setPlace(null)} firstDueStation={firstDueStation} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, padding: 24 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  title: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 10 },
  nearby: { borderRadius: 16, padding: 14, gap: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  pin: { minWidth: 34, height: 34, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 4 },
  home: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
});
