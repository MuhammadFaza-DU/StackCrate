import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth';
import { resolveSort } from '@/lib/asset-sort';
import { assetUploadSchema } from '@/lib/types/schemas';
import { generatePresignedUploadUrl } from '@/lib/r2-presigned';

/**
 * GET /api/assets
 *
 * Public — list published assets with filtering and pagination.
 * Admin — pass `status=all` to include drafts (requires admin session).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const category = searchParams.get('category') ?? '';
    const type = searchParams.get('type') ?? '';
    const statusParam = searchParams.get('status') ?? 'published';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
    const minDuration = searchParams.get('min_duration');
    const maxDuration = searchParams.get('max_duration');
    const minSize = searchParams.get('min_size');
    const maxSize = searchParams.get('max_size');
    const sortBy = searchParams.get('sort') ?? 'newest';

    // Only admins may view non-published assets
    if (statusParam !== 'published') {
      const auth = await requireAdmin();
      if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);
    }

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Build query
    const { column, ascending } = resolveSort(sortBy);
    let query = client
      .from('assets')
      .select(`
        *,
        category:categories(id, slug, name)
      `, { count: 'exact' })
      .order(column, { ascending });

    if (statusParam === 'all') {
      // no status filter
    } else if (statusParam === 'draft') {
      query = query.eq('status', 'draft');
    } else {
      query = query.eq('status', 'published');
    }

    // Filters
    if (q) {
      query = query.ilike('title', `%${q}%`);
    }
    if (category) {
      // Accept either UUID or slug
      const isUuid = /^[0-9a-f-]{36}$/i.test(category);
      if (isUuid) {
        query = query.eq('category_id', category);
      } else {
        // Look up slug → id
        const { data: cat } = await client
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single();
        if (cat) {
          query = query.eq('category_id', cat.id);
        } else {
          // Invalid category → no results
          return success({ items: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }
      }
    }
    if (type) {
      query = query.eq('asset_type', type);
    }
    const featured = searchParams.get('featured') === 'true';
    if (featured) {
      query = query.eq('is_featured', true);
    }
    if (minDuration) {
      query = query.gte('duration_seconds', parseInt(minDuration));
    }
    if (maxDuration) {
      query = query.lte('duration_seconds', parseInt(maxDuration));
    }
    if (minSize) {
      query = query.gte('file_size_bytes', parseInt(minSize) * 1024 * 1024);
    }
    if (maxSize) {
      query = query.lte('file_size_bytes', parseInt(maxSize) * 1024 * 1024);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: assets, error, count } = await query;

    if (error) {
      console.error('[GET /api/assets] query error:', error);
      return err('assets_fetch_failed', 500);
    }

    return success({
      items: assets ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (e) {
    console.error('[GET /api/assets]', e);
    return err('generic_failure', 500);
  }
}

/**
 * POST /api/assets
 *
 * Admin only — create asset record + R2 presigned PUT URL.
 * Client uploads the file directly to the returned presigned_url,
 * then PATCHes the asset to mark it published.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const body = await req.json();
    const parsed = assetUploadSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(',');
      return err('validation_failed', 400, { fields });
    }

    const { title, description, category_id, asset_type, tags, file_name, file_size_bytes, mime_type } = parsed.data;

    // Generate a unique key for the R2 object: assets/<uuid>/<original filename>
    const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `assets/${globalThis.crypto.randomUUID()}/${safeName}`;

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Insert the asset (status 'draft' by default; admin publishes via PATCH)
    const { data: asset, error } = await client
      .from('assets')
      .insert({
        title,
        description: description ?? null,
        category_id: category_id ?? null,
        asset_type,
        status: 'draft',
        file_key: fileKey,
        file_size_bytes,
        mime_type,
        tags: tags ?? [],
        uploaded_by: auth.data.profile.id,
      })
      .select('id, status, uploaded_by, file_key')
      .single();

    if (error || !asset) {
      console.error('[POST /api/assets] insert error:', error);
      return err('asset_create_failed', 500);
    }

    // Presigned PUT URL so the client uploads straight to R2
    const presigned_url = await generatePresignedUploadUrl({
      fileKey: asset.file_key,
      contentType: mime_type,
      expiresIn: 600,
    });

    return success({
      id: asset.id,
      file_key: asset.file_key,
      presigned_url,
      expires_in: 600,
    });
  } catch (e) {
    console.error('[POST /api/assets]', e);
    return err('generic_failure', 500);
  }
}
