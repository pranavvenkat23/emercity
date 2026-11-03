import type { Language } from '@/models/types';

/** §4.2 User.language set, shown in each language's own name plus English. */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  es: 'Español (Spanish)',
  ko: '한국어 (Korean)',
  vi: 'Tiếng Việt (Vietnamese)',
  'zh-Hans': '简体中文 (Chinese)',
  ar: 'العربية (Arabic)',
  hi: 'हिन्दी (Hindi)',
  ur: 'اردو (Urdu)',
  am: 'አማርኛ (Amharic)',
  fa: 'فارسی (Persian)',
};

/** Right-to-left languages (§20.1). */
export const RTL_LANGUAGES: ReadonlySet<Language> = new Set(['ar', 'ur', 'fa']);
