# PR 4 — Debt Lifecycle Actions

| | |
| --- | --- |
| **Type** | Backend feature slice |
| **Depends on** | PR 1.5 + PR 3 |
| **Blocks** | PR 5, PR 8, PR 10 |
| **Risk** | High — lifecycle changes affect future materialization and totals |

## Purpose

Add real backend commands for the target lifecycle UX:

- `Hoppa över denna månad`
- `Inkludera i maj`
- `Markera som betald`
- `Arkivera`
- `Återställ`
- safe remove where allowed

These are not planned-payment edits and not balance edits.

## Dependencies

- PR 1 source lifecycle and month participation exist.
- PR 1.5 seed cleanup and mutation/read hardening are complete.
- PR 3 balance event path exists so paid-off can optionally set balance to zero
  with a real balance audit event.
- PR 5 has not shipped yet, so this PR can still shape the action permission
  contract.

## Backend Scope

Add source lifecycle commands:

- mark source debt paid off
- archive source debt
- restore archived source debt
- soft-delete only where safe

Add month participation commands:

- not include current month
- include current month again
- remove month-only row where safe

## Files / Areas Likely Touched

- `Backend/Application/DTO/Budget/Months/Editor/Debt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/Lifecycle/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/Participation/*`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Debts/*`
- `Backend/Application/Abstractions/Infrastructure/Data/IBudgetMonthDebtMutationRepository.cs`
- `Backend/Application/Abstractions/Infrastructure/Data/IDebtsRepository.cs`
- `Backend/Application/Services/Budget/Materializer/BudgetMonthMaterializer.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthlyTotalsService.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/*`
- `Backend/Infrastructure/Repositories/Budget/Core/DebtsRepository.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/Editor/Debts/*`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorTests.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/CloseBudgetMonthCommandHandlerTests.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/BudgetMonthLifecycleMaterializationTests.cs`

## DTO / API Contracts

Participation:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/participation
```

```csharp
public sealed record SetBudgetMonthDebtParticipationRequestDto(
    string Participation,
    string? Note);
```

Allowed `Participation` values:

- `included`
- `notIncluded`

Mark paid off:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/mark-paid-off
```

```csharp
public sealed record MarkBudgetMonthDebtPaidOffRequestDto(
    bool SetBalanceToZero,
    string? Note);
```

Archive:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/archive
```

Restore:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{sourceDebtId}/restore
```

or a source route if the controller convention fits better:

```text
POST /api/budgets/debts/{sourceDebtId}/restore
```

Remove month-only row:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/remove
```

Prefer returning the updated editor row or a compact action result that PR 5 can
reuse.

## DB / Migration Expectations

No new lifecycle columns should be needed if PR 1 did its job. This PR may add a
source-level event table only if PR 3 did not create a generic debt event table.

Use soft state changes. Do not hard-delete debt rows with history.

## Validation Rules

General:

- open budget month required for month-scoped commands
- row/source must belong to the user's budget
- closed/skipped budget months rejected
- removed/deleted rows rejected unless restore explicitly supports them

Skip/not include:

- source lifecycle unchanged
- balance unchanged
- row remains visible
- monthly payment excluded from totals by participation, not by changing the
  planned payment value

Include again:

- source lifecycle must allow inclusion
- participation becomes `included`
- planned payment value remains whatever the row stores

Mark paid off:

- source-linked row required
- source lifecycle becomes `paidOff`
- future materialization stops
- historical rows remain
- if `SetBalanceToZero = true`, call PR 3 balance adjustment path in the same
  transaction and audit it separately
- current month participation decision must be explicit in code and tests; default
  recommendation is `notIncluded` unless product decides the final planned
  payment should still count this month

Archive:

- source-linked row required
- source lifecycle becomes `archived`
- future materialization stops
- current month row becomes `notIncluded` or `removed` by explicit tested
  decision
- restorable

Restore:

- archived source becomes `active`
- can create or re-include a current open month row if requested
- closed months remain untouched

Remove:

- month-only row can become `removed`
- source-linked row should prefer archive/notIncluded
- source soft-delete allowed only if no historical month rows exist or product
  accepts hiding while preserving history

## Audit / History Behavior

Write audit for every state transition:

- previous source lifecycle
- next source lifecycle
- previous participation
- next participation
- budget month
- actor
- timestamp
- note/reason

Use PR 3 balance event when paid-off also sets balance to zero. Do not collapse
the lifecycle event and balance event into one vague JSON blob.

## Dashboard / Month-Close / Recap Impact

- `notIncluded` rows contribute `0` to current payment outflow
- include again restores the row's planned payment contribution
- paid-off/archived/deleted sources do not materialize into future months
- not-included active debts may still count in liability balance
- removed rows do not count in payment or normal balance totals
- month close snapshots exclude not-included/removed rows from debt payment total
- recap must preserve historical rows and show participation/lifecycle change
  separately from balance change when read model supports it

## Frontend State / UX Contract

PR 8 can rely on:

- real endpoints exist for each lifecycle/participation action
- no action requires frontend to infer state from zero payment or zero balance
- action failures return stable reason codes suitable for disabled-copy mapping
- skip confirmation copy can truthfully say balance remains owed
- paid-off copy can truthfully say lifecycle changed, not that a payment was
  recorded

## Acceptance Criteria

- Lifecycle actions are real backend state changes.
- Month participation is real backend state.
- Future materialization follows source lifecycle.
- Dashboard/month-close totals follow month participation.
- Historical rows are preserved.
- Paid-off and balance-to-zero are audited as separate concepts.

## Tests To Add

- skip excludes payment outflow but leaves balance/source lifecycle unchanged
- include restores payment outflow
- skip/include rejected for closed/skipped months
- mark paid off stops future materialization
- mark paid off preserves historical month rows
- mark paid off optionally sets balance to zero through audited balance path
- archive stops future materialization
- archive affects current month participation by documented decision
- restore reactivates source and can reinsert/re-include current open month
- month-only remove hides/excludes row
- source-linked hard delete rejected when history exists
- dashboard equation updates after skip/re-include
- month close snapshot excludes skipped rows

## Validation

```bash
dotnet build
dotnet test tests/Backend.UnitTests --filter Debt
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebt
dotnet test tests/Backend.IntegrationTests --filter CloseBudgetMonth
```

## Explicit Non-Goals

- No frontend UI.
- No actual payment ledger.
- No automatic interest accrual.
- No automatic paid-off transition from `Balance = 0`.
