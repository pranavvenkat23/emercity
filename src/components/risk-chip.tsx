import { CaretRight, Question } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RiskLevel } from '@/models/types';
import { useTheme } from '@/theme/theme';

import { SourceChip } from './source-chip';
import { AppText } from './text';

export interface RiskChipProps {
  label: string;
  value: string;
  level: RiskLevel;
  source: string;
  fetchedAt?: string | null;
  onPress?: () => void;
  /** A fact about the area (nearest gauge, first-due station), not a risk level: no level pill. */
  info?: boolean;
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'Unknown',
};

/**
 * One address risk factor (§2.5, §9.4). "Unknown" is gray and never
 * implies low risk (§9.5).
 */
export function RiskChip({ label, value, level, source, fetchedAt, onPress, info }: RiskChipProps) {
  const t = useTheme();
  const color = {
    high: t.colors.severityCritical,
    moderate: t.colors.severityUrgent,
    low: t.colors.statusSafe,
    unknown: t.colors.statusStale,
  }[level];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}.${info ? '' : ` ${LEVEL_LABEL[level]} risk.`} Source ${source}.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? t.colors.surfaceSunken : t.colors.surfaceCard,
          borderColor: t.colors.borderDefault,
          borderRadius: t.radius.card,
          padding: t.space.sm,
        },
      ]}>
      {info ? null : (
        <View style={[styles.level, { borderColor: color, borderRadius: t.radius.chip }]}>
          {level === 'unknown' ? <Question size={12} color={color} weight="bold" /> : null}
          <AppText variant="caption" weight="700" color={color}>
            {LEVEL_LABEL[level]}
          </AppText>
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="subhead" weight="600">
          {label}
        </AppText>
        <AppText variant="footnote" secondary>
          {value}
        </AppText>
        <SourceChip source={source} fetchedAt={fetchedAt} kind="riskLayers" />
      </View>
      {onPress ? <CaretRight size={16} color={t.colors.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 76,
    justifyContent: 'center',
  },
});
