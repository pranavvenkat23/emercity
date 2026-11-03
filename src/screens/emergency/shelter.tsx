import { router } from 'expo-router';
import { Warning } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceList } from '@/components/place-list';
import { AppText } from '@/components/text';
import { usePlaces } from '@/services/places';
import { useCurrentSession } from '@/stores/emergency-store';
import { useSession } from '@/stores/session-store';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { EmergencyTopBar } from './top-bar';

/** EM-06 Shelter and route (§12.7). */
export function ShelterAndRoute() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const session = useCurrentSession();
  const snapshot = useSession((s) => s.snapshot);
  const places = usePlaces();
  useEffect(() => {
    usePlaces.getState().load().then(() => usePlaces.getState().refresh());
  }, []);
  if (!snapshot) return null;
  const hazard = session?.hazard;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <EmergencyTopBar onBack={() => router.back()} />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        {hazard === 'flood' || hazard === 'hurricane' ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: t.space.md, borderRadius: t.radius.card, backgroundColor: blend(t.colors.severityCritical, t.colors.surfaceCard, 0.15) }}>
            <Warning size={24} color={t.colors.severityCritical} weight="fill" />
            <AppText variant="body" weight="700" style={{ flex: 1 }}>
              Turn around, don&apos;t drown. Never drive through water. Routes can&apos;t see flooded roads.
            </AppText>
          </View>
        ) : null}
        <AppText variant="callout" secondary>
          Official evacuation orders come first. Shelters are shown open only if FEMA reported them open in the last 6 hours.
        </AppText>
        {places.error ? (
          <AppText variant="callout" color={t.colors.severityImportant}>
            Shelter data is unavailable right now. Showing what was saved.
          </AppText>
        ) : null}
        <PlaceList
          places={places.places.filter((p) => p.type === 'shelter' || p.type === 'hospital' || p.type === 'urgent-care')}
          meetingPoints={snapshot.meetingPoints}
          meetingFirst={hazard === 'fire'}
          firstDueStation={places.firstDueStation}
        />
      </ScrollView>
    </View>
  );
}
