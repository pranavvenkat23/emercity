import { buildDemoHousehold } from '@/data/demo-household';
import { HAZARDS } from '@/models/types';

import { GUIDE_REVIEW, GUIDES, guideOfTheWeek, guidesForHazard, guidesForHousehold, searchGuides } from './index';

describe('guide library (§18)', () => {
  it('has unique ids', () => {
    expect(new Set(GUIDES.map((g) => g.id)).size).toBe(GUIDES.length);
  });

  it.each(GUIDES.map((g) => [g.id, g]))('%s is well-formed', (_id, g) => {
    expect(g.doNow.length).toBeGreaterThanOrEqual(3);
    expect(g.doNow.length).toBeLessThanOrEqual(5);
    expect(g.sources.length).toBeGreaterThan(0);
    g.sources.forEach((s) => expect(s.url).toMatch(/^https:\/\//));
    // Sections stay short (§18.2: each under 100 words).
    g.sections.forEach((s) => expect(s.body.split(/\s+/).length).toBeLessThan(100));
  });

  it('covers every hazard', () => {
    for (const h of HAZARDS) expect(guidesForHazard(h).length).toBeGreaterThan(0);
  });

  it('is honest about review status', () => {
    expect(GUIDE_REVIEW.reviewed).toBe(false);
  });

  it('searches offline across titles and text, title hits first', () => {
    const r = searchGuides('generator');
    expect(r[0].id).toBe('generator-safety');
    expect(searchGuides('insulin cooler').map((g) => g.id)).toContain('insulin-outage');
    expect(searchGuides('')).toEqual([]);
    expect(searchGuides('zzzz-nothing')).toEqual([]);
  });

  it('matches guides to the demo household', () => {
    const ids = guidesForHousehold(buildDemoHousehold(), ['outage']).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(['insulin-outage', 'devices-outage']));
    expect(ids.length).toBeLessThanOrEqual(6);
  });

  it('picks a seasonal guide of the week, stable within the week', () => {
    const snap = buildDemoHousehold();
    const a = guideOfTheWeek(snap, ['outage'], new Date(2026, 9, 20));
    const b = guideOfTheWeek(snap, ['outage'], new Date(2026, 9, 21));
    expect(a?.hazards.some((h) => h === 'winter' || h === 'outage')).toBe(true);
    expect(a?.id).toBe(b?.id);
  });
});
