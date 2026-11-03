import { router } from 'expo-router';
import { BookOpen, CheckCircle, IdentificationCard, LightningSlash, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CriticalBar } from '@/components/critical-bar';
import { CriticalFlash, FlashlightTool } from '@/components/flashlight';
import { MemberAvatar } from '@/components/member-avatar';
import { PowerOutSheet } from '@/components/power-out-sheet';
import { SeverityPill } from '@/components/severity';
import { AppText } from '@/components/text';
import { isActive } from '@/domain/alerts';
import { memberStatuses, STATUS_LABEL } from '@/domain/checkins';
import { formatDuration } from '@/domain/freshness';
import { subjectProgress } from '@/domain/playbook';
import { useCountdowns } from '@/hooks/use-countdowns';
import { useHousehold } from '@/hooks/use-household';
import { useNow } from '@/hooks/use-now';
import { usePlaybook } from '@/hooks/use-playbook';
import { haptic } from '@/services/haptics';
import { useConditions } from '@/stores/conditions-store';
import { setStepStatus, stepStatusMap, useCurrentSession } from '@/stores/emergency-store';
import { useOutage } from '@/stores/outage-store';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { NotRunning } from './not-running';
import { EmergencyTopBar } from './top-bar';

const POWER_HAZARDS = new Set(['outage', 'winter', 'hurricane']);
const ROUTE_HAZARDS = new Set(['flood', 'fire', 'hazmat', 'hurricane']);

