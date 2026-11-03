import { create } from 'zustand';

/**
 * Accessibility preferences (SET-05, §20.2–20.3), per phone. Read by
 * useTheme (contrast, text size, motion) and by the screens that speak,
 * vibrate or flash.
 */
export interface A11yPrefs {
  highContrast: boolean;
  /** Multiplies every text style (on top of the system Dynamic Type size). */
  textScale: 1 | 1.15 | 1.3;
  /** 'system' follows the OS Reduce Motion switch. */
  reduceMotion: 'system' | 'on';
  haptics: boolean;
  /** Text-to-speech rate for read-aloud (1 = normal). */
  speechRate: 0.8 | 1 | 1.2;
  /** Flash the camera light on new critical events in Emergency Mode (opt-in). */
  flashOnCritical: boolean;
  /** §20.3 Simple Mode: three big buttons, view only. */
  simpleMode: boolean;
}

export const DEFAULT_A11Y: A11yPrefs = {
  highContrast: false,
  textScale: 1,
  reduceMotion: 'system',
  haptics: true,
  speechRate: 1,
  flashOnCritical: false,
  simpleMode: false,
};

const KEY = 'a11y.prefs';
type KV = { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void> };

export const useA11y = create<A11yPrefs & { loaded: boolean; load(kv: KV): Promise<void>; update(kv: KV, patch: Partial<A11yPrefs>): Promise<void> }>((set, get) => ({
  ...DEFAULT_A11Y,
  loaded: false,
  async load(kv) {
    const raw = await kv.get(KEY);
    let p: Partial<A11yPrefs> = {};
    try {
      p = raw ? (JSON.parse(raw) as Partial<A11yPrefs>) : {};
    } catch {
      p = {};
    }
    set({ ...DEFAULT_A11Y, ...p, loaded: true });
  },
  async update(kv, patch) {
    set(patch);
    const { loaded: _l, load: _a, update: _b, ...prefs } = get();
    await kv.set(KEY, JSON.stringify(prefs));
  },
}));
