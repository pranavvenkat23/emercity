import { create } from 'zustand';

import { translate, type StringKey } from '@/i18n/strings';
import type { Language } from '@/models/types';

const KEY = 'ui.language';
type KV = { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void> };

/** This phone's interface language (SET-04). Defaults to English. */
export const useLanguage = create<{ lang: Language; load(kv: KV): Promise<void>; set(kv: KV, l: Language): Promise<void> }>((set) => ({
  lang: 'en',
  async load(kv) {
    const v = (await kv.get(KEY)) as Language | null;
    if (v) set({ lang: v });
  },
  async set(kv, lang) {
    set({ lang });
    await kv.set(KEY, lang);
  },
}));

/** t('tab.home') in the current interface language. */
export function useT() {
  const lang = useLanguage((s) => s.lang);
  return (key: StringKey) => translate(lang, key);
}
