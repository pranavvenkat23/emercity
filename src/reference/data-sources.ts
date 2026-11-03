import { STORAGE_RULES } from './storage-rules';

/**
 * Every outside source the app uses (SET-08, §9.1 honesty rule). Kept in
 * one place so the screen and the code can't drift apart.
 */
export interface DataSource {
  name: string;
  use: string;
  url: string;
  coverage: 'Loudoun County' | 'National' | 'Map' | 'Reference';
  live: boolean;
}

export const DATA_SOURCES: DataSource[] = [
  { name: 'National Weather Service (api.weather.gov)', use: 'Alerts for your address and temperature', url: 'https://www.weather.gov/documentation/services-web-api', coverage: 'National', live: true },
  { name: 'NOAA National Water Prediction Service', use: 'River gauges, flood stages and forecasts', url: 'https://water.noaa.gov', coverage: 'National', live: true },
  { name: 'FEMA National Flood Hazard Layer', use: 'Flood zone for your address and the flood map layer', url: 'https://www.fema.gov/flood-maps/national-flood-hazard-layer', coverage: 'National', live: true },
  { name: 'FEMA Open Shelters (National Shelter System)', use: 'Open shelters and their status', url: 'https://gis.fema.gov', coverage: 'National', live: true },
  { name: 'USGS National Hydrography Dataset', use: 'Distance to the nearest stream', url: 'https://www.usgs.gov/national-hydrography/national-hydrography-dataset', coverage: 'National', live: true },
  { name: 'U.S. DOT North American Rail Network', use: 'Rail lines near you', url: 'https://geodata.bts.gov/datasets/usdot::north-american-rail-network-lines', coverage: 'National', live: true },
  { name: 'EPA Toxics Release Inventory facilities', use: 'Sites that report hazardous chemicals', url: 'https://www.epa.gov/toxics-release-inventory-tri-program', coverage: 'National', live: true },
  { name: 'U.S. Census Bureau Geocoder', use: 'Finding your address and county', url: 'https://geocoding.geo.census.gov', coverage: 'National', live: true },
  { name: 'openFDA NDC Directory', use: 'Looking up a medicine from its barcode', url: 'https://open.fda.gov/apis/drug/ndc/', coverage: 'National', live: true },
  { name: 'Loudoun County GIS', use: 'Hospitals, urgent care, fire stations and first-due areas', url: 'https://logis.loudoun.gov', coverage: 'Loudoun County', live: true },
  { name: 'OpenFreeMap / OpenStreetMap contributors', use: 'Base map', url: 'https://openfreemap.org', coverage: 'Map', live: true },
  { name: 'USDA Food Safety and Inspection Service', use: 'Fridge and freezer food times in an outage', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/emergencies/keep-your-food-safe-during-emergencies', coverage: 'Reference', live: false },
  ...STORAGE_RULES.map((r) => ({ name: r.sourceName, use: `Storage limits: ${r.productName ?? r.id}`, url: r.sourceUrl, coverage: 'Reference' as const, live: false })),
];

/** Not available, said plainly rather than filled with a guess. */
export const MISSING_SOURCES = [
  'County power-outage history (DOE/ORNL EAGLE-I) isn’t in the app yet, so outage frequency shows as Unknown.',
  'Live power-outage maps aren’t connected.',
  'Cooler hold times have no official source, so the app only uses your own estimate.',
];
