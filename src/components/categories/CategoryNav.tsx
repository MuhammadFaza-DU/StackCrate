'use client';

import Link from 'next/link';
import { Compass, ChevronRight } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface CategoryNavProps {
  categories: Category[];
  /** Selectable mode renders buttons that call onSelect(slug) instead of navigating. */
  selectable?: boolean;
  activeSlug?: string;
  onSelect?: (slug: string) => void;
}

export function CategoryNav({ categories, selectable = false, activeSlug = '', onSelect }: CategoryNavProps) {
  const { dictionary } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isExplore = pathname?.startsWith('/explore');
  const exploreCategoryParam = searchParams.get('category');

  if (categories.length === 0) return null;

  const pillBase = 'px-3 py-1.5 rounded-full text-sm font-body transition-all cursor-pointer border border-transparent';
  const pillActive = 'bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20';
  const pillInactive = 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground';

  return (
    <nav className="min-w-0 overflow-x-auto md:overflow-visible py-3">
      <div className="flex min-w-max flex-nowrap items-center gap-2 md:min-w-0 md:flex-wrap">
      {selectable ? (
        <>
          <button
            type="button"
            onClick={() => onSelect?.('')}
            aria-pressed={activeSlug === ''}
            className={cn(pillBase, activeSlug === '' ? pillActive : pillInactive)}
          >
             {text(dictionary.common.all)}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect?.(cat.slug)}
              aria-pressed={activeSlug === cat.slug}
              className={cn(pillBase, activeSlug === cat.slug ? pillActive : pillInactive)}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
          <span className="mx-1 w-px h-5 bg-border" aria-hidden />
          <Link
            href="/explore"
            className={cn(pillBase, 'inline-flex items-center gap-0.5', 'bg-primary text-primary-foreground font-semibold')}
          >
            <Compass className="w-4 h-4" />
             {text(dictionary.common.explore)}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/explore"
            className={cn(pillBase, !isExplore || !exploreCategoryParam ? pillActive : pillInactive)}
          >
             {text(dictionary.common.all)}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/explore?category=${cat.slug}`}
              className={cn(
                pillBase,
                isExplore && exploreCategoryParam === cat.slug ? pillActive : pillInactive
              )}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </Link>
          ))}
        </>
      )}
      </div>
    </nav>
  );
}
