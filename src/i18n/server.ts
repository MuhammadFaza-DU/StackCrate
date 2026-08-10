import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/config';
import type { Locale, MessageValues } from '@/i18n/types';

export { getDictionary } from '@/i18n/config';

export function getLocaleFromCookieValue(value: string | undefined): Locale {
  return value && SUPPORTED_LOCALES.includes(value as Locale)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

export function formatMessage(template: string, values: MessageValues): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder
  ));
}

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}
