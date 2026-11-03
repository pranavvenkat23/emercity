import { PushPin } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { TIER_LABEL, tierColor } from '@/domain/hazards';
import type { ConditionType, Tier } from '@/models/types';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

import { CriticalBar } from './critical-bar';
import { CONDITION_ICON } from './icons';
import { MemberAvatar } from './member-avatar';
import { SeverityPill } from './severity';
import { AppText } from './text';

export interface PriorityCardProps {
  rank: number;
  name: string;
  kind: 'person' | 'pet';
  tier: Tier;
  conditions?: ConditionType[];
  variant?: 'full' | 'compact';
  pinned?: boolean;
  /** Emergency view extras (§12.6). */
  progressLabel?: string;
  onPress?: () => void;
  /** Long-press or the "Why this rank" accessibility action (§8.7). */
  onWhy?: () => void;
}

/**
 * One subject in the priority order (§2.5, §8.7). Shows rank, avatar, name,
 * tier treatment and small condition icons, and deliberately no reason
 * text. Reasons are one long-press away.
 */
export function PriorityCard({
  rank,
  name,
  kind,
  tier,
  conditions = [],
  variant = 'full',
  pinned,
  progressLabel,
  onPress,
  onWhy,
}: PriorityCardProps) {
  const t = useTheme();
  const c = tierColor(tier, t.colors);
  const tint =
    tier === 'critical'
      ? blend(c, t.colors.surfaceCard, 0.12)
      : tier === 'urgent'
        ? blend(c, t.colors.surfaceCard, 0.08)
        : t.colors.surfaceCard;
  const compact = variant === 'compact';
  const icons = conditions
    .map((type) => CONDITION_ICON[type])
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 3);

  const a11yLabel = `Rank ${rank}, ${name}, ${TIER_LABEL[tier].toLowerCase()}${pinned ? ', pinned' : ''}${
    progressLabel ? `, ${progressLabel}` : ''
  }`;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityActions={onWhy ? [{ name: 'why', label: 'Why this rank' }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'why' && onWhy?.()}
      onPress={onPress}
      onLongPress={onWhy}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? t.colors.surfaceSunken : tint,
          borderColor: tier === 'standard' ? t.colors.borderDefault : 'transparent',
          borderRadius: t.radius.card,
          paddingVertical: compact ? t.space.sm : t.space.md,
          paddingLeft: t.space.md + 4,
          paddingRight: t.space.md,
          minHeight: compact ? 64 : 76,
        },
      ]}>
      <CriticalBar tier={tier} />
      <AppText
        variant="title2"
        weight="700"
        tabular
        color={tier === 'standard' ? t.colors.textSecondary : c}
        style={{ fontSize: 24, lineHeight: 30, minWidth: 28, textAlign: 'center' }}>
        {rank}
      </AppText>
      <MemberAvatar name={name} kind={kind} tier={tier} size={compact ? 40 : 48} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="headline" style={{ flexShrink: 1 }}>
            {name}
          </AppText>
          {pinned ? <PushPin size={14} color={t.colors.textSecondary} weight="fill" /> : null}
        </View>
        <View style={styles.metaRow}>
          <SeverityPill tier={tier} />
          {icons.map((IconCmp, i) => (
            <IconCmp key={i} size={18} color={t.colors.textSecondary} weight="regular" />
          ))}
        </View>
        {progressLabel ? (
          <AppText variant="footnote" secondary>
            {progressLabel}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
