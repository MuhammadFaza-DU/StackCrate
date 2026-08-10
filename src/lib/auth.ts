/**
 * Auth helpers — admin guard, session, profile lookup.
 * All functions are server-side only (import 'server-only').
 */
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/env';

// ─── Clients ─────────────────────────────────────────────────────────────────

async function getCookieStore() {
  return await cookies();
}

function createSupabaseServerClient() {
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      async getAll() {
        return (await getCookieStore()).getAll();
      },
      async setAll(cookiesToSet) {
        const cookieStore = await getCookieStore();
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

// ─── Session & Profile ───────────────────────────────────────────────────────���

export interface Session {
  id: string;
  email: string | null;
}

/** Get current session — returns null if not authenticated. */
export async function getSession(): Promise<Session | null> {
  const client = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
}

/** Get user profile with role — returns null if not found. */
export async function getProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  if (!session) return null;

  const client = createSupabaseServerClient();
  const { data: profile, error } = await client
    .from('profiles')
    .select('id, email, display_name, avatar_url, role')
    .eq('id', session.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Check if current user is admin. */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === 'admin';
}

/** Require authenticated user. Returns error if not authenticated. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: { status: 401 as const, message: 'Unauthorized' } };
  }
  return { data: session };
}

/** Require admin. Returns error if not authenticated or not admin. */
export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const profile = await getProfile();
  if (!profile || profile.role !== 'admin') {
    return { error: { status: 403 as const, message: 'Forbidden — admin only' } };
  }
  return { data: { ...auth.data, profile } };
}