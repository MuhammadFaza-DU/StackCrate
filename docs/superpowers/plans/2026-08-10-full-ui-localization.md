# Full UI Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Indonesian/English locale switcher that updates all static user-visible UI copy across the app and persists the selected locale.

**Architecture:** Use a small internal i18n layer with typed Indonesian and English dictionaries, a `locale=id|en` cookie, and a client `LocaleProvider` for interactive components. The root server layout reads the cookie, sets `<html lang>`, and passes the selected locale to server-rendered layout/legal content; client components use a translation hook. Dynamic database content remains unchanged, while known API errors are normalized to stable error codes before translation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing Tailwind tokens, existing `next/navigation`, no new runtime dependency.

## Global Constraints

- Preserve all existing routes, search/filter/sort behavior, auth flows, admin actions, download behavior, and motion behavior.
- Support exactly `id` and `en`; default to `id` when no valid cookie exists.
- Persist locale in a `locale` cookie and update the current UI immediately after switching.
- Set the document language to the active locale with `<html lang={locale}>`.
- Translate static UI copy, labels, buttons, tooltips, empty/error/loading states, legal content, and metadata; do not translate user/database-provided asset or category names.
- Do not expose raw server or Supabase exception strings as the primary localized UI message.
- Preserve `prefers-reduced-motion`, focus states, contrast, and responsive behavior.
- Do not commit unless the user explicitly requests a commit.

---

### Task 1: Build the typed i18n core

**Files:**
- Create: `web-asset-editor/src/i18n/config.ts`
- Create: `web-asset-editor/src/i18n/types.ts`
- Create: `web-asset-editor/src/i18n/dictionaries/id.ts`
- Create: `web-asset-editor/src/i18n/dictionaries/en.ts`
- Create: `web-asset-editor/src/i18n/server.ts`
- Create: `web-asset-editor/tests/unit/i18n.test.ts`

**Interfaces:**
- Produce `Locale = 'id' | 'en'`.
- Produce `DEFAULT_LOCALE`, `LOCALE_COOKIE`, and `SUPPORTED_LOCALES`.
- Produce `getDictionary(locale: Locale)` returning the typed dictionary.
- Produce `getLocaleFromCookieValue(value: string | undefined): Locale`.
- Produce interpolation support for messages such as `{count}` and `{page}`.

- [ ] **Step 1: Write failing tests for locale parsing and interpolation**

```ts
it('falls back to Indonesian for missing or unsupported locales', () => {
  expect(getLocaleFromCookieValue(undefined)).toBe('id');
  expect(getLocaleFromCookieValue('fr')).toBe('id');
  expect(getLocaleFromCookieValue('en')).toBe('en');
});

it('interpolates named values in translated messages', () => {
  expect(formatMessage('Showing {count} of {total} assets', { count: 3, total: 10 }))
    .toBe('Showing 3 of 10 assets');
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the i18n module is missing**

Run: `npx vitest run tests/unit/i18n.test.ts`

Expected: FAIL with unresolved `@/i18n/config` or `@/i18n/types` imports.

- [ ] **Step 3: Implement the locale config, typed dictionary shape, parser, and formatter**

Use a dictionary shape grouped by surface rather than one flat key namespace. The top-level dictionary must contain these complete groups: `common`, `header`, `home`, `explore`, `assets`, `auth`, `admin`, `legal`, and `errors`. Each group must enumerate every key consumed by the files listed in Tasks 2-6, with all values typed as strings or message functions for named interpolation.

Keep interpolated values as `{name}` placeholders and format them through one helper.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npx vitest run tests/unit/i18n.test.ts`

Expected: PASS.

### Task 2: Add locale persistence, provider, and switcher

**Files:**
- Create: `web-asset-editor/src/components/i18n/LocaleProvider.tsx`
- Create: `web-asset-editor/src/components/i18n/LocaleSwitcher.tsx`
- Modify: `web-asset-editor/src/app/layout.tsx`
- Modify: `web-asset-editor/src/components/layout/Header.tsx`
- Modify: `web-asset-editor/src/components/layout/Footer.tsx`
- Test: `web-asset-editor/tests/unit/i18n.test.ts`

**Interfaces:**
- `LocaleProvider({ initialLocale, children })` exposes `locale`, `dictionary`, and `setLocale(locale)` through `useLocale()`.
- `LocaleSwitcher` renders accessible `ID` and `EN` controls and calls `setLocale`.

- [ ] **Step 1: Extend tests for cookie persistence and locale switching contract**

Assert that only `id` and `en` are accepted and that switching writes `locale=en` or `locale=id` with a safe path.

- [ ] **Step 2: Implement `LocaleProvider` with immediate state update and cookie persistence**

Use `document.cookie = \`locale=${next}; path=/; max-age=31536000; samesite=lax\`` and `router.refresh()` after the local state changes so server-rendered Footer/legal content updates too.

