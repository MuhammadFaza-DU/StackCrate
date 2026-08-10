'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Locale, Message } from '@/i18n/types';

interface LocaleSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function LocaleSwitcher({ compact = false, className = '' }: LocaleSwitcherProps) {
  const { locale, dictionary, setLocale } = useLocale();
  const text = (message: Message) => typeof message === 'function' ? message() : message;

  const buttonClass = compact
    ? 'min-w-11 min-h-11 px-1.5 py-1 text-[10px]'
    : 'min-w-11 min-h-11 px-2 py-1 text-xs';

  const localeButtonClass = (value: Locale) => (
    `${buttonClass} rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${locale === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
  );

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-background/70 p-0.5 ${className}`}
      role="group"
      aria-label={text(dictionary.header.languageLabel)}
    >
      <button
        type="button"
        onClick={() => setLocale('id')}
        aria-label={text(dictionary.header.languageIndonesian)}
        aria-pressed={locale === 'id'}
        className={localeButtonClass('id')}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-label={text(dictionary.header.languageEnglish)}
        aria-pressed={locale === 'en'}
        className={localeButtonClass('en')}
      >
        EN
      </button>
    </div>
  );
}
