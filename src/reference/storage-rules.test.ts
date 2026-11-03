import { matchStorageRule, productCodeOf, STORAGE_RULES } from './storage-rules';

const med = (brandName: string, extra: Record<string, string | null> = {}) => ({
  brandName,
  genericName: undefined,
  dosageForm: undefined,
  ndcProductCode: null,
  ...extra,
});

describe('storage rules reference data', () => {
  it('every rule cites an https source and a review date', () => {
    for (const r of STORAGE_RULES) {
      expect(r.sourceUrl).toMatch(/^https:\/\//);
      expect(r.reviewedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.maxRoomTempF).toBe(86);
    }
  });

  it('ids are unique', () => {
    expect(new Set(STORAGE_RULES.map((r) => r.id)).size).toBe(STORAGE_RULES.length);
  });
});

describe('matchStorageRule', () => {
  it('matches by NDC product code', () => {
    expect(matchStorageRule(med('Unknown', { ndcProductCode: '0169-2660-15' }))?.rule.id).toBe('tresiba');
  });

  it('matches by brand name', () => {
    expect(matchStorageRule(med('Humalog KwikPen'))).toMatchObject({ confidence: 'exact', rule: { id: 'humalog' } });
    expect(matchStorageRule(med('LANTUS SoloStar'))?.rule.id).toBe('lantus');
  });

  it('does not match Humalog Mix to the Humalog rule', () => {
    expect(matchStorageRule(med('Humalog Mix 75/25'))).toBeNull();
  });

  it('only suggests FDA general guidance for insulin vials or cartridges, never pens', () => {
    expect(matchStorageRule(med('Insulin', { genericName: 'insulin aspart' }), 'vials')).toMatchObject({ confidence: 'suggested' });
    expect(matchStorageRule(med('Insulin pens', { genericName: 'insulin' }), 'pens')).toBeNull();
  });

  it('returns null for products without a rule', () => {
    expect(matchStorageRule(med('Enbrel'))).toBeNull();
  });

  it('normalizes package NDCs to product codes', () => {
    expect(productCodeOf('0002-7510-01')).toBe('0002-7510');
  });
});
