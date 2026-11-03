import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChipSelect, FormSection, MultiChipSelect, SwitchRow, TextField } from '@/components/form';
import { SetupFrame } from '@/components/setup-frame';
import type { Pet } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const SPECIAL = ['Elderly', 'Anxious', 'Heat-sensitive', 'Needs special food'];

/** ONB-07 Pets, one card per pet (§5.7). */
export function PetsStep({ index }: { index: number }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const pets = snapshot?.pets ?? [];
  const [p, setP] = useState<Pet | undefined>(pets[index]);
  const [saving, setSaving] = useState(false);
  if (!p) return null;
  const last = index >= pets.length - 1;
  const set = (patch: Partial<Pet>) => setP({ ...p, ...patch });

  const next = async () => {
    setSaving(true);
    try {
      await save('pets', { ...p, name: p.name.trim() });
      if (last) router.push('/health');
      else router.push({ pathname: '/pets', params: { i: String(index + 1) } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SetupFrame stage="People" title={`About ${p.name}`} subtitle="Pets need a plan too." primary={{ label: last ? 'Next: medications' : 'Next pet', onPress: next, disabled: !p.name.trim(), loading: saving }}>
      <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }}>
        {pets.map((x, i) => (
          <View key={x.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === index ? t.colors.brandAccent : t.colors.borderDefault }} />
        ))}
      </View>
      <FormSection>
        <TextField label="Name" value={p.name} onChange={(v) => set({ name: v })} maxLength={40} />
        <ChipSelect
          label="Size"
          value={p.size}
          onChange={(size) => set({ size })}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
        />
        <SwitchRow label="Needs a carrier?" value={p.needsCarrier} onChange={(v) => set({ needsCarrier: v })} />
        <SwitchRow label="Takes medication?" value={!!p.takesMedication} onChange={(v) => set({ takesMedication: v })} />
        <MultiChipSelect label="Special needs" options={SPECIAL.map((s) => ({ value: s, label: s }))} value={new Set(p.specialNeeds)} onToggle={(v) => set({ specialNeeds: p.specialNeeds.includes(v) ? p.specialNeeds.filter((x) => x !== v) : [...p.specialNeeds, v] })} />
      </FormSection>
    </SetupFrame>
  );
}
