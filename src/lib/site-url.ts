import 'server-only';

function stripProtocol(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Canonical site origin.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_SITE_URL` — explicit override (recommended on Vercel)
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — set automatically by Vercel for the
 *    production deployment (e.g. `stackcrate.vercel.app`)
 * 3. `VERCEL_URL` — set for preview/branch deployments
 * 4. localhost fallback for local development
 */
export const SITE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${stripProtocol(prod)}`;

  const preview = process.env.VERCEL_URL;
  if (preview) return `https://${stripProtocol(preview)}`;

  return 'http://localhost:3000';
})();
