import { router } from 'expo-router';
import { CheckCircle, CircleDashed, Phone } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TierIcon } from '@/components/severity';
import { StepCard } from '@/components/step-card';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { DRILL_BY_TYPE, drillResult, formatClock, formatDuration } from '@/domain/drills';
import { generatePlaybook, insertFallback } from '@/domain/playbook';
import { useHousehold } from '@/hooks/use-household';
import { useMe } from '@/hooks/use-me';
import { useNow } from '@/hooks/use-now';
import { usePriorities } from '@/hooks/use-priorities';
import type { Drill } from '@/models/types';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** Bright yellow banner on every drill screen so nobody mistakes it for a real emergency (§15.2). */
function PracticeBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Dark text: the banner is bright yellow in both themes.
  useStatusBarStyle('dark');
  return (
    <View accessibilityRole="header" accessibilityLabel="Practice drill. This is not a real emergency." style={{ backgroundColor: t.colors.practice, paddingTop: insets.top + 6, paddingBottom: 8, alignItems: 'center' }}>
      <AppText variant="headline" weight="800" color={t.colors.onPractice} style={{ letterSpacing: 2 }}>
        PRACTICE
      </AppText>
    </View>
  );
}

/** PLAN-07 Drill in progress / PLAN-08 results (§15.2–15.3). */
export function DrillRun({ id }: { id: string }) {
  const snapshot = useSession((s) => s.snapshot);
  const drill = snapshot?.drills.find((d) => d.id === id);
  if (!drill || !snapshot) return null;
  return drill.endedAt ? <DrillResults drill={drill} /> : <DrillInProgress drill={drill} />;
}

