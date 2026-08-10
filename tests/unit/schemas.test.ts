import { describe, it, expect } from 'vitest';
import { assetResponseSchema, assetUpdateSchema, isAssetResponse } from '@/lib/types/schemas';

describe('assetUpdateSchema', () => {
  it('accepts is_featured boolean', () => {
    const res = assetUpdateSchema.safeParse({ title: 'Raw Clip', is_featured: true });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.is_featured).toBe(true);
  });

  it('accepts is_featured false', () => {
    const res = assetUpdateSchema.safeParse({ is_featured: false });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.is_featured).toBe(false);
  });

  it('rejects non-boolean is_featured', () => {
    const res = assetUpdateSchema.safeParse({ is_featured: 'yes' });
    expect(res.success).toBe(false);
  });
});

describe('assetResponseSchema', () => {
  const validAsset = {
    id: 'asset-1',
    title: 'Raw Clip',
    tags: ['ambient'],
    category: { id: 'category-1', slug: 'music', name: 'Music' },
  };

  it('accepts the API asset shape and preserves joined category data', () => {
    const res = assetResponseSchema.safeParse(validAsset);

    expect(res.success).toBe(true);
    expect(isAssetResponse(validAsset)).toBe(true);
    if (res.success) expect(res.data.category).toEqual(validAsset.category);
  });

  it.each([
    ['tags as a string', { ...validAsset, tags: 'ambient' }],
    ['tags containing an object', { ...validAsset, tags: [{}] }],
    ['category as a string', { ...validAsset, category: 'music' }],
    ['category missing its slug', { ...validAsset, category: { id: 'category-1', name: 'Music' } }],
  ])('rejects malformed nested response data: %s', (_, value) => {
    expect(assetResponseSchema.safeParse(value).success).toBe(false);
    expect(isAssetResponse(value)).toBe(false);
  });
});
