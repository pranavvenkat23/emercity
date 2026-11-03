/** WCAG 2.x relative luminance and contrast ratio. */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend `fg` over `bg` at `alpha` (0–1); used for tinted card backgrounds. */
export function blend(fg: string, bg: string, alpha: number): string {
  const p = (hex: string, i: number) => parseInt(hex.replace('#', '').slice(i, i + 2), 16);
  const mix = (i: number) => Math.round(p(fg, i) * alpha + p(bg, i) * (1 - alpha));
  return '#' + [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Hex color with alpha suffix for RN styles. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
