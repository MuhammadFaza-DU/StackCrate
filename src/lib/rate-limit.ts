/**
 * Rate limit: max N downloads per IP per window (Postgres-backed).
 * Called by POST /api/assets/[id]/download.
 * Uses downloads table to track recent downloads.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@/lib/types/constants';

/**
 * Check if IP has exceeded rate limit.
 * Returns true if rate-limited (should return 429).
 */
export async function isRateLimited(ipAddress: string): Promise<boolean> {
  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { count, error } = await client
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', new Date(windowStart).toISOString());

  if (error) {
    console.error('[rate-limit] count error:', error.message);
    return false; // fail open on error
  }

  return (count ?? 0) >= RATE_LIMIT_MAX;
}

/**
 * Log a download attempt (called after rate limit check passes).
 */
export async function logDownload(params: {
  assetId: string;
  userId: string | null;
  ipAddress: string;
  userAgent: string | null;
}): Promise<void> {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error: insertError } = await client.from('downloads').insert({
    asset_id: params.assetId,
    user_id: params.userId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  });
  if (insertError) {
    console.error('[rate-limit] failed to insert download log:', insertError.message);
  }

  // Bump download count — do NOT swallow the error. If the RPC is missing,
  // the counter dies silently; we want that visible rather than a forever-zero counter.
  const { error: rpcError } = (await client.rpc('increment_download_count', {
    p_asset_id: params.assetId,
  }).maybeSingle()) as { error: { message: string } | null };
  if (rpcError) {
    console.error('[rate-limit] increment_download_count failed:', rpcError.message);
  }
}