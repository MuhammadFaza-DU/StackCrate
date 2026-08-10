import { enDictionary } from '@/i18n/dictionaries/en';
import { idDictionary } from '@/i18n/dictionaries/id';
import type { Dictionary, Locale } from '@/i18n/types';

export const DEFAULT_LOCALE: Locale = 'id';
export const LOCALE_COOKIE = 'locale';
export const SUPPORTED_LOCALES: readonly Locale[] = ['id', 'en'];

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'en' ? enDictionary : idDictionary;
}
