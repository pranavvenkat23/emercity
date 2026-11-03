import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { DateField, FormSection, Stepper, SwitchRow, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { whyFor } from '@/domain/supplies';
import { useSupplies } from '@/hooks/use-supplies';
import type { SupplyItem } from '@/models/types';
import { GUIDES_BY_ID } from '@/reference/guides';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { CATEGORY_LABEL } from './supplies';

/** PLAN-05 Supply item detail (§17.3). */
export function SupplyDetail({ id }: { id: string }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const { generated } = useSupplies();
  const item = snapshot?.supplies.find((s) => s.id === id);
  const [s, setS] = useState<SupplyItem | undefined>(item);
  const [remind, setRemind] = useState(true);
  if (!s || !snapshot) return null;
  const why = whyFor(s, generated);
  const guideId = generated.find((g) => g.templateRuleId === s.templateRuleId)?.guideId;
  const set = (patch: Partial<SupplyItem>) => setS({ ...s, ...patch });

  return (
    <Screen header={<AppBar title={s.name} back />}>
      <AppText variant="subhead" secondary>
        {CATEGORY_LABEL[s.category]} · {s.location === 'go-bag' ? 'Go-bag' : s.location === 'home-kit' ? 'Home kit' : 'Car'}
      </AppText>
      {why ? <AppText variant="body">Why: {why}</AppText> : <AppText variant="body" secondary>Added by you.</AppText>}
      <FormSection>
        {!s.isTemplateItem ? <TextField label="Item" value={s.name} onChange={(v) => set({ name: v })} /> : null}
        <Stepper label={`Have (${s.unit})`} value={s.quantityHave} onChange={(v) => set({ quantityHave: v ?? 0 })} step={1} min={0} max={9999} />
        {!s.isTemplateItem ? <Stepper label={`Need (${s.unit})`} value={s.quantityNeeded} onChange={(v) => set({ quantityNeeded: v ?? 1 })} step={1} min={1} max={9999} /> : <AppText variant="callout">Need: {s.quantityNeeded} {s.unit}</AppText>}
        <DateField label="Expiration date" value={s.expirationDate} onChange={(v) => set({ expirationDate: v })} />
        {s.expirationDate ? <SwitchRow label="Remind me 30 days before" value={remind} onChange={setRemind} /> : null}
        <TextField label="Where it's kept" placeholder="e.g. Basement shelf, blue bin" value={s.locationNote ?? ''} onChange={(v) => set({ locationNote: v })} />
        <AppText variant="footnote" secondary>
          Last checked: {s.lastCheckedDate ? new Date(`${s.lastCheckedDate}T12:00:00`).toLocaleDateString() : 'never'}
        </AppText>
        <Button label="Checked today" variant="secondary" onPress={() => set({ lastCheckedDate: new Date().toISOString().slice(0, 10) })} />
      </FormSection>
      {guideId && GUIDES_BY_ID[guideId] ? <Button label={`Guide: ${GUIDES_BY_ID[guideId].title}`} variant="ghost" onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guideId } })} /> : null}
      <View style={{ gap: t.space.xs }}>
        <Button
          label="Save"
          size="emergency"
          onPress={async () => {
            await save('supplies', s);
            router.back();
          }}
        />
        {!s.isTemplateItem ? (
          <Button
            label="Delete item"
            variant="ghost"
            onPress={() =>
              Alert.alert('Delete this item?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await remove('supplies', s.id);
                    router.back();
                  },
                },
              ])
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}
