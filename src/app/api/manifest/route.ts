import { cookies } from 'next/headers';
import { LOCALE_COOKIE } from '@/i18n/config';
import { getLocaleFromCookieValue } from '@/i18n/server';
import { getPwaManifest } from '@/lib/pwa-manifest';

export async function GET() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);

  return new Response(JSON.stringify(getPwaManifest(locale)), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-store',
    },
  });
}
