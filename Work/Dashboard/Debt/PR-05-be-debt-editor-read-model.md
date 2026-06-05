# PR 5 — Full Debt Editor Read Model

| | |
| --- | --- |
| **Type** | Backend read model / frontend contract |
| **Depends on** | PR 1.5-4 |
| **Blocks** | PR 6-10 |
| **Risk** | Medium — frontend must not infer financial state |

## Purpose

Expose one trustworthy read model for the target Debt editor. The frontend must
not guess paid-off, archived, skipped, changed, progress, or permissions from
labels, zero values, or local math.

## Dependencies

- PR 1 lifecycle/participation model exists.
- PR 1.5 seed cleanup and mutation/read hardening are complete.
- PR 2 create/edit metadata exists.
- PR 3 balance history exists.
- PR 4 lifecycle/participation actions exist.

## Backend Scope

Build the target editor read endpoint and DTOs:

- month meta
- summary totals
- grouped rows
- source/month field pairs
- lifecycle and participation values
- action permissions
- disabled reason codes
- progress/history only when real backend data exists

## Files / Areas Likely Touched

- `Backend/Application/DTO/Budget/Months/Editor/Debt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebts/*`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Debts/*`
- `Backend/Application/Abstractions/Infrastructure/Data/IBudgetMonthDebtMutationRepository.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/*`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorTests.cs`
- `tests/Backend.IntegrationTests/Budget/Dashboard/BudgetDashboardMonthQueryHandlerTests.cs`

## DTO / API Contract

Preferred route:

```text
GET /api/budgets/months/{yearMonth}/debt-editor
```

Keep the existing row endpoint if needed for compatibility:

```text
GET /api/budgets/months/{yearMonth}/debt-items
```

Recommended response:

```csharp
public sealed record BudgetMonthDebtEditorDto(
    string YearMonth,
    string MonthStatus,
    bool IsReadOnly,
    DebtEditorSummaryDto Summary,
    IReadOnlyList<BudgetMonthDebtEditorRowDto> Rows,
    IReadOnlyList<DebtEditorHistoryEventDto> RecentEvents);
```

Summary:

```csharp
public sealed record DebtEditorSummaryDto(
    decimal IncludedMonthlyPaymentTotal,
    decimal NotIncludedMonthlyPaymentTotal,
    decimal ActiveLiabilityBalanceTotal,
    decimal PaidOffBalanceTotal,
    decimal ArchivedBalanceTotal,
    int IncludedCount,
    int NotIncludedCount,
    int PaidOffCount,
    int ArchivedCount);
```

> **Implementation note (post-PR-5):** `RemainingAfterDebtPayments` is
> intentionally **not** on this DTO. The Debt editor frontend already
> reads remaining-money from the dashboard query
> (`useBudgetDashboardMonthQuery`); duplicating it on this endpoint
> would force the read to recompute the equation across unrelated
> domains (income / expenses / savings) and risk the two endpoints
> disagreeing during a transactional gap. PR 6 must keep reading
> remaining from the dashboard, not this summary.

Row fields:

- `Id`
- `SourceDebtId`
- `Name`
- `Type`
- `Balance`
- `SourceBalance`
- `Apr`
- `SourceApr`
- `MonthlyFee`
- `SourceMonthlyFee`
- `MinPayment`
- `SourceMinPayment`
- `TermMonths`
- `SourceTermMonths`
- `MonthlyPayment`
- `SourceMonthlyPayment`
- `SourceLifecycleStatus`
- `ParticipationStatus`
- `IsMonthOnly`
- `IsRemoved`
- `SortOrder`
- `Group`
- `Progress`
- `Actions`
- `DisabledReasons`

Action permissions:

- `CanEditPayment`
- `CanEditDetails`
- `CanUpdateBalance`
- `CanSkipThisMonth`
- `CanIncludeThisMonth`
- `CanMarkPaidOff`
- `CanArchive`
- `CanRestore`
- `CanRemove`
- `CanUpdatePlan`

Reason codes:

- `monthClosed`
- `monthSkipped`
- `monthOnlyNoPlan`
- `sourceMissing`
- `sourceArchived`
- `sourcePaidOff`
- `sourceDeleted`
- `rowRemoved`
- `historyExistsCannotDelete`
- `unsupportedUntilBackend`

## DB / Migration Expectations

No migration expected. This is a read-model/query PR. If query performance needs
indexes, propose them explicitly and keep them small.

## Validation Rules

- closed/skipped budget months return `IsReadOnly = true`
- permissions must match backend command guards from PR 2-4
- progress is null unless structured history exists
- `ChangedInMonth` / changed-pill data is present only when source/month
  comparison data exists
- archived rows appear only in the archived group or when explicitly requested
- removed rows are hidden by default unless needed for audit/history view

## Audit / History Behavior

No new events are written. The endpoint reads:

- `BudgetMonthChangeEvent` where needed for recent month changes
- PR 3 balance/debt event history for balance progress
- lifecycle/participation events from PR 4 where available

Do not parse arbitrary audit JSON in the frontend. If parsing is needed, do it
in backend and return typed DTOs.

## Dashboard / Month-Close / Recap Impact

Read-model summary must reconcile with the dashboard for the same month:

```text
remaining = income + carryOver - expenses - savings - includedDebtPayments
```

Balance totals are separate:

- included/not-included active liability balance can be shown as owed balance
- paid-off/archived totals must not leak into normal monthly payment totals
- skipped/not-included monthly payment total may be shown as excluded amount

## Frontend State / UX Contract

PR 6-9 can render from this contract without local financial inference:

- hero planned payment = `IncludedMonthlyPaymentTotal`
- balance snapshot = active liability balance supplied by backend
- ledger groups = `Group` or lifecycle/participation fields
- row actions = `Actions`
- disabled tooltips/copy = `DisabledReasons`
- progress bars/history = `Progress`, never computed from mock data

## Acceptance Criteria

- Frontend can render the target Debt editor without guessing backend rules.
- Dashboard and editor summaries reconcile.
- Action permissions are explicit and match command behavior.
- Payment, balance, lifecycle, and participation are separate fields.
- Progress/history and changed markers appear only from real read-model data.

## Tests To Add

- read model includes source and month values
- month-only row has null source values and correct permissions
- not-included row appears with excluded payment summary
- paid-off source row appears in paid group/history as designed
- archived source row appears in archived group
- closed/skipped month returns read-only permissions
- action permissions match command guards
- summary totals reconcile with dashboard for same month
- progress null when no balance events exist
- progress populated from structured balance events
- changed/month delta field appears only when source/month comparison exists

## Validation

```bash
dotnet build
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebtEditor
dotnet test tests/Backend.IntegrationTests --filter BudgetDashboardMonth
```

## Explicit Non-Goals

- No new mutations.
- No frontend implementation.
- No fake progress/history synthesis.
