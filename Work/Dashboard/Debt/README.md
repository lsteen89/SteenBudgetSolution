# Work — Dashboard / Debt

Planning folder for the **target Debt editor**. This is analysis and
implementation planning only. Do not implement production code from this folder
until the user gives an explicit `GO` for a specific PR file.

Debt is not expenses with different copy. Debt has balances, interest,
minimum-payment semantics, repayment strategy, lifecycle, and stigma risk. Keep
these concepts separate in every API and UI decision:

- planned monthly payment
- actual payment made
- balance reduction
- month participation
- source debt lifecycle

## How to use this folder

Each `PR-NN-*.md` file is a scoped implementation brief. Open one file, implement
that PR only, validate it, append `docs/ai/ai-changelog.md`, write
`COMMIT_MSG.tmp`, then stop. Do not commit or push.

Backend PRs must land before frontend UI exposes the matching behavior. The
designer may design the target page now, but engineering must not ship controls
for paid-off, archived, skipped, deleted, balance history, or progress until the
backend contracts in PR 1-5 exist.

## Source material read

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/backend.instructions.md`
- `.agents/instructions/frontend-ui.instructions.md`
- `docs/money-flow-editor-ux-alignment.md`
- `docs/BudgetPeriodLifecycleSpec.md`
- `Work/Dashboard/income/*`
- `Work/Dashboard/Expenses/*`
- `Work/Dashboard/Savings/*`
- designer bundle README from the fetched Claude Design handoff
- `explorations/debt/MVP-Debt v2.html`
- `explorations/debt/debt-editor-handover.md`
- `explorations/debt/MVP-Debt v1.html`
- `explorations/income/MVP-Income v1.html`
- Debt schema, backend, tests, and frontend paths listed in
  `PR-00-source-analysis.md`

## Designer handover

The fetched design bundle has been unpacked into local exploration files:

- `explorations/debt/MVP-Debt v2.html` — target Debt editor reference.
- `explorations/debt/debt-editor-handover.md` — canonical design/product handover.
- `explorations/debt/MVP-Debt v1.html` — Stage-0 reference for today's backend.
- `explorations/income/MVP-Income v1.html` — sibling editor reference.

The design is direction, not production code. Do not port inline prototype JS,
mock `data-*` state, or tweak controls. Backend reality and financial honesty
win over any prototype shortcut.

## Current backend reality

Debt currently has plan rows and materialized month rows:

- `Debt` is the budget-plan/source table.
- `BudgetMonthDebt` is the materialized month table.
- `Budget.DebtRepaymentStrategy` stores the wizard repayment strategy.
- `BudgetMonth.SnapshotTotalDebtPaymentsMonthly` stores closed-month debt
  payment totals.
- `BudgetMonthChangeEvent` stores audit events for planned-payment edits.

Existing Debt editor endpoints under `/api/budgets`:

- `GET /months/{yearMonth}/debt-items`
- `PATCH /months/{yearMonth}/debt-items/{monthDebtId}`
- `PATCH /months/{yearMonth}/debt-items`

The current mutation surface edits only `MonthlyPayment`.

There is no production endpoint today for:

- creating a debt after onboarding
- creating month-only debt
- editing name/type/balance/APR/fee/minimum/term
- updating balance with audit history
- marking paid off
- archiving/restoring
- skipping or not including one month
- safe delete/remove
- editing repayment strategy after onboarding

## Current database tables

Plan table: `Debt`

- `Id`
- `BudgetId`
- `Name`
- `Type`
- `Balance`
- `Apr`
- `MonthlyFee`
- `MinPayment`
- `TermMonths`
- `MonthlyPayment`
- `OpenedAt`
- `ClosedAt`
- `Status` constrained to `active|closed`
- `ClosedReason`
- audit columns

Month table: `BudgetMonthDebt`

- `Id`
- `BudgetMonthId`
- `SourceDebtId`
- `Name`
- `Type`
- `Balance`
- `Apr`
- `MonthlyFee`
- `MinPayment`
- `TermMonths`
- `MonthlyPayment`
- `OpenedAt`
- `Status` constrained to `active|closed`
- `ClosedAt`
- `ClosedReason`
- `IsOverride`
- `IsDeleted`
- `SortOrder`
- audit columns

Other debt-related fields:

- `Budget.DebtRepaymentStrategy`
- `BudgetMonth.SnapshotTotalDebtPaymentsMonthly`
- `BudgetMonth.SnapshotFinalBalanceMonthly`
- `BudgetMonthChangeEvent.EntityType = 'debt'`

No due date, creditor table, payment ledger table, balance history table, or
interest accrual ledger exists.

## Current lifecycle reality

Debt has **schema-level lifecycle columns**, but not a real product lifecycle.

Verified behavior:

- Source `Debt.Status = 'active'` rows materialize into future
  `BudgetMonthDebt` rows.
- Source `Debt.Status = 'closed'` rows do not materialize.
- Month rows with `BudgetMonthDebt.Status = 'active'` count in dashboard and
  month-close payment totals.
- Month rows with `BudgetMonthDebt.Status = 'closed'` are filtered out of live
  totals and rejected by the patch handler.
- `IsDeleted` rows are excluded from totals.

Missing behavior:

- no command sets `Debt.Status = 'closed'`
- no command sets `BudgetMonthDebt.Status = 'closed'`
- no command sets `ClosedReason`
- no user-facing paid-off, archived, skipped, restored, or deleted state
- no automatic payoff when balance reaches zero
- no balance update flow
- no debt event/history table beyond generic month change events

## Target backend scope

The target Debt editor requires five backend slices before target UI can ship:

1. Lifecycle and month participation model.
2. Create/edit metadata endpoints.
3. Balance adjustment and audit history.
4. Paid-off/archive/restore/skip/remove commands.
5. Full Debt editor read model.

Target source debt lifecycle:

- `active`: source debt should materialize into new months.
- `paidOff`: completed debt; no future materialization; historical rows remain.
- `archived`: hidden from normal planning; no future materialization; restorable.
- `deleted`: soft-deleted where safe; never hard-delete rows with history.

Target month participation:

- `included`: payment counts this month.
- `notIncluded`: debt exists this month, but payment outflow is excluded.
- `removed`: month-only row removed from this month, or source-linked row hidden
  from this month where rules allow.

The exact column names are decided in PR 1, but the model must distinguish source
lifecycle from month participation. Reusing one `Status` field for both is too
ambiguous.

## Target financial rules

- Editing `MonthlyPayment` changes planned outflow only.
- Editing `MonthlyPayment` must never reduce `Balance`.
- Updating `Balance` is a separate auditable command.
- Skipping/not including this month excludes payment from monthly outflow totals.
- Skipping/not including this month must not delete, archive, or pay off the
  source debt.
- Marking paid off stops future materialization and preserves historical month
  rows.
- Archived debts are excluded from normal planning but retained for audit/history.
- Closed and skipped budget months remain immutable.
- Dashboard and close-month math use payment outflow, not balance reduction.
- Liability balance is shown separately from monthly payment totals.

## Target frontend scope

The target page may include:

- `Lägg till skuld`
- edit debt details
- `Uppdatera saldo`
- `Hoppa över denna månad`
- `Markera som betald`
- archive/restore
- paid/archived state groups
- repayment progress once balance history exists

But frontend PRs must be gated:

- Add/edit metadata UI requires PR 2.
- Balance update/progress UI requires PR 3 and PR 5.
- Paid/archive/restore/skip UI requires PR 4 and PR 5.
- Designer-visible states must map to backend values, not inferred copy.

## Sensitive UX constraints

Debt copy must be calm, neutral, practical, and private-feeling.

Use:

- `Skulder`
- `Månadsbetalningar`
- `Kvar att betala`
- `Betalas denna månad`
- `Ingår inte denna månad`
- `Betald`
- `Avslutad`
- `Arkiverad`
- `Uppdatera saldo`
- `Hoppa över denna månad`
- `Lägg till skuld`
- `Planerad månadsbetalning`
- `Saldo påverkas inte här`

Avoid:

- `bad debt`
- `debt problem`
- `failure`
- fake warnings
- aggressive red for normal debt presence
- fake celebration when payoff is only a status change
- copy implying a real payment was made when only `MonthlyPayment` changed

## Recommended PR queue

| PR | File | Title | Depends on | Side |
| --- | --- | --- | --- | --- |
| 0 | `PR-00-source-analysis.md` | Source analysis and target contract | — | Docs |
| 1 | `PR-01-be-debt-lifecycle-participation-model.md` | Lifecycle and month participation model | PR 0 | BE |
| 1.5 | `PR-01.5-be-debt-seed-and-guard-hardening.md` | Seed cleanup and PR 1 hardening | PR 1 | BE |
| 2 | `PR-02-be-debt-create-edit-metadata.md` | Create and edit debt metadata endpoints | PR 1.5 | BE |
| 3 | `PR-03-be-debt-balance-adjustment-audit.md` | Balance adjustment and audit history | PR 1.5 | BE |
| 4 | `PR-04-be-debt-lifecycle-actions.md` | Paid-off/archive/restore/skip/remove commands | PR 1.5 + PR 3 | BE |
| 5 | `PR-05-be-debt-editor-read-model.md` | Full editor read model and frontend contract | PR 1.5-4 | BE |
| 6 | `PR-06-fe-debt-target-page-shell.md` | Target page hero, summary, ledger shell | PR 5 | FE |
| 7 | `PR-07-fe-debt-add-edit-flows.md` | Add/edit debt detail flows | PR 2 + PR 5 + PR 6 | FE |
| 8 | `PR-08-fe-debt-lifecycle-actions.md` | Paid/archive/restore/skip actions | PR 4 + PR 5 + PR 6 | FE |
| 9 | `PR-09-fe-debt-balance-progress.md` | Balance update and progress UI | PR 3 + PR 5 + PR 6 | FE |
| 10 | `PR-10-debt-editor-e2e.md` | Debt editor E2E coverage | PR 6-9 | FE/E2E |

Use `PR-01.5-start-prompt.md` as the copy/paste startup prompt for PR 1.5.

## Non-goals for this planning update

- No production UI.
- No backend behavior changes.
- No production migration scripts for legacy data until production data exists.
- No lifecycle fields yet.
- No payment ledger implementation yet.
- No interest accrual engine.
- No conflating balance reduction with planned monthly payment.
- No changes to income, expenses, savings, dashboard routing, Docker, CI,
  package versions, lockfiles, or auth.
