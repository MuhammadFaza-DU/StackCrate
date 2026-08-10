'use client';

import { useState, useEffect } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { HeroSection } from '@/components/layout/HeroSection';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { ScrollVelocityText } from '@/components/layout/ScrollVelocityText';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { CategoryNav } from '@/components/categories/CategoryNav';
import { SortTabs } from '@/components/assets/SortTabs';
import type { AssetSortKey } from '@/components/assets/SortTabs';
import { FeaturedCard } from '@/components/assets/FeaturedCard';
import { useFeatured } from '@/lib/use-featured';
import type { PublicStats } from '@/lib/public-stats';
import type { AssetWithCategory, Category } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';
import { fetchJson } from '@/lib/http';

const HOME_LIMIT = 10;
const text = (message: Message) => typeof message === 'function' ? message() : message;

export default function HomePage() {
  const { dictionary } = useLocale();
  const [activeCategory, setActiveCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<AssetSortKey>('newest');
  const [gridError, setGridError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { asset: featured, isLoading: featuredLoading, hasError: featuredError, retry: featuredRetry } = useFeatured();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  // Load categories once
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.data ?? []))
      .catch(() => {});
  }, []);

  // Load homepage stats (social proof)
  useEffect(() => {
    let ignore = false;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!ignore && d?.data) setStats(d.data);
      })
      .catch(() => {
        if (!ignore) setStatsFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Load newest 10 for active category (or All)
  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setLoading(true);
        setGridError(false);
      }
    });
    const params = new URLSearchParams({ limit: String(HOME_LIMIT), sort });
    if (activeCategory) params.set('category', activeCategory);
    fetchJson<{ data?: { items?: AssetWithCategory[] } }>(`/api/assets?${params.toString()}`)
      .then((data) => {
        if (!ignore) {
          setAssets(data.data?.items ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAssets([]);
          setLoading(false);
          setGridError(true);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeCategory, sort, reloadKey]);

  const activeCat = categories.find((c) => c.slug === activeCategory);
  const reveal = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 40, scale: 0.98, filter: 'blur(8px)' },
    whileInView: reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="home" />
      <div className="relative z-10">
      {/* HS1: Full-viewport hero */}
      <HeroSection
        title={text(dictionary.home.heroTitle)}
        subtitle={text(dictionary.home.heroSubtitle)}
        stats={statsFailed ? null : stats}
        heroNode={<FeaturedCard asset={featured as AssetWithCategory} loading={featuredLoading} error={featuredError} onRetry={featuredRetry} />}
      />

      {/* Divider: Scroll-velocity text */}
      <m.div {...reveal(0)} className="border-y border-border/50 my-24">
        <ScrollVelocityText
          texts={[
            text(dictionary.home.marqueePremium),
            text(dictionary.home.marqueeFree),
            text(dictionary.home.marqueeReady),
            text(dictionary.home.marqueeStart),
          ]}
          separator=" ● "
        />
      </m.div>

      {/* HS2: Latest Assets grid */}
      <section id="assets" className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <m.div {...reveal(0)}>
          <h2 className="font-heading text-4xl text-foreground">
            {activeCat ? `${activeCat.icon ?? ''} ${activeCat.name}` : text(dictionary.home.latestAssets)}
          </h2>
        </m.div>

        <m.div {...reveal(0.1)}>
          <CategoryNav
            categories={categories}
            selectable
            activeSlug={activeCategory}
            onSelect={setActiveCategory}
          />
        </m.div>

        <m.div {...reveal(0.18)}>
          <SortTabs value={sort} onChange={setSort} />
        </m.div>

        {gridError ? (
          <m.div {...reveal(0.24)} className="text-center py-16">
            <p className="text-muted-foreground text-lg">{text(dictionary.home.loadError)}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:translate-y-[1px] transition"
            >
              {text(dictionary.common.retry)}
            </button>
          </m.div>
        ) : loading ? (
          <m.div {...reveal(0.24)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-xl shimmer-warm" />
            ))}
          </m.div>
        ) : (
          <AssetGrid assets={assets} revealOnView />
        )}
      </section>
      </div>
    </main>
  );
}
