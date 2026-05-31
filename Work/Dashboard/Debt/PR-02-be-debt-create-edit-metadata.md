# PR 2 — Debt Create And Edit Metadata Endpoints

| | |
| --- | --- |
| **Type** | Backend feature slice |
| **Depends on** | PR 1.5 |
| **Blocks** | PR 5, PR 7, PR 10 |
| **Risk** | High — scope writes must not corrupt current month vs plan state |

## Purpose

Add the backend surface for `Lägg till skuld` and `Redigera uppgifter`.
Current production behavior only creates debts during onboarding and only edits
`MonthlyPayment` in the Debt editor.

Balance adjustment after creation is not part of this PR. It belongs to PR 3.

## Dependencies

- PR 1 source lifecycle and month participation constants/columns exist.
- PR 1.5 seed cleanup, wizard materialization verification, bulk mutation
  guard parity, and removed-row read filtering are complete.
- Existing planned-payment patch semantics are understood and preserved or
  cleanly superseded.
- Wizard debt validation is inspected and reused where it is still correct.

## Backend Scope

Create debt after onboarding:

- create month-only `BudgetMonthDebt`
- create plan-linked source `Debt` plus current month row
- create plan-only source `Debt` that starts in future materialization

Edit debt metadata:

- `Name`
- `Type`
- `Apr`
- `MonthlyFee`
- `MinPayment`
- `TermMonths`
- `MonthlyPayment`

Create only:

- initial `Balance`

Editing details must not change balance after creation.

## Files / Areas Likely Touched

- `Backend/Application/DTO/Budget/Months/Editor/Debt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/CreateDebt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/PatchDebtDetails/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/PatchDebt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Debts/*`
- `Backend/Application/Abstractions/Infrastructure/Data/IBudgetMonthDebtMutationRepository.cs`
- `Backend/Application/Abstractions/Infrastructure/Data/IDebtsRepository.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/*`
- `Backend/Infrastructure/Repositories/Budget/Core/DebtsRepository.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/Editor/Debts/*`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorTests.cs`

## DTO / API Contracts

Create:

```text
POST /api/budgets/months/{yearMonth}/debt-items
```

```csharp
public sealed record CreateBudgetMonthDebtRequestDto(
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string Scope);
```

Create scopes:

- `currentMonthOnly`
- `currentMonthAndBudgetPlan`
- `budgetPlanOnly`

Details edit:

```text
PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/details
```

```csharp
public sealed record PatchBudgetMonthDebtDetailsRequestDto(
    string Name,
    string Type,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string Scope);
```

Edit scopes:

- `currentMonthOnly`: update month row only
- `currentMonthAndBudgetPlan`: update month row and linked source
- `budgetPlanOnly`: update linked source only

Plan scopes require `SourceDebtId`. Month-only rows must return the existing
style of domain error, e.g. `BudgetMonthDebt.CannotUpdatePlanForMonthOnlyRow`.

## DB / Migration Expectations

No new migration is expected if PR 1 already added lifecycle/participation. This
PR writes existing debt columns and PR 1 state columns:

- source lifecycle defaults to `active`
- current month participation defaults to `included`
- `SourceDebtId = null` means month-only

Do not add balance-history tables here.

## Validation Rules

Reuse wizard rules where possible:

- name required, trimmed, max length matches DB
- type must match `DebtTypes` constants
- balance `>= 0` on create
- APR `>= 0`
- monthly fee `>= 0` when present
- minimum payment `>= 0` when present
- monthly payment `>= 0`
- term months positive when present
- revolving/credit-card type requires minimum payment if wizard rules require it
- installment/bank-loan type requires term months if wizard rules require it
- money values obey existing decimal precision/scale
- invalid scope rejected
- open budget month required
- archived/paidOff/deleted/removed rows rejected for detail edits unless a later
  explicit restore path reactivates them

Do not silently recalculate `MonthlyPayment` when APR/term changes. That would
be clever and wrong. The user edits planned payment explicitly.

## Audit / History Behavior

Write `BudgetMonthChangeEvent` for month row creation/update.

Audit JSON must distinguish:

- `scope`
- `monthValuesBefore`
- `monthValuesAfter`
- `sourceValuesBefore`
- `sourceValuesAfter`
- `sourceCreated`
- `monthRowCreated`

If source-level event infrastructure exists from PR 1, also write source events
for source create/update. If not, document that PR 3 introduces structured debt
history and keep this PR honest in changelog/risk notes.

## Dashboard / Month-Close / Recap Impact

- creating or editing an included current month row affects debt payment totals
- creating `budgetPlanOnly` must not affect current month totals
- editing `budgetPlanOnly` must not affect current month totals
- editing details must not change balance
- month close snapshots continue to use included monthly payments only
- recap can compare source-linked rows by `SourceDebtId`; month-only rows have no
  source comparison

## Frontend State / UX Contract

PR 7 can rely on:

- create result identifies whether a source row and/or current month row exists
- month-only rows report `SourceDebtId = null`
- plan scopes fail cleanly for month-only rows
- backend returns validation errors with field-level detail where current patterns
  support it
- balance is not editable in details mode after creation

## Acceptance Criteria

- Debt can be created after onboarding.
- Month-only, current+plan, and plan-only creation are separate backend paths.
- Details can be edited with scope-aware behavior.
- Plan scopes are rejected for month-only rows.
- Balance is not adjusted by detail edit after creation.
- Existing planned-payment patch either remains compatible or is replaced by a
  route with equivalent behavior and tests.

## Tests To Add

- create month-only debt
- create current+plan debt
- create plan-only debt
- create rejects closed/skipped month
- create audit includes source/month creation flags
- edit month-only current month only
- edit source-linked current month only
- edit source-linked current month and plan
- edit source-linked plan only
- plan scopes rejected for month-only row
- detail edit does not change balance
- included current month create/edit changes dashboard debt payment total
- plan-only create/edit does not change dashboard debt payment total
- validator coverage for invalid type/name/money/scope/required fields

## Validation

```bash
dotnet build
dotnet test tests/Backend.UnitTests --filter Debt
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebtEditor
```

## Explicit Non-Goals

- No balance adjustment after creation.
- No paid-off/archive/restore/skip commands.
- No repayment progress/history UI.
- No actual payment ledger.
- No frontend implementation.
