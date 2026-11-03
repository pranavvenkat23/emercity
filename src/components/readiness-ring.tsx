import { useTheme } from '@/theme/theme';

import { ProgressRing } from './progress-ring';
import { AppText } from './text';

export interface ReadinessRingProps {
  /** 0–100, or null when not yet calculated. */
  score: number | null;
  size?: 'small' | 'large';
  /** Any Critical-tier need unaddressed to red notch and 69 cap (§6.4). */
  criticalGap?: boolean;
}

/** Household readiness 0–100 (§2.5, §6.4). */
export function ReadinessRing({ score, size = 'small', criticalGap }: ReadinessRingProps) {
  const t = useTheme();
  const px = size === 'large' ? 160 : 72;
  const stroke = size === 'large' ? 14 : 8;
  const label = score == null ? 'Readiness not calculated yet' : `${score} percent ready${criticalGap ? ', critical need open' : ''}`;
  return (
    <ProgressRing
      size={px}
      stroke={stroke}
      progress={(score ?? 0) / 100}
      color={t.colors.brandAccent}
      trackColor={t.colors.surfaceSunken}
      notchColor={criticalGap ? t.colors.severityCritical : undefined}>
      <AppText
        accessibilityLabel={label}
        variant={size === 'large' ? 'display' : 'title2'}
        weight="700"
        tabular
        allowFontScaling={false}>
        {score == null ? '--' : score}
      </AppText>
    </ProgressRing>
  );
}
