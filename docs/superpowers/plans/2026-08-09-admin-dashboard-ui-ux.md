# Admin Dashboard UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/admin` dashboard with a stat-card row (Total Asset, Total Views, Total Downloads, Total Favorit) on top, keep every existing feature untouched below it, and fix the silent `download_count` bug.

**Architecture:** Keep `/admin` as a single client page that stacks Header → KPI row → Upload → Kelola Kategori → Kelola Asset. KPI data comes from a new admin-only API route `GET /api/admin/stats` that aggregates server-side via a Supabase service-role client. The `download_count` bug is fixed by (a) adding the missing `increment_download_count` SQL function migration and (b) making `logDownload` in `src/lib/rate-limit.ts` surface RPC errors instead of swallowing them.

**Tech Stack:** Next.js 16.3 (App Router Route Handlers), Tailwind v4 (CSS-first tokens in `src/app/globals.css`), shadcn/ui vendored (Card, Input, Button, toast), framer-motion v13 (via `LazyMotion domAnimation`), lucide-react icons, @supabase/supabase-js (service-role), Vitest + happy-dom, eslint.

## Global Constraints

- **Repo layout:** git root is `D:/Progamming/Project dan SourceCode/WEBB`; the app lives in `Web-Kumpulan-Asset-Editor/web-asset-editor/`. All bash/npm/commit commands run with `workdir` = that app folder; git `add` paths are relative to the repo root and prefixed with `Web-Kumpulan-Asset-Editor/web-asset-editor/`.
- **Package manager:** npm. Scripts: `npm run lint` (= `eslint`), `npm run test` (= `vitest run`). There is NO `typecheck` script — run `npx tsc --noEmit` instead.
- **DB access:** NO ORM. Direct `@supabase/supabase-js` queries + plain SQL migrations in `supabase/migrations/`. Service-role client only for server mutations.
- **Supabase cloud (no Docker local):** new migrations are NOT auto-applied. Each migration is a `[MANUAL]` step executed by the user in the Supabase SQL Editor, one step at a time with confirmation (repo convention documented in `docs/superpowers/plans/2026-08-08-stackcrate.md`).
- **Auth guard for admin routes:** use `requireAdmin()` from `@/lib/auth` → returns `{ error: { status, message } }`; route must `return err(error.message, error.status)`.
- **API envelope:** every route returns `success(data)` / `err(message, status)` from `@/lib/api-response`. Never a bare `Response`.
- **Design tokens only in JSX — no new inline hex colors in components.** Warm palette lives in `src/app/globals.css`: bg `#1a1410`, card `#2a201a`, border `#3d2f25`, primary orange `#f97316`, gold `#fbbf24`. Fonts: Knewave (display), Mystery Quest (heading), Kranky (body). Do not add hard-coded green/amber chips.
- **Next.js 16 note:** follow breaking APIs per `node_modules/next/dist/docs/`. Existing route handlers use async `({ params }: { params: Promise<{...}> })` — follow that pattern.
- **Reduced motion:** any framer-motion animation must respect `prefers-reduced-motion` (app already wrapped in `<MotionConfig reducedMotion="user">`; `globals.css` has a global reduce block).
- **Icons:** lucide-react only (`^1.30.0`).
- **No unrelated refactoring:** touch only the files listed per task.

---

## File Structure

```
supabase/migrations/001_increment_download_count.sql   # NEW — SQL function (apply manually)
src/lib/admin-stats.ts                                  # NEW — AdminStats type + pure aggregate helper (tested)
src/lib/rate-limit.ts                                   # MODIFY — logDownload RPC error handling
src/app/api/admin/stats/route.ts                       # NEW — GET /api/admin/stats (admin-only)
src/components/admin/StatsCards.tsx                    # NEW — 4 KPI cards + skeleton + error state
src/app/admin/page.tsx                                  # MODIFY — add stats row + header subtitle
src/components/admin/AdminAssetTable.tsx               # MODIFY — status chip uses semantic tokens
src/app/globals.css                                     # MODIFY — add .status-published / .status-draft utilities
tests/unit/rate-limit.test.ts                          # NEW — TDD tests for logDownload
tests/unit/admin-stats.test.ts                         # NEW — tests for buildAdminStats
```

---

