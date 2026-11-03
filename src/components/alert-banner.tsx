import { CaretRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Hazard } from '@/models/types';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

import { HAZARD_ICON } from './icons';
import { SourceChip } from './source-chip';
import { AppText } from './text';

/** CAP alert levels to banner variant (§2.5). */
export type AlertLevel = 'warning' | 'watch' | 'advisory' | 'statement';

export interface AlertBannerProps {
  level: AlertLevel;
  hazard: Hazard | null;
  headline: string;
  issuer: string;
  until?: string;
  source: string;
  fetchedAt: string | null;
  isDemo?: boolean;
  onPress?: () => void;
}

const LEVEL_LABEL: Record<AlertLevel, string> = {
  warning: 'Warning',
  watch: 'Watch',
  advisory: 'Advisory',
  statement: 'Statement',
};

/** Official alert row: Warning (red), Watch (orange), Advisory (amber), Statement (blue). */
export function AlertBanner({ level, hazard, headline, issuer, until, source, fetchedAt, isDemo, onPress }: AlertBannerProps) {
  const t = useTheme();
  const color = {
    warning: t.colors.severityCritical,
    watch: t.colors.severityUrgent,
    advisory: t.colors.severityImportant,
    statement: t.colors.severityStandard,
  }[level];
  const IconCmp = hazard ? HAZARD_ICON[hazard] : HAZARD_ICON.hazmat;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isDemo ? 'Demo alert. ' : ''}${LEVEL_LABEL[level]}: ${headline}. ${issuer}.${
        until ? ` Until ${until}.` : ''
      }`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: pressed ? t.colors.surfaceSunken : blend(color, t.colors.surfaceCard, 0.1),
          borderColor: color,
          borderRadius: t.radius.card,
          padding: t.space.md,
        },
      ]}>
      <IconCmp size={28} color={color} weight="bold" />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="caption" weight="700" color={color} style={{ letterSpacing: 0.6 }}>
          {(isDemo ? 'DEMO · ' : '') + LEVEL_LABEL[level].toUpperCase()}
        </AppText>
        <AppText variant="headline">{headline}</AppText>
        <AppText variant="footnote" secondary>
          {issuer}
          {until ? ` · Until ${until}` : ''}
        </AppText>
        <SourceChip source={source} fetchedAt={fetchedAt} kind="alerts" />
      </View>
      {onPress ? <CaretRight size={18} color={t.colors.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1.5 },
});
