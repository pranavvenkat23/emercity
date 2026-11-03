import type { CheckIn } from '@/models/types';

import { memberStatuses, smsBody, smsUrl } from './checkins';

const session = { id: 's1', startedAt: '2026-10-24T20:00:00Z' };
const ci = (memberId: string, status: CheckIn['status'], minute: number, extra: Partial<CheckIn> = {}): CheckIn => ({
  id: `${memberId}-${minute}`,
  createdAt: '',
  updatedAt: '',
  sessionId: 's1',
  memberId,
  status,
  timestamp: new Date(Date.UTC(2026, 9, 24, 20, minute)).toISOString(),
  reportedBy: memberId,
  ...extra,
});

describe('memberStatuses (§12.7)', () => {
  const members = [{ id: 'mom' }, { id: 'dad' }, { id: 'kid' }];

  it('uses the latest check-in per member', () => {
    const r = memberStatuses(members, session, [ci('mom', 'on-my-way', 2), ci('mom', 'safe', 9)], new Date('2026-10-24T20:10:00Z'));
    expect(r.find((x) => x.memberId === 'mom')).toMatchObject({ status: 'safe' });
  });

  it('shows "waiting" before 15 minutes and "no-response" after, never unsafe', () => {
    const early = memberStatuses(members, session, [], new Date('2026-10-24T20:14:00Z'));
    expect(early.every((x) => x.status === 'waiting')).toBe(true);
    const late = memberStatuses(members, session, [], new Date('2026-10-24T20:15:00Z'));
    expect(late.every((x) => x.status === 'no-response')).toBe(true);
    expect(late.some((x) => x.status === 'need-help')).toBe(false);
  });

  it('ignores check-ins from other sessions', () => {
    const r = memberStatuses(members, session, [{ ...ci('dad', 'safe', 1), sessionId: 'other' }], new Date('2026-10-24T20:05:00Z'));
    expect(r.find((x) => x.memberId === 'dad')?.status).toBe('waiting');
  });

  it('keeps who reported a dependent’s status', () => {
    const r = memberStatuses(members, session, [ci('kid', 'safe', 3, { reportedBy: 'mom', message: 'With Mom' })], new Date('2026-10-24T20:05:00Z'));
    expect(r.find((x) => x.memberId === 'kid')).toMatchObject({ reportedBy: 'mom', message: 'With Mom' });
  });
});

describe('SMS fallback', () => {
  it('builds the message', () => {
    expect(smsBody('safe', 'at home')).toBe("I'm safe: at home");
    expect(smsBody('need-help')).toBe('I need help.');
  });
  it('builds platform URLs with several recipients', () => {
    expect(smsUrl(['703-555-0101', '(703) 555-0102'], 'Hi', 'android')).toBe('sms:7035550101,7035550102?body=Hi');
    expect(smsUrl(['703-555-0101'], 'Hi there', 'ios')).toBe('sms:/open?addresses=7035550101&body=Hi%20there');
  });
});