## Task 1: Fix `download_count` bug — SQL migration + error handling

**Files:**
- Create: `supabase/migrations/001_increment_download_count.sql`
- Modify: `src/lib/rate-limit.ts`
- Test: `tests/unit/rate-limit.test.ts`

**Context/root cause:** `src/lib/rate-limit.ts:51` calls `client.rpc('increment_download_count', ...)` with `.maybeSingle()`. That RPC function does not exist in `000_initial_schema.sql`, so every call fails silently and `assets.download_count` never increments.

**Interfaces:**
- Consumes: nothing new.
- Produces: `logDownload(params): Promise<void>` keeps its signature; now logs the RPC error instead of swallowing it. Download flow is never blocked.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/rate-limit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/rate-limit.test.ts`
Expected: FAIL — current code swallows the RPC error, so the second test fails (console.error not called).

- [ ] **Step 3: Add the SQL migration**

Create `supabase/migrations/001_increment_download_count.sql`:

```sql
-- Bump download_count when an asset is downloaded.
create or replace function public.increment_download_count(p_asset_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.assets
  set download_count = download_count + 1,
      updated_at = now()
  where id = p_asset_id;
$$;

-- Allow app roles to execute it (service role bypasses RLS anyway).
grant execute on function public.increment_download_count(uuid) to authenticated, anon, service_role;
```

- [ ] **Step 4: Make `logDownload` surface RPC errors**

In `src/lib/rate-limit.ts`, replace only the bump-counter block (keep the insert exactly as-is except capturing the error):

```ts
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
  })) as unknown as { error: { message: string } | null };
  if (rpcError) {
    console.error('[rate-limit] increment_download_count failed:', rpcError.message);
  }
```

Note: `client.rpc()` in this codebase is typed loosely; use the `as unknown as` assertion above if TS complains. Keep both the insert and RPC non-throwing — the download route must still proceed even if a counter update fails.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/rate-limit.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: [MANUAL] Apply the migration**

Ask the user to open the Supabase SQL Editor and run the contents of `001_increment_download_count.sql`. Wait for explicit confirmation before marking done.

- [ ] **Step 7: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/rate-limit.ts Web-Kumpulan-Asset-Editor/web-asset-editor/tests/unit/rate-limit.test.ts Web-Kumpulan-Asset-Editor/web-asset-editor/supabase/migrations/001_increment_download_count.sql
git commit -m "fix: surface increment_download_count RPC errors and add missing SQL function"
```

---

## Task 2: `AdminStats` type + pure aggregate helper

**Files:**
- Create: `src/lib/admin-stats.ts`
- Test: `tests/unit/admin-stats.test.ts`

**Interfaces:**
- Consumes: nothing (pure logic; Supabase calls injected).
- Produces:
  - `export interface AdminStats { totalAssets; publishedAssets; draftAssets; totalViews; totalDownloads; totalFavorites; totalCategories: number }`
  - `export interface AdminStatsSource { countAssets(status?: 'published' | 'draft'): Promise<number>; sumViews(): Promise<number>; sumDownloads(): Promise<number>; countCategories(): Promise<number>; countFavorites(): Promise<number> }`
  - `export async function buildAdminStats(source: AdminStatsSource): Promise<AdminStats>`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-stats.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { buildAdminStats } from '@/lib/admin-stats';
import type { AdminStatsSource } from '@/lib/admin-stats';

function source(overrides: Partial<AdminStatsSource> = {}): AdminStatsSource {
  return {
    countAssets: vi.fn(async (status?: 'published' | 'draft') => {
      if (status === 'published') return 12;
      if (status === 'draft') return 3;
      return 15;
    }),
    sumViews: vi.fn(async () => 40210),
    sumDownloads: vi.fn(async () => 231),
    countCategories: vi.fn(async () => 8),
    countFavorites: vi.fn(async () => 76),
    ...overrides,
  };
}