function DrillInProgress({ drill }: { drill: Drill }) {
  const t = useTheme();
  const save = useSession((s) => s.save);
  const { snapshot, subjects } = useHousehold();
  const { me } = useMe();
  const priorities = usePriorities(drill.hazard);
  const meta = DRILL_BY_TYPE[drill.type];
  const now = useNow(1000);
  const started = new Date(drill.startedAt!).getTime();
  const [arrivals, setArrivals] = useState(drill.arrivals);
  const [status, setStatus] = useState<Record<string, 'done' | 'skipped' | 'blocked'>>({});
  const [fallbacks, setFallbacks] = useState<string[]>([]);
  const [practice911, setPractice911] = useState(false);

  const steps = useMemo(() => {
    if (!snapshot || !priorities) return [];
    let list = generatePlaybook(snapshot, drill.hazard, { priorities, evacuationOrdered: !!meta.evacuation, outageActive: drill.type === 'outage' });
    for (const fb of fallbacks) {
      const owner = list.find((s) => s.fallback?.id === fb);
      if (owner) list = insertFallback(list, owner.id);
    }
    return list;
  }, [snapshot, priorities, drill.hazard, drill.type, meta.evacuation, fallbacks]);
  if (!snapshot || !priorities) return null;
  const step = steps.find((s) => !status[s.id]);
  const idx = step ? steps.indexOf(step) : steps.length;
  const elapsed = now.getTime() - started;

  const arrive = (subjectId: string, subjectType: 'member' | 'pet') =>
    setArrivals((a) => (a.some((x) => x.subjectId === subjectId) ? a.filter((x) => x.subjectId !== subjectId) : [...a, { subjectId, subjectType, elapsedMs: Date.now() - started }]));

  const mark = (st: 'done' | 'skipped' | 'blocked') => {
    if (!step) return;
    setStatus({ ...status, [step.id]: st });
    if (st === 'blocked' && step.fallback) setFallbacks([...fallbacks, step.fallback.id]);
  };

  const stop = () =>
    save('drills', {
      ...drill,
      endedAt: new Date().toISOString(),
      arrivals,
      skippedStepIds: Object.keys(status).filter((k) => status[k] === 'skipped'),
      blockedStepIds: Object.keys(status).filter((k) => status[k] === 'blocked'),
    });

  const meArrived = me ? arrivals.some((a) => a.subjectId === me.id) : false;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <PracticeBanner />
      <Screen header={null}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="subhead" secondary>
            {meta.title}
          </AppText>
          <AppText variant="display" tabular accessibilityLabel={`Elapsed ${formatDuration(elapsed)}`}>
            {formatClock(elapsed)}
          </AppText>
        </View>

        {me ? <Button label={meArrived ? `${meta.arrivedLabel} ✓` : meta.arrivedLabel} variant={meArrived ? 'secondary' : 'safe'} size="emergency" onPress={() => arrive(me.id, 'member')} /> : null}

        <Card padded={false}>
          <AppText variant="headline" style={{ padding: t.space.md, paddingBottom: 4 }}>
            Check off as they arrive
          </AppText>
          {priorities.order.map((o) => {
            const a = arrivals.find((x) => x.subjectId === o.subjectId);
            return (
              <Pressable key={o.subjectId} accessibilityRole="checkbox" accessibilityState={{ checked: !!a }} onPress={() => arrive(o.subjectId, o.subjectType)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: t.space.md }}>
                {a ? <CheckCircle size={26} color={t.colors.statusSafe} weight="fill" /> : <CircleDashed size={26} color={t.colors.textSecondary} />}
                <TierIcon tier={o.tier} size={16} />
                <AppText variant="body" style={{ flex: 1 }}>
                  {subjects.get(o.subjectId)?.name ?? 'Someone'}
                </AppText>
                {a ? (
                  <AppText variant="subhead" secondary tabular>
                    {formatClock(a.elapsedMs)}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        {step ? (
          <StepCard
            stepNumber={idx + 1}
            totalSteps={steps.length}
            instruction={step.instruction}
            tier={step.tier}
            assignee={step.assigneeId ? subjects.get(step.assigneeId)?.name : null}
            onDone={() => mark('done')}
            onSkip={() => mark('skipped')}
            onCantDo={() => mark('blocked')}
          />
        ) : (
          <AppText variant="body" secondary>
            All steps covered.
          </AppText>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Practice: would call 911. Does not call."
          onPress={() => setPractice911(true)}
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: t.radius.button, borderWidth: 2, borderStyle: 'dashed', borderColor: t.colors.borderDefault }}>
          <Phone size={22} color={t.colors.textSecondary} />
          <AppText variant="headline" secondary>
            {practice911 ? 'Practice: you would call 911 now' : 'Practice: would call 911'}
          </AppText>
        </Pressable>
        <Button label="Stop drill" variant="secondary" size="emergency" onPress={stop} />
      </Screen>
    </View>
  );
}

function DrillResults({ drill }: { drill: Drill }) {
  const t = useTheme();
  const save = useSession((s) => s.save);
  const { snapshot, subjects } = useHousehold();
  const priorities = usePriorities(drill.hazard);
  if (!snapshot || !priorities) return null;
  const meta = DRILL_BY_TYPE[drill.type];
  const r = drillResult(drill, snapshot.drills, priorities.order, snapshot);
  const max = Math.max(1, ...r.arrivals.map((a) => a.elapsedMs ?? 0));
  const steps = generatePlaybook(snapshot, drill.hazard, { priorities, evacuationOrdered: !!meta.evacuation });
  const blocked = steps.filter((s) => drill.blockedStepIds.includes(s.id) || drill.skippedStepIds.includes(s.id));

  const again = async () => {
    const nowIso = new Date().toISOString();
    const d: Drill = { ...drill, id: newId(), createdAt: nowIso, updatedAt: nowIso, startedAt: nowIso, endedAt: null, arrivals: [], skippedStepIds: [], blockedStepIds: [] };
    await save('drills', d);
    router.replace({ pathname: '/(tabs)/plan/drill/[id]', params: { id: d.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <PracticeBanner />
      <Screen header={null}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <AppText variant="subhead" secondary>
            {meta.title} done
          </AppText>
          <AppText variant="display" tabular>
            {formatDuration(r.totalMs)}
          </AppText>
          {r.deltaMs != null ? (
            <AppText variant="headline" color={r.deltaMs <= 0 ? t.colors.statusSafe : t.colors.textPrimary}>
              {r.deltaMs <= 0 ? `${formatDuration(-r.deltaMs)} faster` : `${formatDuration(r.deltaMs)} slower`} than last time
            </AppText>
          ) : (
            <AppText variant="subhead" secondary>
              Your first {meta.title.toLowerCase()}
            </AppText>
          )}
        </View>

        <Card>
          <View style={{ gap: t.space.sm }}>
            {r.arrivals.map((a) => {
              const name = subjects.get(a.subjectId)?.name ?? 'Someone';
              return (
                <View key={a.subjectId} style={{ gap: 4 }} accessible accessibilityLabel={`${name}: ${a.elapsedMs == null ? 'not checked in' : formatClock(a.elapsedMs)}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TierIcon tier={a.tier} size={16} />
                    <AppText variant="subhead" weight={a.tier === 'critical' ? '700' : undefined} style={{ flex: 1 }}>
                      {a.tier === 'critical' && a.elapsedMs != null ? `${name} reached the ${drill.type === 'fire-escape' ? 'meeting point' : 'end'} at ${formatClock(a.elapsedMs)}` : name}
                    </AppText>
                    <AppText variant="subhead" secondary tabular>
                      {a.elapsedMs == null ? 'Not checked in' : formatClock(a.elapsedMs)}
                    </AppText>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceSunken }}>
                    {a.elapsedMs != null ? <View style={{ width: `${(a.elapsedMs / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: a.tier === 'critical' ? t.colors.severityCritical : t.colors.brandAccent }} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {blocked.length ? (
          <Card>
            <View style={{ gap: t.space.sm }}>
              <AppText variant="headline">Skipped or couldn’t do</AppText>
              {blocked.map((s) => (
                <View key={s.id} style={{ gap: 2 }}>
                  <AppText variant="body">{s.instruction}</AppText>
                  {s.fallback ? (
                    <AppText variant="subhead" secondary>
                      Try: {s.fallback.instruction}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {r.tips.map((tip) => (
          <AppText key={tip} variant="body">
            • {tip}
          </AppText>
        ))}

        <Button label="Save" size="emergency" onPress={() => router.dismissTo('/(tabs)/plan/drills')} />
        <Button label="Practice again" variant="secondary" onPress={again} />
        <Button label="Edit roles" variant="ghost" onPress={() => router.push({ pathname: '/(tabs)/plan/roles', params: { hazard: drill.hazard } })} />
      </Screen>
    </View>
  );
}
