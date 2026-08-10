import { describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { assetNotFound, err, notFound, rateLimited, success } from '@/lib/api-response';
import { enDictionary } from '@/i18n/dictionaries/en';
import { localizeApiError } from '@/lib/api-error';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      }),
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'User already registered' },
        }),
      },
    },
  }),
}));

async function readBody(response: Response) {
  return await response.json() as { data: unknown; error: unknown };
}

describe('API error codes', () => {
  it('keeps successful responses in the existing data/error envelope', async () => {
    const body = await readBody(success({ id: 'asset-1' }));

    expect(body).toEqual({ data: { id: 'asset-1' }, error: null });
  });

  it('returns a stable code and optional params without exposing a message', async () => {
    const body = await readBody(err('validation_failed', 400, { fields: 'email,password' }));

    expect(body).toEqual({
      data: null,
      error: { code: 'validation_failed', params: { fields: 'email,password' } },
    });
  });

  it('returns coded auth errors from login and signup routes', async () => {
    const loginBody = await readBody(await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
      headers: { 'Content-Type': 'application/json' },
    }) as never));
    const signupResponse = await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
      headers: { 'Content-Type': 'application/json' },
    }) as never);
    const signupBody = await readBody(signupResponse);

    expect(loginBody.error).toEqual({ code: 'invalid_credentials' });
    expect(signupBody.error).toEqual({ code: 'duplicate_account' });
    expect(signupResponse.status).toBe(500);
  });

  it('returns required-fields code for missing auth input', async () => {
    const response = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }) as never);

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toEqual({ code: 'required_fields' });
  });

  it('keeps not-found and rate-limit statuses while adding stable codes', async () => {
    const notFoundBody = await readBody(assetNotFound());
    const genericNotFoundBody = await readBody(notFound());
    const rateResponse = rateLimited();
    const rateBody = await readBody(rateResponse);

    expect(notFoundBody.error).toEqual({ code: 'asset_not_found' });
    expect(genericNotFoundBody.error).toEqual({ code: 'not_found' });
    expect(rateResponse.status).toBe(429);
    expect(rateResponse.headers.get('Retry-After')).toBe('3600');
    expect(rateBody.error).toEqual({
      code: 'rate_limited',
      params: { retryAfterSeconds: 3600 },
    });
  });

  it('represents generic failures as a safe machine-readable code', async () => {
    const body = await readBody(err('generic_failure', 500));

    expect(body.error).toEqual({ code: 'generic_failure' });
  });

  it('translates coded errors and interpolates safe params at the UI boundary', () => {
    expect(localizeApiError(
      enDictionary,
      { code: 'rate_limited', params: { retryAfterSeconds: 60 } },
      429,
      enDictionary.errors.generic,
    )).toBe('Too many requests. Try again in 60 seconds.');
  });

  it('uses a localized generic message when a coded rate-limit error has no duration', () => {
    const localized = localizeApiError(
      enDictionary,
      { code: 'rate_limited' },
      429,
      enDictionary.errors.generic,
    );

    expect(localized).toBe(enDictionary.errors.rateLimitedGeneric);
    expect(localized).not.toContain('{retryAfterSeconds}');
  });
});
