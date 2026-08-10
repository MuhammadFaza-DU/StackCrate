# StackCrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build StackCrate, a public web aggregator for video-editing assets (audio + video) where an admin uploads assets and public users browse, search, preview, and download after login.

**Architecture:** Next.js 15 (App Router) fullstack monorepo — API routes (Route Handlers) for backend logic, Supabase Postgres + Supabase Auth (Google OAuth for public users, email/password for admin), Cloudflare R2 for file storage via presigned URLs (upload direct browser→R2, download via rate-limited redirect).

**Tech Stack:** Next.js 15 (App Router, TypeScript 5), Tailwind CSS 4, shadcn/ui, lucide-react, framer-motion, @supabase/supabase-js + @supabase/ssr, @aws-sdk/client-s3 (R2 presign), vitest, Playwright, react-intersection-observer, canvas-confetti, react-player.

## Global Constraints

- **Node:** >= 22 (`package.json` engines).
- **Package manager:** npm (package-lock.json must be used).
- **DB access:** NO ORM. Direct `@supabase/supabase-js` SQL queries + plain SQL migrations in `supabase/migrations/`. Service-role client only for server mutations; anon client for public reads (with RLS).
- **Supabase strategy:** Cloud (no Docker local). All dashboard steps are manual (`[MANUAL]`) -> executed one step at a time with user confirmation.
- **Repo:** separate git repo initialized inside `Web-Kumpulan-Asset-Editor/` against GitHub remote later; each task commits to that repo.
- **Admin auth:** email/password via Supabase Auth; `public.profiles.is_admin` flag; role check helper only (no row-based admin table).
- **Public auth:** Google OAuth via Supabase Auth (magic-link/email NOT offered).
- **Auth kit:** Server-side: `@supabase/ssr` cookie-based `createServerClient`. Client: `@supabase/supabase-js`.
- **Download rate limit:** 10 downloads per IP per hour, enforced in DB with query on `download_log` and pre-aggregated counter; IP hashed (SHA-256) not stored plaintext.
- **Upload size cap:** 200 MB per file, enforced client-side AND server-side (presign request checks content-length header).
- **Supported file types:** `.wav`, `.mp3`, `.mp4`, `.webm`; MIME check server-side combined with extension allowlist.
- **Routing rules:** public routes `/`, `/asset/[slug]`, `/search`, `/category/[slug]`, `/login`; auth routes `/favorites`; admin routes `/admin*` (middleware gate).
- **Design system:** warm & playful (dark `#1a1410` default, orange `#f97316` accent); fonts Knewave (display), Mystery Quest (section heading), Kranky (body); motion "wah na nggak berlebihan": LazyMotion `domAnimation` only, all animations gated on `useReducedMotion`.
- **Icons:** lucide-react only.
- **Formatting:** `.prettierrc` single-quote, no semi, trailing-comma all.
- **Contract: no lock against Next.js 16? use stable App Router APIs only** (server actions allowed but API routes are the contract for downloads/uploads).

---

## File Map

