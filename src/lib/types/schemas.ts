/**
 * Zod schemas for API input validation.
 * Each route validates against its matching schema before touching the DB.
 */
import { z } from 'zod';
import type { AssetWithCategory } from './asset';

// The public asset APIs return full database rows, so keep unknown fields while
// validating the fields consumed by shared asset renderers.
const nonBlankResponseString = z.string().min(1).refine((value) => value.trim() !== '');

const assetCategoryResponseSchema = z.object({
  id: nonBlankResponseString,
  slug: nonBlankResponseString,
  name: nonBlankResponseString,
}).passthrough();

export const assetResponseSchema = z.object({
  id: nonBlankResponseString,
  title: nonBlankResponseString,
  tags: z.array(z.string()),
  category: assetCategoryResponseSchema.nullable().optional(),
}).passthrough();

export function isAssetResponse(value: unknown): value is AssetWithCategory {
  return assetResponseSchema.safeParse(value).success;
}

// ─── Asset schemas ───────────────────────────────────────────────────────────

export const assetCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  asset_type: z.enum(['audio', 'video']),
  tags: z.array(z.string()).max(20).optional(),
  published: z.boolean().optional(),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

/**
 * Upload flow uses a separate schema: the DB insert needs media facts
 * (file_name, size, mime) upfront so the NOT NULL columns are filled
 * before the client PUTs the object to R2.
 */
export const assetUploadSchema = assetCreateSchema.extend({
  file_name: z.string().min(1, 'File name is required').max(255),
  file_size_bytes: z.number().int().positive().max(50 * 1024 * 1024 * 1024),
  mime_type: z.string().min(3).max(100),
});

export type AssetUploadInput = z.infer<typeof assetUploadSchema>;

export const assetUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(['draft', 'published']).optional(),
  published_at: z.string().datetime().nullable().optional(),
  is_featured: z.boolean().optional(),
  thumbnail_url: z.string().max(500).nullable().optional(),
  duration_seconds: z.number().nonnegative().max(360000).optional(),
});

export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;

/**
 * List & search filters — extracted from query string.
 * Uses URLSearchParams for zero-validation (route handler validates after).
 */
export const assetListParamsSchema = z.object({
  page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
  limit: z.string().transform((v) => parseInt(v, 10)).default('20').optional(),
  category: z.string().optional(),
  type: z.enum(['audio', 'video']).optional(),
  q: z.string().optional(),
  sort: z.enum(['newest', 'popular']).default('newest').optional(),
});

export type AssetListParams = z.infer<typeof assetListParamsSchema>;

export const assetIdSchema = z.object({
  id: z.string().uuid(),
});

export type AssetIdParams = z.infer<typeof assetIdSchema>;

// ─── Auth schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Category schemas ────────────────────────────────────────────────────────

export const categoryCreateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  sort_order: z.number().int().nonnegative().default(0),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});
