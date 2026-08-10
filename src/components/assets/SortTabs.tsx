'use client';

import { cn } from '@/lib/utils';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

export type AssetSortKey = 'newest' | 'downloads' | 'title';

interface SortTabsProps {
  value: AssetSortKey;
  onChange: (next: AssetSortKey) => void;
}

const text = (message: Message) => typeof message === 'function' ? message() : message;

export function SortTabs({ value, onChange }: SortTabsProps) {
  const { dictionary } = useLocale();
  const options: Array<{ value: AssetSortKey; label: string }> = [
    { value: 'newest', label: text(dictionary.common.newest) },
    { value: 'downloads', label: text(dictionary.common.mostDownloads) },
    { value: 'title', label: text(dictionary.explore.sortAlphabetical) },
  ];

  return (
    <div role="group" aria-label={text(dictionary.explore.sortLabel)} className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-body transition-all cursor-pointer border border-transparent',
            value === opt.value
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
