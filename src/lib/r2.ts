import { S3Client } from '@aws-sdk/client-s3';
import 'server-only';
import { env } from '@/env';

/**
 * Cloudflare R2 client (S3-compatible).
 * Server-side only.
 */
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = env.R2_BUCKET_NAME;