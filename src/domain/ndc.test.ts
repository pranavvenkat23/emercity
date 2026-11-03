import { criticalClass, gs1CheckDigit, ndcFromBarcode, ndcFromGtin, ndcHyphenations, normalizeManualNdc, parseGs1 } from './ndc';

/** Build a UPC-A for an NDC10 with number system 3. */
function upcFor(ndc10: string): string {
  const body = `3${ndc10}`;
  return body + gs1CheckDigit(body);
}

describe('UPC/EAN to NDC (§13.3)', () => {
  it('strips the leading 3 and the check digit', () => {
    const upc = upcFor('0002751001'); // Humalog 0002-7510-01
    expect(ndcFromGtin(upc)).toEqual({ ndc10: '0002751001' });
  });

  it('accepts EAN-13 with a leading zero and GTIN-14 with indicator 00', () => {
    const upc = upcFor('0169266015');
    expect(ndcFromGtin(`0${upc}`).ndc10).toBe('0169266015');
    expect(ndcFromGtin(`00${upc}`).ndc10).toBe('0169266015');
  });

  it('flags pharmacy-sticker barcodes (not number system 3)', () => {
    const body = '41234567890';
    expect(ndcFromGtin(body + gs1CheckDigit(body)).reason).toBe('pharmacy-label');
  });

  it('rejects bad check digits and wrong lengths', () => {
    const upc = upcFor('0002751001');
    const bad = upc.slice(0, -1) + String((Number(upc.slice(-1)) + 1) % 10);
    expect(ndcFromGtin(bad).reason).toBe('bad-check-digit');
    expect(ndcFromGtin('12345').reason).toBe('not-a-drug-code');
  });
});

describe('GS1 DataMatrix (§13.3)', () => {
  const gtin = `00${upcFor('0002751001')}`;

  it('reads GTIN, expiration and lot with FNC1 separators', () => {
    const r = parseGs1(`01${gtin}17271231` + `10ABC123\u001d21SERIAL9`);
    expect(r).toMatchObject({ ndc10: '0002751001', expiration: '2027-12-31', lot: 'ABC123' });
  });

  it('reads the human-readable (AI) form', () => {
    expect(parseGs1(`(01)${gtin}(17)280600(10)LOT7`)).toMatchObject({ ndc10: '0002751001', expiration: '2028-06-30', lot: 'LOT7' });
  });

  it('routes by barcode type', () => {
    expect(ndcFromBarcode('datamatrix', `01${gtin}17271231`).ndc10).toBe('0002751001');
    expect(ndcFromBarcode('upc_a', upcFor('0169266015')).ndc10).toBe('0169266015');
  });
});

describe('NDC formats', () => {
  it('produces all three 10-digit hyphenations', () => {
    expect(ndcHyphenations('0002751001')).toEqual(['0002-7510-01', '00027-510-01', '00027-5100-1']);
    expect(ndcHyphenations('123')).toEqual([]);
  });

  it('normalizes manual 10- and 11-digit entries', () => {
    expect(normalizeManualNdc('0002-7510-01')).toEqual(['0002-7510-01']);
    // An 11-digit code can come from 4-4-2 or 5-4-1; both candidates are tried against the directory.
    expect(normalizeManualNdc('00002-7510-01')).toEqual(['0002-7510-01', '00002-7510-1']);
    expect(normalizeManualNdc('00002751001')).toContain('0002-7510-01');
    expect(normalizeManualNdc('0002751001')).toHaveLength(3);
    expect(normalizeManualNdc('abc')).toEqual([]);
  });
});

describe('critical classes (§13.5)', () => {
  it.each([
    ['INSULIN LISPRO', 'insulin'],
    ['levetiracetam', 'anticonvulsant'],
    ['APIXABAN', 'anticoagulant'],
    ['tacrolimus', 'transplant'],
    ['EPINEPHRINE', 'epinephrine'],
    ['albuterol sulfate', 'rescue inhaler'],
  ])('%s to %s', (name, klass) => expect(criticalClass(name)).toBe(klass));

  it('does not flag ordinary medicines', () => {
    expect(criticalClass('ibuprofen')).toBeNull();
    expect(criticalClass('lisinopril')).toBeNull();
  });
});
