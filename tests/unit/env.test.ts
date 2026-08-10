import { describe, it, expect } from 'vitest';
import { env, publicEnv } from '@/env';

describe('env schema', () => {
  it('should export env and publicEnv objects', () => {
    expect(env).toBeDefined();
    expect(publicEnv).toBeDefined();
  });

  it('should have required fields populated', () => {
    expect(env.SUPABASE_URL).toBeTruthy();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    expect(env.R2_ACCESS_KEY_ID).toBeTruthy();
    expect(env.R2_BUCKET_NAME).toBeTruthy();
    expect(publicEnv.SUPABASE_URL).toBeTruthy();
    expect(publicEnv.SUPABASE_ANON_KEY).toBeTruthy();
  });

  it('should have R2_BUCKET_NAME matching expected value', () => {
    expect(env.R2_BUCKET_NAME).toBe('stackcrate-assets');
  });
});