import { CaretDown, CaretUp, SpeakerHigh } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TIER_LABEL } from '@/domain/hazards';
import type { Tier } from '@/models/types';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

import { Button } from './button';
import { CriticalBar } from './critical-bar';
import { SeverityPill } from './severity';
import { AppText } from './text';

export interface StepCardProps {
  stepNumber: number;
  totalSteps: number;
  instruction: string;
  tier: Tier;
  detail?: string[];
  assignee?: string | null;
  onReassign?: () => void;
  onDone: () => void;
  onSkip: () => void;
  onCantDo?: () => void;
  onSpeak?: () => void;
  doneBy?: string | null;
}

/**
 * One Emergency Mode step (§2.5, §12.4): step count + progress bar, tier
 * treatment, one imperative sentence, collapsed "How" detail, and the
 * 64 pt Done button. Every action is a tap (no swipe-only, §20.2).
 */
export function StepCard({
  stepNumber,
  totalSteps,
  instruction,
  tier,
  detail,
  assignee,
  onReassign,
  onDone,
  onSkip,
  onCantDo,
  onSpeak,
  doneBy,
}: StepCardProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const highlighted = tier === 'critical' || tier === 'urgent';
  const bg =
    tier === 'critical'
      ? blend(t.colors.severityCritical, t.colors.surfaceCard, 0.12)
      : tier === 'urgent'
        ? blend(t.colors.severityUrgent, t.colors.surfaceCard, 0.08)
        : t.colors.surfaceCard;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderRadius: t.radius.card, padding: t.space.lg, borderColor: t.colors.borderDefault },
      ]}>
      <CriticalBar tier={tier} />
      <View style={styles.header}>
        <AppText variant="footnote" secondary accessibilityLabel={`Step ${stepNumber} of ${totalSteps}`}>
          Step {stepNumber} of {totalSteps}
        </AppText>
        {onSpeak ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read this step aloud"
            onPress={onSpeak}
            hitSlop={12}
            style={styles.iconBtn}>
            <SpeakerHigh size={26} color={t.colors.brandPrimary} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.progressTrack, { backgroundColor: t.colors.surfaceSunken }]}>
        <View
          style={{
            width: `${(stepNumber / Math.max(totalSteps, 1)) * 100}%`,
            height: '100%',
            backgroundColor: t.colors.brandAccent,
            borderRadius: 2,
          }}
        />
      </View>

      {highlighted ? <SeverityPill tier={tier} /> : null}
      <AppText
        variant="title2"
        accessibilityRole="header"
        accessibilityLabel={`${highlighted ? TIER_LABEL[tier] + '. ' : ''}${instruction}`}>
        {instruction}
      </AppText>

      {assignee !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={assignee ? `Assigned to ${assignee}. Reassign` : 'Not assigned. Assign someone'}
          onPress={onReassign}
          style={[styles.assignee, { borderColor: t.colors.borderDefault, borderRadius: t.radius.chip }]}>
          <AppText variant="subhead">{assignee ? `${assignee} · Reassign` : 'Assign someone'}</AppText>
        </Pressable>
      ) : null}

      {detail && detail.length > 0 ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel="How"
            onPress={() => setOpen((v) => !v)}
            style={styles.howRow}>
            <AppText variant="headline" color={t.colors.brandPrimary}>
              How
            </AppText>
            {open ? (
              <CaretUp size={18} color={t.colors.brandPrimary} weight="bold" />
            ) : (
              <CaretDown size={18} color={t.colors.brandPrimary} weight="bold" />
            )}
          </Pressable>
          {open
            ? detail.map((d, i) => (
                <AppText key={i} variant="callout" style={{ marginTop: 6 }}>
                  • {d}
                </AppText>
              ))
            : null}
        </View>
      ) : null}

      {doneBy ? (
        <AppText variant="callout" color={t.colors.statusSafe}>
          {doneBy}
        </AppText>
      ) : null}

      <Button label="Done" onPress={onDone} size="emergency" variant={tier === 'critical' ? 'critical' : 'primary'} />
      <View style={styles.secondaryRow}>
        <Button label="Skip" onPress={onSkip} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        {onCantDo ? (
          <Button label="Can't do this" onPress={onCantDo} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  assignee: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48 },
  secondaryRow: { flexDirection: 'row', gap: 8 },
});
