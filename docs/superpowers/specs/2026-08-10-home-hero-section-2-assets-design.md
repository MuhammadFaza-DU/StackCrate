# Home Hero Section 2 Asset Preview

## Goal

Update the homepage's HS2 asset preview to show up to 12 assets and provide a localized link to the full Explore page when the preview is full.

## Behavior

- Request up to 12 assets instead of 10.
- Display every returned asset when fewer than 12 match the active category and sort.
- Display the centered small `View All`/`Lihat Semua` button when 12 or more assets are returned.
- Navigate the button to `/explore` without carrying the homepage category or sort state; Explore uses its default filters.
- Keep the existing `CategoryNav` and `SortTabs` controls and their current behavior.
- Keep the current asset grid, loading state, and error state unchanged.

## Localization

- English label: `View All`.
- Indonesian label: `Lihat Semua`.
- The label is read from the active locale dictionary.

## Implementation

- Change the homepage request limit constant from `10` to `12`.
- Render a small centered `Link` to `/explore` after `AssetGrid` only when `assets.length >= 12`.
- Do not change API behavior or add a new endpoint.

## Responsive and Accessibility

- Use the existing button/link visual language.
- Keep the link keyboard accessible and expose a clear text label.
- Center the link at all viewport sizes without changing the responsive asset grid.

## Verification

- Typecheck and lint pass.
- Unit tests pass.
- Build passes.
- Verify fewer than 12 assets show no link.
- Verify 12 or more assets show the localized link.
- Verify the link opens `/explore` with default filters.
