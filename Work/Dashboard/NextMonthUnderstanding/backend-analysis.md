# Backend Analysis

## Relevant Backend Files

| Area | Files | Finding |
| --- | --- | --- |
| Dashboard | `BudgetController.Dashboard.cs`, `GetBudgetDashboardMonthQueryHandler.cs` | Dashboard endpoint loads/ensures a persisted month, then returns open live dashboard or closed snapshot. |
| Month status | `BudgetController.MonthLifecycle.cs`, `GetBudgetMonthsStatusQueryHandler.cs` | Returns persisted month rows only. No hypothetical next month. |
| Lifecycle ensure | `BudgetMonthLifecycleService.cs` | Can create and materialize a missing month when no open month exists. Fails with `OpenMonthExists` if requesting a missing month while another open month exists. |
| Materializer | `BudgetMonthMaterializer.cs` | Copies active budget-plan rows into month tables. Mutates database. Not preview-safe. |
| Start month | `StartBudgetMonthCommandHandler.cs` | Can close previous open month and open target month, create skipped gaps, apply carry-over. Mutating flow. |
| Close month | `CloseBudgetMonthCommandHandler.cs` | Closes current month, snapshots totals, ensures/configures immediate next month, applies carry-over. Mutating flow. |
| Dashboard math | `BudgetDashboardProjector.cs` | Owns dashboard equation and can project a `BudgetDashboardReadModel` with carry-over. Reusable for preview if a read model is built without mutation. |
| Seed source | `IBudgetMonthSeedSourceRepository`, `BudgetMonthSeedSourceRepository.sql.cs` | Reads active base/budget-plan rows. Good input for preview read model. |
| Wizard preview precedent | `GetWizardFinalizationPreviewQueryHandler.cs`, `WizardPreviewReadModelBuilder.cs` | Existing non-persisted preview pattern: build read model, project through dashboard projector. |
| Editor endpoints | `BudgetController.Editor.*`, handlers under `Months/Editor/*` | Editor reads/writes call `EnsureAccessibleMonthAsync`; mutations reject non-open months. |

## Current Month Support

Supported.

`GET /api/budgets/dashboard` with no `yearMonth`:

- resolves budget;
- targets open month if one exists;
- otherwise targets current calendar month;
- may create/materialize a month if no open month exists.

Open month response includes:

- month metadata;
- live dashboard DTO;
- carry-over amount;
- close-window metadata.

## Specific Month Support

Supported for persisted months.

`GET /api/budgets/dashboard?yearMonth=YYYY-MM`:

- if month exists:
  - open -> live dashboard;
  - closed -> snapshot totals;
  - skipped -> metadata only;
- if month does not exist and another open month exists:
  - fails with `OpenMonthExists`;
- if month does not exist and no open month exists:
  - creates an open month and materializes it.

Conclusion: this endpoint is not preview-safe.

## Budget Plan Support

Partial.

Budget-plan/base data exists in canonical tables:

- `Income`, `IncomeSideHustle`, `IncomeHouseholdMember`
- `ExpenseItem`
- `Savings`, `SavingsGoal`
- `Debt`

`BudgetMonthSeedSourceRepository` reads active base rows for month materialization.

Missing:

- no budget-plan dashboard summary endpoint;
- no plan summary DTO with dashboard equation;
- no direct “normal monthly setup” read model for UI.

## Next Month Preview Support

Not supported today.

No endpoint currently answers:

```text
Given this active month and the current budget plan, what would next month look like without opening/materializing it?
```

Existing options are unsafe:

- `GET /dashboard?yearMonth=next` can fail or create/materialize.
- `POST /months/start` mutates lifecycle.
- `POST /months/{yearMonth}/close` mutates lifecycle.
- Materializer mutates month tables.

## Carry-Over Support

### Persisted Carry-Over

Supported after lifecycle mutation.

Close flow:

- computes snapshot final balance;
- creates/ensures next month;
- sets next month carry-over:
  - `none` -> null;
  - `full` -> `max(snapshot.FinalBalance, 0)`.

Start flow:

- can close previous open month if requested;
- computes previous snapshot;
- applies carry-over:
  - `none` -> null;
  - `custom` -> request amount;
  - `full` -> `max(previousFinalBalance, 0)`.

### Estimated Carry-Over Before Close

Not persisted, but computable as an estimate from current live dashboard:

```text
estimatedFullCarryOver = max(currentLive.finalBalanceWithCarryMonthly, 0)
```

