import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface ProgressRingProps {
  size: number;
  stroke: number;
  /** 0–1 */
  progress: number;
  color: string;
  trackColor: string;
  children?: ReactNode;
  /** Draws a small notch at 12 o'clock (readiness cap, §6.4). */
  notchColor?: string;
}

/** Circular progress used by ReadinessRing and CountdownTile. */
export function ProgressRing({ size, stroke, progress, color, trackColor, children, notchColor }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {notchColor ? (
          <Circle cx={size / 2} cy={stroke / 2} r={stroke * 0.75} fill={notchColor} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
