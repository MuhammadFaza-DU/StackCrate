import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';

/**
 * POST /api/auth/signup
 *
 * Body: { email, password, display_name? }
 *
 * Uses the admin API (createUser) so signups work regardless of the Supabase
 * dashboard's "Email signups are disabled" / email-provider toggles, and
 * `email_confirm: true` skips the confirmation email (avoids GoTrue's
 * per-hour email rate limit).
 *
 * NOTE (dev trade-off): admin.createUser in a public route is acceptable for
 * this project stage (PRD v0) but must be replaced for production, e.g. by a
 * proper Google OAuth login or by re-enabling email signups + SMTP.
 *
 * The DB trigger handle_new_user() auto-creates the profiles row — never
 * insert into profiles from app code (caused the profiles_pkey duplicate).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; password?: string; display_name?: string };
    const { email, password, display_name } = body;

    if (!email || !password) return err('required_fields', 400);
    if (password.length < 6) return err('weak_password', 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return err('invalid_email', 400);

    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: adminData, error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, full_name: display_name },
    });

    if (createError) {
      if (/already|registered|exists|security_emaili/i.test(createError.message ?? '')) {
        return err('duplicate_account', 500);
      }
      throw createError;
    }
    if (!adminData.user) throw new Error('Signup failed');

    // Auto-login: return a real session so the browser client can persist it.
    // If the follow-up sign-in fails (e.g. email provider disabled in dashboard),
    // still return success so the account exists and the user can log in later.
    const { data: loginData, error: loginError } = await client.auth.signInWithPassword({ email, password });
    if (!loginError && loginData.session) {
      return success({
        user_id: adminData.user.id,
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token,
      });
    }

    return success({
      user_id: adminData.user.id,
      needs_login: true,
    });
  } catch (e) {
    console.error('[POST /api/auth/signup]', e);
    return err('generic_failure', 500);
  }
}