```
web-asset-editor/                     # (folder inside repo; you work in it)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                       # Home/Katalog
│   │   │   ├── asset/[slug]/page.tsx        # Asset detail
│   │   │   ├── search/page.tsx              # Search results
│   │   │   └── category/[slug]/page.tsx     # Category browse
│   │   ├── (auth)/
│   │   │   └── login/page.tsx               # Login (Google / Admin tabs)
│   │   ├── (app)/
│   │   │   └── favorites/page.tsx           # User favorites
│   │   ├── (admin)/
│   │   │   ├── admin/page.tsx               # Admin dashboard
│   │   │   ├── admin/upload/page.tsx        # Upload asset
│   │   │   └── admin/manage/page.tsx        # Manage/edit/delete
│   │   ├── api/
│   │   │   ├── assets/
│   │   │   │   ├── route.ts                 # GET list
│   │   │   │   └── [id]/route.ts            # GET single
│   │   │   ├── categories/route.ts          # GET list
│   │   │   ├── favorites/route.ts           # GET (list mine)
│   │   │   ├── favorites/[assetId]/route.ts # POST/DELETE
│   │   │   ├── download/[id]/route.ts       # POST -> rate-limit -> redirect
│   │   │   ├── upload/presign/route.ts      # POST -> presign upload URL
│   │   │   └── auth/confirm/route.ts        # (admin email/password handled by Auth UI)
│   │   ├── layout.tsx                       # Root layout + fonts
│   │   ├── globals.css
│   │   └── middleware.ts                     # Route protection
│   ├── components/
│   │   ├── ui/                              # shadcn/ui primitives
│   │   ├── layout/  (Navbar.tsx, Footer.tsx, ThemeToggle.tsx)
│   │   ├── asset/   (AssetCard.tsx, AssetGrid.tsx, FilterBar.tsx, AssetPlayer.tsx, ShareButton.tsx)
│   │   └── admin/   (AssetUploadForm.tsx, AssetManageTable.tsx, AssetEditForm.tsx)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                    # browser client
│   │   │   ├── server.ts                    # @supabase/ssr createServerClient
│   │   │   └── admin.ts                     # service-role client
│   │   ├── auth.ts                           # requireUser / requireAdmin
│   │   ├── rate-limit.ts                     # bucketAllow / consumeDownload
│   │   ├── search.ts                         # tsquery builder + order
│   │   ├── metadata.ts                       # validate file type / size
│   │   ├── r2.ts                              # presign upload/download, deleteObject
│   │   ├── format.ts                          # formatBytes, formatDuration
│   │   └── utils.ts                           # cn(), slugify()
│   ├── hooks/
│   │   ├── use-favorites.ts
│   │   └── use-motion-safe.ts
│   ├── types/index.ts                         # Asset, Category, Profile, enums
│   └── env.ts                                 # zod env validation
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial.sql
│   │   └── 00002_seed.sql
│   └── seed-admin.sql                          # insert admin profile (manual run)
├── tests/
│   ├── unit/   (rate-limit, metadata, search, auth, format)
│   ├── integration/ (api handlers)
│   └── e2e/
├── supabase/config.toml# (local config not used since cloud) 
├── .env.example
├── .env.local (gitignored)
├── package.json
├── package-lock.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## Task 0: Scaffold Next.js + git init + env

**Files:**
- Create: `package.json`, `app/layout.tsx`, `src/app/page.tsx`, `src/env.ts`, `.env.example`, `.env.local` (via copy), `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.gitignore`, `vitest.config.ts`, `playwright.config.ts`, `supabase/migrations/` folder, `AGENTS.md` (repo note).

**Interfaces:**
- Consumes: -
- Produces:
  - `src/env.ts` exports `env` object validated by zod:
    - `env.SUPABASE_URL: string`, `env.SUPABASE_ANON_KEY: string`, `env.SUPABASE_SERVICE_ROLE_KEY: string`, `env.R2_ACCOUNT_ID`, `env.R2_ACCESS_KEY_ID`, `env.R2_SECRET_ACCESS_KEY`, `env.R2_BUCKET_NAME`, `env.NODE_ENV`
  - `src/app/page.tsx` renders text "StackCrate" (temporary).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/env.test.ts
import { describe, it, expect } from "vitest";
// Fake env setup loaded from `.env.test`
describe("zod env schema", () => {
  it("reflects env back", () => {
    const env = { SUPABASE_URL: "http://localhost", NODE_ENV: "test" };
    expect(env.NODE_ENV).toBeTruthy();
  });
});
```

(This is a trivial anchor to set up the runner; real env assertions come in T3.)

- [ ] **Step 2: Run test to verify fail-fast**

Run: `npm test`
Expected: `vitest` command not found / file missing.

- [ ] **Step 3: Create the Next.js project**

```bash
# In repo root `web-asset-editor`
npm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 4: Add testing deps**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm i -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 5: Write vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 6: Create tests/setup.ts**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Add scripts**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 8: Create .env.example**

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
R2_ACCOUNT_ID=YOUR_ACCOUNT_ID
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_SECRET
R2_BUCKET_NAME=stackcrate-assets
```

- [ ] **Step 9: Create `.env.local` from example (dummy placeholders)**

Copy with placeholders. Real values come in [MANUAL] tasks.

- [ ] **Step 10: Create src/env.ts with zod validation**

```ts
import { z } from 'zod';
import 'server-only';

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default(''),
});

export const env = serverEnvSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
});

export const publicEnv = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
```

- [ ] **Step 11: Run tests**

Run: `npm test`
Expected: 1 passing (anchor test).

- [ ] **Step 12: Verify dev server**

Run: `npm run dev` -> open `http://localhost:3000` shows default Next.js page (temporary).
Then kill.

- [ ] **Step 13: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest + env"
```

---

## Task 1: Design system (Tailwind + fonts + shadcn/ui + motion)

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `components.json`, `src/lib/utils.ts`

**Interfaces:**
- Consumes: -
- Produces: `cn()` helper (`cn(...inputs: ClassValue[]): string`), `src/app/globals.css` with CSS variables + warm palette, `src/app/layout.tsx` rendering `<Navbar/>` later; fonts registered via `next/font/google`: `knewave` (display), `mystery_quest` (heading), `manrope` (body).

- [ ] **Step 1: Add shadcn/ui**

```bash
npx shadcn@latest init
```

Use default Minimal dark scheme when prompted, then customize tokens in next step. Accept all defaults.

- [ ] **Step 2: Override globals.css palette (warm playful)**

Replace `:root` and `.dark` variable blocks with:

```css
:root {
  /* light */
  --background: 43 100% 94%;
  --foreground: 24 10% 15%;
  --card: 43 100% 97%;
  --card-foreground: 24 10% 12%;
  --primary: 25 95% 53%;
  --primary-foreground: 0 0% 100%;
  --muted: 40 10% 92%;
  --muted-foreground: 24 5% 45%;
  --accent: 41 100% 60%;
  --accent-foreground: 24 10% 12%;
  --border: 33 12% 86%;
  --ring: 25 95% 50%;
}