describe('buildAdminStats', () => {
  it('aggregates all counters into an AdminStats object', async () => {
    const stats = await buildAdminStats(create());

    expect(stats).toEqual({
      totalAssets: 15,
      publishedAssets: 12,
      draftAssets: 3,
      totalViews: 40210,
      totalDownloads: 231,
      totalFavorites: 76,
      totalCategories: 8,
    });
  });

  it('normalizes null/undefined numbers to 0', async () => {
    const stats = await buildAdminStats(
      create({
        countAssets: async () => null as unknown as number,
        sumViews: async () => undefined as unknown as number,
      })
    );
    expect(stats.totalAssets).toBe(0);
    expect(stats.totalViews).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/admin-stats.test.ts`
Expected: FAIL with module-not-found (`@/lib/admin-stats`).

- [ ] **Step 3: Write implementation**

Create `src/lib/admin-stats.ts`:

```ts
import 'server-only';

export interface AdminStats {
  totalAssets: number;
  publishedAssets: number;
  draftAssets: number;
  totalViews: number;
  totalDownloads: number;
  totalFavorites: number;
  totalCategories: number;
}

/** Abstraction over the Supabase client so aggregation is unit-testable. */
export interface AdminStatsSource {
  countAssets(status?: 'published' | 'draft'): Promise<number>;
  sumViews(): Promise<number>;
  sumDownloads(): Promise<number>;
  countCategories(): Promise<number>;
  countFavorites(): Promise<number>;
}

const toNum = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

export async function buildAdminStats(source: AdminStatsSource): Promise<AdminStats> {
  const [totalAssets, publishedAssets, draftAssets, totalViews, totalDownloads, totalCategories, totalFavorites] =
    await Promise.all([
      source.countAssets(),
      source.countAssets('published'),
      source.countAssets('draft'),
      source.sumViews(),
      source.sumDownloads(),
      source.countCategories(),
      source.countFavorites(),
    ]);

  return {
    totalAssets: toNum(totalAssets),
    publishedAssets: toNum(publishedAssets),
    draftAssets: toNum(draftAssets),
    totalViews: toNum(totalViews),
    totalDownloads: toNum(totalDownloads),
    totalCategories: toNum(totalCategories),
    totalFavorites: toNum(totalFavorites),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/admin-stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/admin-stats.ts Web-Kumpulan-Asset-Editor/web-asset-editor/tests/unit/admin-stats.test.ts
git commit -m "feat: add admin stats aggregation helper"
```

---

## Task 3: `GET /api/admin/stats` route

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()` from `@/lib/auth`; `buildAdminStats` + `AdminStatsSource` from `@/lib/admin-stats`; `createClient` from `@supabase/supabase-js`; `env`; `success`/`err` from `@/lib/api-response`.
- Produces: `GET /api/admin/stats` → `{ data: AdminStats, error: null }` (200) or `{ data: null, error: string }` (401/403/500).

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/stats/route.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { requireAdmin } from '@/lib/auth';
import { success, err } from '@/lib/api-response';
import { getErrorMessage } from '@/lib/error';
import { buildAdminStats, type AdminStatsSource } from '@/lib/admin-stats';

/**
 * GET /api/admin/stats — admin-only aggregation for the dashboard KPI row.
 * Counts use Supabase `head: true` so they stay accurate past 100 rows.
 * (sum-in-JS is intentional: catalog is small; no extra migration needed.)
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return err(auth.error.message, auth.error.status);

  try {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const countByStatus = async (status?: 'published' | 'draft') => {
      let q = client.from('assets').select('id', { count: 'exact', head: true });
      if (status) q = q.eq('status', status);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    };

    const columnSum = async (column: 'view_count' | 'download_count') => {
      const { data, error } = await client.from('assets').select(column);
      if (error) throw error;
      return (data ?? []).reduce(
        (acc: number, row: Record<string, unknown>) => acc + (Number(row[column]) || 0),
        0
      );
    };

    const source: AdminStatsSource = {
      countAssets: (status) => countByStatus(status),
      sumViews: () => columnSum('view_count'),
      sumDownloads: () => columnSum('download_count'),
      countCategories: async () => {
        const { count, error } = await client.from('categories').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
      countFavorites: async () => {
        const { count, error } = await client.from('favorites').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
    };

    return success(await buildAdminStats(source));
  } catch (e) {
    console.error('[GET /api/admin/stats]', e);
    return err(getErrorMessage(e), 500);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (`client.from().select()` with `head: true` may need a type cast if the generic chain rejects `.eq()` — cast `q` to `any` at the call site if necessary. Follow existing route style where possible.)

- [ ] **Step 3: Manual verification**

Note: requires a working admin session + DB env. Start `npm run dev`, login as admin, then check `curl -s http://localhost:3000/api/admin/stats`. Expect `{"data":{...7 fields...},"error":null}`. If not admin, expect auth error envelope. If you cannot reach the DB in this environment, say so explicitly ("unverified against live DB — logic covered by unit tests; verify in staging") instead of pretending.

- [ ] **Step 4: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/api/admin/stats/route.ts
git commit -m "feat: add GET /api/admin/stats admin aggregation endpoint"
```

---

## Task 4: KPI cards component (`StatsCards`)

**Files:**
- Create: `src/components/admin/StatsCards.tsx`

**Interfaces:**
- Consumes: `AdminStats` from `@/lib/admin-stats`; `Card, CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`; `Package, Eye, Download, Heart` from `lucide-react`; `motion, useInView, useReducedMotion, animate` from `framer-motion`.
- Produces: `export function StatsCards({ stats, loading, onRetry }: { stats: AdminStats | null; loading: boolean; onRetry: () => void })`.

- [ ] **Step 1: Write the component**

Create `src/components/admin/StatsCards.tsx`:

```tsx
'use client';

import * as React from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { Package, Eye, Download, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminStats } from '@/lib/admin-stats';

interface StatsCardsProps {
  stats: AdminStats | null;
  loading: boolean;
  onRetry: () => void;
}

interface CardDef {
  label: string;
  value: (s: AdminStats) => number;
  sub: (s: AdminStats) => string;
  icon: React.ReactNode;
  chip: string;
}

const cardDefs: CardDef[] = [
  {
    label: 'Total Asset',
    value: (s) => s.totalAssets,
    sub: (s) => `${s.publishedAssets} tayang · ${s.draftAssets} draft`,
    icon: <Package className="h-5 w-5" />,
    chip: 'bg-accent/15 text-accent',
  },
  {
    label: 'Total Views',
    value: (s) => s.totalViews,
    sub: () => 'Jumlah penayangan asset',
    icon: <Eye className="h-5 w-5" />,
    chip: 'bg-primary/15 text-primary',
  },
  {
    label: 'Total Downloads',
    value: (s) => s.totalDownloads,
    sub: () => 'Jumlah unduhan asset',
    icon: <Download className="h-5 w-5" />,
    chip: 'bg-secondary-foreground/15 text-secondary-foreground',
  },
  {
    label: 'Total Favorit',
    value: (s) => s.totalFavorites,
    sub: (s) => `${s.totalCategories} kategori`,
    icon: <Heart className="h-5 w-5" />,
    chip: 'bg-yellow-500/15 text-yellow-500',
  },
];

function CountNumber({ value, className }: { value: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display.toLocaleString('id-ID')}
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="shimmer-warm h-10 w-10 rounded-full" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="shimmer-warm mt-4 h-8 w-20 rounded-md" />
        <div className="shimmer-warm mt-3 h-3 w-32 rounded" />
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats, loading, onRetry }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-muted-foreground">Statistik belum bisa dimuat.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardDefs.map((def) => (
        <motion.div
          key={def.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="group rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(249,115,22,0.15)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', def.chip)}>
                  {def.icon}
                </span>
              </div>
              <p className="font-display mt-4 text-3xl text-foreground">
                <CountNumber value={def.value(stats)} />
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{def.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{def.sub(stats)}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Fix any naming/type mismatches (e.g., ensure `bg-yellow-500` classes exist under Tailwind v4 tokens; if yellow is not on the enabled palette, fall back to `bg-[#fbbf24]/15 text-[#fbbf24]` — gold `#fbbf24` is a documented StackCrate token).

- [ ] **Step 3: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/admin/StatsCards.tsx
git commit -m "feat: add admin stats KPI card component"
```

---

## Task 5: Wire stats into `/admin` + header subtitle

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `StatsCards` (Task 4), existing `useToasts`, `AdminStats` type.
- Produces: KPI row renders between `<h1>` and the Upload card. Page behavior otherwise unchanged.

- [ ] **Step 1: Add stats state + fetch**

In `src/app/admin/page.tsx`:

- Add `useCallback` to the existing React import: `import { useState, useEffect, useRef, useCallback } from 'react';`
- Import `StatsCards` and the type:
  ```ts
  import { StatsCards } from '@/components/admin/StatsCards';
  import type { AdminStats } from '@/lib/admin-stats';
  ```
- Inside the component, before the initial `useEffect`, add:
  ```ts
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat statistik');
      setStats(json.data ?? null);
    } catch (e) {
      setStats(null);
      showToast('error', e instanceof Error ? e.message : 'Gagal memuat statistik');
    } finally {
      setStatsLoading(false);
    }
  }, []);
  ```
- In the initial `useEffect`, call it:
  ```ts
  useEffect(() => {
    (async () => {
      await Promise.all([loadCategories(), loadAssets('all', ''), loadStats()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  ```

- [ ] **Step 2: Render header subtitle + KPI row**

Replace the existing plain header block:

```tsx
<h1 className="font-heading text-3xl text-foreground">Admin Dashboard</h1>
```

with:

```tsx
<div>
  <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
  <p className="mt-1 text-sm text-muted-foreground">Sekilas performa katalog asset kamu.</p>
</div>

<StatsCards stats={stats} loading={statsLoading} onRetry={loadStats} />
```

Keep every existing card (Upload, Kelola Kategori, Kelola Asset) untouched and in the same order after this block.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Manual verify**

`npm run dev`, login as admin, open `/admin`. Expect KPI row visible with real numbers; existing Upload / Kategori / Kelola Asset sections intact; `fond-display` and `font-heading` render as intended. Test both dark and light.

- [ ] **Step 5: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/admin/page.tsx
git commit -m "feat: wire admin stats KPI row into /admin dashboard"
```

---

## Task 6: Status chip polish (semantic tokens instead of hardcoded green/amber)

**Files:**
- Modify: `src/components/admin/AdminAssetTable.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `cn` already imported.
- Produces: status pill uses `.status-published` / `.status-draft` CSS utilities readable in both themes.

- [ ] **Step 1: Add CSS utilities**

In `src/app/globals.css`, inside `@layer utilities` (after `.focus-glow`):

```css
/* Status chips — semantic tokens for publish/draft (readable in dark & light) */
.status-published {
  background-color: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 35%, transparent);
}
.status-draft {
  background-color: color-mix(in srgb, #fbbf24 15%, transparent);
  color: #fbbf24;
  border-color: color-mix(in srgb, #fbbf24 35%, transparent);
}
```

- [ ] **Step 2: Update the chip**

In `src/components/admin/AdminAssetTable.tsx`, replace the status chip's `className` logic:

```tsx
className={cn(
  'px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer',
  asset.status === 'published' ? 'status-published' : 'status-draft'
)}
```

and add `hover` styling note: the old `hover:bg-green-200`/`hover:bg-amber-200` were hardcoded. Add a subtle hover tint:

```tsx
className={cn(
  'px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer',
  asset.status === 'published' ? 'status-published hover:brightness-110' : 'status-draft hover:brightness-110'
)}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/globals.css Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/admin/AdminAssetTable.tsx
git commit -m "refactor: token-driven status chips in admin asset table"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint`
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Impeccable + visual check**

Run: `npx impeccable detect src/` (anti-pattern scan), then visually review `/admin` in dark + light and at 375px. Fix any contrast or responsiveness issues found.

- [ ] **Step 4: Final commit + honest summary**

If any fixes were made, commit them. Then summarize to the user:
- what was implemented, verified, and (honestly) what could not be verified in this environment (e.g., live DB numbers, migrated migration applied).

---

## Self-Review Notes

- *Spec coverage:* 4 KPI cards → Task 4/5; `GET /api/admin/stats` → Task 3; `download_count` fix → Task 1; status chip → Task 6; layout/theme constraints → all tasks.
- *Placeholder scan:* replaced placeholder copy in `StatsCards` sub-labels with real Indonesian labels (`tayang`, `draft`, `pertenonan`, `unduhan`, `kategori`). No TBD/TODO remains.
- *Type consistency:* `AdminStats` shape (Task 2) matches the route (Task 3) and the component (Task 4); `buildAdminStats` return type matches `StatsCards` prop; `logDownload` keeps `Promise<void>`.
- *Manual-step honesty:* migration application, live-DB verification, and live-registration are flagged `[MANUAL]` / "unverified" rather than claimed.