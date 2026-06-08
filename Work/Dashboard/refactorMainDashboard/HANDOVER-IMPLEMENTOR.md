# Handover - Implementor

You are implementing the open-month main dashboard refactor for
SteenBudgetSolution.

## Required Design Source

Fetch this design file, read its readme, and implement the relevant aspects of
the design.

Design bundle:

```text
https://api.anthropic.com/v1/design/h/Cv7t6hvUuMlNMEbmxAoIBQ?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Implement:

```text
explorations/dashboard/dashboard.html
```

The mockup is the visual and behavioural reference. It is not shippable code.
Do not port inline mock data, mock state toggles, device frames, tweak panels,
or prototype-only helpers into the app.

## Local Context To Read First

Read these existing docs before editing code:

1. `Work/Dashboard/refactorMainDashboard/README.md`
2. `Work/Dashboard/refactorMainDashboard/current-dashboard-analysis.md`
3. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`
4. `Work/Dashboard/refactorMainDashboard/designer-handoff.md`
5. the fetched design bundle README and dashboard handoff files

Also inspect the current implementation before changing it:

- `Frontend/src/Pages/private/dashboard/dashboardhome.tsx`
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- `Frontend/src/components/organisms/dashboard/shell/*`
- `Frontend/src/components/organisms/dashboard/editPeriod/*`
- `Frontend/src/hooks/dashboard/*`
- `Frontend/src/hooks/budget/*`
- `Frontend/src/types/budget/*`

## Hard Constraints

Do not violate these:

1. This is a budgeting app, not a banking app. There is no transaction,
   spend-progress, "spent so far", burn-rate, or due-date language anywhere.
   Every figure is planned-budget data.
2. Money math is load-bearing and exact:
   `income + carryOver - expenses - savings - debts = remaining`.
   `remaining` must equal backend `finalBalanceWithCarryMonthly`.
3. Carry-over is its own equation term. Do not fold it into income.
4. Render the dashboard from the single `GET /api/budgets/dashboard` read plus
   the existing month status read. Drawer/detail/editor data is lazy-loaded on
   interaction. Do not fetch all editor endpoints on dashboard load.
5. Closed/skipped months expose zero edit affordances.
6. Quick-adjust drawers are bulk-patch only. They must not imply create,
   delete, transfer, lifecycle, archive, restore, or balance-adjust actions
   that only full editor pages support.
7. Client-derived attention/insight ranking must be labelled as on-device
   guidance. Do not present it as backend-authored financial advice.
8. Deficit is clear but never shameful. Surplus is actionable, not noisy.
9. Use existing `eb-*` tokens, Inter, and i18n dictionaries. No new colour
   system, no new font, no hardcoded user-facing strings.

If the design appears to need unavailable data, stop and document an endpoint
request. Do not fake a number or change copy to imply unavailable facts.

## Locked Design Decisions

Build the chosen direction:

- Layout: Spine, a single narrative column. Do not implement the alternative
  cockpit/two-pane exploration.
- Section order:
  1. Month rail
  2. Money state anchor with inline allocation
  3. Conditional close band
  4. Attention lane, capped at 3
  5. Pillar workbench, 2 by 2 on desktop and single-column on mobile
- Allocation visual: Flow bar with proportional segments for expenses,
  savings, debts, and free remaining money. Deficit state shows where money
  runs out and the unfunded tail.
- Existing `/dashboard/breakdown` remains available, but the dashboard must
  explain the core "why" inline.
- Designed states: normal/surplus, deficit, eligible-to-close. Implementation
  must also cover upcoming close, overdue close, zero remaining, no savings,
  no debts, no subscriptions/recurring expenses, loading, error, and read-only.

## Implementation Plan

Keep this as small, ordered, independently verifiable slices.

### P0 - Shared AllocationBar and dashboard terms aggregator

Build first.

Scope:

- Create a reusable allocation flow component. Suggested location:
  `Frontend/src/components/molecules/budget/AllocationBar.tsx`.
- Create a named dashboard terms/aggregator helper. Suggested location:
  `Frontend/src/domain/budget/` or `Frontend/src/hooks/dashboard/`, matching
  existing patterns after inspection.
- Aggregator terms:
  - income
  - carryOver
  - expenses
  - savings
  - debts
  - remaining
- Assert/reconcile that the computed remaining equals
  `finalBalanceWithCarryMonthly` after the same rounding policy used by the
  dashboard.
- Unit-test positive, zero, and deficit scenarios.

Out of scope:

- Do not wire the new UI into the page yet.
- Do not rewrite editor pages.

### P1 - Dashboard shell and MonthRail

Scope:

- Replace/reskin the current period control bar area into the design's
  MonthRail while preserving current behaviour.
- Use existing month navigation and archive selection logic.
- Show open/closed/skipped status and close readiness from existing fields:
  `isCloseWindowOpen`, `closeWindowOpensAtUtc`, `closeEligibleAtUtc`,
  `isOverdueForClose`.
- Closed/skipped must render read-only state with no close CTA.

Out of scope:

- Do not change close-month mutation logic.
- Do not rebuild application nav.

### P2 - MoneyState

Scope:

