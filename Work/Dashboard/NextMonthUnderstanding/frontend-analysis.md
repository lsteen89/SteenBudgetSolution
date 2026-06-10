# Frontend Analysis

## Relevant Files

| Area | Files | Finding |
| --- | --- | --- |
| Routes | `Frontend/src/routes/appRoutes.ts`, `Frontend/src/layout/AppRoutes.tsx` | Dashboard routes are flat: `/dashboard`, `/dashboard/breakdown`, `/dashboard/income`, `/dashboard/expenses`, `/dashboard/savings`, `/dashboard/debts`. No next-month or month-param route exists. |
| Dashboard page | `Frontend/src/Pages/private/dashboard/dashboardhome.tsx`, `Frontend/src/components/organisms/pages/DashboardContent.tsx` | Main dashboard orchestration. Branches open/closed/skipped and wires MonthRail, MoneyState, CloseBand, AttentionLane, PillarWorkbench, close modal, quick drawer. |
| Month navigation | `Frontend/src/components/organisms/dashboard/shell/MonthRail.tsx`, `dashboardMonthNavigation.ts`, `useDashboardSummary.ts` | Prev/next are derived only from persisted months in `/months/status`. |
| Dashboard data | `useDashboardSummary.ts`, `useBudgetDashboardMonthQuery.ts`, `budgetService.ts` | Current selected month is Zustand state, not URL state. Dashboard query calls `/api/budgets/dashboard?yearMonth=...`. |
| Editor routes | `IncomeEditorPage.tsx`, `ExpensesEditorPage.tsx`, `SavingsEditorPage.tsx`, `DebtsEditorPage.tsx` | All resolve `editableYearMonth` from `openMonthYearMonth`. They do not use route params or dashboard selected month. |
| Quick drawer | `EditPeriodDrawer.tsx` and panels | Current open month only. Should not become future-plan editor. |
| Money state/cards | `MoneyState.tsx`, `AttentionLane.tsx`, `OpenMonthPillarWorkbench.tsx` | Existing visual language can be reused for preview once backend returns real preview DTO. |

## Current Dashboard Structure

Open-month dashboard order:

1. `MonthRail`
2. `MoneyState`
3. `CloseBand` if relevant
4. `AttentionLane`
5. `OpenMonthPillarWorkbench`
6. `CloseMonthReviewModal`
7. `EditPeriodDrawer`

Closed/skipped branches bypass open-month edit surfaces.

The current dashboard already has the “current month hero” and inline money equation. Do not replace that with next-month preview. Add next-month clarity as a secondary planning layer.

## Current Month Navigation Behavior

`useDashboardSummary` does this:

1. Fetches `/api/budgets/months/status`.
2. Fetches `/api/budgets/dashboard`, optionally with selected `yearMonth`.
3. Builds sorted persisted `yearMonth` list from `monthsStatus.months`.
4. Calls `getAdjacentYearMonths`.
5. Writes `previousPeriodKey`, `nextPeriodKey`, `canGoPrevious`, `canGoNext`.
6. `MonthRail` disables buttons when `vm.previous.disabled` or `vm.next.disabled`.

Why Next is disabled today:

- It is not a generic “next calendar month” button.
- It is “next persisted budget month in `/months/status`.”
- If the next month has not been opened/materialized, it is absent from `monthsStatus.months`.
- Therefore `getAdjacentYearMonths` returns `nextYearMonth: null`, `canGoNext: false`.

This is not purely a UI decision. It reflects missing route/data support for a preview state.

## URL / Route Support

Current route model:

- No `/dashboard/:yearMonth`.
- No `/dashboard/months/:yearMonth`.
- No `/dashboard/next-month`.
- Selected dashboard month is held in Zustand (`budgetMonthStore`) only.
- Full editor pages are static routes and resolve their own open month from backend status.

Recommended MVP route:

```text
/dashboard/next-month
```

Why:

- It matches current flat dashboard route conventions.
- It represents one product concept: “next month from the active month.”
- It avoids pretending the app supports arbitrary future month previews.
- It can share the same destination for the Next button and `Granska nästa månad`.

Rejected for MVP:

```text
/dashboard/months/{yyyy-MM}/preview
```

