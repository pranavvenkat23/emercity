import { router } from 'expo-router';
import { CheckCircle, Phone, Snowflake } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { ChipSelect, DateField, FormSection, Stepper, SwitchRow, TextField } from '@/components/form';
import { MemberAvatar } from '@/components/member-avatar';
import { Screen } from '@/components/screen';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { roomTempDays } from '@/domain/countdown';
import { displayName } from '@/domain/members';
import { criticalClass } from '@/domain/ndc';
import type { Medication } from '@/models/types';
import { matchStorageRule, STORAGE_RULES_BY_ID } from '@/reference/storage-rules';
import { openSource } from '@/services/links';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

export interface MedicationPrefill {
  ownerId?: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  ndc?: string;
  critical?: string;
  source?: string;
  expiration?: string;
  pendingBarcode?: string;
}

/** Days of supply from quantity and dose when both are simple numbers (§4.2). */
export function computeDaysOfSupply(quantity: number | null | undefined, unit: string | undefined, dose: string | undefined, frequency: string | undefined): number | null {
  if (!quantity || !dose || !frequency) return null;
  const perDose = Number(/(\d+(?:\.\d+)?)/.exec(dose)?.[1]);
  const timesPerDay = /twice|2x|two times|bid/i.test(frequency) ? 2 : /three|3x|tid/i.test(frequency) ? 3 : /four|4x|qid/i.test(frequency) ? 4 : /once|daily|1x|every day|qd/i.test(frequency) ? 1 : NaN;
  if (!Number.isFinite(perDose) || !Number.isFinite(timesPerDay)) return null;
  // Only when dose and quantity share a unit word (e.g. "tablets").
  if (!unit || !new RegExp(unit.replace(/s$/, ''), 'i').test(dose)) return null;
  return Math.floor(quantity / (perDose * timesPerDay));
}

