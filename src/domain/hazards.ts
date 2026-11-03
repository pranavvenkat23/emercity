import type { Hazard, Tier } from '@/models/types';
import type { Palette } from '@/theme/tokens';

/** §8.7 tab order: Outage · Winter · Flood · Fire · Hazmat · Hurricane. */
export const HAZARD_TAB_ORDER: Hazard[] = ['outage', 'winter', 'flood', 'fire', 'hazmat', 'hurricane'];

/** §12.2 picker order: Flood · Winter storm · Power outage · Fire · Chemical/hazmat · Hurricane. */
export const HAZARD_PICKER_ORDER: Hazard[] = ['flood', 'winter', 'outage', 'fire', 'hazmat', 'hurricane'];

export const HAZARD_LABEL: Record<Hazard, string> = {
  outage: 'Power outage',
  winter: 'Winter storm',
  flood: 'Flood',
  fire: 'Fire',
  hazmat: 'Chemical/hazmat',
  hurricane: 'Hurricane / high wind',
};

export const HAZARD_SHORT_LABEL: Record<Hazard, string> = {
  outage: 'Outage',
  winter: 'Winter',
  flood: 'Flood',
  fire: 'Fire',
  hazmat: 'Hazmat',
  hurricane: 'Hurricane',
};

export function hazardColor(h: Hazard, p: Palette): string {
  switch (h) {
    case 'flood':
      return p.hazardFlood;
    case 'winter':
      return p.hazardWinter;
    case 'outage':
      return p.hazardOutage;
    case 'fire':
      return p.hazardFire;
    case 'hazmat':
      return p.hazardHazmat;
    case 'hurricane':
      return p.hazardHurricane;
  }
}

export const TIER_LABEL: Record<Tier, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  important: 'Important',
  standard: 'Standard',
};

export function tierColor(t: Tier, p: Palette): string {
  switch (t) {
    case 'critical':
      return p.severityCritical;
    case 'urgent':
      return p.severityUrgent;
    case 'important':
      return p.severityImportant;
    case 'standard':
      return p.severityStandard;
  }
}

/** Lower is more severe; for sorting. */
export function tierRank(t: Tier): number {
  return { critical: 0, urgent: 1, important: 2, standard: 3 }[t];
}

export function isHazard(value: unknown): value is Hazard {
  return typeof value === 'string' && (HAZARD_TAB_ORDER as string[]).includes(value);
}
