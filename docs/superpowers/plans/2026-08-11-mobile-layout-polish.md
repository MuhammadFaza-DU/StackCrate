# Mobile Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the homepage, explore catalog, asset detail, login, and signup layouts from 320px through 768px without changing desktop presentation above 768px.

**Architecture:** Apply scoped responsive utility classes in the existing components. Keep mobile controls inside horizontal overflow wrappers, use the existing `sm` breakpoint for the 640px grid change, and preserve all existing data and interaction behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Vitest, Playwright.

## Global Constraints

- Target viewport range: 320px through 768px.
- Existing desktop styling and behavior remain unchanged.
- Homepage hero keeps the featured card hidden on mobile.
- Homepage loop text becomes compact on mobile at approximately 18-20px with shorter vertical padding.
- Asset grid uses one column from 320px through 639px and two columns from 640px through 768px.
- Category and sort controls use horizontal scrolling on mobile without causing body-level horizontal overflow.
- Asset detail remains one column and makes the primary download action prominent on mobile.
- Login and signup use balanced mobile spacing with full-width primary actions.
- No changes to authentication, asset fetching, filtering behavior, download behavior, admin pages, or unrelated pages.

---

### Task 1: Compact Homepage Hero and Loop

**Files:**
- Modify: `src/components/layout/HeroSection.tsx`
- Modify: `src/components/layout/ScrollVelocityText.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes existing `HeroSection`, `ScrollVelocityText`, and homepage props without API changes.
- Produces mobile-only spacing and type changes while preserving `lg` desktop rules.

- [ ] Add mobile-first sizing to the hero title and content spacing while keeping the current `sm`, `md`, and `lg` desktop progression intact.
- [ ] Keep `heroNode` hidden below `lg` as it is today.
- [ ] Change the loop wrapper to use shorter mobile vertical padding and set the loop span to `text-lg` or equivalent 18-20px mobile sizing, with the existing larger size retained at `md`.
- [ ] Reduce homepage mobile section padding only where it is currently excessive, without changing desktop spacing.
- [ ] Run the homepage-related unit tests and inspect the diff for accidental non-mobile class changes.

### Task 2: Responsive Asset Grid and Horizontal Catalog Controls

**Files:**
- Modify: `src/components/assets/AssetGrid.tsx`
- Modify: `src/components/categories/CategoryNav.tsx`
- Modify: `src/components/assets/SortTabs.tsx`
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Keeps `AssetGrid`, `CategoryNav`, and `SortTabs` props unchanged.
- Produces one-column assets below `sm` and two-column assets from `sm` through below `lg`.

- [ ] Update asset grids from the current `grid-cols-1 sm:grid-cols-2` behavior only if needed to make the 640-768px two-column range explicit and preserve existing desktop columns.
- [ ] Wrap category navigation in a mobile horizontal scroller using `min-w-0`, `overflow-x-auto`, and a non-wrapping inner row; retain the current wrapped desktop layout at `sm` and above.
- [ ] Apply the same mobile scrolling treatment to sort tabs where they are rendered, without introducing page-level horizontal overflow.
- [ ] Keep category and sort controls keyboard reachable and preserve visible focus styles.
- [ ] Run category, sort, and asset-grid unit tests.

### Task 3: Balanced Mobile Asset Detail

**Files:**
- Modify: `src/app/assets/[id]/page.tsx`

**Interfaces:**
- Keeps the existing asset loading, preview, favorite, download, and error behavior.
- Produces a one-column mobile detail layout with wrapping actions and contained media controls.

- [ ] Reduce mobile page vertical padding while preserving the existing desktop `md`/`lg` spacing.
- [ ] Make the title and favorite action row wrap safely at narrow widths, with the favorite control remaining reachable.
- [ ] Ensure metadata and tags wrap without forcing horizontal overflow.
- [ ] Make the download button full-width below the mobile breakpoint and retain the existing natural width at larger viewports.
- [ ] Constrain the audio control row so time, volume, and range controls can wrap or stack within 320px.
- [ ] Preserve loading, not-found, generic-error, expired-preview, and download states.

### Task 4: Balanced Mobile Login and Signup

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`

**Interfaces:**
- Keeps existing form state, validation, API calls, localization, and error handling.
- Produces compact mobile card spacing and full-width primary actions without changing desktop layout.

- [ ] Reduce mobile page top/bottom padding while retaining the existing desktop `md` spacing.
- [ ] Keep form labels, inputs, password controls, errors, and links readable at 320px.
- [ ] Keep the primary buttons full-width on mobile and preserve existing behavior at all widths.
- [ ] Confirm the signup-specific email placeholder remains unchanged by responsive edits.

### Task 5: Responsive Verification and Final Audit

**Files:**
- Test: existing unit and E2E test suites
- Inspect: changed UI files from Tasks 1-4

- [ ] Run `npm test` and confirm all unit tests pass.
- [ ] Run `npm run lint` and record any pre-existing warnings separately from new errors.
- [ ] Run `npm run build` and confirm TypeScript and production compilation pass.
- [ ] Run the Playwright suite at the configured baseline, then add no new test unless a reproducible regression requires one.
- [ ] Check `/`, `/explore`, `/assets/[id]` with available data, `/login`, and `/signup` at 320px, 390px, 640px, and 768px.
- [ ] Confirm `document.documentElement.scrollWidth <= window.innerWidth` at each mobile viewport and verify a representative desktop viewport above 768px.
- [ ] Run the Impeccable detector once on the changed UI files:

```text
node C:\Users\LENOVO\.config\opencode\skills\impeccable\scripts\detect.mjs --json src/app/page.tsx src/app/explore/page.tsx src/app/assets/[id]/page.tsx src/app/login/page.tsx src/app/signup/page.tsx src/components/layout/HeroSection.tsx src/components/layout/ScrollVelocityText.tsx src/components/assets/AssetGrid.tsx src/components/categories/CategoryNav.tsx src/components/assets/SortTabs.tsx
```

- [ ] Review the final diff and confirm no files outside the approved mobile scope were modified.
