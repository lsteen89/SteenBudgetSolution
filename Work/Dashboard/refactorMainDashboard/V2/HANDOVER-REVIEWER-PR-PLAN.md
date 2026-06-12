# Dashboard V2 Handover: Reviewer PR Plan

Date: 2026-06-11

## Reviewer Mission

Review the Dashboard V2 sequence against the standalone blueprint:

- `/Users/linussteen/Downloads/eBudget Dashboard (standalone).html`
- default blueprint state: `spine`, `surplus`, `flow`, `preview`, `row`, `deltas`

Be strict. This work is not "general polish". The current implementation drifted into a hybrid. The review standard is blueprint alignment plus financial honesty.

## Global Reject Criteria

Reject any PR that:

- computes next-month financial totals in the frontend;
- calls `/api/budgets/dashboard?yearMonth={next}` for unopened preview;
- inserts/materializes `BudgetMonth` rows for read-only preview;
- exposes next-month editing from current dashboard quick drawers;
- adds arbitrary future-month routing;
- changes nav, menu, account, or global shell;
- introduces a new palette, font system, icon system, or dashboard-specific design language outside `eb-*` tokens;
- uses transaction/spend/burn-rate/banking/AI-advice language;
- weakens closed/skipped read-only protection;
- makes next month feel like the primary dashboard answer.

## PR 1 Review: Dashboard Blueprint Primitives

Expected:

- Dashboard-local primitives or normalized helper classes exist.
- Surface/card/pill/button grammar matches the standalone dimensions closely.
- Existing tokens are used; no parallel color system.
- No behavior change is bundled into this PR.

Check:

- Are primitives small and local to dashboard/open-month surfaces?
- Are class names readable enough for later PRs?
- Is anything global changed unnecessarily?
- Are there nested-card patterns that violate the blueprint grammar?

Testing expectation:

- Build/typecheck is enough unless behavior changed.

Reject if:

- The PR edits app-wide design tokens, global background, nav shell, package versions, or Tailwind config without explicit need.

## PR 2 Review: MoneyState And Allocation Flow

Expected:

- `MoneyState` matches blueprint hierarchy:
  - `Open month · {date range}` kicker.
  - large backend-owned remaining number.
  - compact helper copy.
  - allocation area separated by top border.
  - header has `Where the month goes` and small ghost `Breakdown ->`.
  - no large footer CTA.
  - no default visible equation row.
- Flow bar is segmented, not one rounded progress track.

Check:

- Does the rendered amount still come from backend-authoritative remaining?
- Did reconciliation logic stay in place for diagnostics/tests?
- Are deficit states visually clear without changing math?
- Does the `Breakdown` link still use the real route?
- Are all i18n dictionaries complete?

Testing expectation:

- MoneyState tests for rendered remaining and missing default equation row.
- Allocation tests for surplus, zero values, and deficit marker.
- Existing reconciliation tests still pass.

Reject if:

- The old large `See the full breakdown` CTA remains.
- The flow bar still has a single pill track.
- The component silently uses computed remaining instead of backend remaining.
- Copy grows into explanatory dashboard-help prose.

## PR 3 Review: Planning Row Plus Dashboard Preview Detail

Expected:

- Planning row remains three cards: `This month`, `Next month`, `Budget plan`.
- Next-month numbers appear only from `NextMonthPreviewDto`.
- New `NextMonthPreviewDetail` renders below the row only when valid preview data exists.
- Production compare style is `deltas` only.
- Carry-over assumption copy uses `preview.carryOver.amount`.
- `How next month differs` is honest and DTO-backed or safely derived from the two dashboard DTOs.
- No fake prototype reasons ship.
- No unsupported `Edit budget plan` route ships.

Check:

- Does the PR accidentally fetch a full next-month dashboard?
- Are delta chips derived from provided DTO/current dashboard values only?
- Does unavailable/empty preview avoid fake `0 kr` confidence?
- Is `Open full preview` a small ghost action, not another primary CTA?
- Does the detail surface preserve current month as the primary answer?

Testing expectation:

- Preview available renders detail.
- Preview unavailable/null dashboard/empty plan does not fabricate detail numbers.
- Carry-over line uses preview DTO.
- Route for full preview remains `/dashboard/next-month`.
- Mocked query tests prove the dashboard uses `/next-preview`.

