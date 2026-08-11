# Mobile Hero Featured Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing featured asset card below the homepage Explore CTA on mobile while preserving the desktop two-column hero.

**Architecture:** Pass the existing `heroNode` into both responsive hero slots: the current right column for `lg` and above, and a new full-width mobile slot after the narrative content below `lg`. Reuse `FeaturedCard` and its existing loading/error/data behavior without API changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion.

## Global Constraints

- Mobile HS1 order: title, description, stats, Explore CTA, featured asset card.
- Featured card continues to use `useFeatured` and `FeaturedCard`.
- At `lg` and above, preserve the existing two-column hero.
- Do not change featured asset selection, API behavior, copy, or interaction behavior.
- Preserve loading, retry, link, alt text, and reduced-motion behavior.

---

### Task 1: Add Mobile Featured Card Slot

**Files:**
- Modify: `src/components/layout/HeroSection.tsx`

**Interfaces:**
- Consumes the existing optional `heroNode?: ReactNode` prop.
- Produces the same hero node in a mobile-only slot after the narrative and a desktop-only slot in the existing right column.

- [ ] Add a mobile-only wrapper immediately after the narrative content with `lg:hidden`, full width, and compact top spacing.
- [ ] Keep the existing right-column wrapper desktop-only with `hidden lg:block`.
- [ ] Preserve the existing `heroNode` element identity and do not modify `FeaturedCard` props.
- [ ] Ensure the mobile slot appears after the CTA in the rendered DOM order.
- [ ] Run `npm run lint` and `npm run build` to verify the responsive slot compiles cleanly.

### Task 2: Responsive Smoke Verification

**Files:**
- Inspect: `src/components/layout/HeroSection.tsx`
- Inspect: `src/app/page.tsx`

- [ ] Start the local dev server and render `/` at 320px, 390px, 640px, and 768px.
- [ ] Confirm the featured card appears after the Explore CTA at each mobile width when API data is available.
- [ ] Render `/` at 1024px and confirm only the desktop right-column featured card is visible.
- [ ] Confirm `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` at all tested widths.
- [ ] Run `npm test` and the Impeccable detector on the changed hero file.
- [ ] Review `git diff --check` and confirm only the approved hero implementation and documentation files changed.
