# Mobile Hero Featured Card Design

## Goal

Show the existing featured asset card in the homepage hero on mobile so HS1 has a useful visual feature instead of unused space, while preserving the same data and behavior used on desktop.

## User-Approved Layout

On mobile, HS1 will render in this order:

1. Hero title
2. Hero description
3. Stats row
4. Explore CTA
5. Featured asset card

The featured card remains the existing `FeaturedCard` component. It continues to load the featured asset through `useFeatured`, display image/video preview, show category and title, link to the asset detail page, and expose its existing loading and error states.

## Responsive Behavior

- Below `lg`, the hero becomes a single-column layout.
- The featured card is visible below the narrative content on mobile and tablet widths.
- At `lg` and above, the existing two-column layout remains unchanged.
- The mobile card uses the existing responsive `aspect-video` media area and compact spacing so it supports the hero without dominating the first viewport.
- No new API, asset type, copy, or interaction is introduced.

## Accessibility and States

- Preserve the existing card link and accessible asset alt text.
- Preserve loading skeleton and retry state from `FeaturedCard`.
- Keep the card usable with touch and keyboard input.
- Preserve reduced-motion behavior already used by the featured card and hero.

## Non-Goals

- Do not replace the featured card with a new feature section.
- Do not change desktop layout or desktop card behavior.
- Do not change featured asset selection or API behavior.

## Verification

- Render `/` at mobile widths 320px, 390px, 640px, and 768px and confirm the featured card appears after the Explore CTA.
- Render `/` at a desktop width of at least 1024px and confirm the two-column layout remains intact.
- Confirm no horizontal overflow and that the card link still navigates to `/assets/[id]` when fixture data is available.
- Run unit tests, lint, production build, and the Impeccable detector on the changed hero files.
