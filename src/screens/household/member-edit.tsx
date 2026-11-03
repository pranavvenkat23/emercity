import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { PriorityCard } from '@/components/priority-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { HAZARD_LABEL } from '@/domain/hazards';
import { displayName, roleFromBirthDate } from '@/domain/members';
import { removesLifeSustaining } from '@/domain/onboarding';
import { rankHousehold } from '@/domain/priority/engine';
import type { RankedSubject } from '@/domain/priority/types';
import { useHouseholdActions } from '@/hooks/use-household-actions';
import { usePriorityContext, useTopRiskHazard } from '@/hooks/use-priorities';
import { useHouseholdPaths } from '@/hooks/use-household-paths';
import type { Member } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { draftFromMember, MemberForm, type MemberDraft } from './member-form';

function blankMember(householdId: string): Member {
  const now = new Date().toISOString();
  return {
    id: newId(),
    householdId,
    createdAt: now,
    updatedAt: now,
    linkedUserId: null,
    firstName: '',
    birthDate: null,
    role: 'adult',
    conditions: [],
    medicationIds: [],
    deviceIds: [],
    allergies: [],
    primaryLanguage: 'en',
    canDrive: false,
  };
}

/** Role follows the birth date so it never contradicts the age band. */
/** HH-03 Edit member (§7.3). id === 'new' adds a person. */
export function MemberEdit({ id }: { id: string }) {
  const paths = useHouseholdPaths();
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const remove = useSession((s) => s.remove);
  const save = useSession((s) => s.save);
  const { saveMemberWithHealth } = useHouseholdActions();
  const ctx = usePriorityContext();
  const topRisk = useTopRiskHazard();
  const existing = snapshot?.members.find((m) => m.id === id);
  const [draft, setDraft] = useState<MemberDraft | null>(() =>
    snapshot ? draftFromMember(existing ?? blankMember(snapshot.household.id), snapshot.devices) : null,
  );
  const [changes, setChanges] = useState<{ before: RankedSubject[]; after: RankedSubject[] } | null>(null);
  const [saving, setSaving] = useState(false);
  if (!snapshot || !draft) return null;

  const original = existing ? draftFromMember(existing, snapshot.devices) : null;

  const commit = async () => {
    setSaving(true);
    try {
      const before = rankHousehold(snapshot, topRisk, ctx).order;
      const member = { ...draft.member, firstName: draft.member.firstName.trim(), role: roleFromBirthDate(draft.member, new Date()) };
      await saveMemberWithHealth(member, snapshot.devices.filter((d) => d.memberId === member.id), draft.selected, draft.follow);
      const next = useSession.getState().snapshot;
      const after = next ? rankHousehold(next, topRisk, ctx).order : before;
      setChanges({ before, after });
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => {
    if (!draft.member.firstName.trim()) return;
    const dropped = original ? removesLifeSustaining(original.selected, draft.selected) : [];
    if (dropped.length) {
      const what = dropped.map((d) => (d === 'oxygen' ? 'oxygen' : d === 'dialysis-home' ? 'home dialysis' : d === 'feeding-pump' ? 'the feeding pump' : 'the ventilator')).join(' and ');
      Alert.alert(`Remove ${what}?`, `Emercity will stop treating ${displayName(draft.member)} as critical in outages.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: commit },
      ]);
      return;
    }
    commit();
  };

  const name = (id: string) => {
    const m = useSession.getState().snapshot?.members.find((x) => x.id === id);
    if (m) return displayName(m);
    return snapshot.pets.find((p) => p.id === id)?.name ?? '';
  };

  return (
    <Screen header={<AppBar title={existing ? `Edit ${displayName(existing)}` : 'Add a person'} back showAvatar={false} />}>
      <MemberForm draft={draft} onChange={setDraft} />
      <Button label="Save" size="emergency" loading={saving} disabled={!draft.member.firstName.trim()} onPress={onSave} />
      {existing ? (
        <View style={{ gap: t.space.xs }}>
          <Button
            label="Archive (moved out)"
            variant="secondary"
            onPress={() =>
              Alert.alert('Archive this person?', 'They keep their history but are removed from plans and cards. You can restore them later.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Archive',
                  onPress: async () => {
                    await save('members', { ...existing, archived: true }, ['archived']);
                    paths.inSetup ? router.back() : router.dismissTo('/(tabs)/household');
                  },
                },
              ])
            }
          />
          <Button
            label="Remove from household"
            variant="ghost"
            onPress={() =>
              Alert.alert('Remove this person?', 'This removes them from your plan. It can be restored for 30 days.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    await remove('members', existing.id);
                    paths.inSetup ? router.back() : router.dismissTo('/(tabs)/household');
                  },
                },
              ])
            }
          />
        </View>
      ) : null}

      <BottomSheet
        visible={!!changes}
        onClose={() => {
          setChanges(null);
          router.back();
        }}
        title="Priorities updated"
        height="full">
        {changes ? (
          <View style={{ gap: t.space.md }}>
            <AppText variant="body" secondary>
              {HAZARD_LABEL[topRisk]} order, before and after your change.
            </AppText>
            {(['before', 'after'] as const).map((k) => (
              <View key={k} style={{ gap: t.space.xs }}>
                <AppText variant="headline">{k === 'before' ? 'Before' : 'After'}</AppText>
                {changes[k].map((s) => (
                  <PriorityCard key={s.subjectId} rank={s.rank} name={name(s.subjectId)} kind={s.subjectType === 'pet' ? 'pet' : 'person'} tier={s.tier} variant="compact" />
                ))}
              </View>
            ))}
            <Button
              label="Done"
              onPress={() => {
                setChanges(null);
                router.back();
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
