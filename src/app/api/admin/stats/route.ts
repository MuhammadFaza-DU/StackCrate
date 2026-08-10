import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { requireAdmin } from '@/lib/auth';
import { success, err } from '@/lib/api-response';
import { buildAdminStats, type AdminStatsSource } from '@/lib/admin-stats';

/**
 * GET /api/admin/stats — admin-only aggregation for the dashboard KPI row.
 * Counts use Supabase `head: true` so they stay accurate past 100 rows.
 * (sum-in-JS is intentional: catalog is small; no extra migration needed.)
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const countByStatus = async (status?: 'published' | 'draft') => {
      let q = client.from('assets').select('id', { count: 'exact', head: true });
      if (status) q = q.eq('status', status);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    };

    const columnSum = async (column: 'view_count' | 'download_count') => {
      const { data, error } = await client.from('assets').select(column);
      if (error) throw error;
      return (data ?? []).reduce(
        (acc: number, row: Record<string, unknown>) => acc + (Number(row[column]) || 0),
        0
      );
    };

    const source: AdminStatsSource = {
      countAssets: (status) => countByStatus(status),
      sumViews: () => columnSum('view_count'),
      sumDownloads: () => columnSum('download_count'),
      countCategories: async () => {
        const { count, error } = await client.from('categories').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
      countFavorites: async () => {
        const { count, error } = await client.from('favorites').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
    };

    return success(await buildAdminStats(source));
  } catch (e) {
    console.error('[GET /api/admin/stats]', e);
    return err('generic_failure', 500);
  }
}
