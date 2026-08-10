# HS2 Catalog Polish Design

## Goal

Make the Home page's HS2 asset catalog feel curated, playful, and premium without changing its product behavior. Preserve category filtering, sorting, asset links, favorites, loading, empty, and error states.

## Direction

Treat HS2 as a curated catalog rather than a generic dashboard grid:

- Editorial hierarchy: the section title leads, while `Lihat Semua` remains a quiet secondary action.
- Controlled playfulness: StackCrate orange is reserved for active states and focused interaction details.
- Premium restraint: thumbnails lead, metadata recedes, and repeated rounded UI elements are reduced.
- Design dials: `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 4`.

## Component Changes

### `src/app/page.tsx`

- Keep the existing category, asset, stats, sort, loading, error, and retry state flows.
- Recompose HS2 spacing into a clear section header, filter toolbar, and asset result area.
- Keep `#assets` anchor and `/explore` destination unchanged.

### `CategoryNav.tsx`

- Keep both selectable Home mode and navigational Explore mode.
- On Home, render a restrained horizontal filter rail rather than a dominant row of pills.
- Preserve active category selection, category links, Explore action, keyboard focus, and mobile access via horizontal scrolling.

### `SortTabs.tsx`

- Preserve the tablist semantics, labels, selected value, and callback behavior.
- Refine it into a compact segmented control that visually supports, rather than competes with, category filters.

### `AssetGrid.tsx`

- Preserve asset ordering and empty-state behavior.
- Use an editorial lead-asset composition on wide screens while keeping a safe single-column mobile fallback.
- Do not create fake assets or empty grid cells when fewer items are returned.

### `AssetCard.tsx`

- Make the thumbnail the visual anchor and simplify the metadata hierarchy.
- Preserve asset detail links, category links, favorite control, duration, type, preview affordance, image fallback, and motion behavior.
- Keep visible focus states and touch targets accessible.

## Responsive Behavior

- Wide desktop: editorial lead asset plus regular grid rhythm; controls share one aligned toolbar.
- Tablet: collapse the lead composition into a regular two-column grid if needed for stable sizing.
- Mobile: one-column asset list; filter and sort controls scroll horizontally rather than wrap into noisy rows.
- Verify 390px, 768px, and 1440px viewports.

## State and Accessibility Requirements

- Loading skeletons match the final card geometry.
- Error state keeps `Coba lagi` and its existing retry behavior.
- Empty state remains informative and visually aligned with HS2.
- Preserve semantic tab roles, link destinations, button labels, focus rings, contrast, reduced-motion behavior, and image alt text.

## Verification

- Run `npm run lint`, `npx tsc --noEmit`, `npm run test`, and `npm run build`.
- Run the Impeccable detector once on changed UI files.
- Inspect rendered desktop, tablet, and mobile states, including filter selection and sorting interactions.
- Check that no horizontal overflow or accidental layout shift is introduced.
