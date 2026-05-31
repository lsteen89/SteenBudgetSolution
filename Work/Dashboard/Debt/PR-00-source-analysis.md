# PR 0 — Source Analysis And Target Contract

| | |
| --- | --- |
| **Type** | Planning / no production code |
| **Depends on** | Nothing |
| **Blocks** | PR 1-10 |
| **Risk** | None |

## 1. Why This PR Exists

Debt is financially and emotionally sensitive. The target editor will support
add/edit, balance updates, paid-off, archive/restore, skip/not-included, and
progress. Those features cannot be faked in the frontend. This document records
the current repo reality and the backend contracts future PRs must create.

No production code changes in this PR.

Designer handover now lives locally:

- `explorations/debt/MVP-Debt v2.html` — target-state mockup
- `explorations/debt/debt-editor-handover.md` — canonical design handover
- `explorations/debt/MVP-Debt v1.html` — Stage-0 reference
- `explorations/income/MVP-Income v1.html` — sibling editor grammar

Use the handover for UX direction, but backend reality wins when the prototype
uses mock-only progress, changed, paid, skipped, archived, or balance data.

## 2. Current Data Model

Budget-level strategy:

- `Budget.DebtRepaymentStrategy varchar(50) null`
  - set during wizard finalization
  - read by month-aware dashboard through `BudgetMonthDashboardRepository`
  - baseline dashboard repository currently returns `RepaymentStrategy.Unknown`

Source table: `Debt`

- `Id binary(16) primary key`
- `BudgetId binary(16) not null`
- `Name varchar(255) not null`
- `Type varchar(50) not null`
- `Balance decimal(18,2) not null`
- `Apr decimal(18,2) not null`
- `MonthlyFee decimal(18,2) null`
- `MinPayment decimal(18,2) null`
- `TermMonths int null`
- `MonthlyPayment decimal(18,2) not null default 0.00`
- `OpenedAt datetime not null default current_timestamp`
- `ClosedAt datetime null`
- `Status varchar(20) not null default 'active'`
- `ClosedReason varchar(100) null`
- audit columns
- check: `Status in ('active','closed')`

Month table: `BudgetMonthDebt`

- `Id binary(16) primary key`
- `BudgetMonthId binary(16) not null`
- `SourceDebtId binary(16) null`
- `Name`, `Type`, `Balance`, `Apr`, `MonthlyFee`, `MinPayment`, `TermMonths`
- `MonthlyPayment decimal(18,2) not null default 0.00`
- `OpenedAt`
- `Status varchar(20) not null default 'active'`
- `ClosedAt`
- `ClosedReason`
- `IsOverride`
- `IsDeleted`
- `SortOrder`
- audit columns
- check: `Status in ('active','closed')`
- unique key: `(BudgetMonthId, SourceDebtId)`

Snapshot/audit tables:

- `BudgetMonth.SnapshotTotalDebtPaymentsMonthly`
- `BudgetMonth.SnapshotFinalBalanceMonthly`
- `BudgetMonthChangeEvent`
  - `EntityType = 'debt'`
  - `ChangeType = 'updated'` for planned-payment edits
  - `ChangeSetJson` stores before/after `monthPayment` and/or `planPayment`

Missing today:

- debt create endpoint after onboarding
- month-only debt create endpoint
- metadata edit endpoint
- balance adjustment endpoint
- paid-off/archive/restore endpoint
- skip/not-included endpoint
- source debt event/history table
- structured balance history
- repayment progress read model

## 3. Current Flow

Onboarding:

- Frontend wizard step 4 captures debt rows and repayment strategy.
- `DebtsStepValidator` and `DebtsValidator` validate wizard payload.
- `DebtStepProcessor` deserializes `DebtData`.
- `FinalizeBudgetTarget.ApplyDebtAsync` maps DTO via `DebtMapping.ToDomain`.
- `BudgetRepository.UpdateRepaymentStrategyAsync` writes strategy.
- `DebtsRepository.AddDebtsAsync` inserts source `Debt` rows.
- `DebtPaymentCalculator.CalculateMonthlyPayment` seeds `Debt.MonthlyPayment`.

Materialization:

1. `BudgetMonthLifecycleService.EnsureAccessibleMonthAsync` ensures the month.
2. `BudgetMonthSeedSourceRepository.GetActiveDebtsAsync` loads source debts
   where `Debt.Status = 'active'`.
3. `BudgetMonthMaterializer` maps active source debts into
   `BudgetMonthDebtSeedInsertModel`.
4. `BudgetMonthMaterializationRepository.InsertBudgetMonthDebtsIdempotentAsync`
   inserts month rows with copied balance/payment/detail fields.
5. Closed source debts do not materialize.

Editor endpoints:

- `GET /api/budgets/months/{yearMonth}/debt-items`
- `PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}`
- `PATCH /api/budgets/months/{yearMonth}/debt-items`

Current mutation:

- only `MonthlyPayment`
- scopes: `currentMonthOnly`, `currentMonthAndBudgetPlan`, `budgetPlanOnly`
- plan-writing scopes require `SourceDebtId`
- closed/skipped budget months rejected with `BudgetMonth.MonthIsClosed`
- deleted/closed debt rows rejected
- audit event written only for real changes

## 4. Current Dashboard And Close Math

Open month dashboard:

- `TotalDebtBalance = SUM(BudgetMonthDebt.Balance)` for active, non-deleted
  rows.
- `TotalMonthlyPayments = SUM(BudgetMonthDebt.MonthlyPayment)` through the
  projected debt list.
- `FinalBalanceWithCarryMonthly = income - expenses - savings - debtPayments + carryOver`.

Month close:

- `BudgetMonthlyTotalsService` sums monthly debt payments.
- `BudgetMonthCloseSnapshotService` uses debt payments in final balance.
- `BudgetMonthRepository.CloseOpenMonthWithSnapshotAsync` writes
  `SnapshotTotalDebtPaymentsMonthly`.

Recap:

- closed month reads active, non-deleted month debt rows.
- comparisons use `SourceDebtId`.
- month-only rows have no previous comparable delta.

## 5. Target Model Decisions

The target editor needs two separate state dimensions.

Source lifecycle on `Debt`:

- `active`: materializes into new months.
- `paidOff`: completed; no future materialization; historical rows preserved.
- `archived`: hidden from normal planning; restorable; no future materialization.
- `deleted`: soft-deleted only when safe; never hard-delete rows with history.

Month participation on `BudgetMonthDebt`:

- `included`: payment counts this month.
- `notIncluded`: debt appears this month but contributes `0` to debt payment
  outflow.
- `removed`: row is hidden/removed from this month where safe.

Do not rely on `MonthlyPayment = 0` as skip state. A zero planned payment can be
a valid planned amount; skip/not-included needs explicit state.

Do not rely on `Balance = 0` as paid-off state. A balance adjustment to zero and
a paid-off lifecycle transition are separate decisions, though the paid-off
command may perform both when requested.

## 6. Backend Work Required

### 6.1 Source debt creation after onboarding

Needed:

- create source `Debt` from editor
- create current `BudgetMonthDebt` row when scope includes current month
- audit source creation and month creation
- reuse wizard validation/payment calculation rules
- preserve open-month guard

Target endpoint:

```text
POST /api/budgets/months/{yearMonth}/debt-items
```

Create scopes:

- `currentMonthOnly`: create month-only `BudgetMonthDebt` with `SourceDebtId = null`.
- `currentMonthAndBudgetPlan`: create source `Debt` and linked current month row.
- `budgetPlanOnly`: create source `Debt`; it materializes into future months,
  not the already-materialized current month.

`budgetPlanOnly` must return a source summary or an editor response shape that
lets the frontend explain that the debt starts in future planning.

### 6.2 Month-only vs plan-linked debt creation

Month-only debt:

- lives only in `BudgetMonthDebt`
- cannot use plan-writing scopes later
- can be removed from the open month if not closed
- does not participate in future materialization

Plan-linked debt:

- creates/links `Debt.Id` to `BudgetMonthDebt.SourceDebtId`
- current-month edits may affect month only, plan only, or both
- source lifecycle controls future materialization

### 6.3 Debt lifecycle model

Needed:

- lifecycle constants in Application/Domain
- migration/check constraints
- source lifecycle repository methods
- materializer filter update
- integration tests proving paid-off/archived/deleted sources do not materialize
- restore path for archived debt

Recommended source statuses:

- `active`
- `paidOff`
- `archived`
- `deleted`

Legacy `closed` must be migrated or mapped deliberately in PR 1.

### 6.4 Month participation state

Needed:

- explicit month participation field or migration from ambiguous `Status`
- dashboard totals count only `included`
- liability balance can include active liabilities that are `notIncluded`
- `notIncluded` rows remain visible in editor/history
- closed/skipped budget months immutable

Recommended month participation:

- `included`
- `notIncluded`
- `removed`

### 6.5 Balance update flow

Needed:

- separate balance adjustment command
- structured audit/history record
- update source and current snapshot depending on scope
- no monthly payment mutation unless explicitly requested in a different command
- optional note/reason
- non-negative balance validation

Target endpoint:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/balance-adjustments
```

Balance scopes:

- `currentMonthOnly`: update month row balance only.
- `currentMonthAndBudgetPlan`: update month row and source debt.
- `budgetPlanOnly`: update source debt only.

Month-only rows cannot use plan scopes.

### 6.6 Paid-off flow

Needed:

- source lifecycle transition to `paidOff`
- optional balance adjustment to zero in same transaction
- current month row marked paid/completed or not included based on product
  decision in PR 4
- future materialization stops
- historical month rows preserved
- audit records lifecycle and balance effects separately in one changeset

Target endpoint:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/mark-paid-off
```