- Implement the remaining-money anchor and inline allocation explanation.
- Use P0 aggregator and AllocationBar.
- Show surplus, zero, and deficit states honestly.
- Keep `/dashboard/breakdown` as a secondary deeper-analysis route.

Out of scope:

- No attention lane.
- No pillar workbench.

### P3 - Pillar workbench

Scope:

- Replace four current open-month pillar cards with the design's denser
  workbench.
- Pillars:
  - income: salary/side/household split from `liveDashboard.income`
  - expenses: category totals, recurring/subscription pressure from
    `liveDashboard.expenditure`, `recurringExpenses`, `subscriptions`
  - savings: base saving, goal contributions, goal progress from
    `liveDashboard.savings`
  - debts: monthly payments, total balance, strategy from `liveDashboard.debt`
- Each pillar gets one quick-adjust action and one full editor route.
- Quick-adjust opens existing lazy drawer panels.
- Full editor routes remain `/dashboard/expenses`, `/dashboard/income`,
  `/dashboard/savings`, `/dashboard/debts`.
- Closed/skipped months hide quick-adjust; if links remain, they must be
  read-only/view phrased.

Out of scope:

- Do not add create/delete/lifecycle controls to quick drawers.
- Do not fetch debt-editor/savings-methods/editor endpoints on dashboard load.

### P4 - Attention lane

Scope:

- Replace the current follow-up strip with a capped attention lane.
- Derive items from existing dashboard summary data only.
- Cap visible items at 3.
- Keep ranking logic named and unit-tested.
- Include the design's "How these are chosen" affordance or an equivalent
  honest explanation that these are on-device checks.
- Actions must route to the right quick drawer, full editor, breakdown, or
  close flow.

Out of scope:

- No backend action-feed implementation in this PR.
- No fake severity from backend.

### P5 - CloseBand and full state matrix

Scope:

- Implement the conditional close band:
  - eligible: accent treatment
  - overdue: danger/attention treatment
  - upcoming/normal: quiet status or absent per design
- Show carry-forward preview only from existing values, e.g.
  `max(remaining, 0)`.
- Complete all non-happy states:
  - upcoming close
  - overdue close
  - zero remaining
  - negative remaining
  - no savings
  - no debts
  - no subscriptions/recurring expenses
  - loading
  - error
  - read-only closed/skipped
- Keep existing `DashboardErrorState` behaviour.

Out of scope:

- Do not redesign the close modal internals.
- Do not alter close-month backend contracts.

### P6 - Close-month flow integration

Scope:

- Wire MonthRail and CloseBand close CTAs to the existing
  `CloseMonthReviewModal` flow.
- Preserve savings-goal completion candidates fetch only while the modal is
  open.
- Preserve close mutation and post-close landing on the just-closed recap with
  handoff.

Out of scope:

- No close-month modal redesign.
- No closed recap redesign.

### P7 - Endpoint request notes

Scope:

- If the implementation reveals a real gap, document it under this work folder.
- Expected non-blocking requests:
  - backend attention feed with severity/label/action target
  - previous-month comparison bundle
  - expense category item population in the dashboard projection
  - dashboard savings progress summary
  - dashboard debt summary based on the rich debt editor read model

Out of scope:

- Do not request transactions, burn rate, due dates, or spend progress as part
  of this MVP. That is a different product surface.

## Reuse Before Rebuilding

Prefer adapting these:

- `useDashboardSummary`
- `buildDashboardSummaryAggregate`
- `resolvePeriodCloseUiState`
- `getCloseAvailabilityLabel`
- `PeriodControlBar` logic
- `MonthArchivePopover`
- `EditPeriodDrawer`
- current quick editor panels
- close-month modal/controller
- existing money formatting helpers
- existing eBudget tokens and shared UI primitives

## Validation

At minimum:

- Unit tests for the aggregator/reconciliation helper.
- Unit tests for attention ranking.
- Component tests or focused dashboard tests for:
  - positive remaining
  - zero remaining
  - negative remaining
  - eligible close
  - overdue close
  - closed read-only
  - skipped read-only
  - quick-adjust lazy drawer behaviour
- `npm run build` from `Frontend/`.
- Focused frontend tests around dashboard/dashboard hooks.
- Playwright/browser screenshot check for desktop and mobile if the in-app
  browser or Playwright path is available.

Report exactly what was run and what remains unverified.

## Stop Conditions

Stop and ask for clarification if:

- The design requires unavailable financial data.
- You cannot reconcile money terms exactly.
- Implementing a visual detail would require fetching every editor endpoint on
  initial dashboard load.
- You need to change backend DTOs or endpoints.
- You need to alter close-month lifecycle behaviour.

## Definition Of Done

- Dashboard uses the locked Spine direction and design anatomy.
- Core money explanation is inline and reconciles exactly.
- Existing dashboard behaviours are preserved.
- Quick vs full editor boundaries are honest.
- Closed/skipped states are read-only.
- No fake banking language.
- i18n is complete for user-facing strings.
- Tests/build relevant to the slice have been run.
- `docs/ai/ai-changelog.md` is appended.
- `COMMIT_MSG.tmp` is written.
- No commit, push, branch creation, reset, rebase, or checkout.

