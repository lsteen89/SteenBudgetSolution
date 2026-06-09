# Backend Endpoint Map

## Scope

This maps the backend behavior available for current month, specific month, base budget, and next-month preview. Source of truth is the current code, not older docs when wording differs.

## Dashboard And Month Lifecycle Endpoints

All routes are under `api/budgets` in `Backend/Presentation/Controllers/Budget`.

| Endpoint | Controller file | Handler/service path | What it answers | Mutates? | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /dashboard?yearMonth=YYYY-MM` | `BudgetController.Dashboard.cs` | `GetBudgetDashboardMonthQueryHandler` | Dashboard for selected/accessible month. Open -> live dashboard. Closed -> snapshot totals. Skipped -> status only. | Yes, indirectly possible | Calls `EnsureAccessibleMonthAsync`, which can create/materialize a month. Not safe as preview. |
| `GET /months/status` | `BudgetController.MonthLifecycle.cs` | `GetBudgetMonthsStatusQueryHandler` | Existing month rows, open month, current calendar month, gap count, suggested action. | No | Month selector source. No hypothetical next month. |
| `POST /months/start` | `BudgetController.MonthLifecycle.cs` | `StartBudgetMonthCommandHandler` | Opens target month, optionally closes previous open month and creates skipped gaps. Returns updated status. | Yes | Explicit start/open flow. |
| `POST /months/{yearMonth}/close` | `BudgetController.MonthLifecycle.cs` | `CloseBudgetMonthCommandHandler` | Closes an open month and ensures/configures the next month. Returns closed snapshot and next-month metadata. | Yes | This is a close-and-open handoff, not preview. |
| `GET /months/{yearMonth}/close/savings-goal-completion-candidates` | `BudgetController.MonthLifecycle.cs` | `GetSavingsGoalCompletionCandidatesQueryHandler` | Savings goals that can be completed during close. | No | Close flow support only. |
| `GET /months/{yearMonth}/recap` | `BudgetController.MonthRecap.cs` | `GetBudgetMonthRecapQueryHandler` | Closed-month recap and comparisons. | No | Closed-month UX, not next-month preview. |

## Dashboard Read Model

`GetBudgetDashboardMonthQueryHandler` does this:

1. Reads user preferences for currency.
2. Calls `IBudgetMonthLifecycleService.EnsureAccessibleMonthAsync`.
3. Reads the `BudgetMonth`.
4. If `skipped`, returns month metadata only.
5. If `closed`, returns snapshot totals only.
6. If `open`, reads materialized month data through `IBudgetMonthDashboardRepository.GetDashboardDataForMonthAsync`.
7. Projects the live dashboard through `BudgetDashboardProjector`.

`BudgetDashboardProjector` owns the current dashboard equation:

```text
finalBalanceWithCarry =
income
- expenses
- totalSavings
- debtPayments
+ carryOverAmount
```

Where `totalSavings` is base monthly savings plus active savings-goal monthly contributions.

## Month Creation And Materialization Behavior

`BudgetMonthLifecycleService.EnsureAccessibleMonthAsync` is the key service.

Current behavior:

- Resolves budget by user.
- Uses requested `yearMonth`, or current calendar month if omitted.
- If request omits `yearMonth` and an open month exists, targets the open month.
- If target month does not exist and an open month already exists, fails with `OpenMonthExists`.
- If target month does not exist and no open month exists, inserts it as `open`.
- Always calls `BudgetMonthMaterializer.MaterializeIfMissingAsync` for the target row.

`BudgetMonthMaterializer` copies active base-budget data into month-specific tables:

| Source/base data | Month data created |
| --- | --- |
| `Income`, active `IncomeSideHustle`, active `IncomeHouseholdMember` | `BudgetMonthIncome`, side hustle rows, household member rows |
| Active `ExpenseItem` | `BudgetMonthExpenseItem` |
| `Savings`, active `SavingsGoal` | `BudgetMonthSavings`, `BudgetMonthSavingsGoal` |
| Active `Debt` | `BudgetMonthDebt` |

This is the base budget -> month budget relationship in code. The base budget is a seed source, not a dashboard DTO.

## Base Budget / Plan Support

There is no single "budget plan dashboard" endpoint today.

Base plan data exists in canonical tables:

- `Income`, `IncomeSideHustle`, `IncomeHouseholdMember`
- `ExpenseItem`
- `Savings`, `SavingsGoal`
- `Debt`
- `Budget` settings such as debt repayment strategy

Backend support for editing the base plan exists through month editor commands when a row has a clean source link and the requested scope writes the plan.

Relevant editor routes:

| Area | Endpoints | Plan-forward support |
| --- | --- | --- |
| Expenses | `GET/PATCH/POST/DELETE /months/{yearMonth}/expense-items...`, `GET /months/{yearMonth}/editor` | Patch/bulk patch support scopes. Create currently creates month-only from dashboard endpoint. |
| Income | `GET/PATCH/POST/DELETE /months/{yearMonth}/income-items...` | Patch/bulk patch support scopes. Create supports current month and current+plan, not plan-only. |
| Savings | `GET/PATCH/POST /months/{yearMonth}/savings-goals...`, `PATCH /months/{yearMonth}/base-savings` | Goal/base savings support scope where source links exist. Some goal metadata writes are plan-level when linked. |
| Debts | `GET /debt-items`, `GET /debt-editor`, `PATCH/POST /debt-items...` | Strongest plan support: create and edit can support all three scopes, including plan-only, where valid. |

Guardrail: plan scopes require source links. Month-only rows must not pretend to update the plan.

## Current/Open Month Retrieval

Supported:

- `GET /months/status` gives `openMonthYearMonth`.
- `GET /dashboard` without `yearMonth` returns the open month if one exists.
- `GET /dashboard?yearMonth={openMonthYearMonth}` returns live dashboard for that month.

## Specific Month Retrieval

Supported:

- `GET /dashboard?yearMonth=YYYY-MM` retrieves an existing open/closed/skipped month.
- For closed months, it returns snapshot totals.
- For skipped months, it returns no live dashboard and no snapshot.
- For open months, it returns live materialized dashboard.

Caveat: if the requested month does not exist and no other open month exists, the backend may create it as open. That is correct lifecycle behavior, but it makes this endpoint unsuitable for "look but do not touch" preview.

## Next Month Support

Already supported:

- Closing an eligible open month creates/configures the immediate next month through `POST /months/{yearMonth}/close`.
- Explicitly starting a target month is supported through `POST /months/start`.
- Existing next month can be selected and displayed after it exists.

Not supported:

- Read-only preview of next month before it is opened.
- Read-only projection of base plan into a future month without creating `BudgetMonth` rows.
- DTO that compares current month overrides against base plan at dashboard level.

## Closed And Skipped Months

Closed:

- Stored as immutable snapshot totals on `BudgetMonth`.
- Dashboard returns `snapshotTotals` and no `liveDashboard`.
- Recap endpoint reads closed-month recap data.

Skipped:

- Stored as placeholder `BudgetMonth` rows with status `skipped`.
- Dashboard returns month metadata only.
- UI renders a skipped-state branch.

## Reusable Backend Services

| Service/repository | Reuse potential | Limitation |
| --- | --- | --- |
| `BudgetDashboardProjector` | Can project a dashboard DTO from a read model and carry-over amount. | Needs a `BudgetDashboardReadModel`; current read model comes from materialized month tables. |
| `BudgetMonthMaterializer` | Encodes how base rows become month rows. | Mutates database. Not preview-safe. |
| `BudgetMonthSeedSourceRepository` | Reads active base-plan rows. | Returns seed rows, not dashboard read model or comparison DTO. |
| `BudgetMonthDashboardRepository` | Reads live open month data. | Requires existing materialized `BudgetMonthId`. |
| `BudgetMonthCloseSnapshotService` / `BudgetMonthlyTotalsService` | Snapshot/totals logic for existing month rows. | Existing-month only. |

## Endpoint Capability Matrix

| Question | Supported today? | Evidence |
| --- | --- | --- |
| Retrieve current/open month? | Yes | `/months/status`, `/dashboard` default selection. |
| Retrieve specific existing month? | Yes | `/dashboard?yearMonth=YYYY-MM`. |
| Retrieve closed month snapshot? | Yes | `/dashboard`, `/months/{yearMonth}/recap`. |
| Retrieve skipped month state? | Yes | `/dashboard` returns skipped metadata. |
| Retrieve base budget/plan as dashboard summary? | No | Base rows exist; no plan summary endpoint. |
| Preview unopened next month without mutation? | No | Existing ensure/materialize path mutates. |
| Open next month? | Yes | `/months/start` and close-month flow. |
| Calculate next month before opening? | No | No pure projection service/endpoint for future month. |
| Compare current month vs plan at dashboard level? | Partial | Editor row DTOs expose source links/comparison fields; dashboard DTO does not. |

