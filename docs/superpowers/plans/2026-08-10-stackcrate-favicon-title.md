# StackCrate Favicon and Browser Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the browser tab title exactly `StackCrate` and provide a warm-playful editor-themed favicon.

**Architecture:** Keep browser metadata in the existing root `generateMetadata` function. Add one static SVG under `public/` and reference it from both Next metadata and the generated PWA manifest.

**Tech Stack:** Next.js 16 Metadata API, TypeScript, SVG, Vitest.

## Global Constraints

- Browser title must be exactly `StackCrate`.
- Favicon direction must use a timeline plus play button motif.
- Visual direction must be warm playful with the existing orange/yellow palette.
- No new dependencies.

---

### Task 1: Update Browser Metadata and Favicon

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `public/favicon.svg`
- Modify: `src/lib/pwa-manifest.ts`
- Test: `tests/unit/manifest.test.ts`

- [x] Set the global browser metadata title to `StackCrate`.
- [x] Register `/favicon.svg` as the browser icon and shortcut icon.
- [x] Create a small, self-contained SVG using a timeline, play button, and warm orange/yellow colors.
- [x] Reference the same SVG from the PWA manifest.
- [x] Add a manifest regression assertion for the icon metadata.
- [ ] Run focused tests, lint, and production build.

### Verification

Run:

```text
npm test -- tests/unit/manifest.test.ts
npm run lint
npm run build
```

Expected: all commands pass, and the generated browser metadata points to the exact title `StackCrate` and `/favicon.svg`.
