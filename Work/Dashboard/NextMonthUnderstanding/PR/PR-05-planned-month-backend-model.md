# PR 5: Planned Month Backend Model

## Goal

Add a persisted `planned` budget month model so users can edit next month before the current month closes without allowing multiple open months.

## Scope In

- Add `planned` as a real budget month lifecycle status.
- Enforce one open month max per budget.
- Enforce one planned immediate-next month max per budget.
- Planned month year-month must equal open month + 1.
- Materialize planned month from budget plan rows when explicitly requested.
- Allow planned month rows to be edited by later editor APIs.
- Promote planned month to open when current month closes.
- Apply final carry-over during promotion/close flow.
- Preserve planned row edits.

## Scope Out

- No frontend edit UX.
- No editor route refactor.
- No multiple open months.
- No automatic rewrite of budget-plan foundation tables on close.
- No silent plan-forward side effects.

## Backend Files / Areas Likely Touched

- MariaDB schema/init/migration scripts for allowed status/check constraints.
- `Backend/Application/Constants/BudgetMonthConstants.cs`
- `Backend/Application/Services/Budget/Months/BudgetMonthLifecycleService.cs`
- `Backend/Application/Services/Budget/Materializer/BudgetMonthMaterializer.cs`
- `Backend/Application/Features/Budgets/Months/CloseBudgetMonth/*`
- `Backend/Application/Features/Budgets/Months/StartBudgetMonth/*`
- `Backend/Application/Features/Budgets/Months/GetBudgetMonthsStatus/*`
- `Backend/Infrastructure/Repositories/Budget/Months/*`
- Integration tests around lifecycle and month materialization.

## Frontend Files / Areas Likely Touched

None required for backend PR beyond type compile fallout if API DTOs change.

## Data Contracts / DTOs

Extend month status DTOs to represent:

- `open`
- `planned`
- `closed`
- `skipped`

Potential new endpoint:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
```

Potential read endpoint:

```http
GET /api/budgets/months/{plannedYearMonth}/planned-dashboard
```

Only add endpoints needed by the agreed implementation. Do not expose broad future-month editing casually.

## Tests Required

- Cannot create two open months.
- Cannot create two planned months.
- Cannot create planned month that is not immediate next.
- Planned month materializes from budget plan.
- Planned month creation does not close current month.
- Close flow promotes planned month to open.
- Final carry-over replaces estimated carry-over during close.
- Planned edits are preserved through promotion.
- Budget-plan tables are not rewritten on close.
- Closed/skipped months remain immutable.

## Risks

- High-risk lifecycle change.
- Schema/data migration mistakes.
- Accidentally breaking current close/start behavior.
- Hidden plan-forward mutation.
- Existing editor guards may reject `planned` until PR 6.

## Dependencies

- MVP PRs 1-4 should already be stable.

## Definition Of Done

- `planned` lifecycle exists and is tested end-to-end.
- One-open-month invariant remains intact.
- Planned month promotion is deterministic.
- Close flow applies final carry-over correctly.
- No budget-plan side effects occur unless explicitly requested by a separate edit scope.