/** HH-05 Medication detail and HH-06 add form (§7.5, §7.6, §13.5). id 'new' adds. */
export function MedicationDetail({ id, prefill = {} }: { id: string; prefill?: MedicationPrefill }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const existing = snapshot?.medications.find((m) => m.id === id);

  const initial = useMemo<Medication | null>(() => {
    if (existing) return existing;
    if (!snapshot) return null;
    const now = new Date().toISOString();
    const brand = prefill.brandName ?? '';
    const generic = prefill.genericName ?? '';
    const base: Medication = {
      id: newId(),
      householdId: snapshot.household.id,
      createdAt: now,
      updatedAt: now,
      ownerType: snapshot.pets.some((p) => p.id === prefill.ownerId) ? 'pet' : 'member',
      ownerId: prefill.ownerId || snapshot.members[0]?.id || '',
      ndcProductCode: prefill.ndc || null,
      brandName: brand,
      genericName: generic,
      strength: prefill.strength ?? '',
      dosageForm: prefill.dosageForm ?? '',
      route: prefill.route ?? '',
      isCritical: prefill.critical === '1' || !!criticalClass(`${brand} ${generic}`),
      needsRefrigeration: false,
      storageRuleId: null,
      isOpened: false,
      packedInGoBag: false,
      expirationDate: prefill.expiration || null,
      pendingLookupBarcode: prefill.pendingBarcode || null,
    };
    const match = matchStorageRule(base);
    if (match?.confidence === 'exact') return { ...base, storageRuleId: match.rule.id, needsRefrigeration: true };
    if (/insulin/i.test(`${brand} ${generic}`)) return { ...base, needsRefrigeration: true };
    return base;
  }, [existing, snapshot, prefill]);

  const [m, setM] = useState<Medication | null>(initial);
  if (!snapshot || !m) return null;
  const set = (patch: Partial<Medication>) => setM({ ...m, ...patch });

  const rule = m.storageRuleId ? STORAGE_RULES_BY_ID[m.storageRuleId] ?? null : null;
  const suggestion = !rule ? matchStorageRule(m, snapshot.members.find((x) => x.id === m.ownerId)?.conditions.find((c) => c.type === 'diabetes-insulin')?.insulinForm) : null;
  const room = roomTempDays(m, rule);
  const owners = [...snapshot.members.map((x) => ({ id: x.id, name: displayName(x), kind: 'person' as const })), ...snapshot.pets.map((p) => ({ id: p.id, name: p.name, kind: 'pet' as const }))];
  const computedDays = computeDaysOfSupply(m.quantityOnHand, m.quantityUnit, m.dose, m.frequency);
  const valid = m.brandName.trim().length > 0 && !!m.ownerId;

  const onSave = async () => {
    const owner = owners.find((o) => o.id === m.ownerId);
    const saved = await save('medications', { ...m, ownerType: owner?.kind === 'pet' ? 'pet' : 'member', brandName: m.brandName.trim(), daysOfSupply: m.daysOfSupply ?? computedDays });
    // Keep the owner's medicationIds in step.
    const member = useSession.getState().snapshot?.members.find((x) => x.id === saved.ownerId);
    if (member && !member.medicationIds.includes(saved.id)) await save('members', { ...member, medicationIds: [...member.medicationIds, saved.id] }, ['medicationIds']);
    const pet = useSession.getState().snapshot?.pets.find((x) => x.id === saved.ownerId);
    if (pet && !pet.medicationIds.includes(saved.id)) await save('pets', { ...pet, medicationIds: [...pet.medicationIds, saved.id] }, ['medicationIds']);
    router.back();
  };

  return (
    <Screen header={<AppBar title={existing ? m.brandName || 'Medication' : 'Add medication'} back showAvatar={false} />}>
      {!existing && prefill.ndc ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <CheckCircle size={28} color={t.colors.statusSafe} weight="fill" />
          <View style={{ flex: 1 }}>
            <AppText variant="title2">Found it</AppText>
            <AppText variant="footnote" secondary>
              The FDA directory lists what the manufacturer submitted; FDA doesn't verify each entry. Check that the name matches your box.
            </AppText>
          </View>
        </View>
      ) : null}
      {m.pendingLookupBarcode ? (
        <AppText variant="callout" color={t.colors.severityImportant}>
          Pending lookup: the barcode was saved and will be looked up when you’re online.
        </AppText>
      ) : null}

      <FormSection title="Medicine">
        <TextField label="Name" value={m.brandName} onChange={(v) => set({ brandName: v })} error={m.brandName.trim() ? null : 'Name is required.'} />
        <TextField label="Generic name" value={m.genericName ?? ''} onChange={(v) => set({ genericName: v })} autoCapitalize="none" />
        <TextField label="Strength" placeholder="e.g. 100 units/mL" value={m.strength ?? ''} onChange={(v) => set({ strength: v })} />
        {m.ndcProductCode ? (
          <AppText variant="footnote" secondary selectable>
            Product details from the FDA National Drug Code Directory · NDC {m.ndcProductCode}
          </AppText>
        ) : null}
      </FormSection>

      <FormSection title="Who takes it">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {owners.map((o) => (
            <Button key={o.id} label={o.name} variant={m.ownerId === o.id ? 'primary' : 'secondary'} fullWidth={false} onPress={() => set({ ownerId: o.id, ownerType: o.kind === 'pet' ? 'pet' : 'member' })} />
          ))}
        </View>
      </FormSection>

      <FormSection title="Storage">
        <SwitchRow label="Needs refrigeration" value={m.needsRefrigeration} onChange={(v) => set({ needsRefrigeration: v })} />
        {m.needsRefrigeration ? (
          <>
            <SwitchRow label="Opened / in use" value={m.isOpened} onChange={(v) => set({ isOpened: v, openedDate: v ? m.openedDate ?? new Date().toISOString().slice(0, 10) : null })} />
            {m.isOpened ? <DateField label="Opened on" value={m.openedDate} maximumDate={new Date()} onChange={(v) => set({ openedDate: v })} /> : null}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Snowflake size={22} color={t.colors.hazardWinter} weight="bold" />
              <View style={{ flex: 1, gap: 6 }}>
                {room ? (
                  <>
                    <AppText variant="body" weight="600">
                      Once out of the fridge: up to {room.days} days{rule?.maxRoomTempF ? ` below ${rule.maxRoomTempF}°F` : ''}.
                    </AppText>
                    {rule ? <AppText variant="footnote" secondary>{rule.notes}</AppText> : null}
                    <SourceChip source={room.source.name} note={room.source.note} />
                    {rule ? <Button label="Open source" variant="ghost" fullWidth={false} onPress={() => openSource(rule.sourceUrl)} /> : null}
                  </>
                ) : (
                  <AppText variant="body">No safe-time data for this product. Check the package insert or ask your pharmacist, then enter the room-temperature limit from your label below.</AppText>
                )}
              </View>
            </View>
            {suggestion && !rule ? (
              <View style={{ gap: 6 }}>
                <AppText variant="callout">
                  {suggestion.confidence === 'suggested' ? 'For insulin vials and cartridges, FDA emergency guidance allows up to 28 days at 59–86°F.' : `Matches ${suggestion.rule.productName}.`}
                </AppText>
                <Button label={suggestion.confidence === 'suggested' ? 'Use FDA guidance' : 'Use this rule'} variant="secondary" onPress={() => set({ storageRuleId: suggestion.rule.id })} />
              </View>
            ) : null}
            {rule ? <Button label="Don't use this rule" variant="ghost" onPress={() => set({ storageRuleId: null })} /> : null}
            {!rule ? (
              <Stepper
                label="Room-temperature limit from your label"
                hint="From your label. Leave as “Not sure” if you can't find it."
                value={m.userEnteredRoomTempDays ?? null}
                onChange={(v) => set({ userEnteredRoomTempDays: v })}
                step={1}
                min={1}
                max={120}
                format={(v) => `${v} days`}
                allowUnknown
              />
            ) : null}
          </>
        ) : null}
      </FormSection>

      <FormSection title="Supply">
        <TextField label="Dose" placeholder="e.g. 10 units" value={m.dose ?? ''} onChange={(v) => set({ dose: v })} />
        <TextField label="How often" placeholder="e.g. twice daily" value={m.frequency ?? ''} onChange={(v) => set({ frequency: v })} />
        <Stepper label="Quantity on hand" value={m.quantityOnHand ?? null} onChange={(v) => set({ quantityOnHand: v })} step={1} min={0} max={999} allowUnknown />
        <ChipSelect
          label="Unit"
          value={m.quantityUnit ?? null}
          onChange={(v) => set({ quantityUnit: v })}
          options={['pens', 'vials', 'tablets', 'capsules', 'inhalers', 'injectors', 'bottles'].map((u) => ({ value: u, label: u }))}
        />
        <Stepper
          label="Days of supply"
          hint={computedDays != null ? `Worked out from quantity and dose: ${computedDays} days` : 'Enter it, or fill in dose and quantity.'}
          value={m.daysOfSupply ?? computedDays}
          onChange={(v) => set({ daysOfSupply: v })}
          step={1}
          min={0}
          max={365}
          allowUnknown
        />
        <DateField label="Refill by" value={m.refillDate} onChange={(v) => set({ refillDate: v })} hint="Emercity reminds you 5 days before." />
        <TextField label="Pharmacy" value={m.pharmacyName ?? ''} onChange={(v) => set({ pharmacyName: v })} />
        <TextField label="Pharmacy phone" keyboardType="phone-pad" value={m.pharmacyPhone ?? ''} onChange={(v) => set({ pharmacyPhone: v })} />
        {m.pharmacyPhone ? <Button label="Call pharmacy" icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${m.pharmacyPhone!.replace(/[^\d+]/g, '')}`).catch(() => {})} /> : null}
      </FormSection>

      <FormSection>
        <SwitchRow label="Critical medicine" hint="Critical meds are ones where a missed dose could cause serious harm." value={m.isCritical} onChange={(v) => set({ isCritical: v })} />
        <SwitchRow label="Packed in go-bag" value={m.packedInGoBag} onChange={(v) => set({ packedInGoBag: v })} />
        <DateField label="Expiration date" value={m.expirationDate} onChange={(v) => set({ expirationDate: v })} />
      </FormSection>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {owners.find((o) => o.id === m.ownerId) ? <MemberAvatar name={owners.find((o) => o.id === m.ownerId)!.name} size={32} kind={owners.find((o) => o.id === m.ownerId)!.kind} /> : null}
        <AppText variant="footnote" secondary style={{ flex: 1 }}>
          Health details are encrypted on this phone and shared only with your household.
        </AppText>
      </View>

      <Button label="Save" size="emergency" disabled={!valid} onPress={onSave} />
      {existing ? (
        <Button
          label="Delete medication"
          variant="ghost"
          onPress={() =>
            Alert.alert('Delete this medication?', 'You can restore it for 30 days.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await remove('medications', existing.id);
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
