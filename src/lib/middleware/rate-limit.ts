/**
 * Express-style middleware for Next.js Route Handlers.
 * Applied per-route, not globally (global would block all routes).
 */
import { isRateLimited } from '@/lib/rate-limit';

export interface RateLimitContext {
  ip: string;
  limit: number;
  windowMs: number;
}

/**
 * Check rate limit and return error response if exceeded.
 * Call this at the top of POST /api/assets/[id]/download.
 */
export async function checkRateLimit(req: Request): Promise<Response | null> {
  const ip = getRemoteIp(req);
  const limited = await isRateLimited(ip);
  if (limited) {
    const res = new Response(null, { status: 429 });
    res.headers.set('Retry-After', '3600');
    return res;
  }
  return null;
}

function getRemoteIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}