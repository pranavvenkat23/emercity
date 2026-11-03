import type { ConditionType, DeviceType, Hazard, Tier } from '@/models/types';

/** Offline guide article (§18.2). Bundled; works without signal. */
export interface Guide {
  id: string;
  title: string;
  hazards: Hazard[];
  topics: GuideTopic[];
  readMinutes: number;
  /** 3–5 numbered imperative steps, same wording as playbooks. */
  doNow: string[];
  sections: { heading: string; body: string; callout?: { tier: Tier; text: string } }[];
  sources: { name: string; url: string }[];
  /** Matches household facts for "For your household" (§18.1). */
  match?: { conditions?: ConditionType[]; devices?: DeviceType[]; pets?: boolean; infants?: boolean; olderAdults?: boolean; children?: boolean };
}

export type GuideTopic =
  | 'Medications'
  | 'Medical devices'
  | 'Pets'
  | 'Kids'
  | 'Older adults'
  | 'Disabilities'
  | 'Food and water'
  | 'Generators and safety'
  | 'After the emergency';

/** §18.2 "Reviewed [date] by [reviewer]". No guide has been reviewed yet. */
export const GUIDE_REVIEW = { reviewed: false, reviewer: null as string | null, date: null as string | null };
