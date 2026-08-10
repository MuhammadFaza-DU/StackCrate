import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { generatePresignedDownloadUrl } from '@/lib/r2-presigned';
import { env } from '@/env';
import { assetIdSchema, assetUpdateSchema } from '@/lib/types/schemas';
import { requireAdmin } from '@/lib/auth';
import { r2, R2_BUCKET } from '@/lib/r2';
import { success, err, notFound } from '@/lib/api-response';

function isNoRowsError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 'PGRST116';
}

/**
 * GET /api/assets/[id]
 *
 * Public — fetch single asset by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = assetIdSchema.safeParse({ id });
    if (!parsedId.success) return err('validation_failed', 400, { fields: 'id' });

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: asset, error } = await client
      .from('assets')
      .select(`
        *,
        category:categories(id, slug, name)
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error) {
      if (isNoRowsError(error)) return notFound('asset_not_found');
      console.error('[GET /api/assets/[id]] query error:', error);
      return err('asset_fetch_failed', 500);
    }
    if (!asset) return notFound('asset_not_found');

    // Bump view_count (fire and forget)
    client
      .from('assets')
      .update({ view_count: (asset.view_count ?? 0) + 1 })
      .eq('id', id)
      .then(() => {});

    // Generate presigned GET URL for inline preview (expire 1 hour).
    // Not persisted to DB — fresh per request.
    let preview_url: string | null = null;
    try {
      preview_url = await generatePresignedDownloadUrl({
        fileKey: asset.file_key,
        expiresIn: 3600,
      });
    } catch (r2Err) {
      const msg = r2Err instanceof Error ? r2Err.message : String(r2Err);
      console.warn('[GET /api/assets/[id]] preview URL failed:', msg);
    }

    return success({ ...asset, preview_url });
  } catch (e) {
    console.error('[GET /api/assets/[id]]', e);
    return err('asset_fetch_failed', 500);
  }
}

/**
 * PATCH /api/assets/[id]
 *
 * Admin only — update asset metadata.
 * Set status to 'published' to make asset publicly visible.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const { id } = await params;
    const parsedId = assetIdSchema.safeParse({ id });
    if (!parsedId.success) return err('validation_failed', 400, { fields: 'id' });

    const body = await req.json();
    const parsed = assetUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(',');
      return err('validation_failed', 400, { fields });
    }

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // If status flips to 'published', set published_at
    const updatePayload: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === 'published') {
      // Fetch existing to check current status
      const { data: existing, error: existingError } = await client
        .from('assets')
        .select('status, published_at')
        .eq('id', id)
        .single();

      if (existingError) {
        if (isNoRowsError(existingError)) return notFound('asset_not_found');
        console.error('[PATCH /api/assets/[id]] existing asset query error:', existingError);
        return err('asset_update_failed', 500);
      }

      if (existing && existing.status !== 'published' && !existing.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
    }

    const { data: asset, error } = await client
      .from('assets')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        category:categories(id, slug, name)
      `)
      .single();

    if (error) {
      if (isNoRowsError(error)) return notFound('asset_not_found');
      console.error('[PATCH /api/assets/[id]] update query error:', error);
      return err('asset_update_failed', 500);
    }
    if (!asset) return notFound('asset_not_found');

    return success(asset);
  } catch (e) {
    console.error('[PATCH /api/assets/[id]]', e);
    return err('asset_update_failed', 500);
  }
}

/**
 * DELETE /api/assets/[id]
 *
 * Admin only — delete asset metadata and R2 object.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const { id } = await params;
    const parsedId = assetIdSchema.safeParse({ id });
    if (!parsedId.success) return err('validation_failed', 400, { fields: 'id' });

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Fetch file_key first (need it to delete from R2)
    const { data: asset, error: fetchError } = await client
      .from('assets')
      .select('id, file_key')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (isNoRowsError(fetchError)) return notFound('asset_not_found');
      console.error('[DELETE /api/assets/[id]] asset query error:', fetchError);
      return err('asset_fetch_failed', 500);
    }
    if (!asset) return notFound('asset_not_found');

    // Delete from R2 (best-effort; log error but don't fail DB delete)
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: asset.file_key,
      }));
    } catch (r2Err) {
      const msg = r2Err instanceof Error ? r2Err.message : String(r2Err);
      console.warn('[DELETE /api/assets/[id]] R2 delete failed:', msg);
    }

    // Delete the thumbnail object too (best-effort)
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: `assets/${id}/thumb.jpg`,
      }));
    } catch (r2Err) {
      const msg = r2Err instanceof Error ? r2Err.message : String(r2Err);
      console.warn('[DELETE /api/assets/[id]] R2 thumbnail delete failed:', msg);
    }

    // Delete from DB (cascades to downloads, favorites)
    const { error: deleteError } = await client
      .from('assets')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return success({ deleted: true, id });
  } catch (e) {
    console.error('[DELETE /api/assets/[id]]', e);
    return err('asset_delete_failed', 500);
  }
}