.dark {
  /* dark default */
  --background: 24 15% 10%;        /* #1a1410 */
  --foreground: 40 30% 95%;        /* #fafaf9 */
  --card: 21 15% 14%;              /* #2a201a */
  --card-foreground: 40 0% 97%;
  --primary: 26 96% 55%;          /* #f97316 */
  --primary-foreground: 0 0% 100%;
  --muted: 20 10% 18%;
  --muted-foreground: 30 8% 60%;
  --accent: 45 90% 60%;           /* #fbbf24 */
  --accent-foreground: 24 10% 12%;
  --border: 24 20% 22%;           /* #3d2f25 */
  --ring: 26 96% 55%;
}
```

- [ ] **Step 3: Add fonts**

In `src/app/layout.tsx`:

```tsx
import { Knewave, MysteryQuest, Manrope } from 'next/font/google';

const display = Knewave({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const heading = MysteryQuest({ subsets: ['latin'], weight: '400', variable: '--font-heading' });
const body = Manrope({ subsets: ['latin'], variable: '--font-body' });
```

Apply `className={display.variable} ${heading.variable} ${body.variable}` and add CSS variables to `globals.css` + a font stack utility class in `tailwind.config.ts`. Verify each font loads via `document.fonts.check` in unit test? (skip, do a manual `npm run dev` check.)

- [ ] **Step 4: Add motion deps**

```bash
npm i framer-motion react-intersection-observer canvas-confetti
npm i -D @types/canvas-confetti
```

- [ ] **Step 5: Add motion-safe hook**

`src/hooks/use-reduced-motion.ts`:

```ts
import { useReducedMotion } from 'framer-motion';
export const useMotionSafe = () => useReducedMotion();
```

- [ ] **Step 6: Verify**

`npm run dev` shows fonts applied on blank page; no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui design system with warm Palette + fonts + motion deps"
```

---

## Task 2: Supabase clients + env wiring

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/types.ts`
- Modify: `src/env` if needed

**Interfaces:**
- Consumes: `env` from T0.
- Produces:
  - `src/lib/supabase/client.ts` exports `createBrowserClient(): SupabaseClient`
  - `src/lib/supabase/server.ts` exports `createServerClient(cookieStore: ReturnType<typeof cookies>): Promise<SupabaseClient>` (uses @supabase/ssr, Set-Cookie)
  - `src/lib/supabase/admin.ts` exports `adminClient: SupabaseClient` (service-role key)
  - `src/lib/types.ts` exports:
    - `type Kind = 'audio' | 'video'`
    - `interface Asset { id; title; description; type: Kind; category: Category; tags: string[]; file_url: string; file_size: number; duration_ms: number; downloads_count: number; favorites_count: number; created_at: string; }`
    - `interface Category { id; name; slug; }`
    - `interface Profile { id; email; is_admin; }`

- [ ] **Step 1: Install @supabase/ssr**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: client.ts**

```ts
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/env';

export const createBrowserClientHelper = () =>
  createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY);
```

- [ ] **Step 3: server.ts**

```ts
import { createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

export const createServerClientHelper = (cookieStore: ReturnType<typeof cookies>) =>
  createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)) } catch {} } } }
  );
```

- [ ] **Step 4: admin.ts**

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

- [ ] **Step 5: Add unit test for env client creation to avoid crashes**

- [ ] **Step 6: Commit** `feat: add Supabase clients (browser/server/admin) + shared types`

---

## Task 3: [MANUAL] Supabase: create project + keys

**(Step-by-step with user confirmation — do NOT run all at once.)**

- [ ] **Step 1**: User opens https://supabase.com, signs in (or sign up free).
- [ ] **Step 2**: Click "New project" -> name `stackcrate`, region nearest (e.g. Singapore), Database password *auto-generated*; click "Create new project".
- [ ] **Step 3**: After creation (1-2 min), open project dashboard -> Settings > API.
- [ ] **Step 4**: Copy these 3 values into `src/.env.local`:
  - `PROJECT_URL` (e.g. `https://xxxx.supabase.co`)
  - `PUBLIC_ANON_KEY`
  - `SERVICE_ROLE_KEY` (secret — never commit)
