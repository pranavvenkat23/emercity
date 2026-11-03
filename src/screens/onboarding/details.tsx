import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { roleFromBirthDate } from '@/domain/members';
import { useHouseholdActions } from '@/hooks/use-household-actions';
import { draftFromMember, MemberForm, type MemberDraft } from '@/screens/household/member-form';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** ONB-06 Member details, one card per person (§5.6). */
export function DetailsStep({ index }: { index: number }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const { saveMemberWithHealth } = useHouseholdActions();
  const members = (snapshot?.members ?? []).filter((m) => !m.archived);
  const member = members[index];
  const [draft, setDraft] = useState<MemberDraft | null>(() => (member && snapshot ? draftFromMember(member, snapshot.devices) : null));
  const [saving, setSaving] = useState(false);
  if (!snapshot || !member || !draft) return null;
  const last = index >= members.length - 1;
  const after = snapshot.pets.length ? 'pets' : 'medications';

  const next = async () => {
    setSaving(true);
    try {
      const m = { ...draft.member, firstName: draft.member.firstName.trim(), role: roleFromBirthDate(draft.member, new Date()) };
      await saveMemberWithHealth(m, snapshot.devices.filter((d) => d.memberId === m.id), draft.selected, draft.follow);
      if (!last) router.push({ pathname: '/details', params: { i: String(index + 1) } });
      else router.push(snapshot.pets.length ? '/pets' : '/health');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SetupFrame
      stage="People"
      title={member.firstName === 'You' ? 'About you' : `About ${member.firstName}`}
      subtitle="Health needs decide who needs help first. Pick everything that applies."
      primary={{ label: last ? `Next: ${after}` : 'Next person', onPress: next, disabled: !draft.member.firstName.trim(), loading: saving }}>
      <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }} accessibilityLabel={`Person ${index + 1} of ${members.length}`}>
        {members.map((m, i) => (
          <View key={m.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === index ? t.colors.brandAccent : t.colors.borderDefault }} />
        ))}
      </View>
      <AppText variant="footnote" secondary align="center">
        Person {index + 1} of {members.length}
      </AppText>
      <MemberForm draft={draft} onChange={setDraft} compact />
    </SetupFrame>
  );
}
