import { View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { GaugeState } from '@/stores/conditions-store';
import { useTheme } from '@/theme/theme';

/**
 * Hydrograph (§10.4 MAP-03): observed (solid) and forecast (dashed) stage,
 * flood category bands, and a "now" marker. Pure SVG, works offline.
 */
export function Hydrograph({ gauge, width, height = 220 }: { gauge: GaugeState; width: number; height?: number }) {
  const t = useTheme();
  const pad = { l: 36, r: 10, t: 10, b: 24 };
  const pts = [...gauge.observed, ...gauge.forecast];
  if (pts.length < 2) return null;
  const times = pts.map((p) => new Date(p.t).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const f = gauge.flood;
  const maxY = Math.max(...pts.map((p) => p.ft), f.action ?? 0, (f.minor ?? 0) * 1.05);
  const minY = Math.min(0, ...pts.map((p) => p.ft));
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const x = (ms: number) => pad.l + ((ms - t0) / Math.max(1, t1 - t0)) * w;
  const y = (ft: number) => pad.t + h - ((ft - minY) / Math.max(0.1, maxY - minY)) * h;
  const path = (list: { t: string; ft: number }[]) => list.map((p, i) => `${i ? 'L' : 'M'}${x(new Date(p.t).getTime()).toFixed(1)},${y(p.ft).toFixed(1)}`).join(' ');
  const now = Date.now();
  const bands: { from: number | null; to: number; color: string; label: string }[] = [
    { from: f.action, to: f.minor ?? maxY, color: t.colors.severityImportant, label: 'Action' },
    { from: f.minor, to: f.moderate ?? maxY, color: t.colors.severityUrgent, label: 'Minor' },
    { from: f.moderate, to: f.major ?? maxY, color: t.colors.severityCritical, label: 'Moderate' },
    { from: f.major, to: maxY, color: '#7A0019', label: 'Major' },
  ];
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <View accessible accessibilityLabel={`River stage chart for ${gauge.name}: observed over the last 72 hours${gauge.forecast.length ? ' and forecast' : ''}.`}>
      <Svg width={width} height={height}>
        {bands.map((b) =>
          b.from != null && b.from < maxY ? (
            <Rect key={b.label} x={pad.l} width={w} y={y(Math.min(b.to, maxY))} height={Math.max(0, y(b.from) - y(Math.min(b.to, maxY)))} fill={b.color} opacity={0.18} />
          ) : null,
        )}
        {ticks.map((v) => (
          <SvgText key={v} x={pad.l - 4} y={y(v) + 4} fontSize={10} fill={t.colors.textSecondary} textAnchor="end">
            {v.toFixed(0)}
          </SvgText>
        ))}
        <Path d={path(gauge.observed)} stroke={t.colors.hazardFlood} strokeWidth={2.5} fill="none" />
        {gauge.forecast.length ? <Path d={path([gauge.observed.at(-1)!, ...gauge.forecast].filter(Boolean))} stroke={t.colors.hazardFlood} strokeWidth={2} strokeDasharray="6 5" fill="none" /> : null}
        {now >= t0 && now <= t1 ? (
          <>
            <Line x1={x(now)} x2={x(now)} y1={pad.t} y2={pad.t + h} stroke={t.colors.textPrimary} strokeWidth={1} strokeDasharray="2 3" />
            <SvgText x={x(now) + 3} y={pad.t + 10} fontSize={10} fill={t.colors.textPrimary}>
              now
            </SvgText>
          </>
        ) : null}
        <SvgText x={pad.l} y={height - 6} fontSize={10} fill={t.colors.textSecondary}>
          {new Date(t0).toLocaleDateString([], { weekday: 'short' })}
        </SvgText>
        <SvgText x={width - pad.r} y={height - 6} fontSize={10} fill={t.colors.textSecondary} textAnchor="end">
          {new Date(t1).toLocaleDateString([], { weekday: 'short' })}
        </SvgText>
      </Svg>
    </View>
  );
}
