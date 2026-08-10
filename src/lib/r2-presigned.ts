/**
 * R2 presigned URL helpers.
 * - uploadUrl: generates a presigned PUT URL for direct client upload
 * - downloadUrl: returns the public R2 URL (bucket must be public)
 */
import 'server-only';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';
import { r2, R2_BUCKET } from '@/lib/r2';

/**
 * Generate a presigned PUT URL for direct client upload to R2.
 * URL expires after `expiresInSeconds` (default: 5 minutes).
 */
export async function generatePresignedUploadUrl(params: {
  fileKey: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const { fileKey, contentType, expiresIn = 300 } = params;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

/**
 * Generate a presigned GET URL for private downloads.
 * Falls back to public URL if bucket is public.
 */
export async function generatePresignedDownloadUrl(params: {
  fileKey: string;
  expiresIn?: number;
  responseContentDisposition?: string;
  responseContentType?: string;
}): Promise<string> {
  const { fileKey, expiresIn = 3600, responseContentDisposition, responseContentType } = params;

  // Try presigned URL first (works for both public and private buckets)
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileKey,
    ...(responseContentDisposition ? { ResponseContentDisposition: responseContentDisposition } : {}),
    ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
  });

  return getSignedUrl(r2, command, { expiresIn });
}

/**
 * Get the public URL for an R2 object (when bucket is public).
 */
export function getPublicUrl(fileKey: string): string {
  return `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${fileKey}`;
}