import { gaugeAlert, gaugeTrend } from './gauge';

const NOW = new Date('2026-10-24T20:00:00Z');
const at = (h: number, ft: number) => ({ t: new Date(NOW.getTime() + h * 3_600_000).toISOString(), ft });
const g = (stageFt: number | null, forecast: { t: string; ft: number }[] = []) => ({ name: 'Goose Creek', stageFt, flood: { action: 10, minor: 12 }, forecast });

describe('gaugeTrend', () => {
  it('compares to 3 hours earlier', () => {
    expect(gaugeTrend([at(-4, 1.0), at(-3, 1.0), at(0, 1.5)])).toBe('rising');
    expect(gaugeTrend([at(-3, 2.0), at(0, 1.5)])).toBe('falling');
    expect(gaugeTrend([at(-3, 1.5), at(0, 1.55)])).toBe('steady');
    expect(gaugeTrend([at(-1, 1.5), at(0, 1.6)])).toBe('unknown');
  });
});

describe('gaugeAlert (§10.4)', () => {
  it('no alert in normal conditions', () => {
    expect(gaugeAlert(g(1.5, [at(6, 1.6)]), 'high', NOW)).toBeNull();
  });
  it('forecast to reach action within 24 h to Important', () => {
    expect(gaugeAlert(g(5, [at(10, 10.5)]), 'low', NOW)).toMatchObject({ tier: 'important', fullScreen: false });
    expect(gaugeAlert(g(5, [at(30, 10.5)]), 'low', NOW)).toBeNull();
  });
  it('observed at action to Urgent', () => {
    expect(gaugeAlert(g(10.2), 'low', NOW)).toMatchObject({ tier: 'urgent' });
  });
  it('minor flood + high-risk home to Critical full-screen; not for low-risk homes', () => {
    expect(gaugeAlert(g(9, [at(5, 12.5)]), 'high', NOW)).toMatchObject({ tier: 'critical', fullScreen: true });
    expect(gaugeAlert(g(9, [at(5, 12.5)]), 'low', NOW)?.tier).toBe('important');
  });
  it('keeps household details out of the message', () => {
    expect(gaugeAlert(g(13), 'high', NOW)?.body).toBe('Goose Creek is flooding or forecast to flood. Open flood steps.');
  });
});