- [ ] **Step 5**: Confirm to me they are set (I'll validate with a quick `npm` file check).

---

## Task 4: [MANUAL] R2: bucket + API token

- [ ] **Step 1**: Sign in / create Cloudflare account (dash.cloudflare.com).
- [ ] **Step 2**: R2 > Buckets > "Create bucket" → name: `stackcrate-assets`, region `APAC` (or nearest).
- [ ] **Step 3**: R2 → Manage R2 API Tokens → Create new token: "Admin read/write" Full Access to `stackcrate-assets`. Save Access Key ID + Secret Access Key.
- [ ] **Step 4**: Copy 4 values (Account ID + 3 credentials above) into `src/.env.local`.
- [ ] **Step 5 (confirm)**.

---

## Task 5: [MANUAL] Supabase Auth: email/password + Google OAuth

- [ ] **Step 1**: Dashboard → Authentication → Providers.
- [ ] **Step 2**: Enable "Email" (recommended: disable "Confirm email" for dev, enable for PROD).
- [ ] **Step 3**: Enable "Google"; create OAuth client at https://console.cloud.google.com (Google API → Credentials → Create credentials → OAuth client ID → Web). Authorized origins `http://localhost:3000`, callback URL from Supabase dashboard.
- [ ] **Step 4**: Paste Client ID + Secret into Supabase Google provider section, Save.
- [ ] **Step 5**: Confirm.
- [ ] **Step 6**: Create admin account manually: Authentication → Users → Add user → email `admin@stackcrate.dev` password `ReplaceMe123!`.
- [ ] **Step 7**: Run a one-off SQL in Supabase SQL editor after DB setup (T8) to mark admin:

```sql
INSERT INTO profiles (id, username, is_admin)
SELECT id, 'admin', true FROM auth.users WHERE email = 'admin@stackcrate.dev' ON CONFLICT (id) DO UPDATE SET is_admin = true;
```

---

## Task 6: DB schema migration + RLS

**Files:**
- Create: `supabase/migrations/00001_initial.sql`

**Interfaces:**
- Produces: tables `profiles`, `categories`, `assets`, `favorites`, `download_log`; RLS policies (public read on assets/categories; authenticated insert own favorites; admin full on all). `update_download_count()` and `update_favorites_count()` trigger functions.

- [ ] **Step 1: Write migration**

```sql
-- 00001_initial.sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text
);
alter table public.categories enable row level security;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null unique,
  type text not null check (type in ('audio','video')),
  category_id uuid references public.categories(id),
  tags text[] not null default '{}',
  file_key text not null,            -- R2 object key
  file_size integer,                 -- bytes
  duration integer,                  -- seconds
  downloads_count integer not null default 0,
  favorites_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.assets enable row level security;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id)
);
alter table public.favorites enable row level security;

create table if not exists public.download_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  asset_id uuid references public.assets(id) on delete cascade,
  ip_hash text not null,
  downloaded_at timestamptz not null default now()
);
alter table public.download_log enable row level security;

-- indexes
create index if not exists idx_assets_category on public.assets(category_id);
create index if not exists idx_assets_created on public.assets(created_at desc);
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_download_log_ip on public.download_log(ip_hash, downloaded_at);

-- RLS policies
create policy "Public read categories" on public.categories for select using (true);
create policy "Admin write categories" on public.categories for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "Public read assets" on public.assets for select using (true);
create policy "Admin write assets" on public.assets for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
);

create policy "Select own profiles" on public.profiles for select using (auth.uid() = id);
create policy "Admin read all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
);

create policy "Users insert own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users delete own favorites" on public.favorites for delete using (auth.uid() = user_id);
create policy "Users select own favorites" on public.favorites for select using (auth.uid() = user_id);

-- download_log: only insert via service role (no anon writes); read via admin.
create policy "Admin read download_log" on public.download_log for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
);
create policy "Service writes download_log" on public.download_log for insert with check (true); -- used only by service role

-- triggers to keep counters
create or replace function public.bump_download() returns trigger language plpgsql as $$
begin
  update public.assets set downloads_count = downloads_count + 1 where id = NEW.asset_id;
  return new;
end $$;

create trigger trg_bump_download after insert on public.download_log
for each row execute function public.bump_download();

create or replace function public.recompute_favorite(asset_id uuid, increment boolean) returns void language plpgsql as $$
begin
  if increment then
    update public.assets set favorites_count = favorites_count + 1 where id = asset_id;
  else
    update public.assets set favorites_count = greatest(favorites_count - 1, 0) where id = asset_id;
  end if;
end $$;
```

- [ ] **Step 2 (MANUAL confirm)** run migration in Supabase SQL Editor.
- [ ] **Step 3**: Create `supabase/migrations/00002_seed.sql` seeding 5 categories (Recording, SFX, Music, Intro/Outro, Transitions) — run manually in SQL Editor.
- [ ] **Step 4**: Commit (`feat: db schema + seeding`).

---

## Task 7: auth helpers (requireUser / requireAdmin)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `tests/unit/auth.test.ts`

**Interfaces:**
- Consumes: `adminClient`, `createServerClient`.
- Produces:
  - `async function getProfile(userId: string): Promise<Profile | null>`
  - `async function isAdmin(userId: string): Promise<boolean>`
  - `async function requireUser(req: NextRequest): Promise<{ user: User; error: Response } | { user: null; error: Response }>`
  - `async function requireAdmin(req: NextRequest): Promise<{ user: User } | { error: Response }>`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isAdmin } from '@/lib/auth';

