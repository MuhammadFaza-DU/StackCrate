'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Toasts, useToasts } from '@/components/ui/toast';
import { useUser } from '@/components/providers/UserProvider';
import type { AssetWithCategory } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { isAssetResponse } from '@/lib/types/schemas';

const text = (message: Message) => typeof message === 'function' ? message() : message;

export default function FavoritesPage() {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
  const { user, loading: userLoading, favoriteIds } = useUser();
  const { toasts, dismissToast } = useToasts();
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const attempted = useRef(false);

  // Guard: not signed in → redirect to login
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  // Load favorites only when authenticated
  useEffect(() => {
    if (userLoading || !user) return;
    if (attempted.current) return;
    attempted.current = true;

    queueMicrotask(() => setAssetsLoading(true));
    fetch('/api/favorites')
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        const favoriteAssets: unknown[] = Array.isArray(data.data?.assets) ? data.data.assets : [];
        const validAssets = favoriteAssets.filter(isAssetResponse);

        if (validAssets.length !== favoriteAssets.length) throw new Error();
        if (!Array.isArray(data.data?.assets)) throw new Error();

        setAssets(validAssets);
        setLoadError(false);
      })
      .catch(() => {
        setAssets([]);
        setLoadError(true);
      })
      .finally(() => setAssetsLoading(false));
  }, [user, userLoading]);

  // Remove card instantly when unfavorited (toggle in the grid)
  useEffect(() => {
    if (attempted.current) {
      setAssets((prev) => prev.filter((a) => favoriteIds.has(a.id)));
    }
  }, [favoriteIds]);

  if (userLoading || !user) {
    return (
      <main className="relative isolate overflow-hidden">
        <AmbientBackground variant="favorites" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <p>{text(dictionary.favorites.loading)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="favorites" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl text-foreground">{text(dictionary.favorites.title)}</h1>
        <span className="text-sm text-muted-foreground">({formatCount(assets.length, locale)})</span>
      </div>

      {assetsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="text-center py-20">
          <p className="text-muted-foreground text-lg">{text(dictionary.errors.failedToLoadAssets)}</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{text(dictionary.favorites.emptyTitle)}</p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            {text(dictionary.favorites.emptyHelper)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AssetGrid assets={assets} />
          <div className="text-center">
            <button
              onClick={() => router.push('/explore')}
              className="text-sm font-medium text-primary hover:underline"
            >
              {text(dictionary.favorites.exploreCta)}
            </button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
