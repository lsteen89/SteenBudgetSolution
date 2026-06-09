# Dashboard Current State

## Scope

Investigation for the future "current month vs next month budget clarity" PR. This document describes what the dashboard already does today. It is not an implementation plan.

## Frontend Entry Points

| Area | Files | Current role |
| --- | --- | --- |
| Dashboard route/page | `Frontend/src/Pages/private/dashboard/dashboardhome.tsx` | Auth/wizard gate, dashboard shell, `DashboardContent` mount. |
| Dashboard orchestration | `Frontend/src/components/organisms/pages/DashboardContent.tsx` | Main month-aware controller: loads summary, renders month rail, branches between open/closed/skipped UI, opens quick edit and close-month modal. |
| Summary hook | `Frontend/src/hooks/dashboard/useDashboardSummary.ts` | Combines month status and selected dashboard month into the UI aggregate. |
| Month status query | `Frontend/src/hooks/budget/useBudgetMonthsStatusQuery.ts` | Calls `/api/budgets/months/status`. |
| Month dashboard query | `Frontend/src/hooks/budget/useBudgetDashboardMonthQuery.ts` | Calls `/api/budgets/dashboard`, optionally with `yearMonth`. |
| API client | `Frontend/src/api/Services/Budget/budgetService.ts` | Dashboard, month status, start month, close month, recap, close candidates. |
| Selected month store | `Frontend/src/stores/Budget/budgetMonthStore.ts` | Holds `selectedYearMonth` in Zustand only. No persisted selected month. |

## Main Dashboard Components

| Component | File | Notes for next-month work |
| --- | --- | --- |
| `MonthRail` | `Frontend/src/components/organisms/dashboard/shell/MonthRail.tsx` | Existing selected-month header/navigation/archive surface. Reusable for month context, but it only navigates existing `BudgetMonth` rows from status. |
| `ReturningDashboardSection` | `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx` | Open-month dashboard body. Reusable visually, but currently assumes a live open month. |
| `MoneyState` | `Frontend/src/components/organisms/dashboard/returning/openMonth/MoneyState.tsx` | Uses backend-authoritative six-term equation for open months. Reusable if preview returns the same financial shape. |
| `CloseBand` | `Frontend/src/components/organisms/dashboard/returning/openMonth/CloseBand.tsx` | Already talks about closing and inheritance, but it does not preview unopened next month rows. |
| `OpenMonthPillarWorkbench` / cards | `Frontend/src/components/organisms/dashboard/returning/openMonth/*` and `Frontend/src/components/organisms/dashboard/returning/cards/*` | Existing pillar cards for income, expenses, savings, debts. Good visual candidates; current props are current-month aggregate oriented. |
| `ClosedMonthRecapSection` | `Frontend/src/components/organisms/dashboard/recap/ClosedMonthRecapSection.tsx` | Closed-month branch. Snapshot/recap, not editable. |
| `SkippedMonthState` | `Frontend/src/components/organisms/dashboard/recap/SkippedMonthState.tsx` | Skipped-month branch. No live dashboard data. |
| `EditPeriodDrawer` | `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx` | Quick current-month editor. Explicitly current-month-only; not a place to add future-plan controls. |
| `CloseMonthReviewModal` | `Frontend/src/components/organisms/dashboard/closeMonth/CloseMonthReviewModal.tsx` | Close flow review. Mutates state by closing current month and creating/configuring next month. |
| `ClosedMonthHandoffCard` | `Frontend/src/components/organisms/dashboard/closeMonth/ClosedMonthHandoffCard.tsx` | Post-close handoff to next month after it exists. Not an unopened preview. |

## Current Data Flow

1. `dashboardhome.tsx` renders `DashboardContent` once auth and wizard state allow it.
2. `DashboardContent` calls `useDashboardSummary({ enabled })`.
3. `useDashboardSummary` calls:
   - `useBudgetMonthsStatusQuery()` -> `GET /api/budgets/months/status`
   - `useBudgetDashboardMonthQuery(selectedYearMonth)` -> `GET /api/budgets/dashboard?yearMonth=...`
4. When `selectedYearMonth` is `null`, the dashboard request omits `yearMonth`. Backend chooses the open month if one exists, otherwise current year-month.
5. Once dashboard data returns, `useDashboardSummary` sets the selected month to `dashQ.data.month.yearMonth`.
6. `buildDashboardSummaryAggregate` converts `BudgetDashboardMonthDto` into:
   - `DashboardSummary`
   - `DashboardBreakdown`
7. `DashboardContent` renders:
   - closed month -> `ClosedMonthRecapSection`
   - skipped month -> `SkippedMonthState`
   - open month -> `ReturningDashboardSection`, close modal, quick edit drawer

## What The Displayed Data Represents

