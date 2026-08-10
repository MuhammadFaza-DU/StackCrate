import { describe, expect, it, vi } from 'vitest';
import { fetchJson } from '@/lib/http';

describe('fetchJson', () => {
  it('rejects non-OK responses instead of returning an API failure payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'server failure' }), { status: 503 }),
    ));

    await expect(fetchJson('/api/assets')).rejects.toThrow('Request failed with status 503');

    vi.unstubAllGlobals();
  });
});
