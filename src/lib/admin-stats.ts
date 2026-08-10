import 'server-only';

export interface AdminStats {
  totalAssets: number;
  publishedAssets: number;
  draftAssets: number;
  totalViews: number;
  totalDownloads: number;
  totalFavorites: number;
  totalCategories: number;
}

/** Abstraction over the Supabase client so aggregation is unit-testable. */
export interface AdminStatsSource {
  countAssets(status?: 'published' | 'draft'): Promise<number>;
  sumViews(): Promise<number>;
  sumDownloads(): Promise<number>;
  countCategories(): Promise<number>;
  countFavorites(): Promise<number>;
}

const toNum = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

export async function buildAdminStats(source: AdminStatsSource): Promise<AdminStats> {
  const [totalAssets, publishedAssets, draftAssets, totalViews, totalDownloads, totalCategories, totalFavorites] =
    await Promise.all([
      source.countAssets(),
      source.countAssets('published'),
      source.countAssets('draft'),
      source.sumViews(),
      source.sumDownloads(),
      source.countCategories(),
      source.countFavorites(),
    ]);

  return {
    totalAssets: toNum(totalAssets),
    publishedAssets: toNum(publishedAssets),
    draftAssets: toNum(draftAssets),
    totalViews: toNum(totalViews),
    totalDownloads: toNum(totalDownloads),
    totalCategories: toNum(totalCategories),
    totalFavorites: toNum(totalFavorites),
  };
}