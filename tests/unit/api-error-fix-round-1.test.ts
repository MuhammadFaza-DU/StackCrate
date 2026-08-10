import { describe, expect, it, vi } from 'vitest';
import { GET as getAsset } from '@/app/api/assets/[id]/route';
import { DELETE as deleteCategory, PATCH as patchCategory } from '@/app/api/categories/[id]/route';
import { enDictionary } from '@/i18n/dictionaries/en';
import { err } from '@/lib/api-response';
import { localizeApiError } from '@/lib/api-error';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requireAdmin: vi.fn().mockResolvedValue({
    data: { id: 'admin-1', profile: { id: 'admin-1', role: 'admin' } },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mocks.from }),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: mocks.requireAdmin,
}));

const assetId = '00000000-0000-0000-0000-000000000001';

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn> | unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

async function readBody(response: Response) {
  return await response.json() as { data: unknown; error: unknown };
}

describe('API error fix round 1', () => {
  it('returns asset_not_found only when the asset query has no row', async () => {
    mocks.from.mockReturnValue(query({ data: null, error: null }));

    const response = await getAsset(
      new Request(`http://localhost/api/assets/${assetId}`) as never,
      { params: Promise.resolve({ id: assetId }) },
    );

    expect(response.status).toBe(404);
    expect((await readBody(response)).error).toEqual({ code: 'asset_not_found' });
  });

  it('returns asset_fetch_failed for an asset query error', async () => {
    mocks.from.mockReturnValue(query({ data: null, error: { code: 'DB_ERROR' } }));

    const response = await getAsset(
      new Request(`http://localhost/api/assets/${assetId}`) as never,
      { params: Promise.resolve({ id: assetId }) },
    );

    expect(response.status).toBe(500);
    expect((await readBody(response)).error).toEqual({ code: 'asset_fetch_failed' });
  });

  it('returns category_not_found for deleting a missing category', async () => {
    mocks.from.mockReturnValue(query({ data: null, error: { code: 'PGRST116' } }));

    const response = await deleteCategory(
      new Request(`http://localhost/api/categories/${assetId}`, { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: assetId }) },
    );

    expect(response.status).toBe(404);
    expect((await readBody(response)).error).toEqual({ code: 'category_not_found' });
  });

  it('returns category_delete_failed for a category delete query error', async () => {
    mocks.from
      .mockImplementationOnce(() => query({ data: { id: assetId }, error: null }))
      .mockImplementationOnce(() => query({ data: null, error: { code: 'DB_ERROR' } }));

    const response = await deleteCategory(
      new Request(`http://localhost/api/categories/${assetId}`, { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: assetId }) },
    );

    expect(response.status).toBe(500);
    expect((await readBody(response)).error).toEqual({ code: 'category_delete_failed' });
  });

  it('returns category_update_failed for a category update query error', async () => {
    mocks.from.mockReturnValue(query({ data: null, error: { code: 'DB_ERROR' } }));

    const response = await patchCategory(
      new Request(`http://localhost/api/categories/${assetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      { params: Promise.resolve({ id: assetId }) },
    );

    expect(response.status).toBe(500);
    expect((await readBody(response)).error).toEqual({ code: 'category_update_failed' });
  });

  it('uses the generic localized fallback for prototype-name and unknown codes', () => {
    for (const code of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'unknown_code']) {
      expect(() => localizeApiError(
        enDictionary,
        { code },
        500,
        enDictionary.errors.generic,
      )).not.toThrow();
      expect(localizeApiError(
        enDictionary,
        { code },
        500,
        enDictionary.errors.generic,
      )).toBe(enDictionary.errors.generic);
    }
  });

  it('sanitizes arbitrary legacy error strings before returning them', async () => {
    const body = await readBody(err('database password: secret', 500));

    expect(body).toEqual({ data: null, error: { code: 'generic_failure' } });
  });
});
