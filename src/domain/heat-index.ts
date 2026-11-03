/**
 * Heat index (°F) from temperature (°F) and relative humidity (%), using
 * the National Weather Service equation (Rothfusz regression with the NWS
 * adjustments; simple formula below 80°F).
 * Source: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 */
export function heatIndexF(tempF: number, rh: number): number {
  const simple = 0.5 * (tempF + 61 + (tempF - 68) * 1.2 + rh * 0.094);
  if ((simple + tempF) / 2 < 80) return Math.round(simple);
  const T = tempF;
  const R = rh;
  let hi =
    -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5);
  return Math.round(hi);
}
