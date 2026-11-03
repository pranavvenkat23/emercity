import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ArrowSquareOut, Trash } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect, FormSection, SwitchRow } from '@/components/form';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { HAZARD_LABEL, HAZARD_TAB_ORDER } from '@/domain/hazards';
import { displayName } from '@/domain/members';
import { KV_OFFLINE_PACKAGE } from '@/hooks/use-readiness';
import type { Hazard, HouseholdRole } from '@/models/types';
import { DATA_SOURCES, MISSING_SOURCES } from '@/reference/data-sources';
import { flushQueue } from '@/services/cloud-sync';
import { openSource } from '@/services/links';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const header = (title: string) => <AppBar title={title} back showAvatar={false} sheet />;

/** SET-08 Data sources and credits (§22, §9.1 honesty rule). */
export function DataSources() {
  const t = useTheme();
  const groups = ['National', 'Loudoun County', 'Map', 'Reference'] as const;
  return (
    <Screen header={header('Data sources')}>
      <AppText variant="body" secondary>
        Everything Emercity shows comes from these public sources. Each value in the app is labeled with its source and when it was checked.
      </AppText>
      {groups.map((g) => (
        <View key={g} style={{ gap: t.space.xs }}>
          <SectionHeader title={g === 'Reference' ? 'Safety references' : g} />
          <Card padded={false}>
            {DATA_SOURCES.filter((d) => d.coverage === g).map((d, i) => (
              <Pressable key={d.name + d.use} accessibilityRole="link" onPress={() => openSource(d.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: t.space.md, borderTopWidth: i ? 1 : 0, borderColor: t.colors.borderDefault, minHeight: 56 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="headline">{d.name}</AppText>
                  <AppText variant="footnote" secondary>
                    {d.use}
                    {d.live ? ' · live' : ''}
                  </AppText>
                </View>
                <ArrowSquareOut size={18} color={t.colors.textSecondary} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
      <SectionHeader title="Not available yet" />
      {MISSING_SOURCES.map((m) => (
        <AppText key={m} variant="body">
          • {m}
        </AppText>
      ))}
    </Screen>
  );
}

/** SET-07 Offline data and storage (§21). */
export function OfflineData() {
  const db = useSession((s) => s.db);
  const pending = useSession((s) => s.pendingSync);
  const lastSaved = useSession((s) => s.lastSavedAt);
  const [mapSaved, setMapSaved] = useState<string | null>(null);
  useEffect(() => {
    db?.kv.get(KV_OFFLINE_PACKAGE).then(setMapSaved);
  }, [db]);
  return (
    <Screen header={header('Offline data')}>
      <Card>
        <View style={{ gap: 8 }}>
          <AppText variant="headline">Always on this phone</AppText>
          <AppText variant="body">Your household plan, priority order, countdown rules, emergency steps and all guides. They work with no signal.</AppText>
          <AppText variant="footnote" secondary>
            Stored encrypted. Last saved {lastSaved ? new Date(lastSaved).toLocaleString() : 'not yet'}.
          </AppText>
        </View>
      </Card>
      <Card>
        <View style={{ gap: 8 }}>
          <AppText variant="headline">Map</AppText>
          <AppText variant="body">{mapSaved ? `Map within 10 miles of home saved ${new Date(mapSaved).toLocaleDateString()}.` : 'The map isn’t saved for offline yet.'}</AppText>
          <Button label="Open the map to save it" variant="secondary" onPress={() => router.push('/(tabs)/map')} />
        </View>
      </Card>
      <Card>
        <View style={{ gap: 8 }}>
          <AppText variant="headline">Waiting to sync</AppText>
          <AppText variant="body">{pending ? `${pending} change${pending === 1 ? '' : 's'} will sync when you’re online.` : 'Everything is synced.'}</AppText>
          {pending ? <Button label="Sync now" variant="secondary" onPress={() => flushQueue().catch(() => {})} /> : null}
        </View>
      </Card>
      <AppText variant="footnote" secondary>
        Live data (alerts, river gauges, shelters, weather) needs a connection. When offline, the app shows the last saved values and says how old they are.
      </AppText>
    </Screen>
  );
}

/** Emergency preferences (§22.1 item 6). */
export function EmergencyPrefs() {
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  if (!snapshot) return null;
  const h = snapshot.household;
  return (
    <Screen header={header('Emergency preferences')}>
      <FormSection>
        <ChipSelect<Hazard | 'auto'>
          label="Emergency button opens on"
          value={h.defaultHazard ?? 'auto'}
          onChange={(v) => save('households', { ...h, defaultHazard: v === 'auto' ? null : v }, ['defaultHazard'])}
          options={[{ value: 'auto', label: 'Top risk (automatic)' }, ...HAZARD_TAB_ORDER.map((x) => ({ value: x, label: HAZARD_LABEL[x] }))]}
        />
        <SwitchRow
          label="Rural home or long driveway"
          hint="Raises winter storm risk: roads take longer to clear."
          value={!!h.ruralOrLongDriveway}
          onChange={(v) => save('households', { ...h, ruralOrLongDriveway: v }, ['ruralOrLongDriveway'])}
        />
      </FormSection>
      <AppText variant="footnote" secondary>
        The screen always stays awake in Emergency Mode. Countdowns start only when someone says the power is out.
      </AppText>
    </Screen>
  );
}

/** SET-06 Privacy and data (§22.3). */
export function Privacy() {
  const snapshot = useSession((s) => s.snapshot);
  const mode = useSession((s) => s.mode);
  const exit = useSession((s) => s.exitToWelcome);
  const [busy, setBusy] = useState(false);
  if (!snapshot) return null;

  const exportPlan = async () => {
    setBusy(true);
    try {
      const file = new File(Paths.cache, `emercity-plan-${new Date().toISOString().slice(0, 10)}.json`);
      file.write(JSON.stringify({ exportedAt: new Date().toISOString(), ...snapshot }, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your plan' });
    } catch {
      Alert.alert('Couldn’t export', 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={header('Privacy and data')}>
      <Card>
        <View style={{ gap: 8 }}>
          <AppText variant="headline">What Emercity keeps</AppText>
          <AppText variant="body">Your household plan: people, health needs, medicines, devices, pets, contacts and supplies. It’s encrypted on this phone.</AppText>
          <AppText variant="body">{mode === 'account' ? 'It syncs only to people you invite to this household.' : 'It stays on this phone.'}</AppText>
          <AppText variant="body">Never sold, never used for ads, never shared with insurers or employers. Health details are never put in notifications, links or logs.</AppText>
          <AppText variant="body">Your address is sent to public map services (Census, FEMA, NOAA, USGS, EPA, Loudoun County) to check risks, without your name or health details.</AppText>
        </View>
      </Card>
      <Button label="Export my plan (JSON)" variant="secondary" loading={busy} onPress={exportPlan} />
      <AppText variant="footnote" secondary>
        The export contains health details. Share it only with people you trust.
      </AppText>
      <Button
        label={mode === 'demo' ? 'Leave demo and delete its data' : mode === 'account' ? 'Sign out and remove this phone’s copy' : 'Delete this household from this phone'}
        icon={Trash}
        variant="ghost"
        onPress={() =>
          Alert.alert('Remove from this phone?', mode === 'account' ? 'Your household stays in your account. Sign in again to bring it back.' : 'This can’t be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => exit() },
          ])
        }
      />
      {mode === 'account' ? (
        <AppText variant="footnote" secondary>
          Deleting your account or the whole household from the cloud isn’t available in the app yet. Contact the household owner or the developer.
        </AppText>
      ) : null}
    </Screen>
  );
}

const ROLE_LABEL: Record<HouseholdRole, string> = { owner: 'Owner', adult: 'Adult', teen: 'Teen' };

/** SET-02 Account and household members (§19.1–19.3). */
export function AccountHousehold() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const user = useSession((s) => s.user);
  const mode = useSession((s) => s.mode);
  const save = useSession((s) => s.save);
  if (!snapshot) return null;
  const h = snapshot.household;
  const myRole = user ? h.roles[user.uid] : undefined;
  const isOwner = myRole === 'owner';
  const people = Object.entries(h.roles).map(([uid, role]) => ({ uid, role, member: snapshot.members.find((m) => m.linkedUserId === uid) }));

  const setRole = (uid: string, role: HouseholdRole | null) => {
    const roles = { ...h.roles };
    if (role) roles[uid] = role;
    else delete roles[uid];
    return save('households', { ...h, roles }, ['roles']);
  };

  return (
    <Screen header={header('Account and household')}>
      <Card>
        <View style={{ gap: 4 }}>
          <AppText variant="headline">{mode === 'account' ? user?.email : mode === 'demo' ? 'Demo household' : 'This phone only'}</AppText>
          <AppText variant="subhead" secondary>
            {h.name}
            {myRole ? ` · ${ROLE_LABEL[myRole]}` : ''}
          </AppText>
          <AppText variant="footnote" secondary>
            {[h.address.line1, h.address.city, h.address.state].filter(Boolean).join(', ')}
          </AppText>
        </View>
      </Card>
      {mode === 'account' ? (
        <>
          <SectionHeader title="People with access" />
          <Card padded={false}>
            {people.map((p, i) => (
              <View key={p.uid} style={{ padding: t.space.md, gap: 6, borderTopWidth: i ? 1 : 0, borderColor: t.colors.borderDefault }}>
                <AppText variant="headline">
                  {p.member ? displayName(p.member) : 'Member'}
                  {p.uid === user?.uid ? ' (you)' : ''}
                </AppText>
                {isOwner && p.uid !== user?.uid && p.role !== 'owner' ? (
                  <View style={{ gap: 6 }}>
                    <ChipSelect<HouseholdRole>
                      label="Role"
                      value={p.role}
                      onChange={(r) => setRole(p.uid, r)}
                      options={[
                        { value: 'adult', label: 'Adult' },
                        { value: 'teen', label: 'Teen' },
                      ]}
                    />
                    <Button
                      label="Remove access"
                      variant="ghost"
                      onPress={() =>
                        Alert.alert('Remove their access?', 'They’ll stop seeing this household. Their person stays in the plan.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => setRole(p.uid, null) },
                        ])
                      }
                    />
                  </View>
                ) : (
                  <AppText variant="subhead" secondary>
                    {ROLE_LABEL[p.role]}
                  </AppText>
                )}
              </View>
            ))}
          </Card>
          {myRole !== 'teen' ? <Button label="Invite someone" variant="secondary" onPress={() => router.push('/(tabs)/household/invite')} /> : null}
          {!isOwner ? (
            <Button
              label="Leave this household"
              variant="ghost"
              onPress={() =>
                Alert.alert('Leave this household?', 'You’ll lose access on all your phones until someone invites you again.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                      if (user) await setRole(user.uid, null);
                      await flushQueue().catch(() => {});
                      await useSession.getState().exitToWelcome();
                    },
                  },
                ])
              }
            />
          ) : null}
        </>
      ) : (
        <AppText variant="body" secondary>
          Sign in to share this household with the people you live with.
        </AppText>
      )}
    </Screen>
  );
}
