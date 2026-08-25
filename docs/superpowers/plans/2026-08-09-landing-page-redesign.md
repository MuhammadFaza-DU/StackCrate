# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/` landing hero as an editorial split (B3) with a live featured-asset card, real DB social-proof numbers, a self-looping marquee, and sort tabs (Terbaru/Terpopuler/A–Z) on the asset grid — plus an admin "Featured" toggle.

**Architecture:** The hero stays scroll-expand (300vh sticky) but its content becomes two columns: left narrative (kicker, headline, subtitle, social-proof from a new public `GET /api/stats`, CTAs), right a `FeaturedCard`. Featured asset = first published asset with `is_featured=true` (new migration column), falling back to the newest asset. The marquee (`ScrollVelocityText`) is converted from scroll-driven to a seamless framer-motion infinite loop. Grid sorting gains `sort=title`. Admin rows get a star toggle that PATCHes `is_featured`.

**Tech Stack:** Next.js 16.3 (App Router Route Handlers, client `page.tsx`), Tailwind v4 (tokens in `src/app/globals.css`), framer-motion v13 (via `LazyMotion`, use `m.*`), lucide-react, @supabase/supabase-js (service-role), zod validation, Vitest + happy-dom, eslint.

## Global Constraints

- **Repo layout:** git root is `D:/Progamming/Project dan SourceCode/WEBB`; the app lives in `Web-Kumpulan-Asset-Editor/web-asset-editor/`. All bash/npm/commit commands run with `workdir` = that app folder; git `add` paths are relative to the repo root and prefixed with `Web-Kumpulan-Asset-Editor/web-asset-editor/`.
- **Package manager:** npm. Scripts: `npm run lint`, `npm run test` (= `vitest run`). There is NO `typecheck` script — use `npx tsc --noEmit`.
- **DB access:** NO ORM. Direct `@supabase/supabase-js` queries + plain SQL migrations. `env.SUPABASE_URL` / `env.SUPABASE_SERVICE_ROLE_KEY` via `@/env`. Public GET routes must NOT call `requireAdmin`.
- **Supabase cloud (no Docker local):** migrations are `[MANUAL]` — write the file, the user applies it in the SQL Editor. Do not rely on the migration being applied for tests to pass.
- **API envelope:** every route returns `success(data)` / `err(message, status)` from `@/lib/api-response`. Never a bare `Response`.
- **Design tokens only — no new hex colors in JSX.** Use tokens already present (`--primary`, `--accent`, `bg-muted`, `text-muted-foreground`, `border-border`, `font-display`, `font-body`, `shimmer-warm`, etc.).
- **framer-motion convention:** app is wrapped in `<LazyMotion strict>`; import `{ m, useScroll, useTransform, ... }` FROM `framer-motion` and use `m.*` components. Never import `motion` (Legacy Motion).
- **Reduced motion:** all animations gated by `useReducedMotion()` from framer-motion or the global `prefers-reduced-motion` CSS block.
- **Icons:** lucide-react only (`^1.30.0`). Existing icons used: `Play`, `Download`, `Clock`, `Eye`, `Volume2`, `Star`, `ChevronRight`, `Compass`, `ArrowRight`.
- **Repository hygiene:** do NOT stage `/tmp`/`.log`/`build-check.txt` files, `graphify-out/`, or unrelated untracked dirs (`SimplySave/`, `WEB-PORTOFOLIO/`, etc.). Stage only files listed in each task. Never commit config changes (e.g. `package-lock.json` from a stray `npm install`).
- **Next.js 16 note:** follow `node_modules/next/dist/docs/`; route handlers use async `{ params }: { params: Promise<...> }`.

---
## File Structure

