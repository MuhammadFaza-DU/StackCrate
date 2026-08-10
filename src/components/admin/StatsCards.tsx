'use client';

import * as React from 'react';
import { animate, m, useInView, useReducedMotion } from 'framer-motion';
import { Package, Eye, Download, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminStats } from '@/lib/admin-stats';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount, formatMessage } from '@/i18n/server';
import type { Dictionary, Locale, Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface StatsCardsProps {
  stats: AdminStats | null;
  loading: boolean;
  onRetry: () => void;
}

interface CardDef {
  key: string;
  label: Message;
  value: (s: AdminStats) => number;
  sub: (s: AdminStats) => string;
  icon: React.ReactNode;
  chip: string;
}

function getCardDefs(dictionary: Dictionary, locale: Locale): CardDef[] {
  return [
    {
      key: 'total-assets',
      label: dictionary.admin.totalAssets,
      value: (s) => s.totalAssets,
      sub: (s) => formatMessage(text(dictionary.admin.publishedAndDraft), {
        published: formatCount(s.publishedAssets, locale),
        draft: formatCount(s.draftAssets, locale),
      }),
      icon: <Package className="h-5 w-5" />,
      chip: 'chip-accent',
    },
    {
      key: 'total-views',
      label: dictionary.admin.totalViews,
      value: (s) => s.totalViews,
      sub: () => text(dictionary.admin.assetViews),
      icon: <Eye className="h-5 w-5" />,
      chip: 'chip-accent',
    },
    {
      key: 'total-downloads',
      label: dictionary.admin.totalDownloads,
      value: (s) => s.totalDownloads,
      sub: () => text(dictionary.admin.assetDownloads),
      icon: <Download className="h-5 w-5" />,
      chip: 'bg-secondary-foreground/15 text-secondary-foreground',
    },
    {
      key: 'total-favorites',
      label: dictionary.admin.totalFavorites,
      value: (s) => s.totalFavorites,
      sub: (s) => formatMessage(text(dictionary.admin.categoriesCount), {
        count: formatCount(s.totalCategories, locale),
      }),
      icon: <Heart className="h-5 w-5" />,
      chip: 'chip-gold',
    },
  ];
}

function CountNumber({ value, locale, className }: { value: number; locale: Locale; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(0, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {formatCount(reduce ? value : display, locale)}
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="shimmer-warm h-10 w-10 rounded-full" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="shimmer-warm mt-4 h-8 w-20 rounded-md" />
        <div className="shimmer-warm mt-3 h-3 w-32 rounded" />
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats, loading, onRetry }: StatsCardsProps) {
  const { locale, dictionary } = useLocale();
  const cardDefs = getCardDefs(dictionary, locale);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-muted-foreground">{text(dictionary.admin.statsLoadFailed)}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {text(dictionary.common.retry)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardDefs.map((def) => (
        <m.div
          key={def.key}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="group rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(249,115,22,0.15)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', def.chip)}>
                  {def.icon}
                </span>
              </div>
              <p className="font-display mt-4 text-3xl text-foreground">
                <CountNumber value={def.value(stats)} locale={locale} />
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{text(def.label)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{def.sub(stats)}</p>
            </CardContent>
          </Card>
        </m.div>
      ))}
    </div>
  );
}