Reject if:

- Any next-month total is calculated from frontend assumptions instead of DTO values.
- `/api/budgets/dashboard?yearMonth={next}` appears in preview flow.
- Preview materialization or edit controls are added.

## PR 4 Review: Standalone Insight/Action Cards

Expected:

- Main dashboard no longer uses the broad explanatory `AttentionLane` presentation.
- Compact insight/action cards render max three items.
- Old `Värt en snabb koll` / `Uppmärksamhet` framing is gone from the main dashboard.
- No default collapsible "How these are chosen" block.
- Actions only target supported current-month flows.

Check:

- Are cards compact and placed in the blueprint flow?
- Are severity/action claims honest if still frontend-ranked?
- Do actions call the same handlers as before?
- Does any action imply future-month editing?
- Are deficit, eligible/overdue, and normal states covered?

Testing expectation:

- Max-three cap.
- Card order per state.
- Action routing/callback coverage.
- Negative assertion for old explanatory section labels.

Reject if:

- The PR keeps the broad dashboard-help area.
- It presents frontend heuristics as backend-owned advice.
- It adds new unsupported financial recommendations.

## PR 5 Review: MonthRail Visual Alignment

Expected:

- Rail reads as a compact horizon line, not a large card.
- Prev/next are compact icon controls.
- Preview next is chevron-first with a small sparkle/status marker.
- Persisted next remains normal.
- Unsupported next is dimmed/locked.
- Archive and close readiness remain accessible.

Check:

- Did any navigation behavior change?
- Does preview next still route to the existing preview page behavior?
- Are closed/skipped states still read-only?
- Is the rail visually subordinate to MoneyState?

Testing expectation:

- Previous/next enabled/disabled behavior.
- Preview next renders chevron plus marker.
- Disabled next does not fire.
- Archive and close action accessibility still covered.

Reject if:

- Sparkles replaces the chevron as the primary next icon.
- The rail keeps heavy card chrome.
- Any edit affordance leaks into closed/skipped states.

## PR 6 Review: Lower Workbench Surface Alignment

Expected:

- Existing `OpenMonthPillarWorkbench` behavior is preserved.
- Card shell, header rhythm, row spacing, footer buttons, and mini bars align visually with the blueprint.
- Quick adjust remains current-month-only.
- No new dashboard data fetches.

Check:

- Is this PR only visual alignment?
- Are editor routes and drawer callbacks unchanged?
- Is there any new data loading on dashboard render?
- Does the workbench still feel subordinate to the hero/planning layers?

Testing expectation:

- Existing workbench tests pass.
- Handler wiring remains covered.
- Search confirms no new editor endpoint fetch on dashboard load.

Reject if:

- The PR sneaks in pillar behavior changes.
- Future/planned-month quick editing is implied or enabled.

## PR 7 Review: Integrated Visual Verification And Hardening

Expected:

- No broad rewrite.
- Only fixes defects found during visual/browser verification.
- Final docs/changelog reflect the actual V2 state.

Testing expectation:

- Frontend unit/component tests for all changed components.
- `npm run build`.
- Browser verification for:
  - normal surplus/open
  - deficit
  - preview unavailable
  - close eligible/overdue
  - mobile dashboard
  - closed/skipped read-only branch
- Explicit code search for forbidden preview/edit paths.

Reject if:

- This PR becomes a cleanup/refactor bucket.
- Visual verification is claimed but not evidenced.
- Mobile has overlapping text or broken hierarchy.

## Final Sequence Acceptance

The sequence is done only when the open-month dashboard order is:

1. MonthRail
2. MoneyState
3. PlanningRow
4. NextMonthPreviewDetail when preview exists
5. CloseBand when relevant
6. compact insight/action cards
7. lower workbench

Final hard checks:

- No large MoneyState CTA.
- No default visible equation row.
- Flow bar has explicit segment gaps.
- Preview detail exists and is DTO-backed.
- MonthRail preview next is chevron plus subtle marker.
- No future-month quick edit from current dashboard.
- No global shell changes.
- Tests and browser checks cover normal, deficit, unavailable preview, close-ready, mobile, and read-only states.
