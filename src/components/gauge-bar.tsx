import { View } from 'react-native';

import type { GaugeState } from '@/stores/conditions-store';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

export type GaugeCategory = 'normal' | 'action' | 'minor' | 'moderate' | 'major' | 'unknown';

/** NWS flood category for a stage (§10.4). */
export function gaugeCategory(stage: number | null, f: GaugeState['flood']): GaugeCategory {
  if (stage == null) return 'unknown';
  if (f.major != null && stage >= f.major) return 'major';
  if (f.moderate != null && stage >= f.moderate) return 'moderate';
  if (f.minor != null && stage >= f.minor) return 'minor';
  if (f.action != null && stage >= f.action) return 'action';
  return 'normal';
}

export const CATEGORY_LABEL: Record<GaugeCategory, string> = {
  normal: 'Below action stage',
  action: 'Action stage',
  minor: 'Minor flooding',
  moderate: 'Moderate flooding',
  major: 'Major flooding',
  unknown: 'Stage unknown',
};

/** Plain-words meaning of each stage (MAP-03 legend, §10.4). */
export const CATEGORY_MEANING: Record<Exclude<GaugeCategory, 'normal' | 'unknown'>, string> = {
  action: 'Get ready.',
  minor: 'Some roads flood.',
  moderate: 'Some homes near the stream flood; evacuations possible.',
  major: 'Widespread flooding.',
};

/** "3.2 ft · 6.8 ft below flood stage" (flood stage = minor). */
export function gaugeSummary(g: Pick<GaugeState, 'stageFt' | 'flood'>): string {
  if (g.stageFt == null) return 'No current reading';
  const fs = g.flood.minor;
  if (fs == null) return `${g.stageFt.toFixed(1)} ft`;
  const diff = fs - g.stageFt;
  return diff > 0 ? `${g.stageFt.toFixed(1)} ft · ${diff.toFixed(1)} ft below flood stage` : `${g.stageFt.toFixed(1)} ft · ${Math.abs(diff).toFixed(1)} ft above flood stage`;
}

export function GaugeBar({ gauge }: { gauge: Pick<GaugeState, 'stageFt' | 'flood'> }) {
  const t = useTheme();
  const f = gauge.flood;
  const top = Math.max(f.major ?? 0, f.moderate ?? 0, f.minor ?? 0, (gauge.stageFt ?? 0) * 1.1, 1);
  const pct = (v: number | null) => (v == null ? null : Math.max(0, Math.min(100, (v / top) * 100)));
  const bands: { from: number | null; to: number | null; color: string }[] = [
    { from: f.action, to: f.minor ?? f.moderate ?? f.major ?? top, color: t.colors.severityImportant },
    { from: f.minor, to: f.moderate ?? f.major ?? top, color: t.colors.severityUrgent },
    { from: f.moderate, to: f.major ?? top, color: t.colors.severityCritical },
    { from: f.major, to: top, color: '#7A0019' },
  ];
  const marker = pct(gauge.stageFt);
  return (
    <View
      accessible
      accessibilityLabel={`${gaugeSummary(gauge)}. ${CATEGORY_LABEL[gaugeCategory(gauge.stageFt, f)]}`}
      style={{ gap: 4 }}>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: t.colors.surfaceSunken, overflow: 'hidden' }}>
        {bands.map((b, i) => {
          const a = pct(b.from);
          const z = pct(b.to);
          if (a == null || z == null || z <= a) return null;
          return <View key={i} style={{ position: 'absolute', left: `${a}%`, width: `${z - a}%`, top: 0, bottom: 0, backgroundColor: b.color, opacity: 0.85 }} />;
        })}
      </View>
      {marker != null ? (
        <View style={{ position: 'absolute', left: `${marker}%`, top: -4, marginLeft: -2, width: 4, height: 22, borderRadius: 2, backgroundColor: t.colors.textPrimary }} />
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" secondary>
          Streambed
        </AppText>
        {f.major != null ? (
          <AppText variant="caption" secondary>
            Major {f.major} ft
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
