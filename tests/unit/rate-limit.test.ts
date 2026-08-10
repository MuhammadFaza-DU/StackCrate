import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logDownload } from '@/lib/rate-limit';

const calls: Array<{ op: string; args: unknown }> = [];

const fakeClient = {
  from: vi.fn(() => ({
    insert: vi.fn((row) => {
      calls.push({ op: 'insert', args: row });
      return Promise.resolve({ error: null });
    }),
  })),
  rpc: vi.fn((_fn: string, params: Record<string, unknown>) => {
    calls.push({ op: 'rpc', args: params });
    return {
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => fakeClient,
}));

describe('logDownload', () => {
  beforeEach(() => {
    calls.length = 0;
    fakeClient.from.mockClear();
    fakeClient.rpc.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const params = {
    assetId: '00000000-0000-0000-0000-000000000001',
    userId: null,
    ipAddress: '203.0.113.7',
    userAgent: 'vitest',
  };

  it('inserts a download log and calls increment_download_count RPC', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await logDownload(params);

    expect(fakeClient.rpc).toHaveBeenCalledWith('increment_download_count', {
      p_asset_id: params.assetId,
    });
    const insertCall = fakeClient.from.mock.results[0].value.insert;
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: params.assetId,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      })
    );
  });

  it('does not throw when RPC fails; logs the error instead', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeClient.rpc.mockImplementationOnce(() => ({
      maybeSingle: () =>
        Promise.resolve({ data: null, error: { message: 'function not found' } }),
    }));

    await expect(logDownload(params)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('increment_download_count'),
      expect.stringContaining('function not found')
    );
  });
});