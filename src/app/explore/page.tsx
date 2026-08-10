'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, useReducedMotion } from 'framer-motion';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { CategoryNav } from '@/components/categories/CategoryNav';
import { Button } from '@/components/ui/button';
import type { AssetWithCategory, Category } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount } from '@/i18n/server';
import { formatMessage } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { fetchJson } from '@/lib/http';

const text = (message: Message) => typeof message === 'function' ? message() : message;

function ExploreContent() {
  const { locale, dictionary } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const limit = 20;

  // Single source of truth: derive filter values directly from the URL,
  // so clicking a category pill (client nav) updates the list immediately.
  const search = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const type = searchParams.get('type') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const sortBy = searchParams.get('sort') ?? 'newest';

  // Fetch the list whenever the URL query changes
  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setLoading(true);
        setLoadError(false);
      }
    });
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(limit));
    fetchJson<{
      data?: {
        items?: AssetWithCategory[];
        pagination?: { total?: number };
      };
    }>(`/api/assets?${params.toString()}`)
      .then((data) => {
        if (!ignore) {
          setAssets(data.data?.items ?? []);
          setTotal(data.data?.pagination?.total ?? 0);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAssets([]);
          setTotal(0);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [searchParams, reloadKey]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.data ?? []));
  }, []);

  const updateUrl = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page'); // reset pagination on filter change
    router.push(`/explore?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    router.push(`/explore?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/explore');
  };

  const hasFilters =
    search || category || type || sortBy !== 'newest';
  const totalPages = Math.ceil(total / limit);
  const reveal = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="explore" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
      <m.div {...reveal(0)} className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-heading text-5xl text-foreground">{text(dictionary.explore.title)}</h1>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            {text(dictionary.explore.clearFilters)}
          </Button>
        )}
      </m.div>

      <m.div {...reveal(0.08)} className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={type === '' ? 'warm' : 'outline'}
          size="default"
          onClick={() => updateUrl({ type: '' })}
        >
          {text(dictionary.explore.allTypes)}
        </Button>
        <Button
          variant={type === 'audio' ? 'warm' : 'outline'}
          size="default"
          onClick={() => updateUrl({ type: 'audio' })}
        >
          {text(dictionary.explore.audioType)}
        </Button>
        <Button
          variant={type === 'video' ? 'warm' : 'outline'}
          size="default"
          onClick={() => updateUrl({ type: 'video' })}
        >
          {text(dictionary.explore.videoType)}
        </Button>
        <select
          aria-label={text(dictionary.explore.sortLabel)}
          value={sortBy}
          onChange={(e) => updateUrl({ sort: e.target.value })}
          className="h-10 rounded-lg border border-input bg-background px-4 text-sm"
        >
          <option value="newest">{text(dictionary.explore.sortNewest)}</option>
          <option value="oldest">{text(dictionary.explore.sortOldest)}</option>
          <option value="downloads">{text(dictionary.explore.sortDownloads)}</option>
          <option value="views">{text(dictionary.explore.sortViews)}</option>
        </select>
      </m.div>

      {categories.length > 0 && (
        <m.div {...reveal(0.16)}>
          <CategoryNav categories={categories} />
        </m.div>
      )}

       {!loadError && (
         <m.p {...reveal(0.22)} className="text-sm text-muted-foreground mb-4">
            {loading
              ? text(dictionary.explore.loading)
              : formatMessage(text(dictionary.explore.showingCount), {
                count: formatCount(assets.length, locale),
                total: formatCount(total, locale),
              })}
         </m.p>
       )}

       {loadError ? (
         <m.div {...reveal(0.28)} role="alert" className="text-center py-16">
           <p className="text-muted-foreground text-lg">{text(dictionary.explore.loadError)}</p>
           <Button className="mt-4" onClick={() => setReloadKey((key) => key + 1)}>
             {text(dictionary.common.retry)}
           </Button>
         </m.div>
       ) : loading ? (
        <m.div {...reveal(0.28)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
          ))}
        </m.div>
      ) : (
        <m.div {...reveal(0.28)}>
          <AssetGrid key={`${search}|${category}|${type}|${sortBy}|${page}`} assets={assets} />
        </m.div>
      )}

      {totalPages > 1 && (
        <m.div {...reveal(0.12)} className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
             {text(dictionary.explore.previousPage)}
          </Button>
          <span className="text-sm text-muted-foreground">
             {formatMessage(text(dictionary.explore.pageOf), {
               page: formatCount(page, locale),
               total: formatCount(totalPages, locale),
             })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
             {text(dictionary.explore.nextPage)}
          </Button>
        </m.div>
      )}
      </div>
    </main>
  );
}

export default function ExplorePage() {
  const { dictionary } = useLocale();

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">{text(dictionary.explore.suspenseLoading)}</div>}>
      <ExploreContent />
    </Suspense>
  );
}
