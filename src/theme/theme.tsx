import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useA11y } from '@/stores/a11y-store';

import {
  emergencyType,
  highContrastPalette,
  layout,
  motion,
  palettes,
  prepareType,
  radius,
  space,
  touch,
  type ColorScheme,
  type Palette,
  type TypeStyle,
  type TypeStyleName,
} from './tokens';

/** Prepare = calm everyday mode; Emergency = dark, high-contrast flow (§2). */
export type AppMode = 'prepare' | 'emergency';

export interface Theme {
  mode: AppMode;
  scheme: ColorScheme;
  colors: Palette;
  type: Record<TypeStyleName, TypeStyle>;
  space: typeof space;
  radius: typeof radius;
  touch: typeof touch;
  layout: typeof layout;
  motion: typeof motion;
  /** True when the OS Reduce Motion setting is on; all animation must check it. */
  reduceMotion: boolean;
}

const ThemeModeContext = createContext<AppMode>('prepare');

/**
 * Sets the mode for a subtree. Emergency Mode always uses the dark palette
 * regardless of the system setting (§2.1 rules).
 */
export function ThemeScope({ mode, children }: { mode: AppMode; children: ReactNode }) {
  return <ThemeModeContext.Provider value={mode}>{children}</ThemeModeContext.Provider>;
}

export function useTheme(): Theme {
  const mode = useContext(ThemeModeContext);
  const system = useColorScheme();
  const systemReduceMotion = useReducedMotion();
  const highContrast = useA11y((s) => s.highContrast);
  const textScale = useA11y((s) => s.textScale);
  const motionPref = useA11y((s) => s.reduceMotion);
  const reduceMotion = systemReduceMotion || motionPref === 'on';
  // High Contrast is a dark palette; status bars and maps treat it as dark.
  const scheme: ColorScheme = highContrast || mode === 'emergency' || system === 'dark' ? 'dark' : 'light';

  return useMemo(
    () => ({
      mode,
      scheme,
      colors: highContrast ? highContrastPalette : palettes[scheme],
      type: scaleType(mode === 'emergency' ? emergencyType : prepareType, textScale),
      space,
      radius,
      touch,
      layout,
      motion,
      reduceMotion,
    }),
    [mode, scheme, reduceMotion, highContrast, textScale],
  );
}

function scaleType(t: Record<TypeStyleName, TypeStyle>, k: number): Record<TypeStyleName, TypeStyle> {
  if (k === 1) return t;
  return Object.fromEntries(Object.entries(t).map(([n, v]) => [n, { ...v, fontSize: Math.round(v.fontSize * k), lineHeight: Math.round(v.lineHeight * k) }])) as Record<TypeStyleName, TypeStyle>;
}
