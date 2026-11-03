import { buildDemoHousehold } from '@/data/demo-household';

import { meetingPointWarnings } from './meeting-points';

describe('meetingPointWarnings (§16.4)', () => {
  const demo = buildDemoHousehold();
  it('never warns unless the user marked stairs or slopes', () => {
    expect(meetingPointWarnings(demo, { pathHasStairsOrSlopes: false })).toEqual([]);
    expect(meetingPointWarnings(demo, {})).toEqual([]);
  });
  it('warns for members with mobility needs when marked', () => {
    const w = meetingPointWarnings(demo, { pathHasStairsOrSlopes: true });
    expect(w.length).toBeGreaterThan(0);
    expect(w.join(' ')).toMatch(/stairs or slopes/);
  });
});
