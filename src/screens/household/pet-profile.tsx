import { router } from 'expo-router';
import { Copy, PawPrint } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { ChipSelect, FormSection, MultiChipSelect, Stepper, SwitchRow, TextField } from '@/components/form';
import { HazardRankStrip } from '@/components/hazard-rank-strip';
import { MemberAvatar } from '@/components/member-avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import type { Pet, PetSpecies } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const SPECIAL = ['Elderly', 'Anxious', 'Heat-sensitive', 'Needs special food'];
const SPECIES: { value: PetSpecies; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'small-mammal', label: 'Small animal' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'fish', label: 'Fish' },
  { value: 'other', label: 'Other' },
];

/** HH-04 Pet profile (§7.4, ONB-07 fields). id 'new' adds a pet. */
export function PetProfile({ id }: { id: string }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const existing = snapshot?.pets.find((p) => p.id === id);
  const initial = useMemo<Pet | null>(() => {
    if (existing) return existing;
    if (!snapshot) return null;
    const now = new Date().toISOString();
    return { id: newId(), householdId: snapshot.household.id, createdAt: now, updatedAt: now, name: '', species: 'dog', size: 'medium', needsCarrier: true, medicationIds: [], specialNeeds: [] };
  }, [existing, snapshot]);
  const [p, setP] = useState<Pet | null>(initial);
  if (!snapshot || !p) {
    return (
      <Screen header={<AppBar title="Pet" back />}>
        <AppText variant="body">This pet is no longer in your household.</AppText>
      </Screen>
    );
  }
  const set = (patch: Partial<Pet>) => setP({ ...p, ...patch });
  const meds = snapshot.medications.filter((m) => m.ownerType === 'pet' && m.ownerId === p.id);
  const vet = snapshot.contacts.find((c) => c.type === 'vet');

  return (
    <Screen header={<AppBar title={existing ? p.name : 'Add a pet'} back showAvatar={false} />}>
      {existing ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <MemberAvatar name={p.name} kind="pet" size={96} />
          <AppText variant="title1">{p.name}</AppText>
        </View>
      ) : null}
      {existing ? (
        <>
          <SectionHeader title="Priority by emergency" />
          <HazardRankStrip subjectId={p.id} />
        </>
      ) : null}

      <FormSection>
        <TextField label="Name" value={p.name} onChange={(v) => set({ name: v })} autoCapitalize="words" error={p.name.trim() ? null : 'Name is required.'} />
        <ChipSelect label="Species" value={p.species} onChange={(v) => set({ species: v })} options={SPECIES} />
        <ChipSelect
          label="Size"
          value={p.size}
          onChange={(v) => set({ size: v })}
          options={[
            { value: 'small', label: 'Small (<25 lb)' },
            { value: 'medium', label: 'Medium (25–60 lb)' },
            { value: 'large', label: 'Large (>60 lb)' },
          ]}
        />
        <TextField label="Microchip number" value={p.microchipId ?? ''} onChange={(v) => set({ microchipId: v })} keyboardType="number-pad" />
        {p.microchipId ? (
          <Button
            label="Copy microchip number"
            icon={Copy}
            variant="ghost"
            fullWidth={false}
            onPress={() => Clipboard.setStringAsync(p.microchipId ?? '').then(() => Alert.alert('Copied'))}
          />
        ) : null}
      </FormSection>

      <FormSection title="Getting out">
        <SwitchRow label="Needs a carrier" value={p.needsCarrier} onChange={(v) => set({ needsCarrier: v })} />
        {p.needsCarrier ? <TextField label="Where the carrier is kept" placeholder="e.g. Garage shelf" value={p.carrierLocation ?? ''} onChange={(v) => set({ carrierLocation: v })} /> : null}
        <MultiChipSelect label="Special needs" options={SPECIAL.map((s) => ({ value: s, label: s }))} value={new Set(p.specialNeeds)} onToggle={(v) => set({ specialNeeds: p.specialNeeds.includes(v) ? p.specialNeeds.filter((x) => x !== v) : [...p.specialNeeds, v] })} />
        <Stepper label="Days of food on hand" value={p.foodDaysOnHand ?? null} onChange={(v) => set({ foodDaysOnHand: v })} step={1} min={0} max={90} allowUnknown />
      </FormSection>

      {existing ? (
        <FormSection title="Medications and vet">
          {meds.map((m) => (
            <Button key={m.id} label={m.brandName} variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/household/medication/[id]', params: { id: m.id } })} />
          ))}
          <Button label="Add medication" variant="ghost" onPress={() => router.push({ pathname: '/(tabs)/household/add-medication', params: { ownerId: p.id } })} />
          <AppText variant="body" secondary={!vet}>
            {vet ? `Vet: ${vet.name} · ${vet.phone}` : 'No vet added yet. Add one in Contacts.'}
          </AppText>
          <AppText variant="footnote" secondary>
            Vaccination records: keep a copy in your go-bag; shelters often ask for them. Photo upload arrives with cloud storage.
          </AppText>
        </FormSection>
      ) : null}

      <Button label="Pet-friendly shelters" icon={PawPrint} variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/map', params: { filter: 'pet-friendly' } })} />
      <Button
        label="Save"
        size="emergency"
        disabled={!p.name.trim()}
        onPress={async () => {
          await save('pets', { ...p, name: p.name.trim() });
          router.back();
        }}
      />
      {existing ? (
        <Button
          label="Remove pet"
          variant="ghost"
          onPress={() =>
            Alert.alert('Remove this pet?', 'You can restore it for 30 days.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await remove('pets', existing.id);
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}
