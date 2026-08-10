'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { Play, Download, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/components/FavoriteButton';
import type { AssetWithCategory } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount } from '@/i18n/server';
import type { Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface AssetCardProps {
  asset: AssetWithCategory;
  index?: number;
  revealOnView?: boolean;
}

export function AssetCard({ asset, index = 0, revealOnView = false }: AssetCardProps) {
  const { locale, dictionary } = useLocale();
  const reduceMotion = useReducedMotion();
  const isAudio = asset.asset_type === 'audio';
  const typeLabel = isAudio ? text(dictionary.assets.audioType) : text(dictionary.assets.videoType);
  const typeChip = isAudio
    ? 'bg-[#1a1410]/90 text-amber-300 border-amber-400/30'
    : 'bg-[#1a1410]/90 text-blue-300 border-blue-400/30';
  const duration = asset.duration_seconds
    ? `${Math.floor(asset.duration_seconds / 60)}:${String(asset.duration_seconds % 60).padStart(2, '0')}`
    : null;

  return (
    <m.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={revealOnView ? undefined : { opacity: 1, y: 0, scale: 1 }}
      whileInView={revealOnView && !reduceMotion ? { opacity: 1, y: 0, scale: 1 } : undefined}
      viewport={revealOnView ? { once: true, amount: 0.2 } : undefined}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
    >
      {/* Thumbnail */}
      <Link
        href={`/assets/${asset.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        <div className="relative aspect-video bg-muted overflow-hidden rounded-xl">
          {asset.thumbnail_url ? (
            <img
              src={asset.thumbnail_url}
              alt={asset.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : isAudio ? (
            <img src="/logo-audio.png" alt={asset.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          )}
          {/* Type badge */}
          <div className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold border backdrop-blur-sm', typeChip)}>
            {typeLabel}
          </div>
          {/* Duration */}
          {duration && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1410]/80 text-white/90 border border-white/10 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-[#1a1410]/25 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>
          </div>

          {/* Favorite button (absolute top-right) */}
          <div className="absolute top-2 right-2">
            <FavoriteButton assetId={asset.id} size="sm" />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3">
        <Link href={`/assets/${asset.id}`}>
          <h3 className="font-body text-sm font-semibold line-clamp-1 text-foreground group-hover:text-primary transition-colors">
            {asset.title}
          </h3>
        </Link>
        {asset.category ? (
          <Link
            href={`/explore?category=${asset.category.slug}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {asset.category.name}
          </Link>
        ) : (
           <span className="text-xs text-muted-foreground/70">{text(dictionary.assets.noCategory)}</span>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title={text(dictionary.assets.downloadsTitle)}>
              <Download className="w-3 h-3" />
              {formatCount(asset.download_count, locale)}
            </span>
            <span className="flex items-center gap-1" title={text(dictionary.assets.viewsTitle)}>
              <Eye className="w-3 h-3" />
              {formatCount(asset.view_count ?? 0, locale)}
            </span>
          </div>
        </div>
      </div>
    </m.div>
  );
}
