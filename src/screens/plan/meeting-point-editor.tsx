import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Crosshair, Warning } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { FormSection, SwitchRow, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { MEETING_POINT_META, meetingPointWarnings } from '@/domain/meeting-points';
import type { MeetingPoint, MeetingPointType } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/**
 * MAP-04 Meeting point editor (§16.4). The draggable map pin arrives with the
 * Map tab (Phase 11); until then a point is set from the phone's location or
 * described by address.
 */
export function MeetingPointEditor({ type }: { type: MeetingPointType }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const existing = snapshot?.meetingPoints.find((p) => p.type === type);
  const [p, setP] = useState<Partial<MeetingPoint>>(existing ?? { type, name: '', lat: null, lng: null });
  const [locating, setLocating] = useState(false);
  if (!snapshot) return null;
  const meta = MEETING_POINT_META[type];
  const warnings = meetingPointWarnings(snapshot, p);
  const set = (patch: Partial<MeetingPoint>) => setP({ ...p, ...patch });

  const useHere = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location is off', 'Type an address or a description instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert('Couldn’t get your location', 'Type an address or a description instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen header={<AppBar title={meta.title} back />}>
      <AppText variant="body" secondary>
        {meta.purpose}
      </AppText>
      <FormSection>
        <TextField label="Name" placeholder={meta.example} value={p.name ?? ''} onChange={(v) => set({ name: v })} maxLength={60} />
        <TextField label="Description" placeholder="By the big oak at the end of the driveway" value={p.description ?? ''} onChange={(v) => set({ description: v })} multiline maxLength={200} />
        <TextField label="Address (optional)" value={p.address ?? ''} onChange={(v) => set({ address: v })} />
        <Button label={locating ? 'Getting location…' : 'Use current location'} icon={Crosshair} variant="secondary" disabled={locating} onPress={useHere} />
        {p.lat != null && p.lng != null ? (
          <AppText variant="footnote" secondary>
            Location saved ({p.lat.toFixed(5)}, {p.lng.toFixed(5)}).
          </AppText>
        ) : null}
        <SwitchRow label="The path has stairs or steep slopes" hint="Only you know your route. We never guess terrain." value={!!p.pathHasStairsOrSlopes} onChange={(v) => set({ pathHasStairsOrSlopes: v })} />
      </FormSection>
      {warnings.map((w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Warning size={20} color={t.colors.severityImportant} weight="fill" />
          <AppText variant="body" style={{ flex: 1 }}>
            {w}
          </AppText>
        </View>
      ))}
      <Button
        label="Save"
        size="emergency"
        disabled={!p.name?.trim()}
        onPress={async () => {
          const nowIso = new Date().toISOString();
          const rec: MeetingPoint = {
            id: existing?.id ?? newId(),
            householdId: snapshot.household.id,
            createdAt: existing?.createdAt ?? nowIso,
            updatedAt: nowIso,
            type,
            name: p.name!.trim(),
            lat: p.lat ?? null,
            lng: p.lng ?? null,
            address: p.address?.trim() || undefined,
            description: p.description?.trim() || undefined,
            pathHasStairsOrSlopes: !!p.pathHasStairsOrSlopes,
          };
          await save('meetingPoints', rec);
          router.back();
        }}
      />
      {existing ? (
        <Button
          label="Remove meeting point"
          variant="ghost"
          onPress={async () => {
            await remove('meetingPoints', existing.id);
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
