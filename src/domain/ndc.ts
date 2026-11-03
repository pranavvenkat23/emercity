/**
 * National Drug Code handling for barcode scans (§13.3). Deterministic , 
 * no OCR, no guessing.
 */

export interface ScanResult {
  /** 10-digit NDC without hyphens, if one could be derived. */
  ndc10: string | null;
  /** GS1 extras when the code is a DataMatrix/DataBar. */
  expiration?: string | null;
  lot?: string | null;
  /** Why no NDC could be found (shown to the user). */
  reason?: 'pharmacy-label' | 'not-a-drug-code' | 'bad-check-digit';
}

/** GS1 mod-10 check digit for the digits before it. */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

function validCheck(code: string): boolean {
  return gs1CheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);
}

/**
 * UPC-A (12) / EAN-13 / GTIN-14 to NDC10. U.S. drug packages use number
 * system 3: strip the leading "3" and the check digit (§13.3).
 */
export function ndcFromGtin(raw: string): ScanResult {
  const digits = raw.replace(/\D/g, '');
  let code = digits;
  if (code.length === 14 && code.startsWith('00')) code = code.slice(2); // GTIN-14 with packaging indicator 0 to UPC-A
  else if (code.length === 14) code = code.slice(1, 13) + code.slice(13); // keep indicator-stripped 13 digits
  if (code.length === 13 && code.startsWith('0')) code = code.slice(1); // EAN-13 with leading 0 = UPC-A
  if (code.length === 13 && code.startsWith('03')) code = code.slice(1);
  if (code.length !== 12) return { ndc10: null, reason: 'not-a-drug-code' };
  if (!validCheck(code)) return { ndc10: null, reason: 'bad-check-digit' };
  if (code[0] !== '3') return { ndc10: null, reason: 'pharmacy-label' };
  return { ndc10: code.slice(1, 11) };
}

const GS = '\u001d';

/**
 * GS1 element string (DataMatrix/DataBar, §13.3): AI 01 GTIN, AI 17
 * expiration (YYMMDD), AI 10 lot. Handles FNC1/GS separators and
 * "(01)…" human-readable form.
 */
export function parseGs1(raw: string): ScanResult {
  let s = raw.replace(/^\]d2|^\]e0|^\]C1/, '');
  if (s.includes('(')) {
    s = s.replace(/\((\d{2,4})\)/g, (_m, ai) => `${GS}${ai}`).replace(/^\u001d/, '');
  }
  let gtin: string | null = null;
  let expiration: string | null = null;
  let lot: string | null = null;
  let i = 0;
  while (i < s.length) {
    if (s[i] === GS) {
      i++;
      continue;
    }
    const ai = s.slice(i, i + 2);
    if (ai === '01') {
      gtin = s.slice(i + 2, i + 16);
      i += 16;
    } else if (ai === '17') {
      const v = s.slice(i + 2, i + 8);
      const yy = Number(v.slice(0, 2));
      const mm = v.slice(2, 4);
      let dd = v.slice(4, 6);
      if (dd === '00') {
        // DD 00 means the last day of the month (GS1).
        dd = String(new Date(2000 + yy, Number(mm), 0).getDate()).padStart(2, '0');
      }
      expiration = `${2000 + yy}-${mm}-${dd}`;
      i += 8;
    } else if (ai === '10' || ai === '21') {
      const end = s.indexOf(GS, i + 2);
      const value = s.slice(i + 2, end < 0 ? undefined : end);
      if (ai === '10') lot = value;
      i = end < 0 ? s.length : end;
    } else {
      // Unknown AI: skip to the next separator.
      const end = s.indexOf(GS, i);
      i = end < 0 ? s.length : end;
    }
  }
  if (!gtin) return { ndc10: null, reason: 'not-a-drug-code', expiration, lot };
  const r = ndcFromGtin(gtin);
  return { ...r, expiration, lot };
}

/** Any scanned value to NDC (UPC/EAN/GTIN or GS1 string). */
export function ndcFromBarcode(type: string, data: string): ScanResult {
  if (/datamatrix|databar|gs1|rss|code128/i.test(type) || data.includes(GS) || data.startsWith('01') && data.length > 16 || data.startsWith('(01)')) {
    return parseGs1(data);
  }
  return ndcFromGtin(data);
}

/**
 * A 10-digit NDC can be 4-4-2, 5-3-2, or 5-4-1 (§13.3). Returns all three
 * hyphenations in the 11-digit-friendly order to try against the directory.
 */
export function ndcHyphenations(ndc10: string): string[] {
  const d = ndc10.replace(/\D/g, '');
  if (d.length !== 10) return [];
  return [`${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`, `${d.slice(0, 5)}-${d.slice(5, 8)}-${d.slice(8)}`, `${d.slice(0, 5)}-${d.slice(5, 9)}-${d.slice(9)}`];
}

/**
 * Manual entry (§13.2 "Enter NDC number"): accepts 10 or 11 digits, with or
 * without hyphens. 11-digit (5-4-2) codes are converted back to the
 * possible 10-digit forms by dropping a padding zero.
 */
export function normalizeManualNdc(input: string): string[] {
  const t = input.trim();
  if (/^\d{4,5}-\d{3,4}-\d{1,2}$/.test(t)) {
    const [a, b, c] = t.split('-');
    if (a.length + b.length + c.length === 10) return [t];
    if (a.length === 5 && b.length === 4 && c.length === 2) {
      const out: string[] = [];
      if (a.startsWith('0')) out.push(`${a.slice(1)}-${b}-${c}`);
      if (b.startsWith('0')) out.push(`${a}-${b.slice(1)}-${c}`);
      if (c.startsWith('0')) out.push(`${a}-${b}-${c.slice(1)}`);
      return out;
    }
    return [];
  }
  const d = t.replace(/\D/g, '');
  if (d.length === 10) return ndcHyphenations(d);
  if (d.length === 11) return normalizeManualNdc(`${d.slice(0, 5)}-${d.slice(5, 9)}-${d.slice(9)}`);
  return [];
}

/**
 * Critical medicine classes auto-flagged on scan/add (§4.2, §13.5):
 * insulin, anticonvulsants, anticoagulants, transplant/immunosuppressants,
 * epinephrine auto-injectors, inhaled rescue medicines. The user can always
 * change the flag. Matching is by active ingredient name.
 */
const CRITICAL_INGREDIENTS: { klass: string; names: RegExp }[] = [
  { klass: 'insulin', names: /\binsulin\b/i },
  {
    klass: 'anticonvulsant',
    names: /\b(levetiracetam|lamotrigine|valproate|valproic|divalproex|carbamazepine|oxcarbazepine|phenytoin|fosphenytoin|lacosamide|topiramate|zonisamide|clobazam|clonazepam|phenobarbital|brivaracetam|cenobamate|ethosuximide|gabapentin|pregabalin|perampanel|rufinamide|felbamate|vigabatrin|diazepam rectal|midazolam nasal)\b/i,
  },
  { klass: 'anticoagulant', names: /\b(warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|enoxaparin|heparin|dalteparin|fondaparinux)\b/i },
  { klass: 'transplant', names: /\b(tacrolimus|cyclosporine|mycophenolate|sirolimus|everolimus|azathioprine|belatacept)\b/i },
  { klass: 'epinephrine', names: /\bepinephrine\b/i },
  { klass: 'rescue inhaler', names: /\b(albuterol|levalbuterol)\b/i },
];

export function criticalClass(names: string): string | null {
  return CRITICAL_INGREDIENTS.find((c) => c.names.test(names))?.klass ?? null;
}
