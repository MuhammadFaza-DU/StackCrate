'use client';

import * as React from 'react';
import { Trash2, Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AssetWithCategory, Category } from '@/lib/types/asset';
import type { ToastType } from '@/components/ui/toast';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatMessage } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { localizeResponseError } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface AdminAssetTableProps {
  assets: AssetWithCategory[];
  categories: Category[];
  showToast: (type: ToastType, message: string) => void;
  onChanged: () => void;
}

export function AdminAssetTable({ assets, categories, showToast, onChanged }: AdminAssetTableProps) {
  const { dictionary } = useLocale();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const patchAsset = async (
    id: string,
    payload: Record<string, unknown>,
    successMsg: Message,
    errorMsg: Message = dictionary.errors.failedToUpdateAsset,
  ) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
         showToast('error', await localizeResponseError(res, dictionary, errorMsg));
        return;
      }
      showToast('success', text(successMsg));
      onChanged();
    } catch {
      showToast('error', text(errorMsg));
    } finally {
      setBusyId(null);
    }
  };

  const deleteAsset = async (asset: AssetWithCategory) => {
    if (!window.confirm(formatMessage(text(dictionary.admin.assetDeleteConfirm), { name: asset.title }))) return;
    setBusyId(asset.id);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' });
      if (!res.ok) {
         showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToDeleteAsset));
        return;
      }
      showToast('success', formatMessage(text(dictionary.admin.assetDeleteSuccess), { name: asset.title }));
      onChanged();
    } catch {
      showToast('error', text(dictionary.errors.failedToDeleteAsset));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      {assets.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">{text(dictionary.admin.noAssetsFilter)}</p>
      )}

      {assets.map((asset) => (
        <div
          key={asset.id}
          className={cn(
            'flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm',
            busyId === asset.id && 'opacity-60 pointer-events-none'
          )}
        >
          {/* thumb */}
          <div className="w-12 h-9 rounded overflow-hidden bg-muted shrink-0">
            {asset.thumbnail_url ? (
              <img src={asset.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : asset.asset_type === 'audio' ? (
              <img src="/logo-audio.png" alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs">▶️</div>
            )}
          </div>

          {/* title + meta */}
          <div className="flex-1 min-w-[160px]">
            <p className="font-semibold truncate">{asset.title}</p>
            <p className="text-xs text-muted-foreground">
              {asset.asset_type === 'audio' ? text(dictionary.common.audio) : text(dictionary.common.video)} ·{' '}
              {(asset.file_size_bytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>

          {/* status chip */}
          <button
            onClick={() =>
              patchAsset(
                asset.id,
                { status: asset.status === 'published' ? 'draft' : 'published' },
                asset.status === 'published' ? dictionary.admin.assetUnpublished : dictionary.admin.assetPublished,
                dictionary.errors.failedToPublishAsset,
              )
            }
            className={cn(
              'px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer',
              asset.status === 'published' ? 'status-published hover:brightness-110' : 'status-draft hover:brightness-110'
            )}
             title={formatMessage(text(dictionary.admin.assetStatusLabel), { name: asset.title })}
             aria-label={formatMessage(text(dictionary.admin.assetStatusLabel), { name: asset.title })}
          >
            {asset.status === 'published' ? text(dictionary.common.published) : text(dictionary.common.draft)}
          </button>

          {/* category select */}
          <select
            id={`admin-asset-category-${asset.id}`}
            aria-label={formatMessage(text(dictionary.admin.assetCategoryLabel), { name: asset.title })}
            value={asset.category_id ?? ''}
            onChange={(e) =>
              patchAsset(
                asset.id,
                { category_id: e.target.value === '' ? null : e.target.value },
                dictionary.admin.categoryUpdated,
              )
            }
            className="h-9 rounded-lg border border-input bg-background px-2 py-1.5 text-sm w-40"
          >
            <option value="">{text(dictionary.admin.noCategoryOption)}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          {/* actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <a
              href={`/assets/${asset.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={formatMessage(text(dictionary.admin.viewAssetLabel), { name: asset.title })}
              aria-label={formatMessage(text(dictionary.admin.viewAssetLabel), { name: asset.title })}
            >
              <Eye className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() =>
                patchAsset(
                  asset.id,
                  { is_featured: !asset.is_featured },
                  asset.is_featured ? dictionary.admin.assetUnfeatured : dictionary.admin.assetFeatured,
                )
              }
              disabled={busyId === asset.id}
               title={formatMessage(text(asset.is_featured ? dictionary.admin.unfeatureAssetLabel : dictionary.admin.featureAssetLabel), { name: asset.title })}
               aria-label={formatMessage(text(asset.is_featured ? dictionary.admin.unfeatureAssetLabel : dictionary.admin.featureAssetLabel), { name: asset.title })}
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors',
                asset.is_featured
                  ? 'text-amber-400 hover:text-amber-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Star className={cn('w-4 h-4', asset.is_featured && 'fill-current')} />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-destructive/10"
              onClick={() => deleteAsset(asset)}
              disabled={busyId === asset.id}
               title={formatMessage(text(dictionary.admin.deleteAssetLabel), { name: asset.title })}
               aria-label={formatMessage(text(dictionary.admin.deleteAssetLabel), { name: asset.title })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
