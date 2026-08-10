import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { requireAuth } from '@/lib/auth';
import { success, err } from '@/lib/api-response';

/**
 * GET /api/favorites
 *
 * Authenticated — returns the user's favorited assets (full rows,
 * joined with category) plus the raw list of asset IDs so the
 * FavoriteButton state stays cheap.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return err('unauthorized', auth.error.status);

  try {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client
      .from('favorites')
      .select(`
        asset_id,
        asset:assets!inner(
          *,
          category:categories(id, slug, name)
        )
      `)
      .eq('user_id', auth.data.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // favorites join produces { asset_id, asset: <asset row + category> }
    type FetchedFavorite = {
      asset: {
        id: string;
        [key: string]: unknown;
      } | null;
    };
    const assets = ((data as unknown as FetchedFavorite[] | null)
      ?.map((f) => f.asset)
      .filter((a): a is NonNullable<FetchedFavorite['asset']> => a !== null)) ?? [];
    const assetIds = assets.map((a) => a.id);

    return success({ assets, asset_ids: assetIds });
  } catch (e) {
    console.error('[GET /api/favorites]', e);
    return err('generic_failure', 500);
  }
}

/**
 * POST /api/favorites
 *
 * Body: { asset_id }
 * Adds an asset to the current user's favorites.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return err('unauthorized', auth.error.status);

  try {
    const body = await req.json() as { asset_id?: string };
    const asset_id = body.asset_id;
    if (!asset_id || typeof asset_id !== 'string') {
      return err('required_fields', 400, { fields: 'asset_id' });
    }

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Idempotent insert — ignore conflict
    const { error } = await client
      .from('favorites')
      .insert({ user_id: auth.data.id, asset_id });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }

    return success({ favorited: true, asset_id });
  } catch (e) {
    console.error('[POST /api/favorites]', e);
    return err('generic_failure', 500);
  }
}

/**
 * DELETE /api/favorites
 *
 * Body: { asset_id }
 * Removes an asset from the current user's favorites.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return err('unauthorized', auth.error.status);

  try {
    const body = await req.json() as { asset_id?: string };
    const asset_id = body.asset_id;
    if (!asset_id || typeof asset_id !== 'string') {
      return err('required_fields', 400, { fields: 'asset_id' });
    }

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await client
      .from('favorites')
      .delete()
      .match({ user_id: auth.data.id, asset_id });

    if (error) throw error;

    return success({ favorited: false, asset_id });
  } catch (e) {
    console.error('[DELETE /api/favorites]', e);
    return err('generic_failure', 500);
  }
}
