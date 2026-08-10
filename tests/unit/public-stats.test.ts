import { describe, it, expect, vi } from 'vitest';
import { buildPublicStats } from '@/lib/public-stats';
import type { PublicStatsSource } from '@/lib/public-stats';

function source(overrides: Partial<PublicStatsSource> = {}): PublicStatsSource {
  return {
    countAssets: vi.fn(async () => 1200),
    countCategories: vi.fn(async () => 8),
    ...overrides,
  };
}

describe('buildPublicStats', () => {
  it('returns totalAssets and totalCategories', async () => {
    expect(await buildPublicStats(source())).toEqual({ totalAssets: 1200, totalCategories: 8 });
  });

  it('normalizes null/undefined to 0', async () => {
    const stats = await buildPublicStats(
      source({
        countAssets: async () => null as unknown as number,
      })
    );
    expect(stats.totalAssets).toBe(0);
  });
});
