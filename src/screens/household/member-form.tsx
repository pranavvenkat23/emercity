import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ChipSelect, DateField, FormSection, Stepper, SwitchRow, TextField } from '@/components/form';
import { QuickAddChip } from '@/components/quick-add-chip';
import { AppText } from '@/components/text';
import { ageBand } from '@/domain/members';
import { chipsForMember, HEALTH_CHIPS, type HealthChipId, type HealthFollowUps } from '@/domain/onboarding';
import { LANGUAGE_NAME } from '@/i18n/languages';
import { LANGUAGES, type BloodType, type Device, type Member } from '@/models/types';
import { useTheme } from '@/theme/theme';

export interface MemberDraft {
  member: Member;
  selected: Set<HealthChipId>;
  follow: HealthFollowUps;
}

export function draftFromMember(m: Member, devices: Device[]): MemberDraft {
  const mine = devices.filter((d) => d.memberId === m.id);
  const oxygen = m.conditions.find((c) => c.type === 'oxygen-dependent');
  const insulin = m.conditions.find((c) => c.type === 'diabetes-insulin');
  const battery = (type: Device['type']) => mine.find((d) => d.type === type)?.batteryRuntimeMinutes ?? null;
  return {
    member: m,
    selected: chipsForMember(m, mine),
    follow: {
      oxygenUsage: oxygen?.oxygenUsage,
      oxygenSource: oxygen?.oxygenSource,
      insulinForm: insulin?.insulinForm,
      batteryMinutes: { ventilator: battery('home-ventilator'), 'feeding-pump': battery('feeding-pump'), 'dialysis-home': battery('home-dialysis') },
      language: m.primaryLanguage !== 'en' ? m.primaryLanguage : undefined,
    },
  };
}

const ALLERGY_CHIPS = ['penicillin', 'peanuts', 'latex', 'bee stings'];
const BLOOD: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

/**
 * Member editor (§5.6, §7.3). `compact` hides less-common fields for the
 * onboarding cards; everything is still editable later in HH-03.
 */
