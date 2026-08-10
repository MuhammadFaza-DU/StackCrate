'use client';

import { PackageSearch } from 'lucide-react';
import { AssetCard } from './AssetCard';
import type { AssetWithCategory } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface AssetGridProps {
  assets: AssetWithCategory[];
  revealOnView?: boolean;
}

export function AssetGrid({ assets, revealOnView = false }: AssetGridProps) {
  const { dictionary } = useLocale();

  if (assets.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <PackageSearch className="w-8 h-8 text-muted-foreground/70" />
        </div>
        <p className="font-heading text-xl text-foreground">{text(dictionary.assets.emptyTitle)}</p>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
          {text(dictionary.assets.emptyDescription)}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {assets.map((asset, i) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          index={i}
          revealOnView={revealOnView}
        />
      ))}
    </div>
  );
}
