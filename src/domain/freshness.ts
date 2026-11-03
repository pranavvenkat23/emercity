/** §21.4 freshness windows for live values. */
export const FRESHNESS_WINDOW_MS = {
  alerts: 10 * 60_000,
  gauge: 60 * 60_000,
  shelter: 6 * 60 * 60_000,
  weather: 3 * 60 * 60_000,
  outageCounts: 60 * 60_000,
  riskLayers: 45 * 86_400_000,
} as const;

export type FreshnessKind = keyof typeof FRESHNESS_WINDOW_MS;

export type FreshnessState = 'fresh' | 'stale' | 'never';

export function freshness(kind: FreshnessKind, fetchedAt: string | null, now: Date): FreshnessState {
  if (!fetchedAt) return 'never';
  const age = now.getTime() - new Date(fetchedAt).getTime();
  if (Number.isNaN(age)) return 'never';
  return age > FRESHNESS_WINDOW_MS[kind] ? 'stale' : 'fresh';
}

/** "just now", "4 min ago", "3 h ago", "2 d ago". Future times read "just now". */
export function formatAge(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'unknown time';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** h:mm for countdown tiles (§11.4), or "26 d" when two days or more. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin >= 48 * 60) return `${Math.floor(totalMin / (24 * 60))} d`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Spoken form for screen readers: "3 hours 12 minutes". */
export function spokenDuration(ms: number): string {
  if (ms <= 0) return 'no time';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin >= 48 * 60) {
    const d = Math.floor(totalMin / (24 * 60));
    return `${d} days`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m || !h) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}