Hard rule: Marking paid off is not the same as recording an actual payment.

### 6.7 Archive/restore flow

Archive:

- source lifecycle `archived`
- future materialization stops
- current month participation should become `notIncluded` or `removed`
  according to PR 4 decision
- history retained

Restore:

- archived source can become `active`
- current open month row can be created or re-included if requested
- closed months remain untouched

### 6.8 Skip/not-include-this-month flow

Needed:

- month-only participation transition to `notIncluded`
- no source lifecycle change
- no balance change
- debt payment outflow excluded from current month totals
- row remains visible as `Ingår inte denna månad`

Target endpoint:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/participation
Body: { "participation": "included" | "notIncluded" }
```

### 6.9 Dashboard totals

Target math:

- debt payment total: sum `MonthlyPayment` only for included, non-deleted month
  rows whose source lifecycle is not archived/deleted/paid-off.
- debt liability balance: sum balance for active liabilities, including rows
  that are not included this month, unless removed/deleted.
- final balance uses debt payment total only.

### 6.10 Month close snapshots

Existing `SnapshotTotalDebtPaymentsMonthly` remains payment outflow. It must not
include skipped/not-included rows.

Closed month rows are the historical source of balance/state display unless a
future migration adds explicit balance snapshot columns.

### 6.11 Recap deltas

Recap should:

- compare linked debts by `SourceDebtId`
- show balance delta when balance history/read model exists
- show payment delta separately from balance delta
- handle skipped/not-included as payment participation change
- handle paid-off/archived source rows without deleting old rows
- treat month-only rows as no-source rows with no previous linked delta

### 6.12 Audit/event history

Needed:

- keep `BudgetMonthChangeEvent` for month-level row changes
- add source-level debt event/history for:
  - created
  - metadata updated
  - balance adjusted
  - paid off
  - archived
  - restored
  - deleted
- balance events must store old balance, new balance, delta, scope, note,
  actor, timestamp

Progress UI should read structured balance history, not parse generic JSON if
avoidable.

### 6.13 Read models for frontend

The target editor read model must expose:

- month row fields
- source fields
- source lifecycle
- month participation
- balances and source balance
- planned payment and source planned payment
- previous/current deltas where available
- action permissions:
  - canEditDetails
  - canUpdateBalance
  - canSkipThisMonth
  - canIncludeThisMonth
  - canMarkPaidOff
  - canArchive
  - canRestore
  - canRemove
  - canUpdatePlan
- reason codes for disabled actions
- summary totals:
  - payment total included this month
  - balance total for active liabilities
  - skipped/not-included payment total
  - paid-off/archived counts

### 6.14 Frontend design contracts

Frontend may design:

- add debt
- edit details
- update balance
- mark paid
- skip this month
- archive/restore
- progress

Frontend may implement only after backend PRs provide:

- real action endpoints
- read model fields
- action permissions
- disabled reason codes
- exact status/participation constants

### 6.15 E2E coverage

Target E2E must cover:

- add plan-linked debt
- add month-only debt
- edit details with scope
- edit planned payment without balance change
- update balance with audit-visible result
- skip and re-include one month
- mark paid off and verify future materialization stops
- archive and restore
- closed month immutability
- dashboard equation after each relevant action

## 7. Revised PR Queue

1. `PR-01-be-debt-lifecycle-participation-model.md`
2. `PR-01.5-be-debt-seed-and-guard-hardening.md`
3. `PR-02-be-debt-create-edit-metadata.md`
4. `PR-03-be-debt-balance-adjustment-audit.md`
5. `PR-04-be-debt-lifecycle-actions.md`
6. `PR-05-be-debt-editor-read-model.md`
7. `PR-06-fe-debt-target-page-shell.md`
8. `PR-07-fe-debt-add-edit-flows.md`
9. `PR-08-fe-debt-lifecycle-actions.md`
10. `PR-09-fe-debt-balance-progress.md`
11. `PR-10-debt-editor-e2e.md`

## 8. Hard Stops

Do not ship frontend controls for:

- paid-off before PR 4 and PR 5
- skip/not-included before PR 4 and PR 5
- archive/restore before PR 4 and PR 5
- balance update/progress before PR 3 and PR 5
- add/edit details before PR 2 and PR 5

Do not implement:

- actual payment ledger
- automatic interest accrual
- automatic payoff from `Balance = 0`
- hard delete of source debts with history
- mutations on closed/skipped budget months

Validation for this PR: docs-only review.
