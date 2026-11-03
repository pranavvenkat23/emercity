import { router } from 'expo-router';
import { HouseLine, UsersThree } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { isValidInviteCode, normalizeInviteCode } from '@/domain/account-rules';
import { newMemberFromChip } from '@/domain/onboarding';
import { useMe } from '@/hooks/use-me';
import { KV_ACCOUNT_ADULT } from '@/services/cloud-sync';
import { joinHousehold, linkMember, lookupInvite, type InviteInfo } from '@/services/invites';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

type Phase = { kind: 'choose' } | { kind: 'code' } | { kind: 'confirm'; invite: InviteInfo } | { kind: 'who'; invite: InviteInfo };

/** ONB-03 Create or join a household (§5.3, §19.2). */
export function CreateOrJoin({ code: initialCode }: { code?: string }) {
  const t = useTheme();
  const mode = useSession((s) => s.mode);
  const db = useSession((s) => s.db);
  const online = useSession((s) => s.online);
  const adopt = useSession((s) => s.adoptHousehold);
  const save = useSession((s) => s.save);
  const snapshot = useSession((s) => s.snapshot);
  const user = useSession((s) => s.user);
  const { setMe } = useMe();
  const [phase, setPhase] = useState<Phase>(initialCode ? { kind: 'code' } : { kind: 'choose' });
  const [code, setCode] = useState(initialCode ? normalizeInviteCode(initialCode).slice(0, 8) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adult, setAdult] = useState<boolean | null>(null);

  useEffect(() => {
    db?.kv.get(KV_ACCOUNT_ADULT).then((v) => setAdult(v === null ? null : v === '1'));
  }, [db]);

  const canCreate = mode !== 'account' || adult !== false;

  const find = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await lookupInvite(normalizeInviteCode(code));
      if (r === 'not-found') setError('That code didn’t match a household. Check it with the person who sent it.');
      else if (r === 'expired') setError('That invite has expired. Ask for a new code.');
      else setPhase({ kind: 'confirm', invite: r });
    } catch {
      setError(online === false ? 'Joining needs a connection.' : 'Couldn’t check the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const join = async (invite: InviteInfo) => {
    setBusy(true);
    setError(null);
    try {
      await joinHousehold(normalizeInviteCode(code), invite, adult !== false);
      // Onboarding finishes on ONB-12; until then the setup screens stay mounted.
      await adopt(invite.householdId, { onboardingDone: false });
      setPhase({ kind: 'who', invite });
    } catch {
      setError('Couldn’t join. The code may have been turned off. Ask for a new one.');
    } finally {
      setBusy(false);
    }
  };

  const pick = async (memberId: string | 'new', invite: InviteInfo) => {
    setBusy(true);
    try {
      const snap = useSession.getState().snapshot;
      if (memberId === 'new') {
        const m = newMemberFromChip(adult === false ? 'teen' : 'adult', 1, { id: newId(), householdId: invite.householdId }, new Date());
        const saved = await save('members', { ...m, firstName: user?.email?.split('@')[0] ?? 'Me', linkedUserId: user?.uid ?? null });
        await setMe(saved.id);
      } else {
        const m = snap?.members.find((x) => x.id === memberId);
        if (m) await linkMember(invite.householdId, m);
        await setMe(memberId);
      }
      // Joiners skip the people and health steps (§5.3).
      router.replace('/permissions');
    } finally {
      setBusy(false);
    }
  };

  if (phase.kind === 'confirm') {
    const inv = phase.invite;
    return (
      <SetupFrame stage="Account" title={`Join ${inv.householdName}?`} subtitle={inv.inviterFirstName ? `${inv.inviterFirstName} invited you.` : undefined} primary={{ label: 'Join', onPress: () => join(inv), loading: busy }} skip={{ label: 'Not now', onPress: () => setPhase({ kind: 'code' }) }}>
        <AppText variant="body">You’ll see the plan, priorities and countdowns, and get alerts for this home.{adult === false ? ' You’ll join with Teen permissions.' : ''}</AppText>
        {error ? <AppText variant="callout" color={t.colors.severityCritical} accessibilityRole="alert">{error}</AppText> : null}
      </SetupFrame>
    );
  }

  if (phase.kind === 'who') {
    const inv = phase.invite;
    const unlinked = (snapshot?.members ?? []).filter((m) => !m.archived && !m.linkedUserId);
    const suggested = inv.forMemberId ? unlinked.find((m) => m.id === inv.forMemberId) : undefined;
    return (
      <SetupFrame stage="Account" title="Which one is you?" subtitle="This links your account to your place in the plan." back={false}>
        {(suggested ? [suggested, ...unlinked.filter((m) => m.id !== suggested.id)] : unlinked).map((m) => (
          <Button key={m.id} label={`I’m ${m.firstName}`} variant={m.id === suggested?.id ? 'primary' : 'secondary'} loading={busy} onPress={() => pick(m.id, inv)} />
        ))}
        {adult !== false ? <Button label="I’m not listed. Add me" variant="ghost" onPress={() => pick('new', inv)} /> : <AppText variant="footnote" secondary>Not listed? Ask an adult in the household to add you.</AppText>}
      </SetupFrame>
    );
  }

  return (
    <SetupFrame stage="Account" title="Your household" subtitle="Set up a new plan, or join one someone shared with you." back={false}>
      {canCreate ? (
        <Card onPress={() => router.push('/address')} accessibilityLabel="Create a new household. Set up your home's plan.">
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 72 }}>
            <HouseLine size={36} color={t.colors.brandAccent} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="headline">Create a new household</AppText>
              <AppText variant="subhead" secondary>
                Set up your home’s plan
              </AppText>
            </View>
          </View>
        </Card>
      ) : (
        <AppText variant="body" secondary>
          Households are created by an adult (18+). Join with the code someone in your home shares with you.
        </AppText>
      )}
      <Card onPress={() => setPhase({ kind: 'code' })} accessibilityLabel="Join a household. Someone already invited you.">
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 72 }}>
          <UsersThree size={36} color={t.colors.brandAccent} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline">Join a household</AppText>
            <AppText variant="subhead" secondary>
              Someone already invited you
            </AppText>
          </View>
        </View>
      </Card>
      {phase.kind === 'code' ? (
        mode === 'account' ? (
          <View style={{ gap: t.space.sm }}>
            <AppText variant="subhead">Invite code</AppText>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(normalizeInviteCode(v).slice(0, 8))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="8 characters"
              placeholderTextColor={t.colors.textSecondary}
              accessibilityLabel="Invite code"
              style={{ minHeight: 56, fontSize: 24, letterSpacing: 4, color: t.colors.textPrimary, borderWidth: 1, borderColor: t.colors.borderDefault, borderRadius: t.radius.button, backgroundColor: t.colors.surfaceCard, paddingHorizontal: 16 }}
            />
            <Button label="Find household" disabled={!isValidInviteCode(code)} loading={busy} onPress={find} />
            {error ? <AppText variant="callout" color={t.colors.severityCritical} accessibilityRole="alert">{error}</AppText> : null}
          </View>
        ) : (
          <AppText variant="body">Joining needs an account. Go back and sign in first, then use your code.</AppText>
        )
      ) : null}
    </SetupFrame>
  );
}
