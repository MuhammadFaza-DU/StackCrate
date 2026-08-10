import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { assetIdSchema } from '@/lib/types/schemas';
import { checkRateLimit } from '@/lib/middleware';
import { logDownload } from '@/lib/rate-limit';
import { getSession } from '@/lib/auth';
import { generatePresignedDownloadUrl } from '@/lib/r2-presigned';
import { success, err, notFound, rateLimited } from '@/lib/api-response';

/**
 * POST /api/assets/[id]/download
 *
 * Public — returns R2 URL for download.
 * Rate limited: 10/IP/hour.
 * Bumps download_count.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit check
    const limited = await checkRateLimit(req);
     if (limited) return rateLimited();

    const { id } = await params;
    const parsed = assetIdSchema.safeParse({ id });
    if (!parsed.success) return err('validation_failed', 400, { fields: 'id' });

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Fetch asset
    const { data: asset, error } = await client
      .from('assets')
      .select('id, file_key, status, mime_type')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !asset) return notFound('asset_not_found');

    // Get session (optional for downloads)
    const session = await getSession();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const userAgent = req.headers.get('user-agent');

    // Log download + bump count
    await logDownload({
      assetId: id,
      userId: session?.id ?? null,
      ipAddress: ip,
      userAgent,
    });

    // Generate presigned download URL with Content-Disposition: attachment
    // so the browser auto-downloads instead of opening inline.
    const rawName = asset.file_key.split('/').pop() ?? 'download';
    const filename = rawName.replace(/[ \r\n"']/g, '_');
    const downloadUrl = await generatePresignedDownloadUrl({
      fileKey: asset.file_key,
      responseContentDisposition: `attachment; filename="${filename}"`,
    });

    return success({
      url: downloadUrl,
      filename,
      mime_type: asset.mime_type,
      expires_in: 3600,
    });
  } catch (e) {
    console.error('[POST /api/assets/[id]/download]', e);
    return err('download_failed', 500);
  }
}
