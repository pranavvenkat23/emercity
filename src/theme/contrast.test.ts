import { blend, contrastRatio } from './contrast';
import { highContrastPalette, palettes, type Palette } from './tokens';

const AA_BODY = 4.5;
const AA_LARGE = 3;

const all: Record<string, Palette> = { ...palettes, highContrast: highContrastPalette };
const schemes = Object.keys(all);

describe('WCAG AA contrast for design tokens (spec §2.1)', () => {
  it('computes known reference ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  describe.each(schemes)('%s palette', (scheme) => {
    const p: Palette = all[scheme];

    it.each([
      ['textPrimary', 'surfaceBase'],
      ['textPrimary', 'surfaceCard'],
      ['textSecondary', 'surfaceBase'],
      ['textSecondary', 'surfaceCard'],
      ['onBrandPrimary', 'brandPrimary'],
      ['onCritical', 'severityCritical'],
      ['onUrgent', 'severityUrgent'],
      ['onImportant', 'severityImportant'],
      ['onSafe', 'statusSafe'],
      ['onStale', 'statusStale'],
      ['onPractice', 'practice'],
    ] as [keyof Palette, keyof Palette][])('body text %s on %s ≥ 4.5:1', (fg, bg) => {
      expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(AA_BODY);
    });

    // Severity and status colors are used as icon/bar/large-label colors on cards.
    it.each([
      'severityCritical',
      'severityUrgent',
      'severityImportant',
      'severityStandard',
      'statusSafe',
      'statusStale',
      'brandAccent',
      'brandPrimary',
    ] as (keyof Palette)[])('icon color %s on card ≥ 3:1', (fg) => {
      expect(contrastRatio(p[fg], p.surfaceCard)).toBeGreaterThanOrEqual(AA_LARGE);
    });

    it('text stays readable on the 12% critical-tinted card (§2.2)', () => {
      const tinted = blend(p.severityCritical, p.surfaceCard, 0.12);
      expect(contrastRatio(p.textPrimary, tinted)).toBeGreaterThanOrEqual(AA_BODY);
      expect(contrastRatio(p.textSecondary, tinted)).toBeGreaterThanOrEqual(AA_BODY);
    });

    it('text stays readable on the 8% urgent-tinted card (§2.2)', () => {
      const tinted = blend(p.severityUrgent, p.surfaceCard, 0.08);
      expect(contrastRatio(p.textPrimary, tinted)).toBeGreaterThanOrEqual(AA_BODY);
      expect(contrastRatio(p.textSecondary, tinted)).toBeGreaterThanOrEqual(AA_BODY);
    });
  });
});
