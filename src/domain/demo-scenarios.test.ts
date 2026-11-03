import { mapAlert } from './alerts';
import { demoFlashFloodWarning, demoWinterStormWarning } from './demo-scenarios';

const now = new Date('2026-10-24T18:00:00Z');

describe('demo scenarios (§26.3)', () => {
  it('flash flood warning is labeled demo and opens the full-screen prompt for flood', () => {
    const a = demoFlashFloodWarning('h', now);
    expect(a.isDemo).toBe(true);
    expect(a.source).toBe('demo');
    expect(a.headline).toMatch(/^DEMO/);
    expect(a.description).toMatch(/not real/);
    expect(mapAlert(a)).toMatchObject({ hazard: 'flood', prompt: 'full-screen' });
  });

  it('winter storm warning maps to winter and is active now', () => {
    const a = demoWinterStormWarning('h', now);
    expect(mapAlert(a).hazard).toBe('winter');
    expect(new Date(a.effective) < now && new Date(a.expires) > now).toBe(true);
  });
});
