# Planner Layout

The app uses Tailwind CSS 4 and locally bundled Lucide React icons. This migration
changes layout ownership, not dependency versions or financial calculations.

## Shared Components

Use `components/ui/planner-layout.tsx` for screen layout:

| Component | Responsibility |
| --- | --- |
| `PageContent` | Page width, outer padding and the named page-width container |
| `Stack` | Vertical section spacing and bounded children |
| `PlannerCard` | Card surface, padding, rounding and a local width container |
| `FormGrid` | One column in narrow cards, two once the enclosing container reaches 30rem; `single` stays one column |
| `ColumnGrid` | Two/three panel columns once actual page content reaches 48rem/60rem |
| `ActionRow` | Wrapping actions, consistent gaps and 44px minimum button height |

Cards use 12px padding below 768px, 16px from 768px and 20px from 1280px.
Stacks use 12px gaps below 768px and 16px above. Parent stacks own separation;
their direct children have block margins reset to avoid adding a margin to a gap.
The scoped important margin utility bridges older feature-specific styles.

Keep descriptive class names for chart styling, budget rows, validation and browser
selectors. Do not reintroduce card padding or shared form-column overrides there.
Nested enrollment and detail cards establish their own width containers so fields
do not inherit the width of a distant, larger panel. The short coverage-year/month
picker intentionally retains two columns.

Specialized charts, responsive data-entry tables and PDF reports retain dedicated
styles. This is a shared-layout migration, not a conversion of every decorative
CSS rule. Print reports do not depend on screen container measurements.

## Verification and Rollback

Run `npm test`, `npx tsc --noEmit`, and `npm run build:pages`.
The Pages workflow runs `scripts/browser-check.cjs` in Chromium and WebKit at
320, 375, 390, 430, 768 and 1280px. It checks the synthetic user journey, blank
onboarding, dialogs, PDF content, visible containment, card padding and actual
page-section gaps. Inspect its synthetic screenshots as well; geometry checks
cannot establish complete visual polish.

The published tag **`pre-tailwind-layout-2026-09-12`** points to
`63e3f825fac0599ec32ded6ec3b43788a51d2a3d`: the requested Tree Palm, Piggy Bank and
Flask Conical menu icons with the pre-migration layout. The checkpoint workflow
never moves an existing tag. To undo the migration, revert its commit onto current
main and run Pages validation again; do not force-reset main or discard later work.
