import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { Copy, ShareNetwork, UserPlus } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Platform, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ChipSelect } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { inviteCodeFromBytes } from '@/domain/account-rules';
import { ageBand, displayName } from '@/domain/members';
import { useMe } from '@/hooks/use-me';
import { publishInvite, revokeInvite } from '@/services/invites';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const WEEK_MS = 7 * 24 * 3600 * 1000;
const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** HH-10 Invite member (§7.8). */
export function Invite() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const mode = useSession((s) => s.mode);
  const save = useSession((s) => s.save);
  const online = useSession((s) => s.online);
  const { me } = useMe();
  const [forId, setForId] = useState<string>(snapshot?.household.inviteForMemberId ?? 'new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!snapshot) return null;
  const h = snapshot.household;
  const now = new Date();

  if (mode === 'demo' || mode === 'local') {
    return (
      <Screen header={<AppBar title="Invite" back />}>
        <EmptyState
          icon={UserPlus}
          title="Sign in to invite"
          message={mode === 'demo' ? 'The demo household stays on this phone and is never shared.' : 'This household is on this phone only. Create an account to share it.'}
        />
      </Screen>
    );
  }

  const eligible = snapshot.members.filter((m) => !m.archived && !m.linkedUserId && ['teen', 'adult', 'older-adult'].includes(ageBand(m, now)));
  const active = h.inviteCode && h.inviteExpiresAt && new Date(h.inviteExpiresAt) > now ? h.inviteCode : null;
  const link = active ? `emercity://invite/${active}` : '';

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = inviteCodeFromBytes(await Crypto.getRandomBytesAsync(8));
      const expiresAt = new Date(Date.now() + WEEK_MS);
      // "You" is the setup placeholder; it would read "You invited you" on the other phone.
      const inviter = me && me.firstName !== 'You' ? displayName(me) : '';
      // The invite must reach the cloud before the code can work, so this needs a connection.
      await publishInvite(code, { householdId: h.id, householdName: h.name, inviterFirstName: inviter, forMemberId: forId === 'new' ? null : forId, expiresAt });
      if (h.inviteCode) await revokeInvite(h.inviteCode);
      await save('households', { ...h, inviteCode: code, inviteExpiresAt: expiresAt.toISOString(), inviteForMemberId: forId === 'new' ? null : forId }, ['inviteCode', 'inviteExpiresAt', 'inviteForMemberId']);
    } catch {
      setError(online === false ? 'Creating an invite needs a connection.' : 'Couldn’t create the invite. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const revoke = () =>
    Alert.alert('Turn off this invite?', 'The code will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          if (h.inviteCode) await revokeInvite(h.inviteCode);
          await save('households', { ...h, inviteCode: null, inviteExpiresAt: null, inviteForMemberId: null }, ['inviteCode', 'inviteExpiresAt', 'inviteForMemberId']);
        },
      },
    ]);

  return (
    <Screen header={<AppBar title="Invite" back />}>
      <ChipSelect
        label="Who is this invite for?"
        value={forId}
        onChange={setForId}
        options={[...eligible.map((m) => ({ value: m.id, label: `${displayName(m)}${ageBand(m, now) === 'teen' ? ' (Teen)' : ''}` })), { value: 'new', label: 'Someone new' }]}
      />
      {active ? (
        <Card style={{ alignItems: 'center', gap: t.space.md }}>
          <AppText variant="display" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 2 }} accessibilityLabel={`Invite code ${[...active].join(' ')}`} selectable>
            {pretty(active)}
          </AppText>
          <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
            <QRCode value={link} size={180} ecl="M" />
          </View>
          <AppText variant="footnote" secondary>
            Expires {new Date(h.inviteExpiresAt!).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </AppText>
          <View style={{ flexDirection: 'row', gap: t.space.sm, alignSelf: 'stretch' }}>
            <Button style={{ flex: 1 }} label="Share link" icon={ShareNetwork} onPress={() => Share.share({ message: `Join our household plan on Emercity. Code: ${pretty(active)}\n${link}` })} />
            <Button style={{ flex: 1 }} label="Copy code" icon={Copy} variant="secondary" onPress={() => Clipboard.setStringAsync(active)} />
          </View>
        </Card>
      ) : (
        <Button label="Create invite code" icon={UserPlus} size="emergency" loading={busy} onPress={generate} />
      )}
      {active ? (
        <View style={{ gap: t.space.xs }}>
          <Button label="New code" variant="secondary" loading={busy} onPress={generate} />
          <Button label="Turn off invite" variant="ghost" onPress={revoke} />
        </View>
      ) : null}
      <AppText variant="footnote" secondary>
        Teens 13 to 17 join with Teen permissions: they see the plan and can check in, but can't change roles.
      </AppText>
      {error ? (
        <AppText variant="callout" color={t.colors.severityCritical} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