This is not final because the current open month can still change. UI copy must label it as assumption/estimate.

Suggested Swedish copy:

```text
Bygger på att maj stängs med 18 623 kr kvar. Beloppen fastställs när månaden stängs.
```

## Edit-Scope Support

Existing editor endpoints support scopes in several domains:

| Domain | Current-month-only | Current + budget plan | Budget-plan-only | Notes |
| --- | --- | --- | --- | --- |
| Expenses | Yes | Yes, if source-linked | Yes in patch/bulk patch | Creates currently create month rows; source-link required for plan writes. |
| Income | Yes | Yes for patch/create where allowed | Patch supports; create does not support budget-plan-only | Salary special cases; source-link required. |
| Savings | Yes | Yes where source-linked | Yes for patch/base savings | Some lifecycle/name/target writes are plan-level by design. |
| Debts | Yes | Yes | Yes | Strongest support, including budget-plan-only creates. |

Guardrail:

- Plan-writing scopes require source links.
- Month-only rows must not expose plan-forward behavior.
- Mutations reject closed/skipped months.

## Can We Edit Next Month Independently Today?

Only if the next month is an existing open `BudgetMonth`.

What is not supported:

- editing an unopened next month while current month remains open;
- editing a preview/draft month;
- editing a future month through current frontend routes;
- having both current month and next month open at the same time.

Backend invariant:

- `EnsureAccessibleMonthAsync` rejects missing target month when another open month exists.
- `StartBudgetMonthCommandHandler` rejects opening a different target month unless previous open month is closed.
- Multiple open months are treated as an error.

Conclusion: “next month only” editing before close requires a new backend model.

## Required Backend Change For Preview

Add a read-only next-preview endpoint.

Recommended route:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Recommended behavior:

- validate `{fromYearMonth}` belongs to user;
- require from-month to be open for MVP;
- compute `previewYearMonth = fromYearMonth + 1 month`;
- read active base budget rows through seed source or a dedicated plan read repository;
- build `BudgetDashboardReadModel` without inserts;
- project through `BudgetDashboardProjector`;
- include carry-over assumption:
  - `mode: none | estimatedFull | custom`;
  - amount;
  - source;
  - finality flag.

Recommended DTO shape:

```ts
type NextMonthPreviewDto = {
  fromYearMonth: string;
  previewYearMonth: string;
  state: "preview";
  basis: "budgetPlan";
  carryOver: {
    mode: "none" | "estimatedFull";
    amount: number;
    source: "currentMonthLiveFinalBalance" | "none";
    isFinal: false;
  };
  dashboard: BudgetDashboardDto;
  limitations: string[];
};
```

## Required Backend Change For Editable Preview

If product requires editing next month before it becomes active, choose one backend model:

### Option A: Planned Budget Month

Add a persisted status such as `planned`.

Behavior:

- materialize next month from budget plan into `planned` month rows;
- allow editing `planned` rows;
- keep current month as the only `open` month;
- when current closes, promote planned next month to `open` and apply final carry-over.

Pros:

- supports “edit next month only” cleanly.
- uses existing month-row editor model with status changes.

Cons:

- schema/lifecycle/test impact.
- every editor mutation must allow `planned` where appropriate.

### Option B: Dedicated Preview Edit Model

Persist next-month edits separately from `BudgetMonth`.

Pros:

- does not disturb existing lifecycle statuses.

Cons:

- more new tables and merging logic.
- higher risk of divergence from materializer.

### Option C: Budget-Plan-Only Editing

Only allow editing the budget plan from preview.

Pros:

- least backend change.

Cons:

- does not satisfy “edit next month only.”
- must not be labelled as next-month-only editing.

Recommendation: Option A if editable next month is truly required for MVP.

## Endpoint Sufficiency For Desired UI

| Desired UI | Supported today? | Notes |
| --- | --- | --- |
| Current month hero | Yes | Existing dashboard DTO. |
| This month card | Yes | Existing `DashboardSummary`. |
| Next month card without numbers | Partial | Can derive label; no safe route/data for numbers. |
| Next month projected numbers | No | Needs preview endpoint. |
| Budget plan card with totals | No | Needs plan summary or reuse preview without carry-over. |
| Active Next button to preview page | Frontend route missing; backend missing | Can be built after preview endpoint. |
| Edit next month only before close | No | Needs planned/draft month model. |
| Edit budget plan forward | Partial | Existing scope-aware commands by domain. |
| Estimated carry-over | Partial | Can compute from current live dashboard, but backend should own preview contract. |

