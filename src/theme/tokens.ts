/**
 * Design tokens, spec §2.1 (color), §2.3 (type), §2.4 (spacing/shape).
 *
 * Hex values come straight from the spec table. The spec calls them "starting
 * points" and requires every text/background pair to pass WCAG AA; the
 * `on*` foreground tokens below are additions chosen so that pills and filled
 * buttons pass. `contrast.test.ts` enforces this.
 */

export type ColorScheme = 'light' | 'dark';
/** Palettes include High Contrast (§20.2: yellow/white on black). */
export type PaletteName = ColorScheme | 'highContrast';

export interface Palette {
  brandPrimary: string;
  brandAccent: string;
  surfaceBase: string;
  surfaceCard: string;
  /** Raised surface used for pressed rows and chip backgrounds. */
  surfaceSunken: string;
  textPrimary: string;
  textSecondary: string;
  borderDefault: string;

  severityCritical: string;
  severityUrgent: string;
  severityImportant: string;
  severityStandard: string;
  statusSafe: string;
  statusStale: string;

  hazardFlood: string;
  hazardWinter: string;
  hazardOutage: string;
  hazardFire: string;
  hazardHazmat: string;
  hazardHurricane: string;

  /** Foreground for text/icons placed on a filled brandPrimary surface. */
  onBrandPrimary: string;
  /** Foreground on a filled severityCritical surface (CRITICAL pill, Call 911). */
  onCritical: string;
  onUrgent: string;
  onImportant: string;
  onSafe: string;
  /** Foreground on a filled statusStale surface (OfflineBar). */
  onStale: string;
  /** Bright yellow used only for the PRACTICE banner in drills (§15.2). */
  practice: string;
  onPractice: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    brandPrimary: '#1B3A5C',
    brandAccent: '#138A8A',
    surfaceBase: '#F7F8FA',
    surfaceCard: '#FFFFFF',
    surfaceSunken: '#EEF1F5',
    textPrimary: '#14181F',
    textSecondary: '#5B6573',
    borderDefault: '#DDE2E8',

    severityCritical: '#C8102E',
    severityUrgent: '#D95F02',
    severityImportant: '#B38600',
    severityStandard: '#3D6A99',
    statusSafe: '#1E7F4F',
    statusStale: '#6B7280',

    hazardFlood: '#1F6FB2',
    hazardWinter: '#4A90A4',
    hazardOutage: '#6B4FA0',
    hazardFire: '#B33A00',
    hazardHazmat: '#7A7A00',
    hazardHurricane: '#2F4F7F',

    onBrandPrimary: '#FFFFFF',
    onCritical: '#FFFFFF',
    // White on #D95F02 is ~3.6:1, so urgent/important pills use dark text.
    onUrgent: '#14181F',
    onImportant: '#14181F',
    onSafe: '#FFFFFF',
    onStale: '#FFFFFF',
    practice: '#FFD60A',
    onPractice: '#14181F',
  },
  dark: {
    brandPrimary: '#8FB8E8',
    brandAccent: '#4FD1C5',
    surfaceBase: '#0E1116',
    surfaceCard: '#1A1F27',
    surfaceSunken: '#232A34',
    textPrimary: '#F2F4F7',
    textSecondary: '#A9B2BF',
    borderDefault: '#2C333D',

    severityCritical: '#FF4D5E',
    severityUrgent: '#FF9A3C',
    severityImportant: '#F5C542',
    severityStandard: '#7FA7D1',
    statusSafe: '#4ADE80',
    statusStale: '#9CA3AF',

    hazardFlood: '#5AA9F0',
    hazardWinter: '#8FD3E8',
    hazardOutage: '#B49BE8',
    hazardFire: '#FF7A45',
    hazardHazmat: '#D4D44A',
    hazardHurricane: '#8AA8D8',

    onBrandPrimary: '#0E1116',
    // Dark-palette severity colors are light, so foregrounds flip to near-black.
    onCritical: '#0E1116',
    onUrgent: '#0E1116',
    onImportant: '#0E1116',
    onSafe: '#0E1116',
    onStale: '#0E1116',
    practice: '#FFD60A',
    onPractice: '#0E1116',
  },
};

/**
 * High Contrast (§20.2): yellow and white on black. Severity colors stay
 * distinct hues but brighter, and every one also has an icon and a label.
 */
export const highContrastPalette: Palette = {
  brandPrimary: '#FFE14D',
  brandAccent: '#FFE14D',
  surfaceBase: '#000000',
  surfaceCard: '#000000',
  surfaceSunken: '#1C1C1C',
  textPrimary: '#FFFFFF',
  textSecondary: '#E6E6E6',
  borderDefault: '#FFFFFF',

  severityCritical: '#FF6B78',
  severityUrgent: '#FFA552',
  severityImportant: '#FFE14D',
  severityStandard: '#9CC3FF',
  statusSafe: '#5CF08F',
  statusStale: '#C8C8C8',

  hazardFlood: '#7CC0FF',
  hazardWinter: '#A6E4F5',
  hazardOutage: '#CDB6FF',
  hazardFire: '#FF8F5C',
  hazardHazmat: '#E6E65C',
  hazardHurricane: '#A9C3EE',

  onBrandPrimary: '#000000',
  onCritical: '#000000',
  onUrgent: '#000000',
  onImportant: '#000000',
  onSafe: '#000000',
  onStale: '#000000',
  practice: '#FFE14D',
  onPractice: '#000000',
};

/** §2.4: 4 pt grid. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  card: 16,
  button: 12,
  chip: 999,
  sm: 8,
} as const;

/** §2.4 / §20.2 touch targets. */
export const touch = {
  min: 48,
  emergencyPrimary: 64,
} as const;

export const layout = {
  sideMarginPhone: 16,
  sideMarginTablet: 24,
  maxContentWidth: 640,
} as const;

/** §2.7 */
export const motion = {
  standardMs: 225,
  emergencyEntryMs: 400,
  criticalPulseMs: 1600,
} as const;

export type TypeStyleName =
  | 'display'
  | 'title1'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '600' | '700';
}

/** §2.3: Prepare mode scale (size/line-height). */
export const prepareType: Record<TypeStyleName, TypeStyle> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

/**
 * §2.3: "Emergency Mode bumps every size up one step and never goes below
 * 17 pt for actionable text." Each style takes the size of the next style up,
 * keeping its own weight. Body therefore becomes 22 pt, which matches the
 * 22–28 pt next-step text in §12.3. Display has no larger step, so it grows
 * by the same ratio as title1 to display. Actionable text must use callout or
 * larger (≥17 pt here); `Button` and `StepCard` enforce that.
 */
export const emergencyType: Record<TypeStyleName, TypeStyle> = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700' },
  title1: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title2: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  headline: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 22, lineHeight: 28, fontWeight: '400' },
  callout: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  subhead: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  footnote: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
};
