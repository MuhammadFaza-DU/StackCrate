'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toasts, useToasts } from '@/components/ui/toast';
import { AdminAssetTable } from '@/components/admin/AdminAssetTable';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { StatsCards } from '@/components/admin/StatsCards';
import type { AdminStats } from '@/lib/admin-stats';
import type { AssetWithCategory, Category } from '@/lib/types/asset';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatMessage } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { localizeResponseError } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

export default function AdminPage() {
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useToasts();
  const { dictionary } = useLocale();

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState<'audio' | 'video'>('video');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin asset manager state
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const listRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        setStats(null);
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToLoadStats));
        return;
      }
      const json = await res.json();
      setStats(json.data ?? null);
    } catch {
      setStats(null);
      showToast('error', text(dictionary.errors.failedToLoadStats));
    } finally {
      setStatsLoading(false);
    }
  }, [dictionary, showToast]);

  // Auth guard (client side; server routes enforce too)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profile?.role !== 'admin') {
        router.replace('/');
        return;
      }
      setLoading(false);
    });
  }, [router]);

  // Load categories once for form + manager
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) {
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToLoadCategories));
        return [] as Category[];
      }
      const json = await res.json();
      const list: Category[] = json.data ?? [];
      setCategories(list);
      setCategoryId((prev) => (list.some((c) => c.id === prev) ? prev : ''));
      return list;
    } catch {
      showToast('error', text(dictionary.errors.failedToLoadCategories));
      return [] as Category[];
    }
  };

  // Load admin asset list (all statuses unless filtered)
  const loadAssets = async (status: 'all' | 'published' | 'draft' = statusFilter, category: string = categoryFilter) => {
    const params = new URLSearchParams({ page: '1', limit: '100' });
    params.set('status', status);
    if (category) params.set('category', category);
    try {
      const res = await fetch(`/api/assets?${params.toString()}`);
      if (!res.ok) {
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToLoadAssets));
        return;
      }
      const json = await res.json();
      setAssets(json.data?.items ?? []);
    } catch {
      showToast('error', text(dictionary.errors.failedToLoadAssets));
    }
  };

  // Initial load
  useEffect(() => {
    (async () => {
      await Promise.all([loadCategories(), loadAssets('all', ''), loadStats()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Extract a thumbnail frame from a video File using an offscreen <video> +
   * <canvas>. Seeks to ~1s and draws the frame to a JPEG blob.
   * Resolves null if the browser can't decode the video (we keep the upload).
   */
  const extractVideoThumbnail = async (file: File): Promise<Blob | null> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Video decode error'));
      });

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      // Seek to 1s (or midpoint for very short clips)
      const target = duration > 2 ? 1 : duration > 0 ? duration / 2 : 0;
      if (target > 0) {
        video.currentTime = target;
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error('Video seek error'));
          // Safety timeout in case seek never fires
          setTimeout(() => resolve(), 3000);
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.75);
      });
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      showToast('error', text(dictionary.errors.requiredFields));
      return;
    }
    setUploading(true);
    try {
      // Step 1: Create asset in DB + get R2 presigned PUT URL
      const createRes = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          asset_type: assetType,
          category_id: categoryId || null,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
        }),
      });
      if (!createRes.ok) {
        showToast('error', await localizeResponseError(createRes, dictionary, dictionary.errors.failedToCreateAsset));
        return;
      }
      const createData = await createRes.json();

      const { id, presigned_url } = createData.data;

      // Step 2: Upload to R2
      const uploadRes = await fetch(presigned_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) {
        showToast('error', text(dictionary.errors.failedToUploadAsset));
        return;
      }

      // Step 3: Mark as published
      const publishRes = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
          assetType === 'audio'
            ? { status: 'published', thumbnail_url: '/logo-audio.png' }
            : { status: 'published' }
        ),
      });
      if (!publishRes.ok) {
        showToast('error', await localizeResponseError(publishRes, dictionary, dictionary.errors.failedToPublishAsset));
        return;
      }


      // Step 4: Generate & upload thumbnail (audio uses logo set above; video extracts frame)
      if (assetType === 'video' && file) {
        const thumbnailBlob = await extractVideoThumbnail(file);
        if (thumbnailBlob) {
          const form = new FormData();
          form.append('file', thumbnailBlob, 'thumb.jpg');
          const thumbRes = await fetch(`/api/assets/${id}/thumbnail`, {
            method: 'POST',
            body: form,
          });
          if (!thumbRes.ok) {
            showToast(
              'info',
              formatMessage(text(dictionary.admin.thumbnailFailed), {
                reason: text(dictionary.errors.failedToCreateThumbnail),
              }),
            );
          }
        } else {
          showToast('info', text(dictionary.admin.thumbnailDecodeFailed));
        }
      }
      showToast('success', formatMessage(text(dictionary.admin.uploadSuccess), { name: title }));
      setTitle('');
      setDescription('');
      setCategoryId('');
      setAssetType('video');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAssets('all', '');
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      showToast('error', text(dictionary.errors.failedToUploadAsset));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p>{text(dictionary.common.loading)}</p>
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      <div>
        <h1 className="font-display text-3xl text-foreground">{text(dictionary.admin.dashboardTitle)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{text(dictionary.admin.dashboardDescription)}</p>
      </div>

      <StatsCards stats={stats} loading={statsLoading} onRetry={loadStats} />

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">{text(dictionary.admin.uploadNewAsset)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admin-asset-title" className="text-sm font-medium text-muted-foreground">{text(dictionary.admin.assetTitleRequired)}</label>
              <Input id="admin-asset-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={text(dictionary.admin.assetTitlePlaceholder)} />
            </div>
            <div>
              <label htmlFor="admin-asset-type" className="text-sm font-medium text-muted-foreground">{text(dictionary.admin.assetType)}</label>
              <select
                id="admin-asset-type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as 'audio' | 'video')}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="video">{text(dictionary.common.video)}</option>
                <option value="audio">{text(dictionary.common.audio)}</option>
              </select>
            </div>
            <div>
              <label htmlFor="admin-asset-category" className="text-sm font-medium text-muted-foreground">{text(dictionary.admin.assetCategory)}</label>
              <select
                id="admin-asset-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{text(dictionary.admin.noCategoryOption)}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="admin-asset-description" className="text-sm font-medium text-muted-foreground">{text(dictionary.admin.assetDescription)}</label>
            <textarea
              id="admin-asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="admin-asset-file" className="text-sm font-medium text-muted-foreground">{text(dictionary.admin.assetFileRequired)}</label>
            <Input
              id="admin-asset-file"
              ref={fileInputRef}
              type="file"
              accept={assetType === 'audio' ? 'audio/*' : 'video/*'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button variant="warm" onClick={handleUpload} disabled={uploading || !file || !title}>
            {uploading ? text(dictionary.admin.uploading) : text(dictionary.admin.uploadAsset)}
          </Button>
        </CardContent>
      </Card>

      {/* Category manager */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">{text(dictionary.admin.manageCategories)}</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager categories={categories} showToast={showToast} onChanged={loadCategories} />
        </CardContent>
      </Card>

      {/* Asset manager */}
      <div ref={listRef} className="space-y-4 scroll-mt-24">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-xl flex-1">{text(dictionary.admin.manageAssets)}</h2>
          <select
            aria-label={text(dictionary.admin.statusFilter)}
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value as 'all' | 'published' | 'draft';
              setStatusFilter(v);
              loadAssets(v, categoryFilter);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm w-40"
          >
            <option value="all">{text(dictionary.admin.allStatuses)}</option>
            <option value="published">{text(dictionary.common.published)}</option>
            <option value="draft">{text(dictionary.common.draft)}</option>
          </select>
          <select
            aria-label={text(dictionary.admin.categoryFilter)}
            value={categoryFilter}
            onChange={(e) => {
              const v = e.target.value;
              setCategoryFilter(v);
              loadAssets(statusFilter, v);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm w-48"
          >
            <option value="">{text(dictionary.admin.allCategories)}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {assets.length === 0 && statusFilter === 'all' && !categoryFilter ? (
          <p className="text-muted-foreground">{text(dictionary.admin.noAssetsUpload)}</p>
        ) : (
          <AdminAssetTable
            assets={assets}
            categories={categories}
            showToast={showToast}
            onChanged={() => {
              loadAssets(statusFilter, categoryFilter);
              loadCategories();
            }}
          />
        )}
      </div>
    </main>
  );
}
