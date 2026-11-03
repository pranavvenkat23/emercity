import { router } from 'expo-router';
import { Info, Phone, Plug } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect, DateField, FormSection, Stepper, SwitchRow, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { deviceBackup } from '@/domain/device-backup';
import { displayName } from '@/domain/members';
import { isLifeSustaining } from '@/domain/onboarding';
import type { Device, DeviceType } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  'oxygen-concentrator': 'Oxygen concentrator',
  'home-ventilator': 'Home ventilator',
  'cpap-bipap': 'CPAP/BiPAP',
  'power-wheelchair': 'Power wheelchair',
  'feeding-pump': 'Feeding pump',
  'iv-infusion-pump': 'IV infusion pump',
  'suction-machine': 'Suction machine',
  'home-dialysis': 'Home dialysis',
  nebulizer: 'Nebulizer',
  'hospital-bed': 'Hospital bed',
  'apnea-monitor': 'Apnea monitor',
  'insulin-pump': 'Insulin pump',
  'cgm-receiver': 'CGM receiver',
  other: 'Other',
};

const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} m` : ''}` : `${min} m`);

/** HH-09 Device detail (§7.7). id 'new' adds a device for memberId. */
export function DeviceDetail({ id, memberId }: { id: string; memberId?: string }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const existing = snapshot?.devices.find((d) => d.id === id);
  const initial = useMemo<Device | null>(() => {
    if (existing) return existing;
    if (!snapshot) return null;
    const now = new Date().toISOString();
    return {
      id: newId(),
      householdId: snapshot.household.id,
      createdAt: now,
      updatedAt: now,
      memberId: memberId || snapshot.members[0]?.id || '',
      type: 'other',
      label: '',
      usesElectricity: true,
      lifeSustaining: false,
      powerWatts: null,
      hasInternalBattery: false,
      batteryRuntimeMinutes: null,
      backupBatteryCount: 0,
      backupRuntimeMinutes: null,
      backupNonElectric: '',
      backupNonElectricMinutes: null,
      registeredWithUtility: 'not-sure',
    };
  }, [existing, snapshot, memberId]);
  const [d, setD] = useState<Device | null>(initial);
  const [utilityInfo, setUtilityInfo] = useState(false);
  if (!snapshot || !d) return null;
  const set = (patch: Partial<Device>) => setD({ ...d, ...patch });
  const h = snapshot.household;
  const backup = deviceBackup(d, h);
  const owner = snapshot.members.find((m) => m.id === d.memberId);

  const onSave = async () => {
    const saved = await save('devices', { ...d, label: d.label?.trim() || DEVICE_TYPE_LABEL[d.type] });
    const m = useSession.getState().snapshot?.members.find((x) => x.id === saved.memberId);
    if (m && !m.deviceIds.includes(saved.id)) await save('members', { ...m, deviceIds: [...m.deviceIds, saved.id] }, ['deviceIds']);
    router.back();
  };

  return (
    <Screen header={<AppBar title={existing ? d.label || DEVICE_TYPE_LABEL[d.type] : 'Add medical equipment'} subtitle={owner ? displayName(owner) : undefined} back showAvatar={false} />}>
      <Card style={{ borderColor: d.lifeSustaining ? t.colors.severityCritical : t.colors.borderDefault, borderWidth: d.lifeSustaining ? 2 : 1 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Plug size={32} color={t.colors.brandPrimary} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title2" tabular>
              {backup.totalMinutes > 0 ? `About ${fmt(backup.totalMinutes)} without power` : 'Backup time not entered'}
            </AppText>
            <AppText variant="footnote" secondary>
              {backup.stages.length ? backup.stages.map((s) => `${s.label} ${fmt(s.minutes)}`).join(', then ') : 'Add battery runtime below.'}
            </AppText>
            {backup.missing.length ? (
              <AppText variant="footnote" color={t.colors.severityImportant}>
                Missing: {backup.missing.map((x) => x.replace(/-/g, ' ')).join(', ')}
              </AppText>
            ) : null}
            <AppText variant="caption" secondary>
              Your estimate · confirm with your device supplier.
            </AppText>
          </View>
        </View>
      </Card>

      <FormSection title="Device">
        <ChipSelect
          label="Type"
          value={d.type}
          onChange={(v) => set({ type: v, lifeSustaining: existing ? d.lifeSustaining : isLifeSustaining(v) })}
          options={(Object.keys(DEVICE_TYPE_LABEL) as DeviceType[]).map((k) => ({ value: k, label: DEVICE_TYPE_LABEL[k] }))}
        />
        <TextField label="Name (optional)" value={d.label ?? ''} onChange={(v) => set({ label: v })} placeholder={DEVICE_TYPE_LABEL[d.type]} />
        <ChipSelect label="Who uses it" value={d.memberId} onChange={(v) => set({ memberId: v })} options={snapshot.members.map((m) => ({ value: m.id, label: displayName(m) }))} />
        <SwitchRow
          label="Life-sustaining"
          hint="Ventilators, continuous oxygen, sole-nutrition feeding pumps, and home dialysis. Makes this person Critical in outages."
          value={d.lifeSustaining}
          onChange={(v) =>
            v
              ? set({ lifeSustaining: true })
              : Alert.alert('Turn off life-sustaining?', `Emercity will stop treating ${owner ? displayName(owner) : 'this person'} as critical in outages.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Turn off', style: 'destructive', onPress: () => set({ lifeSustaining: false }) },
                ])
          }
        />
      </FormSection>

      <FormSection title="Power">
        <SwitchRow label="Uses electricity" value={d.usesElectricity} onChange={(v) => set({ usesElectricity: v })} />
        {d.usesElectricity ? (
          <>
            <SwitchRow label="Has an internal battery" value={d.hasInternalBattery} onChange={(v) => set({ hasInternalBattery: v })} />
            {d.hasInternalBattery ? (
              <Stepper label="Internal battery runtime" hint="From the device or its manual." value={d.batteryRuntimeMinutes ?? null} onChange={(v) => set({ batteryRuntimeMinutes: v })} step={15} min={15} max={2880} format={fmt} allowUnknown />
            ) : null}
            <Stepper label="Spare batteries" value={d.backupBatteryCount ?? 0} onChange={(v) => set({ backupBatteryCount: v ?? 0 })} step={1} min={0} max={20} />
            {(d.backupBatteryCount ?? 0) > 0 ? (
              <Stepper label="Runtime of each spare" value={d.backupRuntimeMinutes ?? null} onChange={(v) => set({ backupRuntimeMinutes: v })} step={15} min={15} max={2880} format={fmt} allowUnknown />
            ) : null}
            <Stepper label="Power use (watts)" hint="Optional. Used to check if your generator can run it." value={d.powerWatts ?? null} onChange={(v) => set({ powerWatts: v })} step={10} min={10} max={5000} format={(v) => `${v} W`} allowUnknown />
            {h.hasGenerator ? (
              <AppText variant="callout" color={backup.generatorCovers ? t.colors.statusSafe : t.colors.textSecondary}>
                {backup.generatorCovers === true
                  ? `Your generator can run this${h.generatorFuelHours ? ` (+${h.generatorFuelHours} h of fuel)` : '. Add fuel hours in household settings.'}`
                  : backup.generatorCovers === false
                    ? 'Your generator is too small for this device.'
                    : 'Add generator and device watts to check coverage.'}
              </AppText>
            ) : null}
          </>
        ) : null}
        <TextField label="Non-electric backup (optional)" placeholder="e.g. 2 oxygen cylinders" value={d.backupNonElectric ?? ''} onChange={(v) => set({ backupNonElectric: v })} />
        {d.backupNonElectric ? (
          <Stepper label="Estimated time from that backup" hint="Your estimate." value={d.backupNonElectricMinutes ?? null} onChange={(v) => set({ backupNonElectricMinutes: v })} step={30} min={30} max={4320} format={fmt} allowUnknown />
        ) : null}
        <DateField label="Battery last fully charged" value={d.batteryLastChargedDate} maximumDate={new Date()} onChange={(v) => set({ batteryLastChargedDate: v })} hint="Emercity reminds you monthly to charge spares." />
      </FormSection>

      <FormSection title="Supplier and utility">
        <TextField label="Medical equipment supplier" value={d.supplierName ?? ''} onChange={(v) => set({ supplierName: v })} />
        <TextField label="Supplier phone" keyboardType="phone-pad" value={d.supplierPhone ?? ''} onChange={(v) => set({ supplierPhone: v })} />
        {d.supplierPhone ? <Button label="Call supplier" icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${d.supplierPhone!.replace(/[^\d+]/g, '')}`).catch(() => {})} /> : null}
        <ChipSelect
          label="Registered with your utility's medical priority list?"
          value={d.registeredWithUtility}
          onChange={(v) => set({ registeredWithUtility: v })}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'not-sure', label: 'Not sure' },
          ]}
        />
        <Button label="What is this?" icon={Info} variant="ghost" fullWidth={false} onPress={() => setUtilityInfo(true)} />
      </FormSection>

      <Button label="Save" size="emergency" disabled={!d.memberId} onPress={onSave} />
      {existing ? (
        <Button
          label="Remove device"
          variant="ghost"
          onPress={() =>
            Alert.alert('Remove this device?', d.lifeSustaining ? 'This person will no longer be treated as critical because of it.' : 'You can restore it for 30 days.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await remove('devices', existing.id);
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}

      <BottomSheet visible={utilityInfo} onClose={() => setUtilityInfo(false)} title="Utility medical priority lists">
        <AppText variant="body">
          Some utilities keep a list of customers who rely on medical equipment that needs power. Ask your utility (for many Loudoun homes, Dominion Energy) whether they have one.
        </AppText>
        <AppText variant="body" weight="600">
          Being on a list does not guarantee faster restoration. You still need a backup plan.
        </AppText>
      </BottomSheet>
    </Screen>
  );
}