export function MemberForm({ draft, onChange, compact }: { draft: MemberDraft; onChange: (d: MemberDraft) => void; compact?: boolean }) {
  const t = useTheme();
  const { member: m, selected, follow } = draft;
  const now = new Date();
  const band = ageBand(m, now);
  const [exactDate, setExactDate] = useState(!m.birthYearOnly && !!m.birthDate);
  const set = (patch: Partial<Member>) => onChange({ ...draft, member: { ...m, ...patch } });
  const setFollow = (patch: Partial<HealthFollowUps>) => onChange({ ...draft, follow: { ...follow, ...patch } });
  const toggle = (id: HealthChipId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...draft, selected: next });
  };
  const groups = useMemo(() => ['Medical', 'Mobility and senses', 'Other'] as const, []);
  const year = m.birthDate ? Number(m.birthDate.slice(0, 4)) : null;
  const minorOrAdult = band === 'teen' || band === 'adult' || band === 'older-adult';
  const child = band === 'child' || band === 'toddler' || band === 'infant';

  const batteryStepper = (key: 'ventilator' | 'feeding-pump' | 'dialysis-home', label: string) => (
    <Stepper
      key={key}
      label={`${label}: battery runtime`}
      hint="From the device or its manual. Choose “Not sure” if you don't know."
      value={follow.batteryMinutes?.[key] ?? null}
      onChange={(v) => setFollow({ batteryMinutes: { ...follow.batteryMinutes, [key]: v } })}
      step={15}
      min={15}
      max={2880}
      format={(v) => (v >= 60 ? `${Math.floor(v / 60)} h ${v % 60 ? `${v % 60} m` : ''}`.trim() : `${v} m`)}
      allowUnknown
    />
  );

  return (
    <View style={{ gap: t.space.md }}>
      <FormSection>
        <TextField label="First name" value={m.firstName} onChange={(v) => set({ firstName: v })} autoCapitalize="words" error={m.firstName.trim() ? null : 'First name is required.'} />
        <TextField label="Nickname (optional)" hint="Shown on the lock-screen card, e.g. “Grandma”" value={m.nickname ?? ''} onChange={(v) => set({ nickname: v })} autoCapitalize="words" />
        {!compact ? <TextField label="Last name (optional)" value={m.lastName ?? ''} onChange={(v) => set({ lastName: v })} autoCapitalize="words" /> : null}
        {!compact && (band === 'teen' || band === 'adult' || band === 'older-adult') ? (
          <TextField label="Mobile number (optional)" hint="Used for “Send by text message” check-ins when data is down." keyboardType="phone-pad" value={m.phone ?? ''} onChange={(v) => set({ phone: v })} />
        ) : null}
        {exactDate ? (
          <DateField label="Birth date" value={m.birthDate} maximumDate={now} onChange={(v) => set({ birthDate: v, birthYearOnly: false })} />
        ) : (
          <Stepper
            label="Birth year"
            value={year}
            onChange={(v) => set({ birthDate: v == null ? null : `${v}-01-01`, birthYearOnly: true })}
            step={1}
            min={1900}
            max={now.getFullYear()}
            hint={year == null ? 'Set a year so age-based rules work.' : undefined}
          />
        )}
        <SwitchRow label="Enter exact birth date" value={exactDate} onChange={setExactDate} />
      </FormSection>

      <FormSection title="Health and needs">
        {groups.map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <AppText variant="subhead" weight="600" secondary>
              {g}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {HEALTH_CHIPS.filter((c) => c.group === g).map((c) => (
                <QuickAddChip key={c.id} label={c.label} selected={selected.has(c.id)} onPress={() => toggle(c.id)} />
              ))}
            </View>
          </View>
        ))}

        {selected.has('oxygen') ? (
          <>
            <ChipSelect
              label="Oxygen: continuous or only at night/with activity?"
              value={follow.oxygenUsage ?? null}
              onChange={(v) => setFollow({ oxygenUsage: v })}
              options={[
                { value: 'continuous', label: 'Continuous' },
                { value: 'night-or-activity', label: 'Night / activity only' },
              ]}
            />
            <ChipSelect
              label="Concentrator, tanks, or both?"
              value={follow.oxygenSource ?? null}
              onChange={(v) => setFollow({ oxygenSource: v })}
              options={[
                { value: 'concentrator', label: 'Concentrator' },
                { value: 'tanks', label: 'Tanks' },
                { value: 'both', label: 'Both' },
              ]}
            />
          </>
        ) : null}
        {selected.has('insulin') ? (
          <ChipSelect
            label="Insulin: pens, vials, or pump?"
            value={follow.insulinForm ?? null}
            onChange={(v) => setFollow({ insulinForm: v })}
            options={[
              { value: 'pens', label: 'Pens' },
              { value: 'vials', label: 'Vials' },
              { value: 'pump', label: 'Pump' },
            ]}
          />
        ) : null}
        {selected.has('ventilator') ? batteryStepper('ventilator', 'Ventilator') : null}
        {selected.has('feeding-pump') ? batteryStepper('feeding-pump', 'Feeding pump') : null}
        {selected.has('dialysis-home') ? batteryStepper('dialysis-home', 'Home dialysis') : null}
        {selected.has('limited-english') ? (
          <ChipSelect
            label="Language they speak best"
            value={follow.language ?? null}
            onChange={(v) => setFollow({ language: v })}
            options={LANGUAGES.filter((l) => l !== 'en').map((l) => ({ value: l, label: LANGUAGE_NAME[l] }))}
          />
        ) : null}
        {selected.has('formula') ? (
          <Stepper
            label="Days of ready-to-feed formula on hand"
            hint="Ready-to-feed needs no water or heating."
            value={m.readyToFeedFormulaDays ?? null}
            onChange={(v) => set({ readyToFeedFormulaDays: v })}
            step={1}
            min={0}
            max={60}
            format={(v) => `${v} day${v === 1 ? '' : 's'}`}
            allowUnknown
          />
        ) : null}
      </FormSection>

      <FormSection title="Getting out safely">
        {minorOrAdult ? <SwitchRow label="Can drive" value={m.canDrive} onChange={(v) => set({ canDrive: v })} /> : null}
        {child ? (
          <ChipSelect
            label="Can they swim?"
            value={m.canSwim == null ? null : m.canSwim ? 'yes' : 'no'}
            onChange={(v) => set({ canSwim: v === 'yes' })}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
          />
        ) : null}
        <ChipSelect
          label="Where do they sleep?"
          hint="Basement and ground-floor bedrooms matter in flash floods."
          value={m.sleepsIn ?? null}
          onChange={(v) => set({ sleepsIn: v })}
          options={[
            { value: 'basement', label: 'Basement' },
            { value: 'ground-floor', label: 'Ground floor' },
            { value: 'upper-floor', label: 'Upper floor' },
          ]}
        />
        {!compact ? (
          <>
            <SwitchRow
              label="Bedroom has large windows facing the wind"
              hint="Used for hurricane and high-wind plans."
              value={!!m.sleepsNearLargeWindows}
              onChange={(v) => set({ sleepsNearLargeWindows: v })}
            />
            <ChipSelect
              label="Needs help evacuating"
              hint="Emercity works this out from age and health needs. Change it only if that's wrong."
              value={m.needsHelpEvacuatingOverride == null ? 'auto' : m.needsHelpEvacuatingOverride ? 'yes' : 'no'}
              onChange={(v) => set({ needsHelpEvacuatingOverride: v === 'auto' ? null : v === 'yes' })}
              options={[
                { value: 'auto', label: 'Automatic' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </>
        ) : null}
      </FormSection>

      {!compact ? (
        <FormSection title="Medical details">
          <View style={{ gap: 8 }}>
            <AppText variant="subhead" weight="600">
              Allergies
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALLERGY_CHIPS.map((a) => (
                <QuickAddChip
                  key={a}
                  label={a[0].toUpperCase() + a.slice(1)}
                  selected={m.allergies.includes(a)}
                  onPress={() => set({ allergies: m.allergies.includes(a) ? m.allergies.filter((x) => x !== a) : [...m.allergies, a] })}
                />
              ))}
            </View>
            <TextField
              label="Other allergies"
              hint="Separate with commas"
              value={m.allergies.filter((a) => !ALLERGY_CHIPS.includes(a)).join(', ')}
              onChange={(v) =>
                set({
                  allergies: [...m.allergies.filter((a) => ALLERGY_CHIPS.includes(a)), ...v.split(',').map((x) => x.trim()).filter(Boolean)],
                })
              }
            />
          </View>
          <ChipSelect label="Blood type (optional)" value={m.bloodType ?? null} onChange={(v) => set({ bloodType: v })} options={BLOOD.map((b) => ({ value: b, label: b === 'unknown' ? 'Not sure' : b }))} />
          <TextField label="Private notes" hint={`${(m.notes ?? '').length}/500 · visible only to your household`} value={m.notes ?? ''} onChange={(v) => set({ notes: v.slice(0, 500) })} multiline maxLength={500} />
        </FormSection>
      ) : null}
    </View>
  );
}
