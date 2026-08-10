import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth';
import { categoryCreateSchema } from '@/lib/types/schemas';

function getClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * GET /api/categories
 *
 * Public — returns all categories sorted by sort_order.
 */
export async function GET() {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('categories')
      .select('id, slug, name, description, icon, sort_order')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return success(data ?? []);
  } catch (e) {
    console.error('[GET /api/categories]', e);
    return err('category_fetch_failed', 500);
  }
}

/**
 * POST /api/categories
 *
 * Admin only — create a new category.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.status === 401 ? 'unauthorized' : 'forbidden', auth.error.status);

  try {
    const body = await req.json();
    const parsed = categoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(',');
      return err('validation_failed', 400, { fields });
    }

    const client = getClient();
    const { data, error } = await client
      .from('categories')
      .insert(parsed.data)
      .select('id, slug, name, description, icon, sort_order')
      .single();

    if (error || !data) {
      console.error('[POST /api/categories] insert error:', error);
      return err('category_create_failed', 500);
    }

    return success(data);
  } catch (e) {
    console.error('[POST /api/categories]', e);
    return err('category_create_failed', 500);
  }
}
