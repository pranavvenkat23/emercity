import type { Medication, StorageRule } from '@/models/types';

/**
 * Bundled medication storage rules (§4.2 StorageRule, §11.2). Every number
 * below was copied from the cited official source on the date in
 * `reviewedDate` (the date the source was checked by the developer, NOT a
 * clinical review). Products without a rule show "No safe-time data" and
 * ask for the value from the package insert; nothing is guessed.
 *
 * Sources:
 *  - FDA, "Information Regarding Insulin Storage and Switching Between
 *    Products in an Emergency" (content current as of 09/28/2026).
 *  - Manufacturer prescribing information on DailyMed (NLM), §16.2.
 */
export const STORAGE_RULES: StorageRule[] = [
  {
    id: 'fda-insulin-emergency',
    productName: 'Insulin vials and cartridges (FDA emergency guidance)',
    ndcProductCodes: [],
    unopenedRefrigerated: 'Keep refrigerated until the expiration date when possible.',
    unopenedRoomTempDays: 28,
    openedRoomTempDays: 28,
    maxRoomTempF: 86,
    minTempF: 59,
    notes:
      'Applies to manufacturer vials and cartridges, opened or unopened, kept between 59°F and 86°F. Do not use insulin that has been frozen; if using ice, avoid freezing it. Keep away from direct heat and sunlight. Insulin in a pump exposed to temperatures above 98.6°F should be discarded. Diluted or transferred insulin: discard within two weeks.',
    sourceName: 'FDA',
    sourceUrl:
      'https://www.fda.gov/drugs/emergency-preparedness-drugs/information-regarding-insulin-storage-and-switching-between-products-emergency',
    reviewedDate: '2026-10-24',
  },
  {
    id: 'awiqli',
    productName: 'Awiqli (insulin icodec) pens',
    ndcProductCodes: [],
    unopenedRefrigerated: 'Keep refrigerated until first use when possible.',
    unopenedRoomTempDays: 84,
    openedRoomTempDays: 84,
    maxRoomTempF: 86,
    minTempF: 32,
    notes: 'Up to 12 weeks below 86°F in total, opened or unopened. Do not freeze; do not use if frozen.',
    sourceName: 'FDA',
    sourceUrl:
      'https://www.fda.gov/drugs/emergency-preparedness-drugs/information-regarding-insulin-storage-and-switching-between-products-emergency',
    reviewedDate: '2026-10-24',
  },
  {
    id: 'humalog',
    productName: 'Humalog (insulin lispro) U-100 / U-200, vials, cartridges, KwikPen, Tempo Pen',
    ndcProductCodes: ['0002-0800', '0002-7510', '0002-7516', '0002-7533', '0002-7712', '0002-7714', '0002-8213', '0002-8799'],
    unopenedRefrigerated: 'Refrigerated (36–46°F): until the expiration date.',
    unopenedRoomTempDays: 28,
    openedRoomTempDays: 28,
    maxRoomTempF: 86,
    minTempF: 32,
    notes: 'Up to 86°F for 28 days total at room temperature. Do not freeze and do not use if it has been frozen.',
    sourceName: 'Humalog label (Eli Lilly), DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c8ecbd7a-0e22-4fc7-a503-faa58c1b6f3f',
    reviewedDate: '2026-10-24',
  },
  {
    id: 'lantus',
    productName: 'Lantus (insulin glargine), 10 mL vial, SoloStar pen',
    ndcProductCodes: ['0088-2219', '0088-2220'],
    unopenedRefrigerated: 'Refrigerated (36–46°F): until the expiration date.',
    unopenedRoomTempDays: 28,
    openedRoomTempDays: 28,
    maxRoomTempF: 86,
    minTempF: 32,
    notes: 'Up to 86°F for 28 days. In-use SoloStar pens: room temperature only, do not refrigerate. Do not freeze; discard if frozen.',
    sourceName: 'Lantus label (sanofi-aventis), DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5e07a0c-7e14-4756-9152-9fea485d654a',
    reviewedDate: '2026-10-24',
  },
  {
    id: 'tresiba',
    productName: 'Tresiba (insulin degludec), FlexTouch pens and vials',
    ndcProductCodes: ['0169-2550', '0169-2660', '0169-2662'],
    unopenedRefrigerated: 'Refrigerated (36–46°F): until the expiration date.',
    unopenedRoomTempDays: 56,
    openedRoomTempDays: 56,
    maxRoomTempF: 86,
    minTempF: 32,
    notes: 'Up to 86°F for 56 days (8 weeks), opened or unopened. Do not freeze; do not use if it has been frozen.',
    sourceName: 'Tresiba label (Novo Nordisk), DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=456c5e87-3dfd-46fa-8ac0-c6128d4c97c6',
    reviewedDate: '2026-10-24',
  },
];

export const STORAGE_RULES_BY_ID: Record<string, StorageRule> = Object.fromEntries(STORAGE_RULES.map((r) => [r.id, r]));

/** "0002-7510-01" / "00002751001" to "0002-7510" product code when hyphenated. */
export function productCodeOf(ndc: string): string {
  const parts = ndc.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : ndc;
}

export interface RuleMatch {
  rule: StorageRule;
  /** exact = NDC or brand name matched; suggested = general guidance the user must confirm. */
  confidence: 'exact' | 'suggested';
}

const NAME_MATCH: { id: string; pattern: RegExp }[] = [
  { id: 'humalog', pattern: /\bhumalog\b(?!\s*mix)/i },
  { id: 'lantus', pattern: /\blantus\b/i },
  { id: 'tresiba', pattern: /\btresiba\b/i },
  { id: 'awiqli', pattern: /\bawiqli\b/i },
];

/**
 * Finds the storage rule for a medication: NDC product code first, then
 * brand name. For other insulins kept in vials or cartridges, the FDA
 * emergency guidance is *suggested* and must be confirmed by the user;
 * pens are never auto-matched to it because pen limits vary by product.
 */
export function matchStorageRule(
  med: Pick<Medication, 'ndcProductCode' | 'brandName' | 'genericName' | 'dosageForm'>,
  insulinForm?: 'pens' | 'vials' | 'pump',
): RuleMatch | null {
  if (med.ndcProductCode) {
    const code = productCodeOf(med.ndcProductCode);
    const byNdc = STORAGE_RULES.find((r) => r.ndcProductCodes.includes(code));
    if (byNdc) return { rule: byNdc, confidence: 'exact' };
  }
  const name = `${med.brandName} ${med.genericName ?? ''}`;
  const byName = NAME_MATCH.find((n) => n.pattern.test(name));
  if (byName) return { rule: STORAGE_RULES_BY_ID[byName.id], confidence: 'exact' };
  if (/insulin/i.test(name) && (insulinForm === 'vials' || /vial|cartridge/i.test(`${med.dosageForm ?? ''} ${med.brandName}`))) {
    return { rule: STORAGE_RULES_BY_ID['fda-insulin-emergency'], confidence: 'suggested' };
  }
  return null;
}
