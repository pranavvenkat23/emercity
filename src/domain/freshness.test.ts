import { formatAge, formatDuration, freshness, spokenDuration } from './freshness';

const NOW = new Date('2026-10-24T20:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('freshness windows (§21.4)', () => {
  it('alerts go stale after 10 minutes', () => {
    expect(freshness('alerts', ago(9 * 60_000), NOW)).toBe('fresh');
    expect(freshness('alerts', ago(11 * 60_000), NOW)).toBe('stale');
  });
  it('shelter status stays fresh for 6 hours', () => {
    expect(freshness('shelter', ago(5.9 * 3_600_000), NOW)).toBe('fresh');
    expect(freshness('shelter', ago(6.1 * 3_600_000), NOW)).toBe('stale');
  });
  it('never-fetched and unparseable values are "never", not fresh', () => {
    expect(freshness('gauge', null, NOW)).toBe('never');
    expect(freshness('gauge', 'garbage', NOW)).toBe('never');
  });
});

describe('formatAge', () => {
  it.each([
    [10_000, 'just now'],
    [4 * 60_000, '4 min ago'],
    [3 * 3_600_000, '3 h ago'],
    [3 * 86_400_000, '3 d ago'],
  ])('%i ms to %s', (ms, label) => expect(formatAge(ago(ms), NOW)).toBe(label));
});

describe('formatDuration (§11.4 tile digits)', () => {
  it.each([
    [0, '0:00'],
    [-5, '0:00'],
    [(3 * 60 + 12) * 60_000, '3:12'],
    [47 * 3_600_000, '47:00'],
    [26 * 86_400_000, '26 d'],
  ])('%i ms to %s', (ms, label) => expect(formatDuration(ms)).toBe(label));
});

describe('spokenDuration', () => {
  it('reads naturally', () => {
    expect(spokenDuration((3 * 60 + 12) * 60_000)).toBe('3 hours 12 minutes');
    expect(spokenDuration(60 * 60_000)).toBe('1 hour');
    expect(spokenDuration(5 * 60_000)).toBe('5 minutes');
    expect(spokenDuration(0)).toBe('no time');
  });
});