- [ ] **Step 3: Make `layout.tsx` read the locale cookie and set `<html lang>`**

Use `cookies()` in the server layout, resolve the locale with `getLocaleFromCookieValue`, and pass `initialLocale` into `LocaleProvider`. Pass the selected dictionary to server `Footer` rather than importing client context into a server component.

- [ ] **Step 4: Replace the planned language placeholder in Header with `LocaleSwitcher`**

Place it between search and profile/login on desktop, and keep it compact beside the mobile menu button. Give the active locale a visible warm state and ensure both controls have focus styles and accessible labels.

- [ ] **Step 5: Translate Footer using its dictionary prop**

Keep existing route targets `/terms` and `/privacy`; only replace visible copy.

- [ ] **Step 6: Run focused tests, lint, and typecheck**

Run: `npx vitest run tests/unit/i18n.test.ts`, `npm run lint`, `npx tsc --noEmit`.

Expected: all pass; existing `<img>` warnings may remain, but no new warnings/errors.

### Task 3: Localize Home, Explore, and shared asset components

**Files:**
- Modify: `web-asset-editor/src/app/page.tsx`
- Modify: `web-asset-editor/src/app/explore/page.tsx`
- Modify: `web-asset-editor/src/components/layout/HeroSection.tsx`
- Modify: `web-asset-editor/src/components/layout/ScrollVelocityText.tsx`
- Modify: `web-asset-editor/src/components/categories/CategoryNav.tsx`
- Modify: `web-asset-editor/src/components/assets/SortTabs.tsx`
- Modify: `web-asset-editor/src/components/assets/AssetCard.tsx`
- Modify: `web-asset-editor/src/components/assets/AssetGrid.tsx`
- Modify: `web-asset-editor/src/components/assets/FeaturedCard.tsx`
- Modify: `web-asset-editor/src/components/FavoriteButton.tsx`

**Interfaces:**
- Client components call `useLocale()` for fixed copy and `formatMessage` for count-based messages.
- Existing dynamic titles, category names, tags, counts, filters, API calls, motion props, and link destinations remain unchanged.

- [ ] **Step 1: Replace Home fixed copy with dictionary keys**

Translate hero labels, marquee strings, `Asset Terbaru`, retry error, and CTA while preserving cinematic motion and count-up behavior.

- [ ] **Step 2: Replace Explore fixed copy with dictionary keys**

Translate the title, clear button, type buttons, sorting options, loading count, pagination, and suspense fallback. Keep query keys (`q`, `type`, `sort`, `page`) unchanged.

- [ ] **Step 3: Translate shared component labels and accessibility strings**

Cover category `All`/`Explore`, sort tab `aria-label`, asset type labels, `Tanpa kategori`, tooltip titles, empty state, featured error, favorite titles/alert, and all retry labels.

- [ ] **Step 4: Use `Intl.NumberFormat(locale)` for visible counts where the surrounding copy is translated**

Do not change raw data values; only format their presentation.

- [ ] **Step 5: Run Home/Explore interaction checks**

Verify locale switching does not reset category, sort, search, or current route unexpectedly, and that all existing cinematic/reveal motion still runs.

### Task 4: Localize asset detail, favorites, and authentication

**Files:**
- Modify: `web-asset-editor/src/app/assets/[id]/page.tsx`
- Modify: `web-asset-editor/src/app/favorites/page.tsx`
- Modify: `web-asset-editor/src/app/login/page.tsx`
- Modify: `web-asset-editor/src/app/signup/page.tsx`

**Interfaces:**
- Preserve all API behavior, download flow, preview refresh, auth redirects, and form validation.
- Translate known UI and error codes; use localized fallback messages for unknown API errors.

- [ ] **Step 1: Add dictionary keys for detail/download/preview states**

Cover not found, back navigation, preview expiry, refresh, no preview, views, downloads, generating, download, and rate-limit copy.

- [ ] **Step 2: Localize the favorites page**

Translate title, loading, empty state, helper copy, and explore CTA.

- [ ] **Step 3: Localize login and signup forms**

Translate labels, placeholders, submit states, account links, network fallback, and validation/API error presentation.

- [ ] **Step 4: Verify locale switching during auth and download flows**

Ensure changing language does not lose form values, loading state, or download state unexpectedly.

### Task 5: Localize admin surfaces

**Files:**
- Modify: `web-asset-editor/src/app/admin/page.tsx`
- Modify: `web-asset-editor/src/components/admin/StatsCards.tsx`
- Modify: `web-asset-editor/src/components/admin/CategoryManager.tsx`
- Modify: `web-asset-editor/src/components/admin/AdminAssetTable.tsx`

