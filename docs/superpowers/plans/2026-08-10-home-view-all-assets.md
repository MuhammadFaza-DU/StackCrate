# Home Hero Section 2 Asset Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show up to 12 assets in the homepage HS2 grid and add a localized, centered `View All`/`Lihat Semua` link to `/explore` only when the grid is full.

**Architecture:** Keep the existing homepage data flow unchanged. Raise the client-side request limit from 10 to 12 (`HOME_LIMIT`), add a localized `home.viewAll` dictionary entry, and render a small standalone `ViewAllLink` component below `AssetGrid` gated on `assets.length >= 12`. No API or backend changes.

**Tech Stack:** Next.js 16.3.0 (App Router, client component), React 19, Tailwind CSS 4, framer-motion, Vitest + happy-dom, TypeScript.

## Global Constraints

- Do not change the `/api/assets` endpoint, `AssetGrid`, `CategoryNav`, or `SortTabs`.
- The link must navigate to `/explore` without any query string (Explore uses its default filters).
- Localized labels: Indonesian `Lihat Semua`, English `View All`, read from the active locale dictionary via `useLocale()`.
- Follow existing visual language: `Link` from `next/link`, rounded-full pill, `hover:bg-accent`, `active:translate-y-[1px]`, `transition`.
- Tests use the codebase pattern: `react-dom/client` `createRoot` + `act`, `querySelector`, no `@testing-library/react`.
- Verification commands: `npm test`, `npx eslint`, `npx tsc --noEmit`, `npm run build`.

---

### Task 1: Add localized `home.viewAll` dictionary entry

