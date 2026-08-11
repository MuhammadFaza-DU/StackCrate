'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Download, Clock, Eye, ArrowLeft, Play, Pause, Volume2, AlertCircle } from 'lucide-react';
import type { AssetWithCategory } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { isAssetResponse } from '@/lib/types/schemas';
import { localizeApiError } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

/**
 * Asset detail page (public).
 * - Video / audio player inline, backed by a per-request presigned URL (`preview_url`).
 * - Download button uses POST /api/assets/[id]/download which returns a presigned URL
 *   with Content-Disposition: attachment so the browser auto-downloads (no new tab).
 * - When the presigned URL expires (R2 returns 403 on media requests), show a
 *   notice asking the user to refresh the page.
 */
export default function AssetPage() {
  const params = useParams();
  const id = params?.id as string;
  const { locale, dictionary } = useLocale();
  const [asset, setAsset] = useState<AssetWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'notFound' | 'generic' | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [mediaExpired, setMediaExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Fetch asset (favorite status comes from UserProvider context)
    fetch(`/api/assets/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setAsset(null);
          setLoadError('notFound');
          return;
        }
        if (!r.ok) throw new Error();

        const data = await r.json();
        if (!isAssetResponse(data?.data)) throw new Error();
        setAsset(data.data);
        setLoadError(null);
      })
      .catch(() => {
        setAsset(null);
        setLoadError('generic');
      })
      .finally(() => setLoading(false));
  }, [id]);

  /**
   * Trigger browser-native download (no new tab, no page reload).
   * The presigned URL from POST /download includes Content-Disposition: attachment,
   * so the browser saves the file directly to disk.
   */
  const handleDownload = async () => {
    if (!asset) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/download`, { method: 'POST' });
      const data = await res.json();
      if (data.data?.url) {
        const a = document.createElement('a');
        a.href = data.data.url;
        a.download = data.data.filename ?? '';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (data.error) {
        alert(localizeApiError(dictionary, data.error, res.status, dictionary.assets.downloadGenerationFailed));
      }
    } catch {
      alert(text(dictionary.assets.downloadGenerationFailed));
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Detect when the media URL has expired (R2 returns 403 Forbidden).
   * In that case we show a notice and instruct the user to refresh the page.
   */
  const handleMediaError = () => {
    setMediaExpired(true);
  };

  const handleRefresh = () => {
    setMediaExpired(false);
    setLoadError(null);
    setLoading(true);
    fetch(`/api/assets/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setAsset(null);
          setLoadError('notFound');
          return;
        }
        if (!r.ok) throw new Error();

        const data = await r.json();
        if (!isAssetResponse(data?.data)) throw new Error();
        setAsset(data.data);
        setLoadError(null);
      })
      .catch(() => {
        setAsset(null);
        setLoadError('generic');
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-6 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="font-heading text-2xl text-foreground mb-2">
          {loadError === 'notFound' ? text(dictionary.assets.assetNotFound) : text(dictionary.errors.generic)}
        </h1>
        <Link href="/explore" className="text-primary hover:underline">
          {text(dictionary.assets.backToBrowse)}
        </Link>
      </div>
    );
  }

  // preview_url is generated on-the-fly per request; expires after 1 hour.
  const previewUrl = asset.preview_url ?? undefined;

  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="detail" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-5 md:py-8">
      {/* Back */}
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> {text(dictionary.assets.backToBrowse).replace(/^←\s*/, '')}
      </Link>

      {/* Media */}
      <div className="rounded-xl overflow-hidden bg-muted aspect-video mb-6 flex items-center justify-center relative">
        {mediaExpired && (
          <div className="absolute inset-0 z-10 bg-background/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-foreground">
              {text(dictionary.assets.previewExpired)}
            </p>
            <Button variant="warm" size="sm" onClick={handleRefresh}>
              {text(dictionary.assets.refreshPage)}
            </Button>
          </div>
        )}
        {asset.asset_type === 'video' ? (
          <video
            key={previewUrl ?? 'no-src'}
            src={previewUrl}
            controls
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
            onPlay={() => { isPlayingRef.current = true; }}
            onPause={() => { isPlayingRef.current = false; }}
            onError={handleMediaError}
          />
        ) : asset.asset_type === 'audio' ? (
          <div className="w-full p-6">
            <audio
              key={previewUrl ?? 'no-src'}
              src={previewUrl}
              controls
              className="w-full"
              ref={audioRef}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
              onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
              onPlay={() => { isPlayingRef.current = true; }}
              onPause={() => { isPlayingRef.current = false; }}
              onError={handleMediaError}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3 md:gap-4">
              <button aria-label={text(dictionary.assets.pauseAudio)} onClick={() => { audioRef.current?.pause(); isPlayingRef.current = false; }} className="p-2 rounded-full bg-muted hover:bg-primary/20 transition-colors">
                <Pause className="w-5 h-5" />
              </button>
              <button aria-label={text(dictionary.assets.playAudio)} onClick={() => { audioRef.current?.play(); isPlayingRef.current = true; }} className="p-2 rounded-full bg-muted hover:bg-primary/20 transition-colors">
                <Play className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                {Math.floor(currentTime / 60)}:{String(currentTime % 60).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration) % 60).padStart(2, '0')}
              </span>
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <input aria-label={text(dictionary.assets.volume)} type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} className="w-24 max-w-full" />
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">{text(dictionary.assets.noPreview)}</span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
          <h1 className="min-w-0 flex-1 break-words font-heading text-3xl text-foreground">{asset.title}</h1>
          <div className="shrink-0">
            <FavoriteButton assetId={asset.id} size="lg" />
          </div>
        </div>

        {asset.description && (
          <p className="text-muted-foreground">{asset.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {asset.category && (
            <Link href={`/explore?category=${asset.category.slug}`} className="text-primary hover:underline">
              {asset.category.name}
            </Link>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {formatCount(asset.view_count ?? 0, locale)} {text(dictionary.common.views)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" /> {formatCount(asset.download_count, locale)} {text(dictionary.common.downloads)}
          </span>
          {asset.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {Math.floor(asset.duration_seconds / 60)}:{String(asset.duration_seconds % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        {asset.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-accent text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 md:mt-8">
        <Button variant="warm" size="lg" className="w-full sm:w-auto" onClick={handleDownload} disabled={downloading}>
          <Download className="w-5 h-5 mr-2" />
          {downloading ? text(dictionary.assets.generatingDownload) : text(dictionary.assets.downloadButton)}
        </Button>
      </div>
      </div>
    </main>
  );
}
