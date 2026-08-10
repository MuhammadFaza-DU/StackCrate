import { describe, it, expect, vi } from 'vitest';
import { buildAdminStats } from '@/lib/admin-stats';
import type { AdminStatsSource } from '@/lib/admin-stats';

function source(overrides: Partial<AdminStatsSource> = {}): AdminStatsSource {
  return {
    countAssets: vi.fn(async (status?: 'published' | 'draft') => {
      if (status === 'published') return 12;
      if (status === 'draft') return 3;
      return 15;
    }),
    sumViews: vi.fn(async () => 40210),
    sumDownloads: vi.fn(async () => 231),
    countCategories: vi.fn(async () => 8),
    countFavorites: vi.fn(async () => 76),
    ...overrides,
  };
}

describe('buildAdminStats', () => {
  it('aggregates all counters into an AdminStats object', async () => {
    const stats = await buildAdminStats(source());

    expect(stats).toEqual({
      totalAssets: 15,
      publishedAssets: 12,
      draftAssets: 3,
      totalViews: 40210,
      totalDownloads: 231,
      totalFavorites: 76,
      totalCategories: 8,
    });
  });

  it('normalizes null/undefined numbers to 0', async () => {
    const stats = await buildAdminStats(
      source({
        countAssets: async () => null as unknown as number,
        sumViews: async () => undefined as unknown as number,
      })
    );
    expect(stats.totalAssets).toBe(0);
    expect(stats.totalViews).toBe(0);
  });
});