Reason:

- More scalable long-term, but current app has no month-param dashboard/editor route model.
- It implies arbitrary month preview support that backend does not have.

## Existing Future Month Route Behavior

There is no future month route to test today.

Calling existing dashboard endpoint with a future `yearMonth` is unsafe:

- if another open month exists, backend returns `OpenMonthExists`;
- if no open month exists, backend may create an open month;
- either way, it is not a read-only preview model.

## Editor Reuse Analysis

### Full Editor Pages

Current pages:

- `/dashboard/income`
- `/dashboard/expenses`
- `/dashboard/savings`
- `/dashboard/debts`

All four compute `editableYearMonth` as:

```ts
status.openMonthYearMonth ??
status.months.find((month) => month.status === "open")?.yearMonth ??
null
```

Implication:

- They can edit the backend-open month.
- They cannot edit a preview month.
- They cannot edit a selected dashboard month unless it is also the open month.
- They need a route/state input before they can be reused for next-month preview editing.

### Quick Drawer

`EditPeriodDrawer` is intentionally current-month-only:

- opened from current dashboard cards;
- receives current `yearMonth`;
- bulk-patch focused;
- should not grow next-month or budget-plan scope controls.

Keep it out of next-month preview.

## Components Reusable For Preview Page

Reusable once backend preview data exists:

- `MoneyState` layout/money equation pattern, but probably not the component directly because it expects `BudgetDashboardMonthDto` for persisted month metadata.
- `AllocationBar`.
- `OpenMonthPillarWorkbench` visual pattern, but actions/copy must change for preview/read-only.
- `MonthRail` styling, but not current persisted-only navigation model.
- `ClosedMonthHandoffCard` tone for transition language.

Needs new or adapted components:

- `NextMonthPreviewPage`.
- `NextMonthPreviewSurface` or equivalent dashboard card.
- Three-card dashboard model:
  - `ThisMonthCard`
  - `NextMonthCard`
  - `BudgetPlanCard`
- MonthRail preview-aware view-model extension.

Too coupled:

- Full editor pages: hardcoded to open month.
- Quick drawer: current-month-only.
- `MonthRail` adjacent-month logic: persisted list only.

## Three-Card Data Requirements

### This Month Card

Already available from `DashboardSummary`:

- `summary.header.periodLabel`
- `summary.header.periodStatus`
- `summary.remainingToSpend`
- `summary.currency`
- `summary.header.canCloseMonth`
- link to `/dashboard/breakdown`

### Next Month Card

Needs new backend data for numbers:

- preview year-month;
- preview status (`preview`, `opened`, unavailable);
- projected free amount;
- carry-over assumption;
- limitations;
- route/action target.

Can be partially rendered today without numbers:

- derived next calendar month label from current `periodKey`;
- CTA to preview route, if backend preview page exists;
- factual state copy.

### Budget Plan Card

Needs backend data for totals:

- plan income;
- plan expenses;
- plan savings;
- plan debt payments;
- plan free amount without carry-over.

Current dashboard does not expose budget-plan summary. Existing editor rows expose some source values, but aggregating them in frontend would duplicate financial logic and is not recommended.

## Proposed Frontend Changes

After backend preview exists:

1. Add `appRoutes.dashboardNextMonth = "/dashboard/next-month"`.
2. Add `NextMonthPreviewPage`.
3. Add `useNextMonthPreviewQuery(fromYearMonth)`.
4. Add preview-aware Next button behavior in `DashboardContent`/`MonthRail`:
   - persisted next month exists -> current persisted month navigation;
   - active open month with preview available -> route to `/dashboard/next-month`;
   - preview unsupported -> keep disabled or route unavailable state.
5. Add dashboard three-card model beneath the current hero.
6. Keep quick drawer current-month-only.
7. Refactor full editor pages only if product wants editing from the preview page.

## Test Targets

- Next button disabled today because no persisted next month exists.
- Next button routes to `/dashboard/next-month` when preview availability exists.
- Next card CTA and Next button land on same page.
- Existing persisted month navigation still works.
- Closed/skipped months show no edit affordances.
- Full editors do not silently edit the wrong month.

