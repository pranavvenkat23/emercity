import { DEFAULT_PREFS, deliveryTime, inQuietHours, parsePrefs } from './notification-prefs';

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);

describe('notification prefs (§22.2)', () => {
  it('quiet hours cross midnight', () => {
    expect(inQuietHours(DEFAULT_PREFS, at(22))).toBe(true);
    expect(inQuietHours(DEFAULT_PREFS, at(6, 59))).toBe(true);
    expect(inQuietHours(DEFAULT_PREFS, at(7))).toBe(false);
    expect(inQuietHours(DEFAULT_PREFS, at(12))).toBe(false);
  });

  it('critical categories ignore quiet hours', () => {
    expect(deliveryTime(DEFAULT_PREFS, 'countdown', at(23))).toEqual(at(23));
    expect(deliveryTime(DEFAULT_PREFS, 'alerts', at(2))).toEqual(at(2));
  });

  it('quiet categories move to the end of the window', () => {
    expect(deliveryTime(DEFAULT_PREFS, 'supplies', at(23))).toEqual(new Date(2026, 9, 25, 7, 0));
    expect(deliveryTime(DEFAULT_PREFS, 'nudges', at(3))).toEqual(at(7));
  });

  it('master and category toggles suppress', () => {
    expect(deliveryTime({ ...DEFAULT_PREFS, enabled: false }, 'alerts', at(12))).toBeNull();
    expect(deliveryTime({ ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories, drills: false } }, 'drills', at(12))).toBeNull();
  });

  it('parses stored prefs and keeps new categories on', () => {
    const p = parsePrefs(JSON.stringify({ enabled: true, categories: { nudges: false }, quietHours: null }));
    expect(p.categories.nudges).toBe(false);
    expect(p.categories.alerts).toBe(true);
    expect(p.quietHours).toBeNull();
    expect(parsePrefs('nope')).toBe(DEFAULT_PREFS);
  });
});
