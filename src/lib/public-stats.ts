export interface PublicStats {
  totalAssets: number;
  totalCategories: number;
}

/** Abstraction over Supabase so aggregation is unit-testable. */
export interface PublicStatsSource {
  countAssets(): Promise<number>;
  countCategories(): Promise<number>;
}

const toNum = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

export async function buildPublicStats(
  source: PublicStatsSource
): Promise<PublicStats> {
  const [totalAssets, totalCategories] = await Promise.all([
    source.countAssets(),
    source.countCategories(),
  ]);
  return {
    totalAssets: toNum(totalAssets),
    totalCategories: toNum(totalCategories),
  };
}
