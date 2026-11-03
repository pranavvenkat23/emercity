import { alertLevel, instructionExcerpt, isActive, issuingOffice, mapAlert, sortAlerts } from './alerts';

const a = (event: string, extra: Partial<{ headline: string; description: string }> = {}) => ({
  event,
  headline: extra.headline ?? '',
  description: extra.description ?? '',
});

describe('mapAlert (§10.3)', () => {
  it.each([
    ['Flash Flood Warning', 'flood', 'full-screen'],
    ['Flood Watch', 'flood', 'banner'],
    ['Winter Storm Warning', 'winter', 'full-screen'],
    ['Ice Storm Warning', 'winter', 'full-screen'],
    ['Winter Weather Advisory', 'winter', 'banner'],
    ['Extreme Cold Warning', 'outage', 'banner'],
    ['High Wind Warning', 'outage', 'banner'],
    ['Tornado Warning', 'hurricane', 'full-screen'],
    ['Hurricane Warning', 'hurricane', 'full-screen'],
    ['Hazardous Materials Warning', 'hazmat', 'full-screen'],
    ['Shelter In Place Warning', 'hazmat', 'full-screen'],
    ['Civil Emergency Message', 'hazmat', 'full-screen'],
    ['Fire Warning', 'fire', 'full-screen'],
    ['Red Flag Warning', 'fire', 'banner'],
  ] as const)('%s to %s / %s', (event, hazard, prompt) => {
    expect(mapAlert(a(event))).toMatchObject({ hazard, prompt });
  });

  it('tornado warnings start with "Take shelter now"', () => {
    expect(mapAlert(a('Tornado Warning')).firstStep).toMatch(/^Take shelter now/);
  });

  it('Evacuation Immediate follows the alert text, else fire', () => {
    expect(mapAlert(a('Evacuation Immediate', { description: 'Dam failure upstream; flooding expected' }))).toMatchObject({ hazard: 'flood', firstStep: 'Leave now. Take only your go-bag.' });
    expect(mapAlert(a('Evacuation Immediate', { description: 'Chemical release at plant' })).hazard).toBe('hazmat');
    expect(mapAlert(a('Evacuation Immediate')).hazard).toBe('fire');
  });

  it('unknown events map to no hazard and only a banner', () => {
    expect(mapAlert(a('Special Weather Statement'))).toEqual({ hazard: null, prompt: 'banner' });
  });
});

describe('alert ordering', () => {
  it('ranks Warning > Watch > Advisory > Statement', () => {
    expect(alertLevel('Flood Warning')).toBe('warning');
    expect(alertLevel('Flood Watch')).toBe('watch');
    expect(alertLevel('Wind Advisory')).toBe('advisory');
    expect(alertLevel('Hydrologic Statement')).toBe('statement');
    const sorted = sortAlerts([
      { event: 'Wind Advisory', expires: '2026-10-25T00:00:00Z' },
      { event: 'Flood Warning', expires: '2026-10-25T05:00:00Z' },
      { event: 'Flood Watch', expires: '2026-10-25T01:00:00Z' },
    ]);
    expect(sorted.map((x) => x.event)).toEqual(['Flood Warning', 'Flood Watch', 'Wind Advisory']);
  });
});

describe('helpers', () => {
  it('isActive respects effective and expires', () => {
    const now = new Date('2026-10-24T20:00:00Z');
    expect(isActive({ effective: '2026-10-24T19:00:00Z', expires: '2026-10-24T21:00:00Z' }, now)).toBe(true);
    expect(isActive({ effective: '2026-10-24T19:00:00Z', expires: '2026-10-24T19:30:00Z' }, now)).toBe(false);
  });
  it('excerpts the first sentence of the instruction', () => {
    expect(instructionExcerpt({ instruction: 'Move to higher ground now. Act quickly.', description: '' })).toBe('Move to higher ground now.');
  });
  it('formats the issuing office', () => {
    expect(issuingOffice('NWS Sterling VA')).toBe('NWS Sterling, VA');
    expect(issuingOffice(null)).toBe('National Weather Service');
  });
});