```
supabase/migrations/002_assets_is_featured.sql     # NEW — add is_featured column (+ partial index). [MANUAL]
src/lib/types/schemas.ts                           # MODIFY — assetUpdateSchema + is_featured
src/lib/types/asset.ts                             # MODIFY — Asset interface + is_featured
src/lib/asset-sort.ts                              # NEW — resolveSort() pure mapper (tested)
src/app/api/assets/route.ts                        # MODIFY — use resolveSort(); add featured filter
src/lib/public-stats.ts                            # NEW — PublicStats type + buildPublicStats (tested)
src/app/api/stats/route.ts                        # NEW — public GET /api/stats
src/components/assets/FeaturedCard.tsx             # NEW — hero card (video autoplay / audio play)
src/components/assets/SortTabs.tsx                 # NEW — Terbaru/Terpopuler/A-Z tabs
src/components/layout/ScrollVelocityText.tsx       # MODIFY — infinite auto-loop marquee
src/components/layout/ScrollExpandHero.tsx         # MODIFY — B3 editorial split (props: heroNode, stats)
src/lib/use-featured.ts                        # NEW — hook: featured → fallback newest (+ preview_url)
src/app/page.tsx                                   # MODIFY — wire hero slot, stats, sort tabs, skeleton/error
src/components/admin/AdminAssetTable.tsx           # MODIFY — Featured star toggle
tests/unit/schemas.test.ts                         # NEW — assetUpdateSchema accepts/rejects is_featured
tests/unit/asset-sort.test.ts                      # NEW — resolveSort mapping
tests/unit/public-stats.test.ts                    # NEW — buildPublicStats
```

---

### Task 1: Migration `002_assets_is_featured.sql` + schema/types

**Files:**
- Create: `supabase/migrations/002_assets_is_featured.sql`
- Modify: `src/lib/types/schemas.ts`
- Modify: `src/lib/types/asset.ts`
- Test: `tests/unit/schemas.test.ts`

**Context:** The landing hero needs a "featured asset" concept. Add a DB column + zod support so `PATCH /api/assets/[id]` can toggle it (the PATCH route already accepts any key present in `assetUpdateSchema`).

**Interfaces:**
- Produces: `Asset.is_featured: boolean`; `assetUpdateSchema` accepts `is_featured?: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assetUpdateSchema } from '@/lib/types/schemas';

describe('assetUpdateSchema', () => {
  it('accepts is_featured boolean', () => {
    const res = assetUpdateSchema.safeParse({ title: 'Raw Clip', is_featured: true });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.is_featured).toBe(true);
  });

  it('accepts is_featured false', () => {
    const res = assetUpdateSchema.safeParse({ is_featured: false });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.is_featured).toBe(false);
  });

  it('rejects non-boolean is_featured', () => {
    const res = assetUpdateSchema.safeParse({ is_featured: 'yes' });
    expect(res.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/schemas.test.ts`
Expected: FAIL — `assetUpdateSchema` has no `is_featured` key (strict object rejects / no match for `.data.is_featured`).

- [ ] **Step 3: Implement**

Create `supabase/migrations/002_assets_is_featured.sql`:

```sql
-- Feature flag: mark assets that appear in the landing hero card.
alter table public.assets
  add column if not exists is_featured boolean not null default false;

-- Partial index so the landing's featured=true query stays cheap.
create index if not exists assets_is_featured_idx
  on public.assets (id)
  where is_featured = true;
```

Modify `src/lib/types/schemas.ts` — add to `assetUpdateSchema` (after `published_at`):

```ts
  is_featured: z.boolean().optional(),
```

Modify `src/lib/types/asset.ts` — add to `Asset` interface (after `published_at`):

```ts
  is_featured: boolean;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/schemas.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify repo-wide + commit**

Run: `npm run lint` then `npx tsc --noEmit`
Expected: both pass (TS field `is_featured` may surface on existing rows assigning raw `Asset` — fix any by leaving deserialized data as `boolean`, defaults fine since API returns the column).

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/supabase/migrations/002_assets_is_featured.sql" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/types/schemas.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/types/asset.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/tests/unit/schemas.test.ts"
git commit -m "feat: add is_featured asset flag (migration + zod + type)"
```

> **REMINDER:** migration is `[MANUAL]` — tell the user to run `002_assets_is_featured.sql` in the Supabase SQL Editor before verifying the featured card live.

---

## Task 2: `sort=title` reasoning + featured filter on `GET /api/assets`

**Files:**
- Modify: `src/app/api/assets/route.ts`
- Create: `src/lib/asset-sort.ts`
- Create: `tests/unit/asset-sort.test.ts`

