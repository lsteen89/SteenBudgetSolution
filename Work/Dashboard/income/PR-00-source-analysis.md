# PR 0 — Source Analysis And Implementation Contract

| | |
| --- | --- |
| **Type** | Planning / no production code |
| **Depends on** | Nothing |
| **Blocks** | PR 1–6 |
| **Risk** | None |

## 1. Exact Income Data Model

Baseline budget-plan tables:

- `Income`
  - `Id`, `BudgetId`
  - `NetSalaryMonthly decimal(18,2)`
  - `SalaryFrequency int`
  - `IncomePaymentDayType varchar(30)`
  - `IncomePaymentDay tinyint null`
- `IncomeSideHustle`
  - `Id`, `IncomeId`, `Name`, `IncomeMonthly`, `Frequency`
  - `IsActive`, `EndedAt`
- `IncomeHouseholdMember`
  - `Id`, `IncomeId`, `Name`, `IncomeMonthly`, `Frequency`
  - `IsActive`, `EndedAt`

Month tables:

- `BudgetMonthIncome`
  - `Id`, `BudgetMonthId`, `SourceIncomeId`
  - `NetSalaryMonthly`, `SalaryFrequency`
  - payment timing fields
  - `IsOverride`, `IsDeleted`
- `BudgetMonthIncomeSideHustle`
  - `Id`, `BudgetMonthIncomeId`, `SourceSideHustleId`
  - `Name`, `IncomeMonthly`, `Frequency`
  - `IsActive`, `IsOverride`, `IsDeleted`, `SortOrder`
- `BudgetMonthIncomeHouseholdMember`
  - `Id`, `BudgetMonthIncomeId`, `SourceHouseholdMemberId`
  - same shape as side hustle

Row kind mapping:

- salary row = `BudgetMonthIncome`
- side income row = `BudgetMonthIncomeSideHustle`
- household row = `BudgetMonthIncomeHouseholdMember`

Month-only meaning:

- salary is source-linked through `BudgetMonthIncome.SourceIncomeId`
- side/household rows are month-only when their source id is null
- create endpoint always writes null source id

## 2. Wizard Flow

Frontend wizard step 1 stores:

- `netSalary`
- `salaryFrequency`
- `incomePaymentDayType`
- `incomePaymentDay`
- `householdMembers[]`
- `sideHustles[]`

Backend save-step flow:

- `IncomeStepValidator` deserializes `IncomeFormValues`
- `IncomeSanitizer` trims payment type and row names, drops empty rows, and
  nulls `IncomePaymentDay` when type is `lastDayOfMonth`
- `IncomeValidator` requires non-zero salary, valid frequencies, valid payment
  timing, and complete non-empty child rows

Finalization flow:

- `IncomeStepProcessor` deserializes `IncomeData`
- payment timing is normalized:
  - missing type and missing day becomes `lastDayOfMonth`
  - `dayOfMonth` requires day 1–28
  - `lastDayOfMonth` requires null day
- `FinalizeBudgetTarget.ApplyIncomeAsync` maps DTO to domain and calls
  `IncomeRepository.AddAsync`
- `IncomeMapping.ToDomain` converts submitted frequencies to monthly values via
  `FrequencyConversion.ToMonthly`
- `IncomeRepository.AddAsync` inserts `Income`, then child side/household rows

## 3. Materialization Flow

`BudgetMonthLifecycleService.EnsureAccessibleMonthAsync` ensures the requested
month exists, then calls `BudgetMonthMaterializer.MaterializeIfMissingAsync`.

Income materialization:

1. Load baseline `Income`.
2. Load active side hustles:
   - `IncomeSideHustle.IsActive = 1`
   - `EndedAt IS NULL`
3. Load active household rows:
   - `IncomeHouseholdMember.IsActive = 1`
   - `EndedAt IS NULL`
4. Insert one `BudgetMonthIncome` if missing.
5. Insert linked `BudgetMonthIncomeSideHustle` rows idempotently.
6. Insert linked `BudgetMonthIncomeHouseholdMember` rows idempotently.

If the plan has no baseline income row, materialization still inserts
`BudgetMonthIncome` with salary `0`, default salary frequency `1`, and null
source id.

## 4. Endpoints

Base route: `/api/budgets`.

Income editor:

- `GET /months/{yearMonth}/income-items`
  - returns all month income rows, including deleted rows
- `POST /months/{yearMonth}/income-items`
  - creates side/household month-only row
- `PATCH /months/{yearMonth}/income-items/{monthIncomeItemId}`
  - edits one salary, side, or household row
- `PATCH /months/{yearMonth}/income-items`
  - transactional bulk patch
- `DELETE /months/{yearMonth}/income-items/{monthIncomeItemId}`
  - soft-deletes side/household month row

Salary payment timing:

- `PUT /api/users/salary-payment-timing`
  - updates current month timing
  - optionally updates baseline plan timing with `UpdateCurrentAndFuture`

No income category endpoints exist.

## 5. DTOs

Read DTO:

```csharp
BudgetMonthIncomeItemEditorRowDto(
    Guid Id,
    Guid? SourceIncomeItemId,
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault)
```

Create request:

```csharp
CreateBudgetMonthIncomeItemRequestDto(
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive)
```

Patch request:

```csharp
PatchBudgetMonthIncomeItemRequestDto(
    string? Name,
    decimal? AmountMonthly,
    bool? IsActive,
    bool UpdateDefault,
    string? Scope = null)
```

Bulk patch request wraps rows with `MonthIncomeItemId` plus the same patch
fields.

