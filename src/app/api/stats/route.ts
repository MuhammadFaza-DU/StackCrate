import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';
import { buildPublicStats } from '@/lib/public-stats';

/**
 * GET /api/stats
 *
 * Public — aggregate counts for the landing hero social-proof row.
 */
export async function GET() {
  try {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { count: assetCount, error: assetErr } = await client
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    const { count: categoryCount, error: categoryErr } = await client
      .from('categories')
      .select('id', { count: 'exact', head: true });

    if (assetErr || categoryErr) {
      throw assetErr ?? categoryErr;
    }

    const stats = await buildPublicStats({
      countAssets: async () => assetCount ?? 0,
      countCategories: async () => categoryCount ?? 0,
    });

    return success(stats);
  } catch (e) {
    console.error('[GET /api/stats]', e);
    return err('generic_failure', 500);
  }
}