**Interfaces:**
- Consumes: nothing (route-local).
- Produces: `resolveSort(sort: string): { column: 'created_at'|'download_count'|'view_count'|'title'; ascending: boolean }`; route now also honors `featured=true`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/asset-sort.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSort } from '@/lib/asset-sort';

describe('resolveSort', () => {
  it('maps newest → created_at desc (default)', () => {
    expect(resolveSort('newest')).toEqual({ column: 'created_at', ascending: false });
    expect(resolveSort('')).toEqual({ column: 'created_at', ascending: false });
    expect(resolveSort('garbage')).toEqual({ column: 'created_at', ascending: false });
  });

  it('maps oldest → created_at asc', () => {
    expect(resolveSort('oldest')).toEqual({ column: 'created_at', ascending: true });
  });

  it('maps downloads → download_count desc', () => {
    expect(resolveSort('downloads')).toEqual({ column: 'download_count', ascending: false });
  });

  it('maps views → view_count desc', () => {
    expect(resolveSort('views')).toEqual({ column: 'view_count', ascending: false });
  });

  it('maps title → title asc', () => {
    expect(resolveSort('title')).toEqual({ column: 'title', ascending: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/asset-sort.test.ts`
Expected: FAIL — `@/lib/asset-sort` doesn't exist yet.

- [ ] **Step 3: Implement `resolveSort`**

Create `src/lib/asset-sort.ts`:

```ts
export type SortColumn = 'created_at' | 'download_count' | 'view_count' | 'title';

export interface SortClause {
  column: SortColumn;
  ascending: boolean;
}

/**
 * Maps the ?sort= query param to a Supabase order clause.
 * Unknown/empty values default to newest (created_at desc).
 */
export function resolveSort(sort: string): SortClause {
  switch (sort) {
    case 'oldest':
      return { column: 'created_at', ascending: true };
    case 'downloads':
      return { column: 'download_count', ascending: false };
    case 'views':
      return { column: 'view_count', ascending: false };
    case 'title':
      return { column: 'title', ascending: true };
    case 'newest':
    default:
      return { column: 'created_at', ascending: false };
  }
}
```

- [ ] **Step 4: Modify the route to use it + honor `featured`**

In `src/app/api/assets/route.ts`:

Replace the block that builds the query (currently `.order('created_at', { ascending: sortBy === 'oldest' })`):

```ts
    const { column, ascending } = resolveSort(sortBy);
    let query = client
      .from('assets')
      .select(`
        *,
        category:categories(id, slug, name)
      `, { count: 'exact' })
      .order(column, { ascending });
```

Add a featured filter near the other filters (after the `type` filter):

```ts
    const featured = searchParams.get('featured') === 'true';
    if (featured) {
      query = query.eq('is_featured', true);
    }
```

Then **remove** the old sort `if/else` block near the bottom of the query builder:

```ts
    // Sort by
    if (sortBy === 'downloads') {
      query = query.order('download_count', { ascending: false });
    } else if (sortBy === 'views') {
      query = query.order('view_count', { ascending: false });
    }
```

And add the import at the top:

```ts
import { resolveSort } from '@/lib/asset-sort';
```

**Important:** the `sortBy` variable must still exist (it is `const sortBy = searchParams.get('sort') ?? 'newest';`). Keep that line unchanged — `resolveSort(sortBy)` is called above it.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/asset-sort.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/asset-sort.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/api/assets/route.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/tests/unit/asset-sort.test.ts"
git commit -m "feat: sort=title and featured filter on GET /api/assets"
```

---

## Task 3: Public `GET /api/stats` (live social-proof numbers)

**Files:**
- Create: `src/lib/public-stats.ts`
- Create: `src/app/api/stats/route.ts`
- Create: `tests/unit/public-stats.test.ts`

**Interfaces:**
- Produces: `PublicStats { totalAssets: number; totalCategories: number }`; `buildPublicStats(source: PublicStatsSource): Promise<PublicStats>` where `PublicStatsSource = { countAssets(): Promise<number>; countCategories(): Promise<number> }`.
- Consumed by: `page.tsx` (Task 7) for the hero social-proof row.

- [ ] **Step 1: Write failing tests**

Create `tests/unit/public-stats.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { buildPublicStats } from '@/lib/public-stats';
import type { PublicStatsSource } from '@/lib/public-stats';

function source(overrides: Partial<PublicStatsSource> = {}): PublicStatsSource {
  return {
    countAssets: vi.fn(async () => 1200),
    countCategories: vi.fn(async () => 8),
    ...overrides,
  };
}

describe('buildPublicStats', () => {
  it('returns totalAssets and totalCategories', async () => {
    expect(await buildPublicStats(source())).toEqual({ totalAssets: 1200, totalCategories: 8 });
  });

  it('normalizes null/undefined to 0', async () => {
    const stats = await buildPublicStats(
      source({
        countAssets: async () => null as unknown as number,
      })
    );
    expect(stats.totalAssets).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/public-stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `src/lib/public-stats.ts`:

```ts
export interface PublicStats {
  totalAssets: number;
  totalCategories: number;
}

/** Abstraction over Supabase so aggregation is unit-testable. */
export interface PublicStatsSource {
  countAssets(): Promise<number>;
  countCategories(): Promise<number>;
}

const toNum = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

export async function buildPublicStats(
  source: PublicStatsSource
): Promise<PublicStats> {
  const [totalAssets, totalCategories] = await Promise.all([
    source.countAssets(),
    source.countCategories(),
  ]);
  return {
    totalAssets: toNum(totalAssets),
    totalCategories: toNum(totalCategories),
  };
}
```

- [ ] **Step 4: Create the route**

Create `src/app/api/stats/route.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { success, err } from '@/lib/api-response';
import { getErrorMessage } from '@/lib/error';
import { buildPublicStats } from '@/lib/public-stats';

/**
 * GET /api/stats
 *
 * Public — aggregate counts for the landing hero social-proof row.
 */
export async function GET() {
  try {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { count: assetCount, error: assetErr } = await client
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    const { count: categoryCount, error: categoryErr } = await client
      .from('categories')
      .select('id', { count: 'exact', head: true });

    if (assetErr || categoryErr) {
      throw assetErr ?? categoryErr;
    }

    const stats = await buildPublicStats({
      countAssets: async () => assetCount ?? 0,
      countCategories: async () => categoryCount ?? 0,
    });

    return success(stats);
  } catch (e) {
    console.error('[GET /api/stats]', e);
    return err(getErrorMessage(e), 500);
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/public-stats.test.ts`
Expected: PASS.

- [ ] **Step 6: Build check**

Run: `npx tsc --noEmit` then `npm run build`
Expected: pass. (No `build`-time errors from the route; it only runs at request time.)

- [ ] **Step 7: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/public-stats.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/api/stats/route.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/tests/unit/public-stats.test.ts"
git commit -m "feat: public GET /api/stats for landing social proof"
```

---

## Task 4: SortTabs component (Terbaru / Terpopuler / A–Z)

**Files:**
- Create: `src/components/assets/SortTabs.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export type AssetSortKey = 'newest' | 'downloads' | 'title';` and `export function SortTabs({ value, onChange }: { value: AssetSortKey; onChange: (next: AssetSortKey) => void })`.

UI-only — no unit test (lint + typecheck verify). Follow `CategoryNav` visual style (rounded-full pills).

- [ ] **Step 1: Implement**

Create `src/components/assets/SortTabs.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';

export type AssetSortKey = 'newest' | 'downloads' | 'title';

interface SortTabsProps {
  value: AssetSortKey;
  onChange: (next: AssetSortKey) => void;
}

const OPTIONS: Array<{ value: AssetSortKey; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'downloads', label: 'Terpopuler' },
  { value: 'title', label: 'A – Z' },
];

export function SortTabs({ value, onChange }: SortTabsProps) {
  return (
    <div role="tablist" aria-label="Urutkan asset" className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-sm font-body transition-all cursor-pointer',
            value === opt.value
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/assets/SortTabs.tsx"
git commit -m "feat: sort tabs for asset grid"
```

---

## Task 5: FeaturedCard (hero right column)

**Files:**
- Create: `src/components/assets/FeaturedCard.tsx`

**Interfaces:**
- Consumes: `AssetWithCategory` (has optional `preview_url`), `m` from framer-motion.
- Produces: `export function FeaturedCard({ asset, loading, error, onRetry }: { asset: AssetWithCategory; loading: boolean; error: boolean; onRetry: () => void })`. Renders video autoplay when `asset.asset_type === 'video' && preview_url`; else thumbnail + play overlay for audio. If `error` → static fallback card with CTA.

UI component — verified by lint/typecheck (no unit tests).

- [ ] **Step 1: Implement**

Create `src/components/assets/FeaturedCard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import type { AssetWithCategory } from '@/lib/types/asset';

interface FeaturedCardProps {
  asset: AssetWithCategory;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function FeaturedCard({ asset, loading, error, onRetry }: FeaturedCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden aspect-video animate-pulse shimmer-warm" aria-busy="true" />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col items-center justify-center gap-3 p-8 text-center aspect-video">
        <p className="font-body text-muted-foreground">Gagal memuat asset unggulan.</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const isVideo = asset.asset_type === 'video';
  const thumbSrc =
    asset.thumbnail_url
    ?? (asset.asset_type === 'audio' ? '/logo-audio.png' : undefined);

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden"
    >
      <Link href={`/assets/${asset.id}`} className="block">
        {isVideo && asset.preview_url ? (
          <video
            className="aspect-video w-full object-cover"
            src={asset.preview_url}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="relative aspect-video overflow-hidden">
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={asset.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play className="w-10 h-10 text-primary" />
              </div>
            )}
            {!isVideo && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
            )}
          </div>
        )}
      </Link>

      <div className="absolute top-3 left-3 px-2.5 py-1 rounded text-xs font-bold bg-primary text-primary-foreground">
        Featured
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/95 to-transparent">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {asset.category?.name && (
              <p className="text-xs text-muted-foreground">
                {asset.category.icon} {asset.category.name}
              </p>
            )}
            <h3 className="font-heading text-lg text-foreground truncate">{asset.title}</h3>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Buat
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </m.div>
  );
}
```

> Thumbnail fallback mengikuti pola `AssetCard.tsx`: video tanpa thumbnail menampilkan ikon Play di atas `bg-muted`; audio tanpa thumbnail pakai `/logo-audio.png`.

- [ ] **Step 2: Fix lint/TS issues**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: pass. Thumbnail fallback sudent sudah benar di snippet (video → ikon Play, audio → `/logo-audio.png`).

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/assets/FeaturedCard.tsx"
git commit -m "feat: featured hero asset card"
```

---

## Task 6: `ScrollVelocityText` → infinite auto-loop marquee

**Files:**
- Modify: `src/components/layout/ScrollVelocityText.tsx`

**Interfaces:**
- Consumes: framer-motion `m`, `useReducedMotion`.
- Produces: same props `{ texts: string[]; className?: string; separator?: string; speed?: number }` — now a continuously scrolling marquee (no `useScroll` dependency).

- [ ] **Step 1: Replace implementation**

Rewrite `src/components/layout/ScrollVelocityText.tsx`:

```tsx
'use client';

import { m, useReducedMotion } from 'framer-motion';

interface ScrollVelocityTextProps {
  texts: string[];
  className?: string;
  separator?: string;
  /** seconds for one full loop; larger = slower */
  duration?: number;
}

export function ScrollVelocityText({
  texts,
  className = '',
  separator = ' ● ',
  duration = 30,
}: ScrollVelocityTextProps) {
  const reduceMotion = useReducedMotion();
  const totalText = texts.join(separator);

  return (
    <div className={`overflow-hidden py-10 ${className}`} aria-hidden="true">
      <m.div
        className="flex w-max"
        animate={reduceMotion ? undefined : { x: '-50%' }}
        transition={
          reduceMotion
            ? undefined
            : { ease: 'linear', duration, repeat: Infinity }
        }
      >
        {[0, 1].map((i) => (
          <span
            key={i}
            className="shrink-0 text-4xl md:text-6xl font-display font-bold text-foreground/80 mx-6 whitespace-nowrap"
          >
            {totalText}
          </span>
        ))}
      </m.div>
    </div>
  );
}
```

**Seamless-loop note:** the wrapper has exactly two identical copies inside a `flex w-max` container; animating `x` from `0` to `-50%` advances exactly one copy width, and because the two copies are pixel-identical the jump back to `0` is invisible. When the user prefers reduced motion, `m.div` stays static.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: pass (no unused imports — the old `useScroll`/`useTransform`/`useRef` imports are all removed).

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/layout/ScrollVelocityText.tsx"
git commit -m "feat: marquee auto-loops seamlessly"
```

---

## Task 7: ScrollExpandHero → editorial B3 layout

**Files:**
- Modify: `src/components/layout/ScrollExpandHero.tsx`

**Interfaces:**
- Consumes: `AssetWithCategory`, `PublicStats | null`.
- Produces: `ScrollExpandHero` props: `{ title: string; subtitle: string; heroNode?: React.ReactNode; stats?: PublicStats | null; }`. The hero renders left narrative + right slot (`heroNode` = `FeaturedCard`). Scroll-out animation (fade + background shift) preserved.

UI — no unit tests.

- [ ] **Step 1: Rewrite component**

Replace `src/components/layout/ScrollExpandHero.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';
import type { PublicStats } from '@/lib/public-stats';

interface ScrollExpandHeroProps {
  title: string;
  subtitle: string;
  /** Right-column slot; pass FeaturedCard (or skeleton handled by caller). */
  heroNode?: React.ReactNode;
  /** Social-proof numbers (real from DB); null hides the row. */
  stats?: PublicStats | null;
}

export function ScrollExpandHero({ title, subtitle, heroNode, stats }: ScrollExpandHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const contentOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <m.div
          className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent"
          style={{ opacity: bgOpacity }}
        />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8">
          <m.div
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            style={{ opacity: contentOpacity, y: contentY }}
          >
            {/* Left narrative */}
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-primary/30 text-primary-foreground text-xs font-bold mb-6 bg-primary/10">
                ★ 100% GRATIS. SELAMANYA.
              </span>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-4 text-foreground">
                {title}
              </h1>
              <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-8">
                {subtitle}
              </p>

              {stats && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground mb-8">
                  <span className="font-display text-2xl text-foreground">{stats.totalAssets}</span>
                  <span>asset gratis</span>
                  <span className="w-px h-4 bg-border" aria-hidden />
                  <span className="font-display text-2xl text-foreground">{stats.totalCategories}</span>
                  <span>kategori</span>
                  <span className="w-px h-4 bg-border" aria-hidden />
                  <span>Tanpa sign-up</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#assets"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:brightness-110 transition"
                >
                  Jelajahi Katalog
                </a>
                <a
                  href="#assets"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-foreground font-semibold text-lg hover:bg-accent/80 transition"
                >
                  Semua kategori
                </a>
              </div>
            </div>

            {/* Right hero card */}
            <div className="hidden lg:block min-w-0">{heroNode}</div>
          </m.div>
        </div>
      </div>
    </div>
  );
}
```

**Note:** the inner `m.div` (narrative grid) now fades as one block on scroll instead of the old separate title/subtitle elements. On mobile (`lg:hidden`), hero card hides and the user scrolls to #assets. Keep the export name and `dynamic(...)` usage in `page.tsx` the same.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: pass. (No unused `React` import — use `import type { ReactNode }` or React 19 auto-JSX; simplest is `heroNode?: React.ReactNode` only if `React` is imported. Use `import { useRef } from 'react'` + `import type { ReactNode } from 'react'` and type the prop as `heroNode?: ReactNode`.)

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/layout/ScrollExpandHero.tsx"
git commit -m "feat: editorial B3 hero layout"
```

---

## Task 8: `useFeatured` hook + wire `page.tsx`

**Files:**
- Create: `src/lib/use-featured.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `AssetWithCategory`.
- Produces: `useFeatured(): { asset: FeaturedAsset | null; isLoading: boolean; hasError: boolean; retry: () => void }` where `FeaturedAsset = AssetWithCategory & { preview_url?: string | null }`.

**Data flow:** select featured via `GET /api/assets?featured=true&limit=1`; if empty, fall back to `GET /api/assets?sort=newest&limit=1`. For the chosen asset, if it is a video, `GET /api/assets/[id]` to obtain `preview_url` (presigned). All failures set `hasError`.

- [ ] **Step 1: Implement hook**

Create `src/lib/use-featured.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AssetWithCategory } from '@/lib/types/asset';

export type FeaturedAsset = AssetWithCategory & { preview_url?: string | null };

export function useFeatured() {
  const [asset, setAsset] = useState<FeaturedAsset | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [hasError, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setLoading(true);
        setError(false);
      }
    });

    const pickList = (featured: boolean) =>
      fetch(`/api/assets?featured=${featured ? 'true' : 'false'}&limit=1`)
        .then((r) => r.json())
        .then((d) => d?.data?.items ?? []);

    async function load() {
      let list = await pickList(true);
      if (list.length === 0) list = await pickList(false);

      let chosen: FeaturedAsset | null = list[0] ?? null;
      if (chosen && chosen.asset_type === 'video') {
        try {
          const detail = await fetch(`/api/assets/${chosen.id}`).then((r) => r.json());
          chosen = detail?.data ?? chosen;
        } catch {
          /* keep list item; video preview may be missing */
        }
      }
      if (!ignore) {
        setAsset(chosen);
        setLoading(false);
        setError(!chosen);
      }
    }

    load().catch(() => {
      if (!ignore) {
        setAsset(null);
        setLoading(false);
        setError(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { asset, isLoading, hasError, retry };
}
```

**Note: `attempt` triggers refetch on retry; init dilakukan via `queueMicrotask` (pola yang sama dengan `page.tsx` existing) agar kualifikasi lint `react-hooks/set-state-in-effect` terpenuhi.**

- [ ] **Step 2: Wire `page.tsx`**

Modify `src/app/page.tsx`:
- Import `SortTabs` + `type AssetSortKey` from `@/components/assets/SortTabs`, `FeaturedCard` from `@/components/assets/FeaturedCard`, `useFeatured` from `@/lib/use-featured`, `type PublicStats` from `@/lib/public-stats`.
- Add state `sort` (type `AssetSortKey`, default `'newest'`), `stats` + `statsFailed`, and grid error + reloadKey.
- Pass `featured` + `stats` to the hero: `<ScrollExpandHero ... heroNode={<FeaturedCard asset={featuredAsset} loading={featuredLoading} error={featuredError} onRetry={featuredRetry} />} stats={statsError ? null : stats} />`.
- Grid fetch effect depends on `[activeCategory, sort, reloadKey]`; set `sort` param to `sort` (nil saat sort = 'newest').
- Render `<SortTabs value={sort} onChange={setSort} />` above the grid heading row.
- Grid `error` → message + "Coba lagi" button; keep existing skeleton + `AssetGrid`.

Full replacement of the grid section (`page.tsx:113-122` region):

```tsx
        {gridError ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Gagal memuat asset.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AssetGrid assets={assets} />
        )}
```

Add near the top of `HomePage`:

```tsx
  const [sort, setSort] = useState<AssetSortKey>('newest');
  const [gridError, setGridError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { asset: featured, isLoading: featuredLoading, hasError: featuredError, retry: featuredRetry } = useFeatured();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
```

And a stats effect:

```tsx
  useEffect(() => {
    let ignore = false;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!ignore && d?.data) setStats(d.data);
      })
      .catch(() => {
        if (!ignore) setStatsFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, []);
```

Update the grid fetch effect to include sort + gridError reset:

```tsx
  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setLoading(true);
        setGridError(false);
      }
    });
    const params = new URLSearchParams({ limit: String(HOME_LIMIT), sort });
    if (activeCategory) params.set('category', activeCategory);
    fetch(`/api/assets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setAssets(data.data?.items ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAssets([]);
          setLoading(false);
          setGridError(true);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeCategory, sort, reloadKey]);
```

> Keep imports for `AssetCard` grid exactly as-is; the grid section above is only the state wiring. Hero props: `heroNode={...}` as described. Verify the `Hero` section renders `<ScrollExpandHero title="Free Assets for Video Editors" subtitle="Browse hundreds of free audio and video clips. Download instantly. No sign-up required." stats={statsFailed ? null : stats} heroNode={...} />`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` then `npm run lint` then `npm run test`
Expected: all pass (existing suite + new).

- [ ] **Step 4: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/lib/use-featured.ts" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/page.tsx"
git commit -m "feat: wire featured card, stats, and sort tabs into landing"
```

> **Note:** make sure to use exact correct paths in commit — `src/lib/use-featured.ts`, `src/app/page.tsx` under the `web-asset-editor/` folder, git-add relative to repo root (`Web-Kumpulan-Asset-Editor/web-asset-editor/...`).

---

## Task 9: Admin "Featured" toggle in `AdminAssetTable`

**Files:**
- Modify: `web-asset-editor/src/components/admin/AdminAssetTable.tsx`

**Interfaces:**
- Consumes: existing `patchAsset(id, payload, successMsg)` helper in the same file; lucide `Star` icon.
- Produces: toggle button per row; visually filled (`fill-current text-amber-400`) when `asset.is_featured`, outline otherwise. PATCH `{ is_featured: !asset.is_featured }`.

- [ ] **Step 1: Add star toggle**

In `AdminAssetTable.tsx`:

1. Import `Star` alongside `Trash2, Eye`:
   ```ts
   import { Trash2, Eye, Star } from 'lucide-react';
   ```
2. In the actions row (next to the `<Eye>` link), insert:

   ```tsx
   <button
     type="button"
     onClick={() =>
       patchAsset(
         asset.id,
         { is_featured: !asset.is_featured },
         asset.is_featured ? 'Asset dilepas dari Featured' : 'Asset dijadikan Featured'
       )
     }
     disabled={busyId === asset.id}
     title={asset.is_featured ? 'Fitur featured aktif' : 'Tandai sebagai featured'}
     className={cn(
       'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors',
       asset.is_featured
         ? 'text-amber-400 hover:text-amber-500'
         : 'text-muted-foreground hover:text-foreground'
     )}
   >
     <Star className={cn('w-4 h-4', asset.is_featured && 'fill-current')} />
   </button>
   ```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` then `npm run lint` then `npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/admin/AdminAssetTable.tsx"
git commit -m "feat: admin can toggle featured asset"
```

---

## Task 10: Final verification + manual steps

**Files:**
- No new source files.

- [ ] **Step 1: Full test/lint/build run**

Run from `web-asset-editor/`:
1. `npm run test`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`

Expected: all green.

- [ ] **Step 2: Manual checklist for user**

Tell the user:
1. Apply `supabase/migrations/002_assets_is_featured.sql` in Supabase SQL Editor ([MANUAL]).
2. Visit `/` (`npm run dev`) — hero shows featured/newest asset card, social-proof real numbers, marquee loops infinitely, sort tabs work.
3. Visit `/admin` — star toggle in each row; toggling updates the hero card.
4. Verify reduce-motion (`prefers-reduced-motion`) stops marquee.

- [ ] **Step 3: Final commit (only if new files changed)**

```bash
git status
# stage only stray this-task changes if any; otherwise nothing.
```

---

## Self-Review Notes (run before presenting)

- [x] Spec coverage: hero (B3), social-proof, featured card, migration column, sort=title, featured filter, marquee, admin toggle, error states — all mapped to tasks 1–10. ✅
- [x] Placeholders: no "TBD"/"compile to eksisting"; full code in every step. ✅
- [x] Types consistency: `AssetSortKey` (Task 4) dipakai di Task 8 (`page.tsx`). `resolveSort` (Task 2) dipakai route & grid Task 8. `PublicStats` (Task 3) dipakai hero Task 7 & `page.tsx`. `FeaturedAsset` (Task 8 hook) dipakai `FeaturedCard` (Task 5) & `page.tsx`. ✅