Current frontend type mirrors this in
`Frontend/src/types/budget/BudgetMonthsStatusDto.ts`.

## 6. Mutation Behavior

Valid edit scopes:

- `currentMonthOnly`
- `currentMonthAndBudgetPlan`
- `budgetPlanOnly`

Default scope fallback:

- explicit valid `scope` wins
- otherwise `updateDefault = true` means `currentMonthAndBudgetPlan`
- otherwise `currentMonthOnly`

Patch rules:

- all patch commands require an open month
- amount must be non-negative
- name can be changed only for side/household rows
- salary name is always returned as `Net salary`
- salary is always active
- side/household `IsActive` can change
- plan-writing scopes require `SourceIncomeItemId != null`
- plan-writing scopes verify the linked baseline row still exists
- `budgetPlanOnly` updates the plan row and returns the unchanged month values

Create rules:

- only `sideHustle` and `householdMember` are valid
- created rows are month-only
- created rows cannot write to plan
- amount may be `0`

Delete rules:

- salary cannot be deleted
- delete soft-deletes only the month child row
- delete does not change the plan row

Bulk rules:

- request must contain at least one row
- duplicate `MonthIncomeItemId` values are rejected
- backend transaction makes the request all-or-nothing
- one audit event is written per changed row

## 7. Active/Inactive And Lifecycle

Income has no subscription-style lifecycle.

Real state fields:

- `IsActive`
- `IsDeleted`
- baseline `EndedAt` used only to exclude future materialization

There is no paused/cancelled income status. UI copy must not say `Pausad`.
The honest inactive label is `Inaktiv denna månad`.

## 8. Closed, Skipped, And Read-Only Months

Read behavior:

- `GET /income-items` uses `EnsureAccessibleMonthAsync`
- it can read historical closed/skipped months if the month exists
- read DTO does not include month status; the page must get editability from
  month/dashboard/month-status data

Write behavior:

- create, patch, bulk patch, and delete all load month meta
- any status other than `open` fails with `BudgetMonth.MonthIsClosed`
- integration tests cover closed and skipped mutation rejection

Current frontend behavior:

- `IncomeEditorPage` always selects the open month from month status
- it does not expose closed/skipped historical editing today
- row actions are disabled through `readOnly`, but because the page selects the
  open month only, historical read-only behavior is mostly backend-enforced

## 9. Dashboard Total Behavior

Open month dashboard:

- `BudgetMonthDashboardRepository` reads month tables
- income total is:
  `NetSalaryMonthly + active side income + active household income`
- side/household rows count only when:
  - parent month income is not deleted
  - row is not deleted
  - row is active

Projected dashboard:

- `BudgetDashboardProjector` builds `IncomeOverviewDto`
- `IncomeOverviewDto.TotalIncomeMonthly` sums salary, side, and household
- final balance with carry-over is:
  `income - expenses - savings - debt payments + carryOver`

Closed month dashboard:

- closed months return `SnapshotTotals`, not live dashboard data
- snapshot income comes from `BudgetMonthCloseSnapshotService`
- snapshot income uses the same monthly totals service

Skipped month dashboard:

- returns month metadata
- `liveDashboard = null`
- `snapshotTotals = null`

Carry-over is not income. It is added separately in dashboard final balance.

## 10. Frontend Existing Pieces

Income page:

- `IncomeEditorPage.tsx`
- `IncomeLedgerSection.tsx`
- `IncomeItemModal.tsx`
- `DeleteIncomeItemDialog.tsx`

Hooks:

- `useBudgetMonthIncomeItems`
- `useCreateBudgetMonthIncomeItem`
- `usePatchBudgetMonthIncomeItem`
- `usePatchBudgetMonthIncomeItemsBulk`
- `useDeleteBudgetMonthIncomeItem`
- `useBudgetDashboardMonthQuery`
- `useBudgetMonthsStatusQuery`

Shared editor primitives:

- `BudgetEditorPageShell`
- `BudgetEditorWorkspaceBar`
- `BudgetEntryModalShell`
- `BudgetEditorRowActionsMenu`
- `EditScopeRadioCards`
- `MoneyInput`

Frontend gaps:

- no income hero matching expenses
- no income allocation strip with savings/debts included
- no income ledger grouping VM/utils
- no source-plan fields for honest plan deltas
- inactive copy currently says paused
- global add and group add do not yet have distinct create behavior
- salary drawer needs stricter approved behavior:
  - no scope cards
  - name disabled with explanation
  - active toggle disabled/explained as always active
- bulk patch hook exists but the page currently saves one row at a time

## 11. Implementation Contract

Build with existing backend behavior:

- PR 1 extracts shared editor primitives while keeping expenses unchanged.
- PR 2 can use dashboard aggregate totals for the equation.
- PR 3 can group rows by `salary`, `householdMember`, and `sideHustle`.
- PR 4 can use existing scope cards and enforce month-only plan-scope gating.
- PR 5 is required before any `Ändrad i {månad}` plan-delta UI.

Designer handover refinements:

- use `Fritt kvar` consistently
- use `Sidoinkomst`, not `Sidointäkt`
- global add shows type selector; group add preselects and hides type selector
- inactive rows are visible in their own quiet subsection
- salary has no row lock icon and no scope cards
- closed/read-only months hide edit affordances, not just rely on backend
- multi-row saves must use transactional bulk patch

Do not implement:

- income categories
- paused/cancelled lifecycle
- future-plan creation
- fake baseline/source deltas
- fake allocation numbers

Validation for this PR: docs-only diff.
