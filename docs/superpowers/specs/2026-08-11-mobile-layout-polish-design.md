# Mobile Layout Polish Design

## Goal

Improve the mobile and small-tablet presentation of the homepage, explore catalog, asset detail, login, and signup surfaces without changing the desktop presentation above 768px.

## Scope

- Target viewport range: 320px through 768px.
- Homepage hero keeps the featured card hidden on mobile.
- Homepage loop text becomes compact on mobile at approximately 18-20px with shorter vertical padding.
- Asset grid uses one column from 320px through 639px and two columns from 640px through 768px.
- Category and sort controls use horizontal scrolling on mobile without causing body-level horizontal overflow.
- Asset detail remains one column, wraps long metadata safely, keeps the primary download action prominent, and prevents audio controls from overflowing.
- Login and signup use balanced mobile spacing with full-width primary actions.
- Existing desktop styling and behavior remain unchanged.

## Non-Goals

- No redesign of the visual identity, color palette, typography system, or desktop layout.
- No changes to authentication, asset fetching, filtering behavior, or download behavior.
- No changes to admin pages or unrelated legal/public pages.

## Implementation Direction

Use responsive utility classes and small component-level adjustments in the existing components rather than global mobile overrides. The primary files are `HeroSection`, `ScrollVelocityText`, `AssetGrid`, `CategoryNav`, `SortTabs`, the asset detail page, and the login/signup pages. Mobile-only classes will be applied below existing desktop breakpoints so desktop rules remain the source of truth above 768px.

Category and sort controls will be placed in horizontally scrollable wrappers with hidden scrollbars where appropriate. The wrappers must use `min-w-0`, `overflow-x-auto`, and prevent wrapping inside the control row so the document itself does not gain horizontal overflow.

The detail page will keep the media player responsive, make the title/action row wrap at narrow widths, and make the download button full-width only on mobile. Auth cards will reduce vertical padding on mobile while retaining the existing maximum width and desktop spacing.

## States and Accessibility

- Preserve existing loading, empty, error, and authenticated states.
- Maintain visible focus states and keyboard operation for scrollable controls.
- Keep touch targets at or above the existing project target sizing.
- Ensure text remains readable against existing theme colors in both dark and light mode.
- Respect the existing reduced-motion behavior.

## Verification

- Run responsive checks at 320px, 390px, 640px, and 768px for `/`, `/explore`, `/assets/[id]` with available data, `/login`, and `/signup`.
- Confirm no horizontal page overflow at any target width.
- Confirm desktop layout remains unchanged at a representative width above 768px.
- Run focused and full unit tests, lint, production build, and the Impeccable detector on changed UI files.
