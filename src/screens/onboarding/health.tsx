import { router } from 'expo-router';
import { Barcode, CheckCircle, PencilSimple, Warning } from 'phosphor-react-native';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { impliedItems } from '@/domain/onboarding';
import { HouseholdPathsContext, useHouseholdPaths } from '@/hooks/use-household-paths';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** ONB-08 Medications and devices (§5.8): what the chips implied, with Scan / Type it. */
export function HealthStep() {
  return (
    <HouseholdPathsContext.Provider value="/(onboarding)/hh">
      <HealthList />
    </HouseholdPathsContext.Provider>
  );
}

function HealthList() {
  const t = useTheme();
  const paths = useHouseholdPaths();
  const snapshot = useSession((s) => s.snapshot);
  if (!snapshot) return null;
  const members = snapshot.members.filter((m) => !m.archived);
  const items = impliedItems(members, snapshot.devices, snapshot.medications);
  const petMeds = snapshot.pets.filter((p) => p.takesMedication).map((p) => ({ pet: p, done: snapshot.medications.some((m) => m.ownerId === p.id) }));
  const nameOf = (id: string) => members.find((m) => m.id === id)?.firstName ?? '';
  const otherMeds = snapshot.medications.filter((m) => !items.some((i) => i.kind === 'medication' && i.memberId === m.ownerId && /insulin/i.test(`${m.genericName ?? ''} ${m.brandName}`)));
  const anything = items.length || petMeds.length;
  const openLifeSustaining = items.some((i) => i.lifeSustaining && !i.complete);

  return (
    <SetupFrame
      stage="Health"
      title="Medicines and devices"
      subtitle={anything ? 'Add details for what you picked. Battery times and storage rules drive your countdowns.' : 'Add any medicine someone can’t go without. You can always add more later.'}
      primary={{ label: 'Next: your risks', onPress: () => router.push('/risk') }}
      skip={anything ? { label: 'Add these later', onPress: () => router.push('/risk') } : undefined}>
      {items.map((i) => (
        <Card key={`${i.memberId}-${i.kind}-${i.deviceId ?? i.label}`}>
          <View style={{ gap: t.space.xs }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {i.complete ? <CheckCircle size={22} color={t.colors.statusSafe} weight="fill" /> : i.lifeSustaining ? <Warning size={22} color={t.colors.severityCritical} weight="fill" /> : null}
              <AppText variant="headline" style={{ flex: 1 }}>
                {nameOf(i.memberId)}: {i.label}
              </AppText>
            </View>
            <AppText variant="subhead" secondary>
              {i.complete ? 'Details added' : i.kind === 'device' ? 'Add battery and backup times' : 'Add your insulin'}
              {i.lifeSustaining && !i.complete ? ' · Critical' : ''}
            </AppText>
            {i.kind === 'device' && i.deviceId ? (
              <Button label={i.complete ? 'Edit details' : 'Add details'} icon={PencilSimple} variant="secondary" onPress={() => router.push(paths.device(i.deviceId!))} />
            ) : i.kind === 'medication' ? (
              <View style={{ flexDirection: 'row', gap: t.space.sm }}>
                <Button style={{ flex: 1 }} label="Scan box" icon={Barcode} variant="secondary" onPress={() => router.push(paths.scan(i.memberId))} />
                <Button style={{ flex: 1 }} label="Type it" icon={PencilSimple} variant="secondary" onPress={() => router.push(paths.addMedication(i.memberId))} />
              </View>
            ) : null}
          </View>
        </Card>
      ))}
      {petMeds.map(({ pet, done }) => (
        <Card key={pet.id}>
          <View style={{ gap: t.space.xs }}>
            <AppText variant="headline">
              {pet.name}: medication {done ? '✓' : ''}
            </AppText>
            <View style={{ flexDirection: 'row', gap: t.space.sm }}>
              <Button style={{ flex: 1 }} label="Scan box" icon={Barcode} variant="secondary" onPress={() => router.push(paths.scan(pet.id))} />
              <Button style={{ flex: 1 }} label="Type it" icon={PencilSimple} variant="secondary" onPress={() => router.push(paths.addMedication(pet.id))} />
            </View>
          </View>
        </Card>
      ))}
      {otherMeds.length ? (
        <AppText variant="body">
          Added: {otherMeds.map((m) => m.brandName).join(', ')}
        </AppText>
      ) : null}
      <Card>
        <View style={{ gap: t.space.xs }}>
          <AppText variant="headline">Another medicine</AppText>
          <View style={{ flexDirection: 'row', gap: t.space.sm }}>
            <Button style={{ flex: 1 }} label="Scan box" icon={Barcode} variant="secondary" onPress={() => router.push(paths.scan(members[0]?.id))} />
            <Button style={{ flex: 1 }} label="Type it" icon={PencilSimple} variant="secondary" onPress={() => router.push(paths.addMedication(members[0]?.id))} />
          </View>
        </View>
      </Card>
      {openLifeSustaining ? (
        <AppText variant="footnote" secondary>
          Skipped life-sustaining items stay on Home as Critical tasks until you add them.
        </AppText>
      ) : null}
    </SetupFrame>
  );
}
