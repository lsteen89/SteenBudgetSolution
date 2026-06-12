# Dashboard V2 Handover: Implementor PR Plan

Date: 2026-06-11

## Objective

Make the real open-month dashboard match the standalone blueprint:

- `/Users/linussteen/Downloads/eBudget Dashboard (standalone).html`
- default blueprint state: `spine`, `surplus`, `flow`, `preview`, `row`, `deltas`

This is a visual-alignment pass with strict product guardrails. Do not add new financial behavior unless a PR below explicitly says so.

## Non-Negotiables

- Do not compute next-month financial totals in the frontend.
- Do not call `/api/budgets/dashboard?yearMonth={next}` for unopened next-month preview.
- Do not materialize or insert `BudgetMonth` rows for read-only preview.
- Do not expose next-month editing from current dashboard quick drawers.
- Do not add arbitrary future-month routing.
- Do not redesign nav, menu, account, or global shell.
- Do not use transaction, spend, burn-rate, banking, or AI-advice language.
- Do not introduce a new color, typography, icon, or design system.
- Preserve closed/skipped read-only protection.
- Preserve current month as the primary dashboard answer.

## PR 1: Dashboard Blueprint Primitives

Purpose: create the small dashboard-local visual vocabulary needed by the later PRs.

Implementation scope:

- Normalize or add dashboard-local primitives under `Frontend/src/components/organisms/dashboard/returning/openMonth/`.
- Target blueprint grammar:
  - `DashboardSurface`: 24px radius, `eb-surface/90`, `eb-stroke/40`, `shadow-eb`, optional top sheen.
  - `ModelCard`: 18px radius, compact `14px 15px` rhythm, neutral/accent variants.
  - compact `DashboardPill` and small ghost/quiet button styles.
- Reuse existing `eb-*`, shadcn, and Tailwind token classes. No raw parallel palette.
- Do not change dashboard behavior yet.

Likely files:

- `dashboardSurface.ts`
- possibly new `DashboardPrimitives.tsx`

Testing:

- Typecheck/build for touched frontend files.
- No snapshot-only tests unless they protect semantic states.

Acceptance:

- Later PRs can consume the primitives without copying one-off class strings everywhere.
- No visible dashboard behavior should change except harmless class normalization if existing components import the primitive.

## PR 2: MoneyState And Allocation Flow

Purpose: make the dashboard hero match the blueprint and keep financial math honest.

Implementation scope:

- Update `MoneyState.tsx`.
- Kicker becomes `Open month · {date range}` style.
- Keep backend remaining as the rendered source of truth.
- Keep reconciliation diagnostic logic, but remove the default visible equation row.
- Move `Breakdown ->` into the allocation header as a small ghost action.
- Remove the large footer CTA and explanatory footer hint.
- Update copy/i18n to blueprint rhythm.
- Update `AllocationBar.tsx` or add a dashboard-specific Flow adapter:
  - 16px-ish height.
  - explicit gaps between segments.
  - small rectangular radii, not one rounded pill.
  - palette: expenses navy, savings blue, debts amber/warning, free green.
  - deficit marker is a thin danger line where money runs out.

Likely files:

- `MoneyState.tsx`
- `MoneyState.i18n.ts`
- `AllocationBar.tsx`
- `MoneyState.test.tsx`
- allocation bar tests if separate

Testing:

- MoneyState renders backend remaining, not computed remaining.
- Reconciliation warning path still works.
- Visible equation row is absent in default MoneyState.
- `Breakdown` link still routes to the real breakdown route.
- Allocation bar tests for:
  - surplus segments
  - zero segments hidden safely
  - deficit marker present
  - no pill-style single-track assumptions in test IDs/classes

Acceptance:

- No large `See the full breakdown` CTA remains in MoneyState.
- Flow bar no longer reads as a generic progress pill.
- No money math source changes.

## PR 3: Planning Row Plus Dashboard Preview Detail

Purpose: complete the missing next-month dashboard layer from the blueprint.

Implementation scope:

- Keep three planning cards: `This month`, `Next month`, `Budget plan`.
- Keep the next-month amount gated behind `NextMonthPreviewDto`.
- Add `NextMonthPreviewDetail` directly under `PlanningRow` when valid preview data exists.
- Implement only production style `deltas`; do not expose a compare toggle.
- Detail surface includes:
  - `Next month preview` kicker
  - preview pill
  - preview period label
  - projected remaining from backend preview dashboard
  - delta chips derived only from current dashboard + preview dashboard fields
  - carry-over assumption copy using `preview.carryOver.amount`
  - `How next month differs` disclosure only with honest backend-backed or safely derived values
  - small `Open full preview` ghost action
- If preview is unavailable or empty, do not fabricate numbers.
- Do not implement prototype-only fake reasons like "Freelance isn't part of your budget plan" unless the DTO supports that evidence.
- Do not add an `Edit budget plan` action unless a real route exists and product explicitly wants it.

Likely files:

- `PlanningRow.tsx`
- new `NextMonthPreviewDetail.tsx`
- `PlanningRow.i18n.ts` or new detail i18n file
- `PlanningRow.test.tsx`
- `ReturningDashboardSection.tsx`
- `nextMonthPreview.ts` only if a pure selector/helper is needed

Testing:

