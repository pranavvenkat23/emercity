import { criticalClass, ndcHyphenations } from '@/domain/ndc';
import { STORAGE_RULES } from '@/reference/storage-rules';
import { useSession } from '@/stores/session-store';

import { fetchJson } from './nws';

/**
 * openFDA NDC Directory (§13.4). Public domain data; only the search term
 * or NDC is sent (§22.4). Works without a key (240 req/min, 1,000/day per
 * IP). The spec's server proxy with a shared key and 30-day cache needs
 * Cloud Functions (Firebase Blaze plan); until then results are cached on
 * the device for 30 days.
 */
export interface DrugProduct {
  productNdc: string;
  brandName: string;
  genericName: string;
  labeler: string;
  dosageForm: string;
  route: string;
  strength: string;
  packageNdcs: string[];
  discontinued: boolean;
  /** Critical class (insulin, anticonvulsant, …) or null. */
  criticalClass: string | null;
  source: 'openFDA' | 'bundled';
}

interface OpenFdaResult {
  product_ndc: string;
  brand_name?: string;
  generic_name?: string;
  labeler_name?: string;
  dosage_form?: string;
  route?: string[];
  active_ingredients?: { name: string; strength: string }[];
  packaging?: { package_ndc: string; description?: string }[];
  marketing_end_date?: string | null;
}

const BASE = 'https://api.fda.gov/drug/ndc.json';
const CACHE_DAYS = 30;

function toProduct(r: OpenFdaResult): DrugProduct {
  const ingredients = (r.active_ingredients ?? []).map((a) => a.name).join(', ');
  const ended = r.marketing_end_date ? r.marketing_end_date < new Date().toISOString().slice(0, 10).replace(/-/g, '') : false;
  return {
    productNdc: r.product_ndc,
    brandName: r.brand_name ?? r.generic_name ?? 'Unknown product',
    genericName: (r.generic_name ?? ingredients).toLowerCase(),
    labeler: r.labeler_name ?? '',
    dosageForm: (r.dosage_form ?? '').toLowerCase(),
    route: (r.route ?? []).join(', ').toLowerCase(),
    strength: (r.active_ingredients ?? []).map((a) => a.strength.replace(/\[iU\]/g, 'units')).join(', '),
    packageNdcs: (r.packaging ?? []).map((p) => p.package_ndc),
    discontinued: ended,
    criticalClass: criticalClass(`${r.generic_name ?? ''} ${ingredients}`),
    source: 'openFDA',
  };
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const db = useSession.getState().db;
  const hit = db ? await db.kv.getJSON<{ at: number; value: T }>(`fda.${key}`) : null;
  if (hit && Date.now() - hit.at < CACHE_DAYS * 86_400_000) return hit.value;
  const value = await load();
  if (db) await db.kv.setJSON(`fda.${key}`, { at: Date.now(), value });
  return value;
}

/** Bundled offline index (§13.1): products with verified storage rules. */
export function bundledProducts(): DrugProduct[] {
  return STORAGE_RULES.filter((r) => r.ndcProductCodes.length).map((r) => ({
    productNdc: r.ndcProductCodes[0],
    brandName: r.productName.split(' (')[0],
    genericName: (/\(([^)]+)\)/.exec(r.productName)?.[1] ?? '').toLowerCase(),
    labeler: '',
    dosageForm: 'injection',
    route: 'subcutaneous',
    strength: '',
    packageNdcs: [],
    discontinued: false,
    criticalClass: criticalClass(r.productName),
    source: 'bundled',
  }));
}

/** Autocomplete search by brand or generic name (HH-06). */
export async function searchProducts(term: string): Promise<DrugProduct[]> {
  const q = term.trim().replace(/["\\]/g, '');
  if (q.length < 2) return [];
  const offline = bundledProducts().filter((p) => `${p.brandName} ${p.genericName}`.toLowerCase().includes(q.toLowerCase()));
  if (useSession.getState().online === false) return offline;
  try {
    const words = q.split(/\s+/).map(encodeURIComponent).join('+');
    const results = await cached(`search.${q.toLowerCase()}`, async () => {
      const data = await fetchJson<{ results: OpenFdaResult[] }>(
        `${BASE}?search=(brand_name:${words}*+generic_name:${words}*)+AND+product_type:"HUMAN+PRESCRIPTION+DRUG"&limit=20`,
        { headers: { Accept: 'application/json' }, retries: 1 },
      );
      return data.results;
    });
    // Collapse duplicates from repackagers: one row per brand + strength + form.
    const seen = new Set<string>();
    return results.map(toProduct).filter((p) => {
      const k = `${p.brandName}|${p.strength}|${p.dosageForm}`.toLowerCase();
      return seen.has(k) ? false : (seen.add(k), true);
    });
  } catch (e) {
    if ((e as { status?: number }).status === 404) return offline;
    throw e;
  }
}

export type NdcLookup =
  | { status: 'found'; products: DrugProduct[] }
  | { status: 'not-found' }
  | { status: 'offline' };

/**
 * Looks up a scanned/entered NDC (§13.1 step 5). Tries every hyphenation
 * (§13.3) as a package NDC, then as a product NDC. Bundled index first.
 */
export async function lookupNdc(candidates: string[]): Promise<NdcLookup> {
  const productCodes = candidates.map((c) => c.split('-').slice(0, 2).join('-'));
  const bundled = bundledProducts().filter((p) => STORAGE_RULES.some((r) => r.ndcProductCodes.some((code) => productCodes.includes(code)) && r.productName.startsWith(p.brandName)));
  if (useSession.getState().online === false) {
    return bundled.length ? { status: 'found', products: bundled } : { status: 'offline' };
  }
  const found: DrugProduct[] = [];
  for (const c of candidates) {
    for (const field of ['packaging.package_ndc', 'product_ndc'] as const) {
      const value = field === 'product_ndc' ? c.split('-').slice(0, 2).join('-') : c;
      try {
        const data = await cached(`ndc.${field}.${value}`, () =>
          fetchJson<{ results: OpenFdaResult[] }>(`${BASE}?search=${field}:"${value}"&limit=5`, { headers: { Accept: 'application/json' }, retries: 1 }).then((d) => d.results),
        );
        found.push(...data.map(toProduct));
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
      }
      if (found.length) break;
    }
  }
  const unique = [...new Map(found.map((p) => [p.productNdc, p])).values()];
  if (unique.length) return { status: 'found', products: unique };
  return bundled.length ? { status: 'found', products: bundled } : { status: 'not-found' };
}

/** NDC10 to candidates for lookup. */
export function candidatesFor(ndc10: string): string[] {
  return ndcHyphenations(ndc10);
}
