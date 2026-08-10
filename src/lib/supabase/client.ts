'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/public-env';

// Module-level singleton — creating a client per call spawns a new GoTrueClient
// each time ("Multiple GoTrueClient instances" warning) and makes any effect
// depending on the client re-run on every render.
let client: SupabaseClient | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      publicEnv.SUPABASE_URL,
      publicEnv.SUPABASE_ANON_KEY,
      { isSingleton: true }
    );
  }
  return client;
}