**Interfaces:**
- Preserve admin authorization, upload, R2 operations, category CRUD, publish toggles, featured toggles, confirmation dialogs, and retry behavior.
- Translate user-visible success/error messages at the UI boundary.

- [ ] **Step 1: Add all admin labels, actions, statuses, empty states, and errors to both dictionaries**

Include upload form, category manager, stats cards, table, status labels, confirm messages, and R2/thumbnail outcomes.

- [ ] **Step 2: Replace hard-coded admin copy with `useLocale()` translations**

Use interpolation for asset/category names and counts; keep names supplied by the admin unchanged.

- [ ] **Step 3: Normalize API error handling where raw English/Indonesian strings are currently displayed**

Map known errors to dictionary keys and use a localized generic fallback for unknown failures.

- [ ] **Step 4: Verify admin actions in both locales**

Test upload success/failure, category create/edit/delete, publish/unpublish, featured toggle, and empty/filter states.

### Task 6: Localize legal pages and metadata

**Files:**
- Modify: `web-asset-editor/src/app/terms/page.tsx`
- Modify: `web-asset-editor/src/app/privacy/page.tsx`
- Modify: `web-asset-editor/src/components/layout/LegalPage.tsx`
- Modify: `web-asset-editor/src/app/layout.tsx`

**Interfaces:**
- Legal pages remain server-rendered and use the server-resolved locale/dictionary.
- Preserve the existing seven-section structure and factual/legal meaning.

- [ ] **Step 1: Move Indonesian legal content into typed dictionary data and add faithful English translations**

Keep headings, paragraphs, lists, provider names, dates, and contact details as structured data; do not shorten or invent legal claims.

- [ ] **Step 2: Translate `Terakhir diperbarui` and page metadata**

Use locale-specific title/description and set `<html lang>` from the same resolved locale.

- [ ] **Step 3: Verify `/terms` and `/privacy` in both locales**

Check HTTP 200, no horizontal overflow, no hydration mismatch, and full text visibility.

### Task 7: Normalize known API error codes

**Files:**
- Modify: `web-asset-editor/src/lib/api-response.ts`
- Modify: `web-asset-editor/src/app/api/auth/login/route.ts`
- Modify: `web-asset-editor/src/app/api/auth/signup/route.ts`
- Modify: `web-asset-editor/src/app/api/assets/route.ts`
- Modify: `web-asset-editor/src/app/api/assets/[id]/route.ts`
- Modify: `web-asset-editor/src/app/api/assets/[id]/download/route.ts`
- Modify: `web-asset-editor/src/app/api/categories/route.ts`
- Modify: `web-asset-editor/src/app/api/categories/[id]/route.ts`
- Modify: client consumers listed in Tasks 3-5
- Test: `web-asset-editor/tests/unit/i18n.test.ts` or a focused API error test file

**Interfaces:**
- API responses expose stable machine-readable codes plus optional interpolation params, while retaining HTTP status codes.
- Client translation layer maps codes to locale-specific messages.

- [ ] **Step 1: Add failing tests for representative error codes**

Cover required auth fields, invalid credentials, duplicate account, asset not found, rate limiting, and generic failure.

- [ ] **Step 2: Return codes instead of mixed-language display strings from APIs**

Keep server logs detailed, but keep client payloads stable and safe.

- [ ] **Step 3: Translate codes at the UI boundary**

Use dictionary interpolation for messages containing asset/category names or retry durations.

- [ ] **Step 4: Run focused API tests and all existing tests**

Expected: existing response shape consumers remain compatible except for the documented `error.code` addition.

### Task 8: Full verification and locale audit

**Files:**
- Modify only files required by verification findings.
- Test: `web-asset-editor/tests/unit/i18n.test.ts`, existing test suite, Playwright checks.

- [ ] **Step 1: Run formatting/static checks**

Run: `npm run lint`

Expected: 0 errors; only pre-existing `<img>` warnings may remain.

- [ ] **Step 2: Run typecheck, unit tests, and production build**

Run: `npx tsc --noEmit`, `npm run test`, `npm run build`.

Expected: all pass.

- [ ] **Step 3: Run browser checks at 390px and 1440px**

Verify language switcher placement, navbar layout, mobile menu, locale persistence after refresh, all routes, no overflow, and preserved Home/Explore motion.

- [ ] **Step 4: Run reduced-motion checks**

Verify content is immediately visible and no scroll/entrance transforms run under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Run Impeccable detector once on changed UI targets**

Run: `node C:\Users\LENOVO\.config\opencode\skills\impeccable\scripts\detect.mjs --json <changed UI files>`

Expected: no new detector findings.

- [ ] **Step 6: Manually audit for untranslated static copy**

Search changed UI sources for the known English/Indonesian strings from the inventory and confirm every remaining visible string is either translated, dynamic data, a proper name, or an intentional technical value.
