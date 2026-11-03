import { router } from 'expo-router';
import { ChatText, Phone, UserPlus } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { MemberAvatar } from '@/components/member-avatar';
import { QuickAddChip } from '@/components/quick-add-chip';
import { AppText } from '@/components/text';
import { memberStatuses, smsBody, smsUrl, STATUS_LABEL, type DisplayStatus } from '@/domain/checkins';
import { displayName } from '@/domain/members';
import { useMe } from '@/hooks/use-me';
import { useNow } from '@/hooks/use-now';
import type { CheckInStatus } from '@/models/types';
import { checkIn } from '@/services/checkins';
import { useCurrentSession } from '@/stores/emergency-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { NotRunning } from './not-running';
import { EmergencyTopBar } from './top-bar';

/** EM-07 Family status (§12.7, §19.7). */
export function FamilyStatus() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(15_000);
  const session = useCurrentSession();
  const snapshot = useSession((s) => s.snapshot);
  const online = useSession((s) => s.online);
  const { me, setMe } = useMe();
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState('');
  const [forMember, setForMember] = useState<string | null>(null);
  const [whoAmI, setWhoAmI] = useState(false);
  const statuses = useMemo(() => (snapshot && session ? memberStatuses(snapshot.members, session, snapshot.checkIns, now) : []), [snapshot, session, now]);
  if (!session || !snapshot) return <NotRunning />;

  const colorFor = (s: DisplayStatus) =>
    s === 'safe' ? t.colors.statusSafe : s === 'need-help' ? t.colors.severityCritical : s === 'on-my-way' ? t.colors.severityStandard : s === 'no-response' ? t.colors.severityImportant : t.colors.statusStale;

  const report = async (status: CheckInStatus, memberId = me?.id, msg?: string) => {
    if (!memberId || !me) return;
    await checkIn({ sessionId: session.id, memberId, status, reportedBy: me.id, message: msg });
  };

  const sms = (status: CheckInStatus) => {
    const numbers = snapshot.members.filter((m) => m.id !== me?.id && m.phone).map((m) => m.phone!) ;
    Linking.openURL(smsUrl(numbers, smsBody(status, message || undefined), Platform.OS === 'ios' ? 'ios' : 'android')).catch(() => {});
  };

  const accountHolders = snapshot.members.filter((m) => m.linkedUserId);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <EmergencyTopBar onBack={() => router.back()} />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        <Pressable accessibilityRole="button" onPress={() => setWhoAmI(true)}>
          <AppText variant="callout" secondary>
            You are {me ? displayName(me) : 'not set'} · change
          </AppText>
        </Pressable>
        <Button label="I'm safe" variant="safe" size="emergency" onPress={() => report('safe')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="On my way" variant="primary" fullWidth={false} style={{ flex: 1 }} size="emergency" onPress={() => report('on-my-way')} />
          <Button label="I need help" variant="critical" fullWidth={false} style={{ flex: 1 }} size="emergency" onPress={() => setHelp(true)} />
        </View>
        {online === false ? (
          <Card>
            <View style={{ gap: t.space.xs }}>
              <AppText variant="callout">Will send when connected. Text messages often work when data doesn't.</AppText>
              <Button label="Send by text message" icon={ChatText} variant="secondary" onPress={() => sms('safe')} />
            </View>
          </Card>
        ) : (
          <Button label="Send by text message" icon={ChatText} variant="ghost" onPress={() => sms('safe')} />
        )}

        {accountHolders.length === 0 ? (
          <EmptyState icon={UserPlus} message="Invite your household so you can see who's safe." action={{ label: 'Invite', onPress: () => router.push('/(tabs)/household/invite') }} />
        ) : null}

        {statuses.map((st) => {
          const m = snapshot.members.find((x) => x.id === st.memberId)!;
          const reporter = st.reportedBy && st.reportedBy !== st.memberId ? snapshot.members.find((x) => x.id === st.reportedBy) : null;
          const color = colorFor(st.status);
          return (
            <Card key={st.memberId}>
              <View style={styles.row}>
                <MemberAvatar name={displayName(m)} size={48} dependent={!m.linkedUserId} />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="headline">{displayName(m)}</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: color, borderRadius: t.radius.chip, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <AppText variant="caption" weight="700" color={t.colors.surfaceBase}>
                        {STATUS_LABEL[st.status].toUpperCase()}
                      </AppText>
                    </View>
                    {st.at ? (
                      <AppText variant="footnote" secondary>
                        {new Date(st.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </AppText>
                    ) : null}
                  </View>
                  {st.message ? <AppText variant="callout">{st.message}</AppText> : null}
                  {reporter ? (
                    <AppText variant="footnote" secondary>
                      Reported by {displayName(reporter)}
                    </AppText>
                  ) : null}
                </View>
                {m.phone && m.id !== me?.id ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Call ${displayName(m)}`} onPress={() => Linking.openURL(`tel:${m.phone!.replace(/[^\d+]/g, '')}`).catch(() => {})} style={styles.call}>
                    <Phone size={24} color={t.colors.brandPrimary} weight="bold" />
                  </Pressable>
                ) : null}
              </View>
              {!m.linkedUserId || m.id !== me?.id ? (
                <Button label={`Set status for ${displayName(m)}`} variant="ghost" onPress={() => setForMember(m.id)} />
              ) : null}
            </Card>
          );
        })}
        <AppText variant="footnote" secondary>
          “No response” means no check-in yet. It does not mean someone is unsafe.
        </AppText>
      </ScrollView>

      <BottomSheet visible={help} onClose={() => setHelp(false)} title="I need help">
        <Call911Bar />
        <TextInput
          accessibilityLabel="Short message to your household"
          placeholder="Optional: e.g. Stuck at work, roads flooded"
          placeholderTextColor={t.colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          style={{ minHeight: 52, borderWidth: 1, borderColor: t.colors.borderDefault, borderRadius: t.radius.button, paddingHorizontal: 12, color: t.colors.textPrimary, fontSize: t.type.callout.fontSize }}
        />
        <Button
          label="Tell my household"
          variant="critical"
          onPress={async () => {
            await report('need-help', me?.id, message);
            setHelp(false);
          }}
        />
        <Button label="Send by text message" variant="secondary" onPress={() => sms('need-help')} />
      </BottomSheet>

      <BottomSheet visible={!!forMember} onClose={() => setForMember(null)} title={`Status for ${forMember ? displayName(snapshot.members.find((m) => m.id === forMember)!) : ''}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['safe', 'on-my-way', 'need-help'] as CheckInStatus[]).map((s) => (
            <QuickAddChip
              key={s}
              label={STATUS_LABEL[s]}
              onPress={async () => {
                await report(s, forMember!, me && s === 'safe' ? `With ${displayName(me)}` : undefined);
                setForMember(null);
              }}
            />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={whoAmI} onClose={() => setWhoAmI(false)} title="Who is using this phone?">
        {snapshot.members
          .filter((m) => m.role !== 'infant' && m.role !== 'child')
          .map((m) => (
            <Button
              key={m.id}
              label={displayName(m)}
              variant={me?.id === m.id ? 'primary' : 'secondary'}
              onPress={async () => {
                await setMe(m.id);
                setWhoAmI(false);
              }}
            />
          ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  call: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
