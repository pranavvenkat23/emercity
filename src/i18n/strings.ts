import type { Language } from '@/models/types';

/**
 * Interface strings (§20.1). Only menus and labels live here. Safety text
 * (emergency steps, guides, countdown messages, alerts) is never
 * machine-translated: it stays in English until a fluent speaker has
 * translated and reviewed it.
 *
 * The Spanish below was written for this build and has NOT been reviewed by
 * a fluent speaker. The language screen says so.
 */
const en = {
  'tab.home': 'Home',
  'tab.household': 'Household',
  'tab.map': 'Map',
  'tab.plan': 'Plan',
  'tab.emergency': 'Emergency',
  'settings.title': 'Settings',
  'settings.account': 'Account and household',
  'settings.notifications': 'Notifications',
  'settings.accessibility': 'Accessibility',
  'settings.language': 'Language',
  'settings.emergency': 'Emergency preferences',
  'settings.privacy': 'Privacy and data',
  'settings.offline': 'Offline data',
  'settings.sources': 'Data sources and credits',
  'settings.about': 'About and disclaimer',
  'settings.signOut': 'Sign out',
  'settings.leaveDemo': 'Leave demo',
  'settings.resetDemo': 'Reset demo household',
  'simple.help': 'I need help',
  'simple.steps': 'Emergency steps',
  'simple.card': 'My card',
} as const;

export type StringKey = keyof typeof en;

const es: Partial<Record<StringKey, string>> = {
  'tab.home': 'Inicio',
  'tab.household': 'Hogar',
  'tab.map': 'Mapa',
  'tab.plan': 'Plan',
  'tab.emergency': 'Emergencia',
  'settings.title': 'Ajustes',
  'settings.account': 'Cuenta y hogar',
  'settings.notifications': 'Notificaciones',
  'settings.accessibility': 'Accesibilidad',
  'settings.language': 'Idioma',
  'settings.emergency': 'Preferencias de emergencia',
  'settings.privacy': 'Privacidad y datos',
  'settings.offline': 'Datos sin conexión',
  'settings.sources': 'Fuentes de datos',
  'settings.about': 'Acerca de y aviso',
  'settings.signOut': 'Cerrar sesión',
  'settings.leaveDemo': 'Salir de la demostración',
  'settings.resetDemo': 'Restablecer hogar de demostración',
  'simple.help': 'Necesito ayuda',
  'simple.steps': 'Pasos de emergencia',
  'simple.card': 'Mi tarjeta',
};

const CATALOG: Partial<Record<Language, Partial<Record<StringKey, string>>>> = { en, es };

/** Languages with an interface translation, and whether it has been reviewed. */
export const UI_LANGUAGES: { id: Language; reviewed: boolean }[] = [
  { id: 'en', reviewed: true },
  { id: 'es', reviewed: false },
];

/** Falls back to English for anything not translated (never to a machine translation at runtime). */
export function translate(lang: Language, key: StringKey): string {
  return CATALOG[lang]?.[key] ?? en[key];
}

export function translationCoverage(lang: Language): number {
  const keys = Object.keys(en) as StringKey[];
  const have = keys.filter((k) => CATALOG[lang]?.[k]).length;
  return have / keys.length;
}
