import fixture from './__fixtures__/nws-alerts-leesburg.json';
import { toAlert } from './nws';

describe('NWS alert parsing (real response captured 2026-10-24, Leesburg VA)', () => {
  const f = (fixture as { features: Parameters<typeof toAlert>[0][] }).features[0];
  const a = toAlert(f, 'hh');

  it('keeps the official fields as issued', () => {
    expect(a.source).toBe('NWS');
    expect(a.event).toBe(f.properties.event);
    expect(a.description).toBe(f.properties.description ?? '');
    expect(a.instruction).toBe(f.properties.instruction ?? '');
    expect(a.senderName).toBe(f.properties.senderName);
  });

  it('marks point-query alerts as affecting the address and links the official page', () => {
    expect(a.affectsAddress).toBe(true);
    expect(a.url).toMatch(/^https:\/\/api\.weather\.gov\/alerts\//);
    expect(a.householdId).toBe('hh');
  });

  it('uses onset/ends when present', () => {
    expect(a.effective).toBe(f.properties.onset ?? f.properties.effective);
    expect(a.expires).toBe(f.properties.ends ?? f.properties.expires);
  });
});
