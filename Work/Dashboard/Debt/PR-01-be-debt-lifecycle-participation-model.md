# PR 1 — Debt Lifecycle And Month Participation Model

| | |
| --- | --- |
| **Type** | Backend schema/model foundation |
| **Depends on** | PR 0 |
| **Blocks** | PR 1.5-10 |
| **Risk** | High — this defines the state model used by every later write/read |

## Purpose

Create the real backend vocabulary for Debt state. Today `Debt.Status` and
`BudgetMonthDebt.Status` are both `active|closed`, which is too vague. The
target editor needs separate source lifecycle and month participation.

This PR adds the model only. No create/edit metadata endpoint, no balance
adjustment, no lifecycle action endpoints, and no frontend work.

## Dependencies

- Read `PR-00-source-analysis.md` first.
- Confirm current DDL in `Backend/SQL/MariaDB/`.
- Inspect materialization and dashboard/month-close reads before touching SQL.

## Backend Scope

Add two separate concepts:

Source lifecycle on `Debt`:

- `active`
- `paidOff`
- `archived`
- `deleted`

Month participation on `BudgetMonthDebt`:

- `included`
- `notIncluded`
- `removed`

Rules:

- only source lifecycle `active` materializes into future open months
- only participation `included` counts in monthly debt payment totals
- participation `notIncluded` keeps the debt visible and keeps balance owed
- participation `removed` is hidden by default and excluded from totals
- closed/skipped budget months remain immutable
- skip is never represented as `MonthlyPayment = 0`
- paid-off is never inferred from `Balance = 0`

## Files / Areas Likely Touched

- `Backend/SQL/MariaDB/*`
- `Backend/Application/Constants/BudgetMonthConstants.cs`
- `Backend/Application/Constants/DebtTypes.cs`
- `Backend/Application/Features/Budgets/Months/Models/*`
- `Backend/Application/Features/Budgets/Months/Models/Insert/BudgetMonthDebtSeedInsertModel.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Debts/*`
- `Backend/Application/Services/Budget/Materializer/BudgetMonthMaterializer.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthlyTotalsService.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthCloseSnapshotService.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Seed/BudgetMonthSeedSourceRepository.sql.cs`
- `Backend/Infrastructure/Repositories/Budget/BudgetDashboard/BudgetMonthDashboardRepository.sql.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/*`
- `Backend/Infrastructure/Repositories/Budget/Months/Recap/*` or recap query files if debt filters are inline there
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorTests.cs`
- `tests/Backend.IntegrationTests/Budget/Dashboard/BudgetDashboardMonthQueryHandlerTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/*`

## DB / Migration Expectations

Preferred migration shape:

- expand or replace `Debt.Status` so valid lifecycle values are `active`,
  `paidOff`, `archived`, `deleted`
- add `BudgetMonthDebt.ParticipationStatus varchar(20) not null default 'included'`
- add optional month participation metadata:
  - `ParticipationChangedAt`
  - `ParticipationReason`
- add optional source lifecycle metadata:
  - `PaidOffAt`
  - `ArchivedAt`
  - `DeletedAt`
  - `LifecycleReason`

Legacy mapping must be explicit:

- existing source `active` -> `active`
- existing source `closed` -> deliberate compatibility decision, preferably
  `paidOff` only if current data semantics support it
- existing month active/non-deleted rows -> `included`
- existing month deleted rows -> `removed`

Do not reuse `ClosedAt`/`ClosedReason` for archived/deleted semantics unless the
column names are clearly still truthful. Ambiguous columns become technical debt
immediately.

## DTO / API Contract

No public route shape needs to change in this PR unless existing DTOs must expose
the new values for compatibility tests. Existing editor reads can temporarily
return the old shape, but internal read models must carry:

- source lifecycle
- month participation
- removed/deleted flags

## Validation Rules

- status values must be constrained by constants, validators, or check
  constraints
- mutation guards must reject closed/skipped budget months exactly as today
- existing planned-payment patch must keep working for active/included rows
- patching `notIncluded`, `removed`, `paidOff`, `archived`, or `deleted` rows
  should fail unless a later PR adds an explicit command for that state

## Audit / History Behavior

No new user-facing action audit is required here. If migration changes existing
state, document the mapping in the migration. Existing `BudgetMonthChangeEvent`
behavior for planned-payment edits must remain unchanged.

## Dashboard / Month-Close / Recap Impact

Payment total:

```text
SUM(BudgetMonthDebt.MonthlyPayment)
where ParticipationStatus = 'included'
and row/source is not removed/deleted/archived/paidOff
```

Liability balance:

```text
SUM(BudgetMonthDebt.Balance)
for visible active liabilities, including notIncluded rows
```

Balance is not part of:

```text
income + carry-over - expenses - savings - debt payments = remaining
```

Month close snapshots must keep storing debt payment outflow, not liability.
Recap must keep enough source/month identity for later payment-vs-balance deltas.

## Frontend Contract

No UI in this PR. The only frontend-relevant outcome is that later reads can
distinguish:

- paid-off vs zero balance
- skipped/not-included vs zero payment
- archived vs removed
- source lifecycle vs current month participation

## Acceptance Criteria

- Source lifecycle and month participation are separate in schema and backend
  read/write models.
- Materialization creates month rows only for active source debts.
- Included rows count in debt payment totals; not-included and removed rows do
  not.
- Not-included active debts remain representable as owed liabilities.
- Existing debt planned-payment behavior still works for active/included rows.
- Closed/skipped budget months stay immutable.

## Tests To Add

- active source materializes as included month row
- paid-off source does not materialize
- archived source does not materialize
- deleted source does not materialize
- not-included row is excluded from payment total
- not-included row can still appear in an editor/read model as owed balance
- removed row is hidden/excluded by default
- closed/skipped budget month mutation still fails
- existing planned-payment patch remains compatible for active/included rows
- month close snapshot excludes not-included/removed rows from payment total

## Validation

```bash
dotnet build
dotnet test tests/Backend.UnitTests --filter Debt
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebt
dotnet test tests/Backend.IntegrationTests --filter BudgetDashboardMonth
```

## Explicit Non-Goals

- No debt creation after onboarding.
- No metadata edit endpoint.
- No balance adjustment endpoint.
- No paid-off/archive/restore/skip commands.
- No frontend UI.
