import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err, categoryNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth';
import { categoryUpdateSchema } from '@/lib/types/schemas';

function getClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

function isNoRowsError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 'PGRST116';
}

/**
 * PATCH /api/categories/[id]
 *
 * Admin only — update category metadata (name, icon, sort_order, …).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(',');
      return err('validation_failed', 400, { fields });
    }

    const client = getClient();
    const { data, error } = await client
      .from('categories')
      .update(parsed.data)
      .eq('id', id)
      .select('id, slug, name, description, icon, sort_order')
      .single();

    if (error) {
      if (isNoRowsError(error)) return categoryNotFound();
      console.error('[PATCH /api/categories/[id]] update query error:', error);
      return err('category_update_failed', 500);
    }
    if (!data) return categoryNotFound();
    return success(data);
  } catch (e) {
    console.error('[PATCH /api/categories/[id]]', e);
    return err('category_update_failed', 500);
  }
}

/**
 * DELETE /api/categories/[id]
 *
 * Admin only — remove a category.
 * RLS + FK `on delete set null` clears asset.category_id automatically.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const { id } = await params;
    const client = getClient();

    const { data: existing, error: fetchError } = await client
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (isNoRowsError(fetchError)) return categoryNotFound();
      console.error('[DELETE /api/categories/[id]] category query error:', fetchError);
      return err('category_fetch_failed', 500);
    }
    if (!existing) return categoryNotFound();

    const { error } = await client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/categories/[id]]', error);
      return err('category_delete_failed', 500);
    }

    return success({ deleted: true, id });
  } catch (e) {
    console.error('[DELETE /api/categories/[id]]', e);
    return err('category_delete_failed', 500);
  }
}
