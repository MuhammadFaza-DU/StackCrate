'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/UserProvider';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';
import { getApiErrorCode } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface FavoriteButtonProps {
  assetId: string;
  size?: 'sm' | 'lg';
}

export function FavoriteButton({ assetId, size = 'sm' }: FavoriteButtonProps) {
  const [loading, setLoading] = useState(false);
  const { favoriteIds, toggleFavoriteLocal } = useUser();
  const { dictionary } = useLocale();
  // Single source of truth: favoriteIds from UserProvider context
  const isFavorite = favoriteIds.has(assetId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    const wasFavorited = isFavorite;
    // Optimistic update
    toggleFavoriteLocal(assetId, !wasFavorited);
    setLoading(true);

    try {
      const res = await fetch('/api/favorites', {
        method: wasFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId }),
      });

      if (!res.ok) {
        // Revert optimistic update on any failure
        toggleFavoriteLocal(assetId, wasFavorited);
        const err = await res.json().catch(() => null);
        if (res.status === 401 || getApiErrorCode(err?.error) === 'unauthorized') {
          alert(text(dictionary.assets.favoriteUnauthorized));
        }
      }
    } catch {
      // Revert on network failure
      toggleFavoriteLocal(assetId, wasFavorited);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={`${sizeClasses[size]} ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={handleClick}
      disabled={loading}
       title={text(isFavorite ? dictionary.assets.favoriteRemoveTitle : dictionary.assets.favoriteAddTitle)}
    >
      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
    </Button>
  );
}