/** EM-02 Emergency home, the hub (§12.3). */
export function EmergencyHub() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const session = useCurrentSession();
  const { steps, priorities } = usePlaybook(session);
  const { snapshot, subjects } = useHousehold();
  const alerts = useConditions((s) => s.alerts);
  const outage = useOutage((s) => s.current);
  const { countdowns } = useCountdowns();
  const [powerSheet, setPowerSheet] = useState(false);
  const hapticDone = useRef(false);
  const status = stepStatusMap(session);

  const nextIndex = steps.findIndex((s) => !status[s.id]);
  const next = nextIndex >= 0 ? steps[nextIndex] : null;
  const alert = session?.alertId ? alerts?.value.find((a) => a.id === session.alertId && isActive(a, now)) : null;
  const statuses = useMemo(
    () => (snapshot && session ? memberStatuses(snapshot.members, session, snapshot.checkIns, now) : []),
    [snapshot, session, now],
  );
  const runningCountdowns = countdowns.filter((c) => c.remainingMs != null).slice(0, 2);

  // §2.2: one strong haptic the first time a Critical item is shown in Emergency Mode.
  const hasCritical = next?.tier === 'critical' || priorities?.order.some((p) => p.tier === 'critical');
  useEffect(() => {
    if (hasCritical && !hapticDone.current) {
      hapticDone.current = true;
      haptic.warning();
    }
  }, [hasCritical]);

  if (!session || !snapshot) return <NotRunning />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <CriticalFlash trigger={!!hasCritical} />
      <EmergencyTopBar showStepList />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        {alert ? (
          <Card style={{ borderColor: t.colors.severityCritical, borderWidth: 1.5 }} onPress={() => router.push({ pathname: '/alert/[alertId]', params: { alertId: alert.id } })} accessibilityLabel={`${alert.event}, until ${new Date(alert.expires).toLocaleTimeString()}. Official instructions`}>
            <AppText variant="headline">{alert.isDemo ? 'DEMO · ' : ''}{alert.event}</AppText>
            <AppText variant="subhead" secondary>
              Until {new Date(alert.expires).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · Official instructions
            </AppText>
          </Card>
        ) : null}

        {next ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Next step, ${nextIndex + 1} of ${steps.length}. ${next.instruction}. Open step`}
            onPress={() => router.push({ pathname: '/emergency/steps', params: { stepId: next.id } })}
            style={[
              styles.next,
              {
                borderRadius: t.radius.card,
                padding: t.space.lg,
                backgroundColor: next.tier === 'critical' ? blend(t.colors.severityCritical, t.colors.surfaceCard, 0.12) : t.colors.surfaceCard,
                borderColor: t.colors.borderDefault,
              },
            ]}>
            <CriticalBar tier={next.tier} />
            <AppText variant="footnote" secondary>
              Next · Step {nextIndex + 1} of {steps.length}
            </AppText>
            <SeverityPill tier={next.tier} />
            <AppText variant="title1" style={{ fontSize: 28, lineHeight: 34 }}>
              {next.instruction}
            </AppText>
            {next.assigneeId ? (
              <AppText variant="callout" secondary>
                {subjects.get(next.assigneeId)?.name ?? ''} is on this
              </AppText>
            ) : null}
            <Button
              label="Done"
              size="emergency"
              variant={next.tier === 'critical' ? 'critical' : 'primary'}
              onPress={() => {
                setStepStatus(session.id, next.id, 'done');
                haptic.success();
              }}
            />
            <Button label="Skip" variant="ghost" onPress={() => setStepStatus(session.id, next.id, 'skipped')} />
          </Pressable>
        ) : (
          <Card style={{ alignItems: 'center', gap: t.space.sm }}>
            <CheckCircle size={48} color={t.colors.statusSafe} weight="fill" />
            <AppText variant="title2" align="center">
              All steps done
            </AppText>
            <Button label="End Emergency Mode" size="emergency" onPress={() => router.push('/emergency/end')} />
          </Card>
        )}

        <Card onPress={() => router.push('/emergency/priorities')} accessibilityLabel="Who first. Open priority order">
          <View style={{ gap: t.space.sm }}>
            <AppText variant="headline">Who first</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.md, paddingTop: 6 }}>
              {(priorities?.order ?? []).map((p) => {
                const s = subjects.get(p.subjectId);
                if (!s) return null;
                const prog = subjectProgress(steps, status, p.subjectId);
                const done = prog.total > 0 && prog.done === prog.total;
                return (
                  <View key={p.subjectId} style={{ alignItems: 'center', gap: 4, width: 76 }} accessible accessibilityLabel={`Rank ${p.rank}, ${s.name}${done ? ', steps done' : ''}`}>
                    <View>
                      <MemberAvatar name={s.name} kind={s.kind} tier={p.tier} rank={p.rank} size={56} />
                      {done ? (
                        <View style={{ position: 'absolute', right: -4, bottom: -4 }}>
                          <CheckCircle size={24} color={t.colors.statusSafe} weight="fill" />
                        </View>
                      ) : null}
                    </View>
                    <AppText variant="footnote" align="center">
                      {s.name}
                    </AppText>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Card>

        <Card onPress={() => router.push('/emergency/family')} accessibilityLabel="Family status. Open">
          <View style={{ gap: t.space.sm }}>
            <AppText variant="headline">Family status</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
              {statuses.map((st) => {
                const s = subjects.get(st.memberId);
                const color =
                  st.status === 'safe' ? t.colors.statusSafe : st.status === 'need-help' ? t.colors.severityCritical : st.status === 'on-my-way' ? t.colors.severityStandard : st.status === 'no-response' ? t.colors.severityImportant : t.colors.statusStale;
                return (
                  <View key={st.memberId} style={{ alignItems: 'center', width: 70, gap: 2 }}>
                    <View style={{ borderWidth: 3, borderColor: color, borderRadius: 26 }}>
                      <MemberAvatar name={s?.name ?? ''} size={44} />
                    </View>
                    <AppText variant="caption" align="center">
                      {STATUS_LABEL[st.status]}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {(POWER_HAZARDS.has(session.hazard) || outage) && runningCountdowns.length ? (
          <Card onPress={() => router.push('/emergency/countdowns')} accessibilityLabel="Countdowns. Open all">
            <View style={{ gap: t.space.sm }}>
              <AppText variant="headline">{outage ? 'Countdowns' : 'If power goes out'}</AppText>
              {runningCountdowns.map((c) => (
                <View key={c.id} style={styles.countRow}>
                  <AppText variant="callout" style={{ flex: 1 }}>
                    {c.name}
                  </AppText>
                  <AppText variant="title2" weight="700" tabular color={c.tier === 'critical' ? t.colors.severityCritical : t.colors.textPrimary}>
                    {formatDuration(c.remainingMs!)}
                  </AppText>
                </View>
              ))}
              <AppText variant="footnote" secondary>
                Estimates. Confirm with your pharmacist or device supplier.
              </AppText>
            </View>
          </Card>
        ) : null}

        {ROUTE_HAZARDS.has(session.hazard) ? <Button label="Where to go" icon={MapPin} size="emergency" variant="secondary" onPress={() => router.push('/emergency/shelter')} /> : null}

        <View style={[styles.tools, { borderColor: t.colors.borderDefault, borderRadius: t.radius.card }]}>
          <FlashlightTool />
          {!outage ? (
            <Tool label="Power is out" onPress={() => setPowerSheet(true)}>
              <LightningSlash size={30} color={t.colors.hazardOutage} weight="bold" />
            </Tool>
          ) : null}
          <Tool label="My card" onPress={() => router.push('/emergency/card')}>
            <IdentificationCard size={30} color={t.colors.textPrimary} weight="bold" />
          </Tool>
          <Tool label="Guides" onPress={() => router.push('/guides')}>
            <BookOpen size={30} color={t.colors.textPrimary} weight="bold" />
          </Tool>
        </View>

        <AppText variant="footnote" secondary>
          Steps follow public guidance (Ready.gov, CDC, NWS, Red Cross) and have not yet been reviewed by a local expert. Always follow official orders and call 911 in an emergency.
        </AppText>
      </ScrollView>
      <PowerOutSheet visible={powerSheet} onClose={() => setPowerSheet(false)} openSteps={false} />
    </View>
  );
}

function Tool({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 4, minWidth: 72, minHeight: 72, justifyContent: 'center' }}>
      {children}
      <AppText variant="caption">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  next: { gap: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  tools: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
});
