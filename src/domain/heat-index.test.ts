import { heatIndexF } from './heat-index';

describe('heatIndexF (NWS equation)', () => {
  // Reference values from the NWS heat index chart.
  it.each([
    [90, 50, 95],
    [96, 40, 101],
    [100, 60, 129],
    [86, 90, 105],
  ])('%i°F at %i%% RH ≈ %i°F', (t, rh, expected) => {
    expect(Math.abs(heatIndexF(t, rh) - expected)).toBeLessThanOrEqual(2);
  });

  it('uses the simple formula below 80°F', () => {
    expect(heatIndexF(70, 50)).toBeLessThan(75);
  });
});
