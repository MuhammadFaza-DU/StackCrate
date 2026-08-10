'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import type { AssetWithCategory } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface FeaturedCardProps {
  asset: AssetWithCategory;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function FeaturedCard({ asset, loading, error, onRetry }: FeaturedCardProps) {
  const { dictionary } = useLocale();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden aspect-video animate-pulse shimmer-warm" aria-busy="true" />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col items-center justify-center gap-3 p-8 text-center aspect-video">
         <p className="font-body text-muted-foreground">{text(dictionary.assets.featuredLoadError)}</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
        >
           {text(dictionary.common.retry)}
        </button>
      </div>
    );
  }

  const isVideo = asset.asset_type === 'video';
  const thumbSrc =
    asset.thumbnail_url
    ?? (asset.asset_type === 'audio' ? '/logo-audio.png' : undefined);

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden"
    >
      <Link href={`/assets/${asset.id}`} className="block">
        {isVideo && asset.preview_url ? (
          <video
            className="aspect-video w-full object-cover"
            src={asset.preview_url}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="relative aspect-video overflow-hidden">
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={asset.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play className="w-10 h-10 text-primary" />
              </div>
            )}
            {!isVideo && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
            )}
          </div>
        )}
      </Link>

      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/20">
         {text(dictionary.assets.featuredLabel)}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/95 via-background/60 to-transparent">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {asset.category?.name && (
              <p className="text-xs text-muted-foreground">
                {asset.category.icon} {asset.category.name}
              </p>
            )}
            <h3 className="font-heading text-lg text-foreground truncate">{asset.title}</h3>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary">
             {text(dictionary.assets.featuredSee)}
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </m.div>
  );
}
