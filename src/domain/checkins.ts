import type { CheckIn, CheckInStatus, EmergencySession, Member } from '@/models/types';

/**
 * Family status (§12.7 EM-07). A missing response is shown as "No response"
 *, it never means unsafe, and never means safe.
 */
export const NO_RESPONSE_MS = 15 * 60_000;

export type DisplayStatus = CheckInStatus | 'waiting';

export interface MemberStatus {
  memberId: string;
  status: DisplayStatus;
  /** When the shown status was reported; null if never. */
  at: string | null;
  message?: string;
  reportedBy?: string;
  location?: { lat: number; lng: number } | null;
}

/** Latest status per member wins (§19.5). */
export function memberStatuses(members: Pick<Member, 'id'>[], session: Pick<EmergencySession, 'id' | 'startedAt'>, checkIns: CheckIn[], now: Date): MemberStatus[] {
  const mine = checkIns.filter((c) => c.sessionId === session.id);
  return members.map((m) => {
    const latest = mine.filter((c) => c.memberId === m.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    if (latest) {
      return { memberId: m.id, status: latest.status, at: latest.timestamp, message: latest.message, reportedBy: latest.reportedBy, location: latest.location ?? null };
    }
    const waited = now.getTime() - new Date(session.startedAt).getTime();
    return { memberId: m.id, status: waited >= NO_RESPONSE_MS ? 'no-response' : 'waiting', at: null };
  });
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  safe: 'Safe',
  'on-my-way': 'On my way',
  'need-help': 'Needs help',
  'no-response': 'No response',
  waiting: 'Waiting',
};

/** Pre-filled SMS fallback (§12.7): "I'm safe, at home." */
export function smsBody(status: CheckInStatus, message?: string): string {
  const base = status === 'safe' ? "I'm safe" : status === 'on-my-way' ? "I'm on my way" : 'I need help';
  return message?.trim() ? `${base}: ${message.trim()}` : `${base}.`;
}

/** sms: URL for several recipients (iOS uses "&body", Android "?body"). */
export function smsUrl(numbers: string[], body: string, platform: 'ios' | 'android'): string {
  const to = numbers.map((n) => n.replace(/[^\d+]/g, '')).filter(Boolean).join(',');
  const sep = platform === 'ios' ? '&' : '?';
  return `sms:${platform === 'ios' ? '/open?addresses=' : ''}${to}${sep}body=${encodeURIComponent(body)}`;
}
