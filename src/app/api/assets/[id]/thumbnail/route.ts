import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/env';
import { r2, R2_BUCKET } from '@/lib/r2';
import { assetIdSchema } from '@/lib/types/schemas';
import { requireAdmin } from '@/lib/auth';
import { success, err, notFound } from '@/lib/api-response';

/**
 * The thumbnail for an asset is stored in R2 under `assets/<id>/thumb.jpg`.
 * The DB `thumbnail_url` points at this public route so clients don't need
 * presigned URLs that expire.
 */
function thumbnailKey(id: string): string {
  return `assets/${id}/thumb.jpg`;
}

function isNoRowsError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 'PGRST116';
}

/**
 * POST /api/assets/[id]/thumbnail
 *
 * Admin only — accepts a multipart form upload (`file`) and stores it as the
 * asset's thumbnail in R2, then sets `thumbnail_url` on the asset.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const { id } = await params;
    const parsedId = assetIdSchema.safeParse({ id });
    if (!parsedId.success) return err('validation_failed', 400, { fields: 'id' });

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return err('validation_failed', 400, { fields: 'file' });
    }

    // Limit: thumbnails should be small (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return err('validation_failed', 400, { fields: 'file' });
    }

    const contentType = file.type || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return err('validation_failed', 400, { fields: 'file' });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Ensure the asset exists (and it must be a video — audio uses the logo)
    const { data: asset, error: fetchError } = await client
      .from('assets')
      .select('id, asset_type')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (isNoRowsError(fetchError)) return notFound('asset_not_found');
      console.error('[POST /api/assets/[id]/thumbnail] asset query error:', fetchError);
      return err('asset_fetch_failed', 500);
    }
    if (!asset) return notFound('asset_not_found');

    const key = thumbnailKey(id);

    // Upload to R2
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }));

    // Point the asset's thumbnail_url at this public route
    const { data: updated, error: updateError } = await client
      .from('assets')
      .update({ thumbnail_url: `/api/assets/${id}/thumbnail` })
      .eq('id', id)
      .select('id, thumbnail_url')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error('Failed to update asset thumbnail');
    }

    return success({ id: updated.id, thumbnail_url: updated.thumbnail_url });
  } catch (e) {
    console.error('[POST /api/assets/[id]/thumbnail]', e);
    return err('asset_update_failed', 500);
  }
}

/**
 * GET /api/assets/[id]/thumbnail
 *
 * Public — streams the stored thumbnail image from R2.
 * 404 if the asset has no thumbnail uploaded yet.
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

    // Only published assets expose thumbnails publicly (admin sees all via cookie)
    const { data: asset, error: fetchError } = await client
      .from('assets')
      .select('id, status, thumbnail_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (isNoRowsError(fetchError)) return notFound('asset_not_found');
      console.error('[GET /api/assets/[id]/thumbnail] asset query error:', fetchError);
      return err('asset_fetch_failed', 500);
    }
    if (!asset || !asset.thumbnail_url) return notFound('asset_not_found');

    // Only published assets are publicly viewable; drafts require admin
    if (asset.status !== 'published') {
      const auth = await requireAdmin();
      if (auth.error) return notFound('asset_not_found');
    }

    const body = await r2.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: thumbnailKey(id),
    }));

    if (!body) return notFound('asset_not_found');

    // body.Body is a stream; convert for NextResponse
    const stream = body.Body as unknown as ReadableStream<Uint8Array> | null;
    if (!stream) return notFound('asset_not_found');

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('[GET /api/assets/[id]/thumbnail]', e);
    return err('asset_fetch_failed', 500);
  }
}
