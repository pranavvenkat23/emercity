import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect } from '@/components/form';
import { MemberAvatar } from '@/components/member-avatar';
import { QuickAddChip } from '@/components/quick-add-chip';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { newMemberFromChip, newPetFromChip, PERSON_CHIPS, PET_CHIPS, type PersonChip } from '@/domain/onboarding';
import { useMe } from '@/hooks/use-me';
import type { Member, MemberRole, Pet, PetSpecies } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const YOU_BANDS: { value: MemberRole; label: string }[] = [
  { value: 'adult', label: 'Adult' },
  { value: 'older-adult', label: 'Older adult (65+)' },
  { value: 'teen', label: 'Teen (13–17)' },
];
const baseOf = (label: string) => label.replace(/\s*\(.*\)\s*$/, '');

/** ONB-05 Who lives here (§5.5). */
export function PeopleStep() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const user = useSession((s) => s.user);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const [undo, setUndo] = useState<{ kind: 'members'; rec: Member } | { kind: 'pets'; rec: Pet } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingYou = useRef(false);

  const { me, setMe } = useMe();
  const members = (snapshot?.members ?? []).filter((m) => !m.archived);
  const pets = snapshot?.pets ?? [];
  // "You" is tracked by id (renaming yourself on the next screen must not lose it).
  const you = me && members.some((m) => m.id === me.id) ? me : undefined;

  // The "You" card is there from the start (§5.5 item 3).
  useEffect(() => {
    if (!snapshot || you || members.length || creatingYou.current) return;
    creatingYou.current = true;
    const m = newMemberFromChip('adult', 1, { id: newId(), householdId: snapshot.household.id }, new Date());
    save('members', { ...m, firstName: 'You', linkedUserId: user?.uid ?? null })
      .then((saved) => setMe(saved.id))
      .finally(() => (creatingYou.current = false));
  }, [snapshot, you, members.length, user, save, setMe]);

  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);
  if (!snapshot) return null;
  const hid = snapshot.household.id;
  const now = new Date();

  const countFor = (label: string, list: { firstName?: string; name?: string }[]) => list.filter((x) => (x.firstName ?? x.name ?? '').startsWith(`${baseOf(label)} `)).length;

  const addPerson = (chip: PersonChip) => {
    const def = PERSON_CHIPS.find((c) => c.id === chip)!;
    save('members', newMemberFromChip(chip, countFor(def.label, members) + 1, { id: newId(), householdId: hid }, now));
  };
  const addPet = (species: PetSpecies) => {
    const def = PET_CHIPS.find((c) => c.id === species)!;
    save('pets', newPetFromChip(species, countFor(def.label, pets) + 1, { id: newId(), householdId: hid }, now));
  };
  const removeWithUndo = async (u: NonNullable<typeof undo>) => {
    await remove(u.kind, u.rec.id);
    setUndo(u);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  return (
    <SetupFrame
      stage="People"
      title="Who lives here?"
      subtitle="Tap everyone in your home, including you. You can add details next."
      notice={undo ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: t.radius.card, backgroundColor: t.colors.surfaceSunken }}>
          <AppText variant="body" style={{ flex: 1 }}>
            Removed {undo.kind === 'members' ? undo.rec.firstName : undo.rec.name}
          </AppText>
          <Button
            label="Undo"
            variant="ghost"
            onPress={async () => {
              const u = undo;
              setUndo(null);
              if (u.kind === 'members') await save('members', { ...u.rec, deletedAt: null } as Member);
              else await save('pets', { ...u.rec, deletedAt: null } as Pet);
            }}
          />
        </View>
      ) : null}
      primary={{ label: 'Next: add details', onPress: () => router.push({ pathname: '/details', params: { i: '0' } }), disabled: members.length === 0 }}>
      {you ? (
        <Card>
          <View style={{ gap: 8 }}>
            <AppText variant="headline">You</AppText>
            <ChipSelect label="Age" value={you.role} onChange={(role) => save('members', { ...you, role }, ['role'])} options={YOU_BANDS} />
          </View>
        </Card>
      ) : null}

      <AppText variant="headline">People</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PERSON_CHIPS.map((c) => {
          const n = countFor(c.label, members);
          return <QuickAddChip key={c.id} label={c.label} count={n} onPress={() => addPerson(c.id)} />;
        })}
      </View>
      <AppText variant="headline">Pets</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PET_CHIPS.map((c) => {
          const n = countFor(c.label, pets);
          return <QuickAddChip key={c.id} label={c.label} count={n} onPress={() => addPet(c.id)} />;
        })}
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="subhead" secondary>
          Your household · tap to remove
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
          {members.map((m) => (
            <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Remove ${m.firstName}`} disabled={m.id === you?.id} onPress={() => removeWithUndo({ kind: 'members', rec: m })} style={{ alignItems: 'center', gap: 4, width: 72 }}>
              <MemberAvatar name={m.firstName} size={52} />
              <AppText variant="caption" align="center" numberOfLines={2}>
                {m.firstName}
              </AppText>
            </Pressable>
          ))}
          {pets.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} onPress={() => removeWithUndo({ kind: 'pets', rec: p })} style={{ alignItems: 'center', gap: 4, width: 72 }}>
              <MemberAvatar name={p.name} size={52} kind="pet" />
              <AppText variant="caption" align="center" numberOfLines={2}>
                {p.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </SetupFrame>
  );
}
