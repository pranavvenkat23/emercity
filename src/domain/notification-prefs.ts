import type { NotificationPrefs } from '@/models/types';

/** Notification categories from the §23 catalogue. */
export type NoteCategory =
  | 'alerts'
  | 'gauges'
  | 'emergency'
  | 'outage'
  | 'countdown'
  | 'supplies'
  | 'medications'
  | 'devices'
  | 'nudges'
  | 'drills'
  | 'card'
  | 'household';

export const NOTE_CATEGORIES: { id: NoteCategory; label: string; detail: string; critical?: boolean; quiet?: boolean }[] = [
  { id: 'alerts', label: 'Official alerts', detail: 'Warnings and watches for your address', critical: true },
  { id: 'gauges', label: 'River gauges', detail: 'Nearby creeks near or at flood stage', critical: true },
  { id: 'emergency', label: 'Emergency Mode', detail: 'When someone starts Emergency Mode or needs help', critical: true },
  { id: 'countdown', label: 'Countdowns', detail: 'Medicine, device, and food time left during an outage', critical: true },
  { id: 'outage', label: 'Power outages', detail: 'Power out and power back' },
  { id: 'medications', label: 'Medicine refills', detail: 'Refill reminders for critical medicines' },
  { id: 'devices', label: 'Device batteries', detail: 'Monthly reminder to charge spare batteries' },
  { id: 'supplies', label: 'Supplies', detail: 'Items expiring soon', quiet: true },
  { id: 'nudges', label: 'Seasonal tips', detail: 'Get ready before winter, storms, and heat', quiet: true },
  { id: 'drills', label: 'Drills', detail: 'Scheduled drills and practice reminders', quiet: true },
  { id: 'card', label: 'Lock-screen card', detail: 'When your card is out of date', quiet: true },
  { id: 'household', label: 'Household', detail: 'Members joining and changes to critical needs' },
];

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  categories: Object.fromEntries(NOTE_CATEGORIES.map((c) => [c.id, true])),
  quietHours: { start: '21:00', end: '07:00' },
};

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** True when `at` falls inside the quiet window (which may cross midnight). */
export function inQuietHours(prefs: NotificationPrefs, at: Date): boolean {
  if (!prefs.quietHours) return false;
  const s = minutes(prefs.quietHours.start);
  const e = minutes(prefs.quietHours.end);
  const t = at.getHours() * 60 + at.getMinutes();
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/**
 * When a notification should be delivered, or null to not send it.
 * Critical categories ignore quiet hours (§22.2). Quiet categories that land
 * inside quiet hours move to the end of the window.
 */
export function deliveryTime(prefs: NotificationPrefs, category: NoteCategory, at: Date): Date | null {
  if (!prefs.enabled) return null;
  if (prefs.categories[category] === false) return null;
  const meta = NOTE_CATEGORIES.find((c) => c.id === category);
  if (!meta?.quiet || !inQuietHours(prefs, at)) return at;
  const [h, m] = prefs.quietHours!.end.split(':').map(Number);
  const out = new Date(at);
  out.setHours(h, m, 0, 0);
  if (out <= at) out.setDate(out.getDate() + 1);
  return out;
}

export function parsePrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const p = JSON.parse(raw) as NotificationPrefs;
    return { ...DEFAULT_PREFS, ...p, categories: { ...DEFAULT_PREFS.categories, ...p.categories } };
  } catch {
    return DEFAULT_PREFS;
  }
}