- Preview detail renders for `state: "preview"` with non-empty `dashboard`.
- Preview detail does not render fake numbers for `state: "unavailable"`, `dashboard: null`, or empty plan.
- Delta chips are derived from provided DTO/current dashboard only.
- Carry-over line uses `preview.carryOver.amount`.
- `Open full preview` routes to `/dashboard/next-month`.
- Mock API tests confirm the dashboard still calls `/next-preview`, not `/dashboard?yearMonth={next}`.

Acceptance:

- Planning row no longer feels like an isolated three-card teaser.
- Dashboard has the standalone preview detail surface when preview exists.

## PR 4: Standalone Insight/Action Cards

Purpose: replace the broad explanatory attention system with compact blueprint cards.

Implementation scope:

- Replace the main open-month dashboard usage of `AttentionLane`.
- Build `StandaloneInsightActionCards` or reshape `AttentionLane` behind a new compact variant.
- Render max three cards under the next-month preview detail and after `CloseBand` only if the final order still matches the accepted blueprint flow.
- Keep actions mapped to existing supported actions only:
  - close month
  - current-month quick drawer
  - full current-month editor
  - breakdown page
- Remove the large `Värt en snabb koll` / `Uppmärksamhet` explanatory framing from the main dashboard.
- Remove default collapsible "How these are chosen" from the main dashboard cards.
- Keep frontend-ranking copy honest. Do not present it as backend-owned advice.

Likely files:

- new `StandaloneInsightActionCards.tsx`
- `AttentionLane.tsx` if reused or retained elsewhere
- `attentionRanking.ts` only if shape changes are needed
- relevant i18n files
- `ReturningDashboardSection.tsx`

Testing:

- Max three cards render.
- Deficit, eligible/overdue close, and normal surplus states produce expected card order.
- Each card action routes/calls the existing supported handler.
- No card action targets a future/planned month from the current dashboard.
- Main dashboard no longer renders the old explanatory section labels.

Acceptance:

- The area reads like compact action cards, not a dashboard help system.

## PR 5: MonthRail Visual Alignment

Purpose: make the rail match the compact horizon-line blueprint while preserving behavior.

Implementation scope:

- Reduce outer card chrome.
- Keep previous/next as compact icon buttons.
- Current label and status remain inline/compact.
- Archive remains accessible.
- Close readiness remains visible but quiet.
- Preview-next button uses a chevron as the primary icon, with a small sparkle/status marker.
- Persisted next remains normal.
- Unsupported next remains dimmed/locked.

Likely files:

- `MonthRail.tsx`
- `MonthRail.test.tsx`
- possibly dashboard shell i18n if copy changes

Testing:

- Previous/next click handlers still fire when enabled.
- Preview next routes through the existing preview behavior.
- Preview next renders chevron plus marker, not Sparkles-only.
- Disabled next cannot fire.
- Archive and close action remain accessible.
- Closed/skipped states still do not expose edit affordances.

Acceptance:

- MonthRail no longer competes visually with MoneyState.
- Navigation semantics are unchanged.

## PR 6: Lower Workbench Surface Alignment

Purpose: avoid leaving the lower dashboard in a different visual system.

Implementation scope:

- Keep `OpenMonthPillarWorkbench` behavior.
- Align card shells, header rhythm, row spacing, footer buttons, and mini bars with blueprint grammar.
- Keep quick adjust current-month-only.
- Do not add editor endpoint fetches on dashboard load.
- Do not broaden pillar functionality.

Likely files:

- `OpenMonthPillarWorkbench.tsx`
- `PillarWorkbenchCard.tsx`
- `PillarRows.tsx`
- relevant tests/i18n only if copy changes

Testing:

- Existing workbench tests still pass.
- Quick adjust handlers remain wired to current-month drawers.
- Full editor handlers remain unchanged.
- No new data fetching hooks are introduced.

Acceptance:

- Workbench looks subordinate and consistent, not like a second dashboard design.

## PR 7: Integrated Visual Verification And Hardening

Purpose: prove the full page works across states after the visual slices land.

Implementation scope:

- No broad refactor.
- Fix only defects found by focused browser/test verification.
- Update docs/changelog for the final V2 state.

Testing:

- Frontend unit/component tests for all changed components.
- `npm run build`.
- Browser verification with desktop and mobile dashboard states:
  - normal surplus/open
  - deficit
  - preview unavailable
  - close eligible/overdue
  - closed/skipped branch still protected
- Explicit code search:
  - no `/api/budgets/dashboard?yearMonth=` preview path
  - no frontend-only next-month total calculation
  - no current-dashboard future-month quick edit
  - no global shell/nav/account changes

Acceptance:

- Screens are visually close to the standalone default blueprint.
- Money values remain backend-owned.
- No unsupported next-month editing appears.

## Recommended Review Order

Review PRs in order. Do not merge PR 3 before PR 2, because preview detail depends on settled money-state/flow grammar. Do not merge PR 6 before PR 4, because the page hierarchy should be settled before lower workbench polish.

## Definition Of Done For The V2 Sequence

- The open-month dashboard follows this order:
  1. MonthRail
  2. MoneyState
  3. PlanningRow
  4. NextMonthPreviewDetail when preview exists
  5. CloseBand when relevant
  6. compact insight/action cards
  7. lower workbench
- No large MoneyState CTA.
- No visible default equation row.
- Flow bar is segmented with gaps.
- Preview detail is present and DTO-backed.
- MonthRail preview next uses chevron plus subtle marker.
- Tests and browser checks cover both normal and edge states.
