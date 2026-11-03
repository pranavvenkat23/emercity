import { router, type Href } from 'expo-router';
import { DeviceMobile, Globe, PawPrint, Phone, Plug, Plus, Snowflake, UserPlus, Users } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { CONDITION_ICON } from '@/components/icons';
import { MemberAvatar } from '@/components/member-avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { deviceBackup } from '@/domain/device-backup';
import { AGE_BAND_LABEL, ageBand, ageInYears, displayName } from '@/domain/members';
import { useHousehold } from '@/hooks/use-household';
import { useTopTiers } from '@/hooks/use-priorities';
import { useTheme } from '@/theme/theme';

import { CONTACT_TYPE_LABEL } from './contacts';

/** HH-01 Household overview (§7.1). */
export function HouseholdOverview() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { snapshot, isDemo } = useHousehold();
  const tiers = useTopTiers();
  const [addSheet, setAddSheet] = useState(false);
  const now = new Date();
  const members = useMemo(
    () => [...(snapshot?.members ?? [])].sort((a, b) => (ageInYears(b.birthDate, now) ?? 0) - (ageInYears(a.birthDate, now) ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot],
  );
  if (!snapshot) return null;
  const { pets, medications, devices, contacts } = snapshot;
  const colWidth = width >= 768 ? '31.5%' : '48%';
  const ownerName = (ownerId: string) => {
    const m = snapshot.members.find((x) => x.id === ownerId);
    return m ? displayName(m) : pets.find((p) => p.id === ownerId)?.name ?? 'Unknown';
  };
  const adultsNotJoined = snapshot.members.filter((m) => (m.role === 'adult' || m.role === 'older-adult' || m.role === 'teen') && !m.linkedUserId).length;
  const incomplete = (m: (typeof members)[number]) => !m.birthDate || /^(Adult|Older adult|Teen|Child|Toddler|Baby|Pregnant person) \d+$/.test(m.firstName);

  const summary = [
    `${members.length} ${members.length === 1 ? 'person' : 'people'}`,
    `${pets.length} ${pets.length === 1 ? 'pet' : 'pets'}`,
    `${medications.length} ${medications.length === 1 ? 'medication' : 'medications'}`,
    `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`,
  ];

  const go = (href: Href) => {
    setAddSheet(false);
    router.push(href);
  };

  const plus = (
    <Pressable accessibilityRole="button" accessibilityLabel="Add to household" onPress={() => setAddSheet(true)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Plus size={26} color={t.scheme === 'light' ? t.colors.onBrandPrimary : t.colors.textPrimary} weight="bold" />
    </Pressable>
  );

  return (
    <Screen header={<AppBar title="Household" subtitle={snapshot.household.name} badge={isDemo ? 'DEMO' : undefined} right={plus} />}>
      <View style={styles.wrap}>
        {summary.map((s) => (
          <View key={s} style={[styles.pill, { backgroundColor: t.colors.surfaceSunken, borderRadius: t.radius.chip }]}>
            <AppText variant="footnote" weight="600">
              {s}
            </AppText>
          </View>
        ))}
      </View>

      <SectionHeader title="People" />
      {members.length <= 1 ? (
        <EmptyState icon={Users} message="Add everyone who lives here so Emercity can plan for them." action={{ label: 'Add people and pets', onPress: () => setAddSheet(true) }} />
      ) : null}
      <View style={styles.grid}>
        {members.map((m) => {
          const band = ageBand(m, now);
          const icons = m.conditions
            .map((c) => CONDITION_ICON[c.type])
            .filter((x): x is NonNullable<typeof x> => !!x)
            .slice(0, 3);
          const missing = incomplete(m);
          return (
            <Card
              key={m.id}
              style={{ width: colWidth, gap: 8 }}
              onPress={() => router.push({ pathname: '/(tabs)/household/member/[id]', params: { id: m.id } })}
              accessibilityLabel={`${displayName(m)}, ${AGE_BAND_LABEL[band]}, ${m.linkedUserId ? 'has joined the app' : 'dependent'}${missing ? ', details missing' : ''}`}>
              <View style={styles.cardTop}>
                <MemberAvatar name={displayName(m)} size={52} tier={tiers.get(m.id)} dependent={!m.linkedUserId} />
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {missing ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.severityImportant }} /> : null}
                  {m.linkedUserId ? <DeviceMobile size={18} color={t.colors.textSecondary} /> : null}
                </View>
              </View>
              <AppText variant="headline">{displayName(m)}</AppText>
              <AppText variant="footnote" secondary>
                {AGE_BAND_LABEL[band]} · {m.linkedUserId ? 'On the app' : 'Dependent'}
              </AppText>
              <View style={styles.iconRow}>
                {icons.map((IconCmp, i) => (
                  <IconCmp key={i} size={20} color={t.colors.textSecondary} />
                ))}
              </View>
            </Card>
          );
        })}
      </View>

      {pets.length > 0 ? (
        <>
          <SectionHeader title="Pets" />
          <View style={styles.grid}>
            {pets.map((p) => (
              <Card
                key={p.id}
                style={{ width: colWidth, gap: 8 }}
                onPress={() => router.push({ pathname: '/(tabs)/household/pet/[id]', params: { id: p.id } })}
                accessibilityLabel={`${p.name}, ${p.size} ${p.species}`}>
                <MemberAvatar name={p.name} kind="pet" size={52} tier={tiers.get(p.id)} />
                <AppText variant="headline">{p.name}</AppText>
                <AppText variant="footnote" secondary>
                  {cap(p.species)} · {cap(p.size)}
                </AppText>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Medications" />
      <Card padded={false}>
        {medications.length === 0 ? (
          <View style={{ padding: t.space.md, gap: t.space.sm }}>
            <AppText variant="body" secondary>
              Add medicines that matter in an emergency, especially ones that need the fridge.
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Scan a box" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => router.push('/(tabs)/household/scan')} />
              <Button label="Type it" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => router.push('/(tabs)/household/add-medication')} />
            </View>
          </View>
        ) : (
          medications.map((med, i) => (
            <Pressable
              key={med.id}
              accessibilityRole="button"
              accessibilityLabel={`${med.brandName}, ${med.strength ?? ''}, for ${ownerName(med.ownerId)}${med.needsRefrigeration ? ', needs refrigeration' : ''}${med.isCritical ? ', critical' : ''}${med.daysOfSupply != null ? `, ${med.daysOfSupply} days of supply` : ''}`}
              onPress={() => router.push({ pathname: '/(tabs)/household/medication/[id]', params: { id: med.id } })}
              style={({ pressed }) => [styles.listRow, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline">{med.brandName}</AppText>
                <AppText variant="footnote" secondary>
                  {ownerName(med.ownerId)} · {med.strength || 'strength not set'}
                  {med.daysOfSupply != null ? ` · ${med.daysOfSupply} days of supply` : ''}
                </AppText>
              </View>
              {med.needsRefrigeration ? <Snowflake size={20} color={t.colors.hazardWinter} weight="bold" /> : null}
              {med.isCritical ? <Pill label="CRITICAL" /> : null}
            </Pressable>
          ))
        )}
      </Card>

      <SectionHeader title="Devices" />
      <Card padded={false}>
        {devices.length === 0 ? (
          <View style={{ padding: t.space.md, gap: t.space.sm }}>
            <AppText variant="body" secondary>
              Does anyone use medical equipment that needs power?
            </AppText>
            <Button label="Add equipment" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/household/device/[id]', params: { id: 'new' } })} />
          </View>
        ) : (
          devices.map((d, i) => {
            const b = deviceBackup(d, snapshot.household);
            const internal = b.stages.find((s) => s.kind === 'internal');
            const backup = b.totalMinutes - (internal?.minutes ?? 0);
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/(tabs)/household/device/[id]', params: { id: d.id } })}
                style={({ pressed }) => [styles.listRow, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' }]}>
                <Plug size={24} color={t.colors.textSecondary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="headline">{d.label ?? d.type}</AppText>
                  <AppText variant="footnote" secondary>
                    {ownerName(d.memberId)} · Battery {internal ? hours(internal.minutes) : 'not entered'} · Backup {backup > 0 ? hours(backup) : 'none listed'}
                  </AppText>
                </View>
                {d.lifeSustaining ? <Pill label="LIFE-SUSTAINING" /> : null}
              </Pressable>
            );
          })
        )}
      </Card>

      <SectionHeader title="Contacts" action={<Button label="Manage" variant="ghost" fullWidth={false} onPress={() => router.push('/(tabs)/household/contacts')} />} />
      <Card padded={false}>
        {contacts.length === 0 ? (
          <View style={{ padding: t.space.md }}>
            <AppText variant="body" secondary>
              Add emergency contacts, an out-of-area contact, and doctors.
            </AppText>
          </View>
        ) : (
          contacts.map((c, i) => (
            <View key={c.id} style={[styles.listRow, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault }]}>
              {c.isOutOfArea ? <Globe size={22} color={t.colors.brandAccent} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline">{c.name}</AppText>
                <AppText variant="footnote" secondary>
                  {CONTACT_TYPE_LABEL[c.type]} · {c.phone}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone.replace(/[^\d+]/g, '')}`).catch(() => {})} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={24} color={t.colors.brandPrimary} weight="bold" />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {adultsNotJoined > 0 ? (
        <Card onPress={() => router.push('/(tabs)/household/invite')} accessibilityLabel="Invite household members">
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <UserPlus size={28} color={t.colors.brandAccent} />
            <AppText variant="body" style={{ flex: 1 }}>
              {adultsNotJoined} {adultsNotJoined === 1 ? "person hasn't" : "people haven't"} joined yet. Invite them so everyone has the plan.
            </AppText>
          </View>
        </Card>
      ) : null}

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title="Add to household">
        <Button label="Person" icon={Users} variant="secondary" onPress={() => go({ pathname: '/(tabs)/household/member/edit/[id]', params: { id: 'new' } })} />
        <Button label="Pet" icon={PawPrint} variant="secondary" onPress={() => go({ pathname: '/(tabs)/household/pet/[id]', params: { id: 'new' } })} />
        <Button label="Medication" icon={Snowflake} variant="secondary" onPress={() => go('/(tabs)/household/add-medication')} />
        <Button label="Medical equipment" icon={Plug} variant="secondary" onPress={() => go({ pathname: '/(tabs)/household/device/[id]', params: { id: 'new' } })} />
        <Button label="Contact" icon={Phone} variant="secondary" onPress={() => go('/(tabs)/household/contacts')} />
      </BottomSheet>
    </Screen>
  );
}

function Pill({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.colors.severityCritical, borderRadius: t.radius.chip, paddingHorizontal: 8, paddingVertical: 2 }}>
      <AppText variant="caption" weight="700" color={t.colors.onCritical} style={{ letterSpacing: 0.5 }}>
        {label}
      </AppText>
    </View>
  );
}

function hours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconRow: { flexDirection: 'row', gap: 8, minHeight: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
});
