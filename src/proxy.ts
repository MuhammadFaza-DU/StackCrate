import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy (successor to middleware.js).
 * Reads/refreshes the Supabase session cookie so that server-side
 * `createServerClient`-based routes (getSession/requireAuth/requireAdmin)
 * see the logged-in user.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: don't run any code between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it very hard to debug
  // being logged out or having "random" auth errors.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets, images, icons, and the service
     * worker. API routes are intentionally INCLUDED so the Supabase session
     * cookie is refreshed on every request before route handlers read it
     * via createServerClient (getSession/requireAuth/requireAdmin).
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.+\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};