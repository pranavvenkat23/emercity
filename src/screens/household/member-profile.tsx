import { router } from 'expo-router';
import { Car, DeviceMobile, PencilSimple, Person, Plug, Plus, Snowflake, Translate } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { HazardRankStrip } from '@/components/hazard-rank-strip';
import { CONDITION_ICON, CONDITION_LABEL } from '@/components/icons';
import { MemberAvatar } from '@/components/member-avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { deviceBackup } from '@/domain/device-backup';
import { AGE_BAND_LABEL, ageBand, ageInYears, displayName, needsHelpEvacuating } from '@/domain/members';
import { useTopTiers } from '@/hooks/use-priorities';
import { LANGUAGE_NAME } from '@/i18n/languages';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** HH-02 Member profile (§7.2). */
export function MemberProfile({ id }: { id: string }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const tiers = useTopTiers();
  const m = snapshot?.members.find((x) => x.id === id);
  if (!snapshot || !m) {
    return (
      <Screen header={<AppBar title="Person" back />}>
        <EmptyState icon={Person} message="This person is no longer in your household." />
      </Screen>
    );
  }
  const now = new Date();
  const age = ageInYears(m.birthDate, now);
  const band = ageBand(m, now);
  const meds = snapshot.medications.filter((x) => x.ownerType === 'member' && x.ownerId === m.id);
  const devices = snapshot.devices.filter((d) => d.memberId === m.id);
  const doctor = snapshot.contacts.find((c) => c.id === m.doctorContactId);
  const tasks = snapshot.tasks.filter((x) => x.assignedMemberId === m.id || x.linkedSubjectId === m.id);
  const edit = () => router.push({ pathname: '/(tabs)/household/member/edit/[id]', params: { id: m.id } });

  const section = (title: string, children: React.ReactNode, onEdit?: () => void) => (
    <>
      <SectionHeader title={title} action={onEdit ? <Button label="Edit" variant="ghost" fullWidth={false} icon={PencilSimple} onPress={onEdit} /> : undefined} />
      <Card>{children}</Card>
    </>
  );

  return (
    <Screen header={<AppBar title={displayName(m)} back />}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <MemberAvatar name={displayName(m)} size={96} tier={tiers.get(m.id)} />
        <AppText variant="title1" align="center">
          {m.firstName}
          {m.lastName ? ` ${m.lastName}` : ''}
        </AppText>
        <AppText variant="subhead" secondary align="center">
          {[m.nickname ? `“${m.nickname}”` : null, age != null ? `${age} years` : null, AGE_BAND_LABEL[band], m.linkedUserId ? 'On the app' : 'Dependent'].filter(Boolean).join(' · ')}
        </AppText>
        <View style={styles.badges}>
          <Badge icon={<Translate size={16} color={t.colors.textSecondary} />} label={LANGUAGE_NAME[m.primaryLanguage]} />
          {m.canDrive ? <Badge icon={<Car size={16} color={t.colors.textSecondary} />} label="Can drive" /> : null}
          {needsHelpEvacuating(m, now) ? <Badge icon={<Person size={16} color={t.colors.severityUrgent} />} label="Needs help evacuating" /> : null}
          {m.linkedUserId ? <Badge icon={<DeviceMobile size={16} color={t.colors.textSecondary} />} label="Joined" /> : null}
        </View>
      </View>

      <SectionHeader title="Priority by emergency" />
      <HazardRankStrip subjectId={m.id} />

      {section(
        'Health and needs',
        <View style={{ gap: t.space.sm }}>
          {m.conditions.length === 0 ? (
            <AppText variant="body" secondary>
              No health needs listed.
            </AppText>
          ) : (
            <View style={styles.chips}>
              {m.conditions.map((c) => {
                const IconCmp = CONDITION_ICON[c.type];
                return (
                  <View key={c.type} style={[styles.chip, { backgroundColor: t.colors.surfaceSunken, borderRadius: t.radius.chip }]}>
                    {IconCmp ? <IconCmp size={16} color={t.colors.textPrimary} /> : null}
                    <AppText variant="subhead">
                      {CONDITION_LABEL[c.type]}
                      {c.severity === 'severe' ? ' · severe' : ''}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
          <AppText variant="subhead">
            <AppText variant="subhead" weight="600">
              Allergies:{' '}
            </AppText>
            {m.allergies.length ? m.allergies.join(', ') : 'None listed'}
          </AppText>
          <AppText variant="subhead">
            <AppText variant="subhead" weight="600">
              Blood type:{' '}
            </AppText>
            {m.bloodType && m.bloodType !== 'unknown' ? m.bloodType : 'Not set'}
          </AppText>
        </View>,
        edit,
      )}

      <SectionHeader title="Medications" />
      <Card padded={false}>
        {meds.map((med, i) => (
          <Row
            key={med.id}
            divider={i > 0}
            title={med.brandName}
            subtitle={[med.strength, med.dose && med.frequency ? `${med.dose}, ${med.frequency}` : null, med.daysOfSupply != null ? `${med.daysOfSupply} days of supply` : null].filter(Boolean).join(' · ')}
            right={med.needsRefrigeration ? <Snowflake size={18} color={t.colors.hazardWinter} weight="bold" /> : null}
            onPress={() => router.push({ pathname: '/(tabs)/household/medication/[id]', params: { id: med.id } })}
          />
        ))}
        <Row divider={meds.length > 0} title="Add medication" icon={<Plus size={18} color={t.colors.brandPrimary} weight="bold" />} onPress={() => router.push({ pathname: '/(tabs)/household/add-medication', params: { ownerId: m.id } })} link />
      </Card>

      <SectionHeader title="Devices" />
      <Card padded={false}>
        {devices.map((d, i) => {
          const b = deviceBackup(d, snapshot.household);
          return (
            <Row
              key={d.id}
              divider={i > 0}
              title={d.label ?? d.type}
              subtitle={`${b.totalMinutes ? `About ${Math.floor(b.totalMinutes / 60)} h ${b.totalMinutes % 60} m of backup` : 'Backup not entered'}${d.lifeSustaining ? ' · life-sustaining' : ''}`}
              icon={<Plug size={18} color={t.colors.textSecondary} />}
              onPress={() => router.push({ pathname: '/(tabs)/household/device/[id]', params: { id: d.id } })}
            />
          );
        })}
        <Row divider={devices.length > 0} title="Add medical equipment" icon={<Plus size={18} color={t.colors.brandPrimary} weight="bold" />} onPress={() => router.push({ pathname: '/(tabs)/household/device/[id]', params: { id: 'new', memberId: m.id } })} link />
      </Card>

      {section(
        'Contacts',
        <AppText variant="body" secondary={!doctor}>
          {doctor ? `Doctor: ${doctor.name} · ${doctor.phone}` : 'No doctor linked. Add one in Contacts.'}
        </AppText>,
        () => router.push('/(tabs)/household/contacts'),
      )}

      {section(
        'Tasks',
        <View style={{ gap: 4 }}>
          {tasks.length === 0 ? (
            <AppText variant="body" secondary>
              No roles assigned yet. Set helpers in Plan, then Priority order, then Edit roles.
            </AppText>
          ) : (
            tasks.map((x) => (
              <AppText key={x.id} variant="body">
                • {x.title}
              </AppText>
            ))
          )}
        </View>,
      )}

      {section('Notes', <AppText variant="body" secondary={!m.notes}>{m.notes || 'No notes.'}</AppText>, edit)}

      <Button label="Edit details" icon={PencilSimple} onPress={edit} />
    </Screen>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: t.colors.surfaceSunken, borderRadius: t.radius.chip }]}>
      {icon}
      <AppText variant="footnote">{label}</AppText>
    </View>
  );
}

function Row({ title, subtitle, icon, right, onPress, divider, link }: { title: string; subtitle?: string; icon?: React.ReactNode; right?: React.ReactNode; onPress: () => void; divider?: boolean; link?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { padding: t.space.md, borderTopWidth: divider ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' },
      ]}>
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline" color={link ? t.colors.brandPrimary : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" secondary>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