**Files:**
- Modify: `src/i18n/types.ts:80-94`
- Modify: `src/i18n/dictionaries/id.ts:77-91`
- Modify: `src/i18n/dictionaries/en.ts:77-91`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Consumes: nothing (new key).
- Produces: `dictionary.home.viewAll: Message` in `id` and `en` dictionaries, and the `'viewAll'` key in the `Dictionary.home` `Keys<...>` union in `src/i18n/types.ts`.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('i18n core', ...)` block in `tests/unit/i18n.test.ts`:

```ts
  it('provides a localized view-all label on the home section', () => {
    expect(getDictionary('id').home.viewAll).toBe('Lihat Semua');
    expect(getDictionary('en').home.viewAll).toBe('View All');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — TypeScript error `Property 'viewAll' does not exist on type ...` (the dictionaries do not yet expose `home.viewAll`).

- [ ] **Step 3: Add the key to the dictionary type**

In `src/i18n/types.ts`, add `| 'viewAll'` to the `home: Keys<...>` union (line 94, after `'featuredLoadError'`):

```ts
  home: Keys<
    | 'heroTitle'
    | 'heroSubtitle'
    | 'statFreeAssets'
    | 'statCategories'
    | 'statFreeForever'
    | 'ctaExplore'
    | 'marqueePremium'
    | 'marqueeFree'
    | 'marqueeReady'
    | 'marqueeStart'
    | 'latestAssets'
    | 'loadError'
    | 'featuredLoadError'
    | 'viewAll'
  >;
```

- [ ] **Step 4: Add the key to the Indonesian dictionary**

In `src/i18n/dictionaries/id.ts`, inside `home: { ... }` (after `featuredLoadError`), add:

```ts
    viewAll: 'Lihat Semua',
```

- [ ] **Step 5: Add the key to the English dictionary**

In `src/i18n/dictionaries/en.ts`, inside `home: { ... }` (after `featuredLoadError`), add:

```ts
    viewAll: 'View All',
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — the new i18n test passes and the whole suite stays green (68 tests + 1 new).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/types.ts src/i18n/dictionaries/id.ts src/i18n/dictionaries/en.ts tests/unit/i18n.test.ts
git commit -m "feat: add localized home view-all label"
```

---

### Task 2: Create the `ViewAllLink` component

**Files:**
- Create: `src/components/assets/ViewAllLink.tsx`
- Test: `tests/unit/view-all-link.test.ts`

**Interfaces:**
- Consumes: `useLocale()` from `@/components/i18n/LocaleProvider`, `dictionary.home.viewAll` (from Task 1), `Link` from `next/link`.
- Produces: `export function ViewAllLink({ show }: { show: boolean })` — renders `null` when `show` is false; otherwise a centered pill `Link` to `/explore` labeled with the active locale's `home.viewAll`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/view-all-link.test.ts`:

```ts
import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ViewAllLink } from '@/components/assets/ViewAllLink';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderWithLocale(child: ReactNode, initialLocale: 'id' | 'en' = 'id') {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  act(() => {
    root.render(createElement(LocaleProvider, { initialLocale }, child));
  });

  return { container, root };
}

describe('ViewAllLink', () => {
  it('renders nothing when show is false', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: false }));

    expect(container.querySelector('a[href="/explore"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('renders a centered link to /explore with the Indonesian label when show is true', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: true }));

    const link = container.querySelector('a[href="/explore"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe('Lihat Semua');
    expect(link?.parentElement?.className).toContain('justify-center');

    act(() => root.unmount());
    container.remove();
  });

  it('localizes the label with the active locale', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: true }), 'en');

    const link = container.querySelector('a[href="/explore"]');
    expect(link?.textContent).toBe('View All');

    act(() => root.unmount());
    container.remove();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found (`@/components/assets/ViewAllLink` does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/assets/ViewAllLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

const text = (message: Message) => (typeof message === 'function' ? message() : message);

interface ViewAllLinkProps {
  show: boolean;
}

export function ViewAllLink({ show }: ViewAllLinkProps) {
  const { dictionary } = useLocale();

  if (!show) return null;

  return (
    <div className="flex justify-center pt-2">
      <Link
        href="/explore"
        className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground active:translate-y-[1px] transition"
      >
        {text(dictionary.home.viewAll)}
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all three `ViewAllLink` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/assets/ViewAllLink.tsx tests/unit/view-all-link.test.ts
git commit -m "feat: add centered localized view-all link"
```

---

### Task 3: Integrate `ViewAllLink` and raise the homepage limit

**Files:**
- Modify: `src/app/page.tsx:20`
- Modify: `src/app/page.tsx:162`
- Modify: `src/app/page.tsx:1-19` (imports)

**Interfaces:**
- Consumes: `ViewAllLink` (from Task 2).
- Produces: Homepage HS2 grid requests up to 12 assets; `ViewAllLink` rendered below `AssetGrid` when `assets.length >= 12`.

- [ ] **Step 1: Write the failing test (skip — covered by Task 2 component tests)**

The visibility condition `assets.length >= 12` lives inline in the page component; the component-level behavior is already covered by the `ViewAllLink` tests. Continue with implementation.

- [ ] **Step 2: Add the `ViewAllLink` import**

In `src/app/page.tsx`, after the `AssetGrid` import (line 8), add:

```tsx
import { ViewAllLink } from '@/components/assets/ViewAllLink';
```

- [ ] **Step 3: Raise the request limit**

In `src/app/page.tsx`, change line 20:

```tsx
const HOME_LIMIT = 12;
```

- [ ] **Step 4: Render the link after the grid**

In `src/app/page.tsx`, change the final render branch so `ViewAllLink` sits directly below `AssetGrid`:

```tsx
        ) : (
          <>
            <AssetGrid assets={assets} revealOnView />
            <ViewAllLink show={assets.length >= 12} />
          </>
        )}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: show up to 12 assets with view-all link on homepage"
```

---

### Task 4: Verification

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: all previous tasks.

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0, no errors.

- [ ] **Step 2: Lint**

Run: `npx eslint`
Expected: exit code 0. Existing `<img>` warnings (5) are pre-existing and not introduced by this change.

- [ ] **Step 3: Unit tests**

Run: `npm test`
Expected: PASS — 71 tests (68 existing + 3 `ViewAllLink` + 1 i18n, minus none).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds, homepage route compiled.

- [ ] **Step 5: Manual verification**

1. With fewer than 12 published assets: open `/`, scroll to the assets section, confirm **no** view-all link appears.
2. With 12 or more published assets (in the active category): confirm 12 cards render and a centered `View All`/`Lihat Semua` pill appears below the grid.
3. Click the pill: confirm it navigates to `/explore` with no query string and Explore shows its default filters.
4. Toggle language in the header and confirm the pill label switches between `View All` and `Lihat Semua`.

- [ ] **Step 6: Commit any lint/format fixes (only if produced)**

```bash
git add -A
git commit -m "chore: verification fixes for home view-all feature"
```
