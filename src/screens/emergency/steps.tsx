import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { CheckCircle, Prohibit, SkipForward } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { StepCard } from '@/components/step-card';
import { AppText } from '@/components/text';
import { displayName } from '@/domain/members';
import { useHousehold } from '@/hooks/use-household';
import { usePlaybook } from '@/hooks/use-playbook';
import { GUIDES_BY_ID } from '@/reference/guides';
import { haptic } from '@/services/haptics';
import { useA11y } from '@/stores/a11y-store';
import { addFallback, reassignStep, setStepStatus, stepStatusMap, useCurrentSession, type StepStatus } from '@/stores/emergency-store';
import { useTheme } from '@/theme/theme';

import { Call911Bar } from './call-911';
import { NotRunning } from './not-running';
import { StepEmbed } from './step-embed';
import { EmergencyTopBar } from './top-bar';

/** EM-03 Step-by-step playbook (§12.4). Also used by drills (practice). */
export function PlaybookSteps({ startStepId, openList, subjectFilter }: { startStepId?: string; openList?: boolean; subjectFilter?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const session = useCurrentSession();
  const { steps: all } = usePlaybook(session);
  const { snapshot, subjects } = useHousehold();
  const steps = useMemo(() => (subjectFilter ? all.filter((s) => s.subjectId === subjectFilter) : all), [all, subjectFilter]);
  const status = stepStatusMap(session);
  const [index, setIndex] = useState(() => {
    const at = startStepId ? steps.findIndex((s) => s.id === startStepId) : steps.findIndex((s) => !status[s.id]);
    return Math.max(0, at);
  });
  const [list, setList] = useState(!!openList);
  const [reassign, setReassign] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => () => void Speech.stop(), []);
  if (!session || !snapshot) return <NotRunning />;
  const step = steps[Math.min(index, steps.length - 1)];

  const advance = () => {
    const nextOpen = steps.findIndex((s, i) => i > index && !status[s.id]);
    if (nextOpen >= 0) setIndex(nextOpen);
    else router.back();
  };

  const mark = async (st: StepStatus) => {
    if (!step) return;
    Speech.stop();
    await setStepStatus(session.id, step.id, st);
    if (st === 'done') haptic.success();
    if (st === 'blocked' && step.fallback) {
      await addFallback(session.id, step.fallback.id);
      // The fallback is inserted right after this step; go to it.
      setIndex(index + 1);
      return;
    }
    advance();
  };

  const guide = step?.guideId ? GUIDES_BY_ID[step.guideId] : undefined;
  const detail = guide ? guide.doNow.filter((d) => d !== step.instruction).slice(0, 4) : undefined;
  const helpers = snapshot.members.filter((m) => m.role === 'adult' || m.role === 'older-adult' || m.role === 'teen');
  const done = status[step?.id ?? ''];
  const doneBy = done?.status === 'done' ? `Done by ${done.byMemberId ? subjects.get(done.byMemberId)?.name ?? 'someone' : 'this phone'}, ${new Date(done.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null;

  const statusIcon = (id: string, i: number) => {
    const s = status[id]?.status;
    if (s === 'done') return <CheckCircle size={22} color={t.colors.statusSafe} weight="fill" />;
    if (s === 'skipped') return <SkipForward size={22} color={t.colors.statusStale} weight="bold" />;
    if (s === 'blocked') return <Prohibit size={22} color={t.colors.severityUrgent} weight="bold" />;
    return (
      <AppText variant="callout" weight="700" color={i === index ? t.colors.brandAccent : t.colors.textSecondary}>
        {i + 1}
      </AppText>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <EmergencyTopBar onBack={() => router.back()} />
      <Call911Bar variant="thin" />
      <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.listToggle}>
          {subjectFilter ? (
            <AppText variant="callout" secondary style={{ flex: 1 }}>
              Steps for {subjects.get(subjectFilter)?.name}
            </AppText>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => setList(true)} style={styles.listBtn}>
            <AppText variant="callout" weight="600" color={t.colors.brandPrimary}>
              All steps
            </AppText>
          </Pressable>
        </View>
        {step ? (
          <>
            <StepCard
              stepNumber={index + 1}
              totalSteps={steps.length}
              instruction={step.instruction}
              tier={step.tier}
              detail={detail}
              assignee={step.assigneeId ? subjects.get(step.assigneeId)?.name ?? null : null}
              onReassign={() => setReassign(true)}
              onDone={() => mark('done')}
              onSkip={() => mark('skipped')}
              onCantDo={() => mark('blocked')}
              onSpeak={() => {
                Speech.stop();
                Speech.speak(step.instruction, { language: 'en-US', rate: 0.95 * useA11y.getState().speechRate });
              }}
              doneBy={doneBy}
            />
            <StepEmbed step={step} session={session} checked={checked} onCheck={(id) => setChecked((c) => new Set(c.has(id) ? [...c].filter((x) => x !== id) : [...c, id]))} />
            {guide ? <Button label={`Guide: ${guide.title}`} variant="ghost" onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })} /> : null}
          </>
        ) : (
          <AppText variant="body">No steps for this person in this emergency.</AppText>
        )}
      </ScrollView>

      <BottomSheet visible={list} onClose={() => setList(false)} title="All steps" height="full">
        {steps.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`Step ${i + 1}: ${s.instruction}. ${status[s.id]?.status ?? (i === index ? 'current' : 'upcoming')}`}
            onPress={() => {
              setIndex(i);
              setList(false);
            }}
            style={[styles.listRow, { borderColor: t.colors.borderDefault }]}>
            <View style={styles.listIcon}>{statusIcon(s.id, i)}</View>
            <AppText variant="callout" style={{ flex: 1 }} weight={s.tier === 'critical' ? '700' : '400'}>
              {s.instruction}
            </AppText>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={reassign} onClose={() => setReassign(false)} title="Who should do this?">
        {helpers.map((m) => (
          <Button
            key={m.id}
            label={displayName(m)}
            variant={step?.assigneeId === m.id ? 'primary' : 'secondary'}
            onPress={async () => {
              if (step) await reassignStep(session.id, step.id, m.id);
              setReassign(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  listToggle: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  listBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  listIcon: { width: 32, alignItems: 'center' },
});
