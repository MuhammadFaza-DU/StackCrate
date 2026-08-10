import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) return err('required_fields', 400);

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Sign in
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) return err('invalid_credentials', 401);
    if (!authData.session) return err('invalid_credentials', 401);

    // Return session token (client will handle cookie storage)
    return success({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });
  } catch (e) {
    console.error('[POST /api/auth/login]', e);
    return err('generic_failure', 500);
  }
}