describe('isAdmin', () => {
  it('returns false when profile not found', async () => {
    // mock adminClient.profile not found
    expect(await isAdmin('no-user')).toBe(false);
  });
  it('returns true when is_admin true', async () => {
    // mock profile row
    expect(await isAdmin('u1')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (fail)**
- [ ] **Step 3: Implement**

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabase } from './supabase/server';
import { adminClient } from './supabase/admin';

export async function requireUser(req: NextRequest) {
  const supabase = await createServerSupabase(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: NextResponse.json({error:'Unauthorized'}, {status:401}) };
  const profile = await getProfile(user.id);
  return { user, profile };
}

export async function requireAdmin(req: NextRequest) {
  const { user, profile, error } = await requireUser(req);
  if (error || !user) return { error };
  if (!profile?.is_admin) return { error: NextResponse.json({error:'Forbidden'}, {status:403}) };
  return { user, profile };
}

export async function getProfile(userId: string) {
  const { data } = await adminClient.from('profiles').select('*').eq('id', userId).single();
  return data ?? null;
}
```

- [ ] **Step 4: Run test (pass; adjust mocks)**
- [ ] **Step 5: Commit**

---

## Task 8: categories + assets list API

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/assets/route.ts`, `src/lib/search.ts`
- Test: `tests/unit/search.test.ts`, `tests/integration/assets.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/categories` → `{ categories: Category[] }`
  - `GET /api/assets?limit=12&offset=0&category=slug&q=text&sort=newest|downloads|favorites` → `{ assets: Asset[], total: number }`
  - `src/lib/search.ts` exports `buildSearchQuery(q: string): string` (safe tsquery) and `resolveOrder(sort): OrderDefinition`

- [ ] **Step 1: Write failing search tests**
- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement `search.ts`**

```ts
export function buildSearchQuery(q: string): string | null {
  const clean = q.trim().replace(/[^\p{L}\p{N}\s_-]/gu, '');
  if (!clean) return null;
  return clean.split(/\s+/).map(w => `${w}:*`).join(' & ');
}

export function resolveOrder(sort: string) {
  switch (sort) {
    case 'downloads': return { column: 'downloads_count', ascending: false };
    case 'favorites': return { column: 'favorites_count', ascending: false };
    default: return { column: 'created_at', ascending: false };
  }
}
```

- [ ] **Step 4: Implement assets route**

```ts
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const sort = url.searchParams.get('sort') ?? 'newest';
  const category = url.searchParams.get('category') ?? '';
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 12), 50);

  let query = adminClient.from('assets').select('*, categories(name, slug)', { count: 'exact' });
  if (category) query = query.eq('categories.slug', category);
  if (q) {
    const ts = buildSearchQuery(q);
    if (ts) query = query.textSearch('title', ts, { config: 'english' });
  }
  const order = resolveOrder(sort);
  query = query.order(order.column, { ascending: order.ascending })
              .range(offset, offset + limit - 1);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: data, total: count ?? 0 });
}
```

- [ ] **Step 5: Implement categories route (similar simple select)**
- [ ] **Step 6: Run tests (pass) + `npm run build` clean**
- [ ] **Step 7: Commit (`feat: categories & assets list API`)**

---

## Task 9: asset detail API + slug helper

**Files:**
- Create: `src/app/api/assets/[id]/route.ts`, `src/lib/slug.ts`
- Test: `tests/unit/slug.test.ts`

**Interfaces:**
- Produces: `GET /api/assets/[slug]` → `{ asset: Asset }` or 404; `slugify(title: string): string`
- Consumes: `adminClient`.

- [ ] **Step 1: Write slug test**

```ts
expect(slugify('Keren Banget!! SFX')).toBe('keren-banget-sfx');
```

- [ ] **Step 2: Implement + Test pass**
- [ ] **Step 3: Implement GET route** (`select * from assets where slug = param`), return 404 `{error:'Asset tidak ditemukan'}`.
- [ ] **Step 4: Integration test with mocked adminClient**
- [ ] **Step 5: Commit**

---

## Task 10: favorites API

**Files:**
- Create: `src/app/api/favorites/route.ts`, `src/app/api/favorites/[assetId]/route.ts`

**Interfaces:**
- Consumes: `requireUser`, `adminClient`.
- Produces:
  - `GET /api/favorites` → `{ favorites: Asset[] }` (assets user favorited)
  - `POST /api/favorites/:assetId` → `{ ok: true }`
  - `DELETE /api/favorites/:assetId` → `{ ok: true }`

- [ ] **Step 1: Test `requireUser` auth applied (unit: rejects anonymous)**.
- [ ] **Step 2: Implement GET** (join favorites with assets for current user).
- [ ] **Step 3: Implement POST** — insert row, ensure duplicate tolerant (`onConflictDoNothing`).
- [ ] **Step 4: Implement DELETE** — `adminClient.from('favorites').delete().eq('user_id').eq('asset_id')`.
- [ ] **Step 5: Run tests + build; commit.**

---

## Task 11: R2 presign + upload API

**Files:**
- Create: `src/lib/r2.ts`, `src/app/api/upload/presign/route.ts`, `src/app/api/assets/[slug]-upload` (skip; upload happens through presign + DB insert via admin)

**Interfaces:**
- Consumes: env R2 creds, `requireAdmin`.
- `src/lib/r2.ts`:
  - `getS3Client(): S3Client` (uses @aws-sdk/client-s3 with `endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region 'auto', signatureVersion 'v4')
  - `getPresignedUpload(key: string, contentType: string, length: number): Promise<string>` (= 5min)
  -  `getPresignedDownload(key: string): Promise<string>` (10min)
  - `deleteObject(key: string): Promise<void>`
- `POST /api/upload/presign` body `{ fileName: string, contentType: string, size: number }` → validates admin + size<=200MB + extension allowlist → returns `{ uploadUrl, publicKey }`.

- [ ] **Step 1: Unit test metadata validation (`src/lib/metadata.ts` accepts mp4/webm/wav/mp3; reject others; reject >200MB)**
- [ ] **Step 2: Implement metadata.ts** (extension + MIME allowlist, size cap)
- [ ] **Step 3: Implement r2.ts** (use `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`)
- [ ] **Step 4: Implement presign route** (requires admin; validate; call getPresignedUpload)
- [ ] **Step 5: Test with mocked clients; run tests; commit**

---

## Task 12: create-edit API for assets

**Files:**
- `src/app/api/assets/route.ts` (add POST), `src/app/api/assets/[slug]/route.ts` (add PATCH, DELETE)

**Interfaces:**
- `POST /api/assets` body `{ title, description, type, category_id, tags, file_key, file_size, duration }` → `{ asset: Asset }`; triggers slugify + insert. Admin only.
- `PATCH /api/assets/:slug` body partial — admin only, updates fields, re-slugs if title changed.
- `DELETE /api/assets/:slug` — admin only, first delete R2 object via `deleteObject`, then DB delete.

- [ ] **Step 1: Write integration tests** for POST (admin), PATCH (slug uniqueness), DELETE (R2 call).
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run tests, build, commit**

---

## Task 13: download route — rate limit + presigned redirect

**Files:**
- Create: `src/app/api/download/[id]/route.ts`, `src/lib/rate-limit.ts`
- Test: `tests/unit/rate.test.ts` (mockable bucketAllow)

**Interfaces:**
- `src/lib/rate-limit.ts`:
  - `f("ip", "now"): Promise<{allowed, remaining}>` using DB:

```sql
SELECT count(*) AS cnt FROM public.download_log
WHERE ip_hash = $1 AND downloaded_at > now() - interval '1 hour';
```

  - if cnt >= 10 → `{allowed:false, remaining:0}` else `{allowed:true, remaining:10-cnt}`
- `POST /api/download/[id]`:
  - resolve ip = `request.headers.get('x-forwarded-for')` split first, hash SHA-256 server-side constant.
  - if not allowed → `429 {error:"Terlalu banyak download. Tunggu beberapa saat."}`
  - find asset by id; if not found 404.
  - `getPresignedDownload(asset.file_path)` → redirect (302) to presigned URL
  - insert row into `download_log` (adminClient, so counters bump via trigger)

- [ ] **Step 1: Write failing rate-limit test** (10th block, 9th allow, reset-time boundary)
- [ ] **Step 2: Implement `rate-limit.ts`**
- [ ] **Step 3: Implement route** (mocked adminClient + r2 in tests)
- [ ] **Step 4: Tests pass + build + commit**

---

## Task 14: Layout & Navbar/Footer + theme

**Files:**
- Create: `src/components/layout/Navbar.tsx`, `Footer.tsx`, `src/app/(public)/layout.tsx`

**Requirement Notes (from dialect UI):**
- Sticky top navbar: brand (knewave logo), search input (expand on focus), categories dropdown, theme toggle, auth button.
- Footer: credits + small print.
- Navbar uses client-side auth state (use client) — uses `onAuthStateChanged` from browser client.

- [ ] **Step 1: Write `ThemeToggle`** using next-themes, persists to localStorage, respects `prefers-color-scheme`.
- [ ] **Step 2: Navbar** with sticky + motion-safe hover/fade.
- [ ] **Step 3: Footer** minimal.
- [ ] **Step 4: Wire layout** `(public)/layout.tsx` wrapping `<Navbar/><main>{children}</main><Footer/>`.
- [ ] **Step 5: Manual check** `npm run dev` → see theme toggle, navbar, footer.
- [ ] **Step 6: Commit**

---

## Task 15: Home page + AssetCard + Grid

**Files:**
- Create: `src/components/asset/AssetCard.tsx`, `AssetGrid.tsx`, `src/app/(public)/page.tsx`
- Style: fonts known. Motion: staggered fade + lift + hover scale; cards show type icon, title (heading font), meta (duration, size).

- [ ] **Step 1: `<AssetCard asset={a}>`** — link to `/asset/[slug]`, use `Image`? (assets are media; use native img for thumbnail if we have one; else show waveform/type icon). For v1 no thumbnail — show large type icon + title + tags.
- [ ] **Step 2: `<AssetGrid assets={list}>`** responsive `grid-cols-1 sm:2 lg:4` + staggered framer-motion `whileTap`/`whileHover`.
- [ ] **Step 3: Server component page** fetch list via `supabase/route` server-side `GET /api/assets` (use internal fetch) + `searchParams` handling.
- [ ] **Step 4: Infinite scroll** via IntersectionObserver + offset fetch (client component `AssetList`).
- [ ] **Step 5: Skeleton** shimmer warm gradient for loading state.
- [ ] **Step 6: Reduced-motion guards** everywhere.
- [ ] **Step 7: Verify in dev; commit**

---

## Task 16: Asset detail page

**Files:**
- Create: `src/components/asset/Player.tsx` (uses `<video>` / `<audio>`), `src/app/(public)/asset/[slug]/page.tsx`
- Interacts with favorites + download buttons (auth-aware).

- [ ] **Step 1: `Player`** uses native element + `src` from server asset `file_url` (the R2 key public-> via `getPresignedDownload` on mount). Controls custom minimal.
- [ ] **Step 2: Page grunts**: left player, right meta (title, category, tags, description, size, duration, created) + actions row (Download button — disabled unless logged in; Favorite toggler).
- [ ] **Step 3: Download button** calls `POST /api/download/[id]`; on 302 navigate; on 429 show toast "Terlalu banyak download…"; success → fire `canvas-confetti` small.
- [ ] **Step 4: Login CTA** if unauthenticated (`Login to download` → `/login?next=/asset/xxx`).
- [ ] **Step 5: Related assets** (same category, next 4) below.
- [ ] **Step 6: Motion** on load (fade + lift).
- [ ] **Step 7: Build + test component with RTL**

---

## Task 17: Login page

**Files:**
- Create: `src/components/auth/AuthTabs.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] **Step 1**: tabs Google / Admin.
- [ ] **Step 2** Google: `onAuthStateChanged` in browser client, call `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo}})`.
- [ ] **Step 3** Admin: form email+password → `supabase.auth.signInWithPassword`.
- [ ] **Step 4** On error show timely (email invalid, wrong password).
- [ ] **Step 5** `next` query redirect after auth.
- [ ] **Step 6** passport-level: `middleware.ts` protect `/admin*` and `/favorites`.

---

## Task 18: Favorites page

**Files:**
- Create: `src/app/(app)/favorites/page.tsx`

- [ ] **Step 1** Protected (middleware) — user must login.
- [ ] **Step 2** Fetch `GET /api/favorites` via server cause uses adminClient.
- [ ] **Step 3** Show AssetGrid; empty state "Belum ada favorit".

---

## Task 19: Admin pages

**Files:**
- `(admin)/admin/page.tsx` (dashboard - counts, recent), `(admin)/admin/upload/page.tsx`, `(admin)/admin/manage/page.tsx`
- Components in `components/admin/`.

- [ ] **Step 1** Dashboard: totals (assets, downloads, users) from admin queries.
- [ ] **Step 2** Upload: Drag-n-drop (client), form metadata → on file select client validates size/type; after `presign` call → upload Blob via `fetch(uploadUrl, {method:'PUT', body})` → then `POST /api/assets`. Show progress (XHR).
- [ ] **Step 3** Manage: table (title, category, type, created, downloads) with edit (sheet/modal: `AssetEditForm`) + delete (confirm).
- [ ] **Step 4** Admin-only (middleware guard).
- [ ] **Step 5** Test with Playwright (admin login → upload → see in catalog).

---

## Task 20: E2E + polish

- [ ] **Write `tests/e2e/app.spec.ts`**: home shows cards, login works, favorite add, download button triggers flow (mock R2 with local static file).
- [ ] **Write `tests/e2e/admin.spec.ts`**: admin login → upload → asset visible.
- [ ] Capsule accessibility sweep (button labels, focus, aria, contrast in dark mode).
- [ ] `npm run lint && npm test && npm run build && npm run test:e2e` — all green.

---

## Task 21: [MANUAL] Deploy

- [ ] Vercel project connect repo/git; env vars from `.env.example` (both public + private) into Vercel.
- [ ] Set `NEXT_PUBLIC_*` + `SUPABASE_SERVICE_ROLE_KEY` + R2 creds.
- [ ] Turn off R2 CORS to allow upload from Vercel domain (if not already).
- [ ] Deploy; verify homepage, login, upload, download on prod URL.
- [ ] Set `domain` (optional).

---

## Self-Review Notes

- Spec section "Fitur & Fungsi" coverage: all map to T8 (browse/search), T1-T2 (UI), T9 (detail), T10 (favorites), T11-T12 (upload), T13 (download), T16-T19 pages.
- Rate limit decision consistent with T13 (`10 downloads / IP / hour`).
- Upload cap consistent (200MB) enforced in T11 + UI in T19.
- `[MANUAL]` tasks executed one step at a time with user confirmation.
- Recheck: auth middleware ordering, env var naming; ensure `NEXT_PUBLIC_SUPABASE_URL` actually set in `publicEnv`.

---

## Execution Handoff

Two options for engineers:
1. Subagent-driven (recommended): fresh subagent per task with review between.
2. Inline execution with checkpoints.

## Execution Context (wajib dibaca sebelum eksekusi di session baru)

> Konteks ini untuk agent eksekutor yang memulai implementasi plan ini di session terpisah, agar tidak perlu mengulang diskusi.

### Repo GitHub
- Kode aplikasi di-commit ke remote terpisah: `https://github.com/MuhammadFaza-DU/StackCrate.git` (sudah ada, kosong).
- Cara: pada awal Task 0, init git di root pekerjaan (bisa subfolder), set remote, push commit awal. Login `gh` sudah aktif sebagai `MuhammadFaza-DU`.

### Kapan env dashboard dibutuhkan (SANGAT penting)
- **Task 0–2** (scaffold, design system, supabase client code): jalan TANPA env real — gunakan `placeholder` di `.env.local`.
- **Task 3–5** (`[MANUAL]`): WAJIB env real + aksi manual di dashboard oleh USER:
  - T3: Supabase — buat project di dashboard, ambil URL + anon key + service_role key.
  - T4: Cloudflare R2 — buat bucket `stackcrate-assets`, buat Access Key ID + Secret.
  - T5: Google OAuth — set Email + Google provider di Supabase Auth; buat OAuth client di Google Cloud.
  - Setelah Task 5 selesai, isi nilai real ke `.env.local` sebelum lanjut Task 6.

### Pembagian fase dengan checkpoint (WAJIB ditaati)
Eksekusi berjalan bertahap; di setiap akhir fase, sebagai agent:
1. Laporkan hasil fase (apa yang selesai, apa yang belum, status tes/build).
2. **Berhenti / pause** — jangan langsung lanjut fase berikutnya.
3. Tawari user untuk lanjut.
4. Tunggu konfirmasi user. User konfirmasi → lanjut fase berikutnya; user revisi → perbaiki dulu.

Urutan fase:
- **Fase 0 (Task 0–2)**: scaffold + design system + supabase client code. Tanpa env.
- **Fase 1 (Task 3–5)**: `[MANUAL]` dashboard setup. Step-by-step satu per satu, konfirmasi user tiap step (bukan semua step sekaligus).
- **Fase 2 (Task 6–13)**: backend logic (schema, auth, API, rate limit, upload/download).
- **Fase 3 (Task 14–19)**: frontend pages (layout, home, detail, login, favorites, admin).
- **Fase 4 (Task 20)**:  E2E + polish.
- **Fase 5 (Task 21)**: deploy (manual).

### Aturan `[MANUAL]` step
- Task `[MANUAL]` dijalankan **step-by-step** — tampilkan SATU step, user jalankan & konfirmasi ("iya sudah / ini benar"), baru tampilkan step berikutnya. JANGAN tulis semua step sekaligus di depan user.