'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AssetWithCategory } from '@/lib/types/asset';

export type FeaturedAsset = AssetWithCategory & { preview_url?: string | null };

export function useFeatured() {
  const [asset, setAsset] = useState<FeaturedAsset | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [hasError, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setLoading(true);
        setError(false);
      }
    });

    const pickList = (featured: boolean) =>
      fetch(`/api/assets?featured=${featured ? 'true' : 'false'}&limit=1`)
        .then((r) => r.json())
        .then((d) => d?.data?.items ?? []);

    async function load() {
      let list = await pickList(true);
      if (list.length === 0) list = await pickList(false);

      let chosen: FeaturedAsset | null = list[0] ?? null;
      if (chosen && chosen.asset_type === 'video') {
        try {
          const detail = await fetch(`/api/assets/${chosen.id}`).then((r) => r.json());
          chosen = detail?.data ?? chosen;
        } catch {
          /* keep list item; video preview may be missing */
        }
      }
      if (!ignore) {
        setAsset(chosen);
        setLoading(false);
        setError(!chosen);
      }
    }

    load().catch(() => {
      if (!ignore) {
        setAsset(null);
        setLoading(false);
        setError(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { asset, isLoading, hasError, retry };
}
