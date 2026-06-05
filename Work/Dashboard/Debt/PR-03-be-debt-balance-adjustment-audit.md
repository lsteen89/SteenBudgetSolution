# PR 3 — Debt Balance Adjustment And Audit History

| | |
| --- | --- |
| **Type** | Backend feature slice |
| **Depends on** | PR 1.5 |
| **Blocks** | PR 4, PR 5, PR 9, PR 10 |
| **Risk** | High — liability changes must be auditable and separate from payments |

## Purpose

Add `Uppdatera saldo`. Current debt balance is copied from onboarding and cannot
be changed honestly. Planned payment edits must never reduce balance.

This PR creates a separate command and structured history for liability balance.

## Dependencies

- PR 1 lifecycle/participation model is present.
- PR 1.5 guard/read hardening is complete so balance writes do not build on
  inconsistent Debt editor mutation behavior.
- Existing planned-payment patch and audit behavior are understood.
- PR 2 may exist, but this PR should not depend on PR 2 unless implementation
  ordering makes shared validators unavoidable.

## Backend Scope

Add a balance adjustment command that:

- updates only `Balance`
- supports month/source scopes
- writes structured balance history
- preserves planned monthly payment
- never auto-marks debt as paid off when new balance is `0`

## Files / Areas Likely Touched

- `Backend/SQL/MariaDB/*`
- `Backend/Application/DTO/Budget/Months/Editor/Debt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/AdjustBalance/*`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Debts/*`
- `Backend/Application/Abstractions/Infrastructure/Data/IBudgetMonthDebtMutationRepository.cs`
- `Backend/Application/Abstractions/Infrastructure/Data/IDebtBalanceEventRepository.cs` or equivalent
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/*`
- `Backend/Infrastructure/Repositories/Budget/Core/*`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/Editor/Debts/*`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorTests.cs`

## DTO / API Contract

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/balance-adjustments
```

```csharp
public sealed record AdjustBudgetMonthDebtBalanceRequestDto(
    decimal NewBalance,
    string Scope,
    string? Note);
```

Scopes:

- `currentMonthOnly`
- `currentMonthAndBudgetPlan`
- `budgetPlanOnly`

Plan scopes require `SourceDebtId`.

Response should return enough for PR 5/PR 9 to refresh without guessing:

- affected month debt id
- source debt id, if any
- old balance
- new balance
- delta
- scope
- changed at
- planned monthly payment unchanged value

## DB / Migration Expectations

Add structured history. Preferred table:

```text
DebtBalanceEvent
```

Suggested columns:

- `Id`
- `BudgetId`
- `DebtId null`
- `BudgetMonthDebtId null`
- `BudgetMonthId null`
- `OldBalance decimal(18,2)`
- `NewBalance decimal(18,2)`
- `Delta decimal(18,2)`
- `Scope varchar(50)`
- `Note varchar(...) null`
- `ChangedByUserId binary(16)`
- `ChangedAt datetime`

If using a generic `DebtChangeEvent`, balance fields must still be first-class
columns or otherwise queryable without parsing arbitrary JSON for progress.

## Validation Rules

- open budget month required
- row must exist and belong to the user's budget/month
- removed/deleted rows rejected
- source lifecycle `paidOff`, `archived`, `deleted` rejected unless a later PR
  defines an explicit restore/update path
- not-included rows allowed because balance can still be owed
- new balance `>= 0`
- decimal precision/scale follows money rules
- note length capped
- invalid scope rejected
- month-only rows reject plan scopes
- no-op behavior must be deliberate: either no event or explicit no-op event,
  with tests documenting the choice

## Audit / History Behavior

Always distinguish balance adjustment from planned payment edit.

Write:

- `DebtBalanceEvent` / structured debt history for every real balance change
- `BudgetMonthChangeEvent` when the month row changes

History must include:

- old balance
- new balance
- delta
- scope
- actor
- timestamp
- optional note

Do not write an actual-payment event. This PR records a balance correction, not
proof of money leaving an account.

## Dashboard / Month-Close / Recap Impact

- monthly debt payment totals do not change
- remaining cash equation does not change
- liability balance totals may change
- month close payment snapshot remains unchanged unless the implementation also
  snapshots balance elsewhere
- recap can later show balance delta separately from payment delta

## Frontend State / UX Contract

PR 9 can rely on:

- balance update is a distinct endpoint
- returned/audited delta is balance-only
- planned payment remains unchanged
- zero balance does not imply paid-off lifecycle
- progress/history reads can be built from structured events

## Acceptance Criteria

- Balance can be updated manually with scope-aware behavior.
- Balance changes are auditable.
- Planned monthly payment is untouched.
- Zero balance does not mark paid off.
- Current month remaining-money math is unaffected.
- Future read model can expose progress/history without frontend inference.

## Tests To Add

- current-month balance adjustment changes month row only
- current+plan adjustment changes month row and source
- plan-only adjustment changes source only
- month-only row rejects plan scopes
- adjustment to zero does not mark paid-off
- planned monthly payment unchanged
- closed/skipped budget month rejected
- not-included row can be adjusted
- deleted/removed row rejected
- history row contains old/new/delta/scope/note
- dashboard payment total unchanged after balance update
- validator coverage for negative balance, invalid scope, note length, scale

## Validation

```bash
dotnet build
dotnet test tests/Backend.UnitTests --filter Debt
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebt
```

## Explicit Non-Goals

- No actual payment ledger.
- No interest accrual.
- No paid-off/archive/restore/skip actions.
- No frontend UI.
