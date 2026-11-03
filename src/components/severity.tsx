import { Warning, WarningCircle } from 'phosphor-react-native';
import { View } from 'react-native';

import { TIER_LABEL, tierColor } from '@/domain/hazards';
import type { Tier } from '@/models/types';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

/**
 * Tier icon per §2.2: Critical = filled triangle with exclamation, Urgent =
 * filled circle with exclamation, Important = outlined circle, Standard = none
 * (the category icon is used instead).
 */
export function TierIcon({ tier, size = 20, color }: { tier: Tier; size?: number; color?: string }) {
  const t = useTheme();
  const c = color ?? tierColor(tier, t.colors);
  if (tier === 'critical') return <Warning size={size} color={c} weight="fill" />;
  if (tier === 'urgent') return <WarningCircle size={size} color={c} weight="fill" />;
  if (tier === 'important') return <WarningCircle size={size} color={c} weight="bold" />;
  return null;
}

/**
 * The "CRITICAL / URGENT / IMPORTANT" pill. Color never carries meaning
 * alone: every pill has an icon and a text label (§2.1).
 */
export function SeverityPill({ tier }: { tier: Tier }) {
  const t = useTheme();
  if (tier === 'standard') return null;
  const c = tierColor(tier, t.colors);
  const filled = tier !== 'important';
  const fg =
    tier === 'critical' ? t.colors.onCritical : tier === 'urgent' ? t.colors.onUrgent : c;
  return (
    <View
      accessible
      accessibilityLabel={TIER_LABEL[tier]}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: t.radius.chip,
        backgroundColor: filled ? c : 'transparent',
        borderWidth: filled ? 0 : 1.5,
        borderColor: c,
      }}>
      <TierIcon tier={tier} size={14} color={fg} />
      <AppText variant="caption" weight="700" color={fg} style={{ letterSpacing: 0.6 }}>
        {TIER_LABEL[tier].toUpperCase()}
      </AppText>
    </View>
  );
}