| UI state | Source | Meaning |
| --- | --- | --- |
| Open month dashboard | `BudgetDashboardMonthDto.liveDashboard` from `/api/budgets/dashboard` | Live month-specific materialized rows plus carry-over. Backend owns financial math. |
| Closed month dashboard | `BudgetDashboardMonthDto.snapshotTotals` and recap endpoint | Immutable closed-month snapshot. No live dashboard DTO. |
| Skipped month | `BudgetDashboardMonthDto.month.status = skipped` | Placeholder month. No live dashboard and no snapshot totals. |
| Month navigation | `BudgetMonthsStatusDto.months` | Existing persisted month rows only. It does not include hypothetical future months. |
| Quick edit drawer | Month editor endpoints under `/api/budgets/months/{yearMonth}/...` | Current open month only from dashboard drawer. |

The dashboard is not frontend-aggregating the main totals. It maps backend DTOs and does small presentation shaping only.

## Current Month Handling

The selected/current display month is not simply "calendar current month".

Backend selection rules matter:

- `GET /api/budgets/dashboard` with no `yearMonth` asks backend for the accessible month.
- If an open month exists, backend returns that open month.
- If no open month exists and the requested/default month does not exist, backend may create an open month.
- The frontend then stores the returned `yearMonth` as `selectedYearMonth`.

The dashboard therefore means "currently selected persisted budget month", with an initial bias toward the open month.

## Month Selector And State In UI

Already present:

- Current selected month label.
- Previous/next navigation through existing month rows.
- Month archive popover from `monthsStatus.months`.
- Status labels for `open`, `closed`, `skipped`.
- Close action for eligible open months.
- Continue action when a next persisted month exists.
- Closed/skipped read-only branches.

Missing:

- No explicit "Budget plan" surface on the dashboard.
- No "Next month" preview when next month has not been opened/materialized.
- No comparison between selected month rows and the base budget plan at dashboard level.

## Frontend Types And Models

| Concept | Types/files | Notes |
| --- | --- | --- |
| Dashboard month | `Frontend/src/types/budget/BudgetDashboardMonthDto.ts` | Month metadata, `liveDashboard`, `snapshotTotals`. |
| Live dashboard | `Frontend/src/types/budget/BudgetDashboardDto.ts` | Income, expenses, savings, debt, carry-over totals. |
| Month status/list | `Frontend/src/types/budget/BudgetMonthsStatusDto.ts` | Existing month list, open month, current calendar month, suggested action. |
| Dashboard aggregate | `Frontend/src/hooks/dashboard/dashboardSummary.types.ts` | UI-facing summary/breakdown/header model. |
| Income editor rows | `BudgetMonthIncomeItemEditorRowDto` in `BudgetMonthsStatusDto.ts` | Includes `sourceIncomeItemId`, `isMonthOnly`, `canUpdateDefault`, source comparison fields. |
| Expense editor rows | `BudgetMonthExpenseItemEditorRowDto` in `BudgetMonthsStatusDto.ts` | Includes `sourceExpenseItemId`, `isMonthOnly`, `canUpdateDefault`, source comparison fields. |
| Savings rows | `BudgetMonthSavingsGoalEditorRowDto`, `BudgetMonthBaseSavingsEditorDto` | Includes source link and month-only signals for goals/base savings. |
| Debt rows | `BudgetMonthDebtEditorRowDto`, `DebtEditorDto.ts` | Includes source link, month-only, action/participation state in richer debt editor DTO. |

## Reusable For A Next-Month Preview Surface

Good candidates:

- `MonthRail` patterns for status/context, if adapted to support a non-persisted preview state.
- `MoneyState` and six-term equation presentation, if backend returns a preview DTO with the same totals.
- Pillar card layout and CTA hierarchy from `ReturningDashboardSection`.
- `ClosedMonthHandoffCard` directionally, for transition language after closing.
- `CloseBand` copy area, because it already explains next-month inheritance at the right moment.

Too coupled:

- `ReturningDashboardSection` assumes an open `BudgetDashboardMonthDto`.
- `EditPeriodDrawer` is intentionally current-month-only and should not become a future-plan editor.
- Month navigation uses only persisted month rows.
- Closed recap branch expects snapshot/recap data and is not useful for plan preview.
- Dashboard aggregate has no budget-plan comparison fields.

## Current Limitations

- No read-only next-month preview endpoint.
- No dashboard-level base-budget/plan summary endpoint.
- No DTO that says "this is the base plan" vs "this is this month" vs "this is projected next month".
- Existing `/dashboard?yearMonth=...` can create/materialize a month in some backend states, so it is unsafe as a preview primitive.
- Dashboard cards do not expose source row links or plan deltas; the editor DTOs do.
- Quick drawers intentionally hide plan scopes and save current-month-only changes.
- Full editor pages have some plan-forward scope support, but support differs by domain and row source-link availability.

