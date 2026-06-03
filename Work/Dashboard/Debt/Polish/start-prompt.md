# Starting Prompt — Debt Polish Implementation

We are working in `/Users/linussteen/Documents/SteenBudgetSolution`.

You are taking over the post-implementation polish for the Debt dashboard/editor. The previous agent investigated the current frontend/backend behavior and created PR handoff documents. Your first job is to read the context, confirm you understand the work, and stop. Do **not** implement yet.

At the end of your first response, say exactly:

```text
OK, ready for the task
```

## Hard Rules

- Do not implement until the user explicitly says to start.
- Do not change production code during context intake.
- Do not create migrations unless the active PR explicitly requires it and the user has told you to implement.
- Do not commit or push.
- Keep debt balance, planned monthly payment, monthly planning breakdown, progress/history, lifecycle, and month participation separate.
- Closed/skipped budget months must remain immutable.
- Do not fake progress, history, paid-off, skipped, archived, original amount, projected balance, or payment data in the frontend.
- Backend-owned financial truth beats visual polish.

## Read First

Project rules:

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/backend.instructions.md`
- `.agents/instructions/frontend-ui.instructions.md`
- `docs/money-flow-editor-ux-alignment.md`
- `docs/ai/ai-changelog.md`

Debt implementation/planning context:

- `Work/Dashboard/Debt/README.md`
- `Work/Dashboard/Debt/IMPLEMENTATION-PLAN.md`
- `Work/Dashboard/Debt/PR-00-source-analysis.md`
- `Work/Dashboard/Debt/PR-01-be-debt-lifecycle-participation-model.md`
- `Work/Dashboard/Debt/PR-01.5-be-debt-seed-and-guard-hardening.md`
- `Work/Dashboard/Debt/PR-02-be-debt-create-edit-metadata.md`
- `Work/Dashboard/Debt/PR-03-be-debt-balance-adjustment-audit.md`
- `Work/Dashboard/Debt/PR-04-be-debt-lifecycle-actions.md`
- `Work/Dashboard/Debt/PR-05-be-debt-editor-read-model.md`
- `Work/Dashboard/Debt/PR-06-fe-debt-target-page-shell.md`
- `Work/Dashboard/Debt/PR-07-fe-debt-add-edit-flows.md`
- `Work/Dashboard/Debt/PR-08-fe-debt-lifecycle-actions.md`
- `Work/Dashboard/Debt/PR-09-fe-debt-balance-progress.md`
- `Work/Dashboard/Debt/PR-10-debt-editor-e2e.md`

Polish handoff documents:

- `Work/Dashboard/Debt/Polish/00-investigation.md`
- `Work/Dashboard/Debt/Polish/01-pr-debt-payment-truth.md`
- `Work/Dashboard/Debt/Polish/02-pr-debt-form-language-and-preview.md`
- `Work/Dashboard/Debt/Polish/03-pr-debt-ux-parity-with-expenses.md`
- `Work/Dashboard/Debt/Polish/implementation-handoff.md`

Sibling editor UX patterns:

- `Work/Dashboard/Expenses/README.md`
- `Work/Dashboard/Expenses/PR-*.md`
- `Work/Dashboard/income/README.md`
- `Work/Dashboard/income/IMPLEMENTATION-PLAN.md`
- `Work/Dashboard/income/PR-*.md`
- `Work/Dashboard/Savings/README.md`
- `Work/Dashboard/Savings/PR-*.md`

## What Happened

Debt implementation has landed. It now has:

- source debt lifecycle: active / paidOff / archived / deleted-safe concepts
- month participation: included / notIncluded / removed
- add debt
- edit debt details
- update balance through audited balance events
- skip/include this month
- mark paid off
- archive/restore
- paid and archived groups
- target editor read model
- frontend Debt page shell and flows
- E2E coverage

The post-implementation investigation found one major product gap:

The system stores balance and planned payment correctly, and APR/fee edits persist correctly, but the editor does not expose the monthly debt payment truth. A user can change APR/fee and see row meta text update, while the visible debt effect remains centered on the unchanged current balance and historical progress.

Example:

```text
balance = 93 000
planned monthly payment = 1 550
annual interest = 10.99 %
monthly fee = 130

monthlyInterest = 851.73
principalPayment = 568.27
projectedBalanceAfterMonth = 92 431.73
```

After changing to:

```text
annual interest = 12.99 %
monthly fee = 149.99

monthlyInterest = 1 006.73
principalPayment = 393.28
projectedBalanceAfterMonth = 92 606.72
```

Current UI can show:

```text
Avbetalning · ränta 12,99 % · avgift 150 kr/mån
```

but it does not show that less of the planned payment reduces principal. That is misleading.

## Product Contract

Debt has two faces:

1. `Planerad månadsbetalning` is cash leaving this month’s budget.
2. `Kvar att betala` is liability balance.

Monthly planning formula to implement in the read model:

```text
monthlyInterest = currentBalance * annualInterestPercent / 100 / 12
monthlyFee = configured monthly fee, null treated as 0
principalPayment = max(plannedMonthlyPayment - monthlyInterest - monthlyFee, 0)
projectedBalanceAfterMonth = max(currentBalance - principalPayment, 0)
```

Dashboard/month-close equation must remain:

```text
income + carryOver - expenses - savings - includedDebtPayments = remaining
```

`includedDebtPayments` remains the stored planned monthly payment. Do not replace it with principal.

Balance must not mutate when APR, fee, min payment, term, or planned payment changes. Balance changes only through the balance-adjustment path or explicit paid-off-with-zero flow.

Progress/history remains strictly based on real `DebtBalanceEvent` rows. Do not synthesize progress from current balance or original amount.

## Recommended PR Order

### PR 1: Debt Payment Truth

Implement from:

- `Work/Dashboard/Debt/Polish/01-pr-debt-payment-truth.md`

Goal:

- backend-owned monthly payment breakdown
- expose derived row/summary DTO values
- display monthly breakdown in the Debt editor
- prove APR/fee/payment/balance changes affect derived math
- warn when payment does not cover interest + fee
- keep balance unchanged on APR/fee edits
- keep dashboard/month-close totals based on planned payment

Likely backend files:

- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorRowDto.cs`
- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorSummaryDto.cs`
- new `DebtMonthlyPaymentBreakdownDto.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/GetBudgetMonthDebtEditorQueryHandler.cs`
- optional calculator/service under `Backend/Application/Services/Debts/`
- optional interface under `Backend/Application/Abstractions/Application/Services/Debts/`
- `Backend/Infrastructure/DependencyInjection.cs` if introducing a service

Likely frontend files:

- `Frontend/src/types/budget/DebtEditorDto.ts`
- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx`
- `Frontend/src/utils/i18n/pages/private/debts/DebtsEditorPage.i18n.ts`

### PR 2: Debt Form Language And Preview

Implement from:

- `Work/Dashboard/Debt/Polish/02-pr-debt-form-language-and-preview.md`

Goal:

- rename labels:
  - `Ränta` -> `Årsränta (%)`
  - `Månadsavgift` -> `Avgift per månad`
- clarify kr/%/month semantics
- add Expense-style preview cards to create/details/payment modals
- make dirty-form preview match backend PR 1 math
- keep copy Swedish and calm

Likely files:

- `Frontend/src/Pages/private/debts/components/DebtCreateModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtDetailsModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtPlannedPaymentModal.tsx`
- `Frontend/src/utils/i18n/pages/private/debts/DebtCreateModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtDetailsModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtPlannedPaymentModal.i18n.ts`
- optional `Frontend/src/Pages/private/debts/utils/debtPaymentBreakdown.ts`

### PR 3: Debt UX Parity With Expenses

Implement from:

- `Work/Dashboard/Debt/Polish/03-pr-debt-ux-parity-with-expenses.md`

Goal:

- align modal rhythm with Expenses
- simplify/group action menu
- clean row hierarchy
- align scope cards and preview rhythm
- improve strip/bar/legend semantics
- clean status copy

Action menu recommendation:

Keep one kebab, but group actions:

1. Planning
   - `Redigera planerad betalning`
   - `Redigera uppgifter`
   - `Uppdatera saldo`

2. Insight
   - `Visa återbetalningsförlopp`

3. This month
   - `Hoppa över denna månad`
   - `Inkludera denna månad`

4. Lifecycle
   - `Markera som betald`
   - `Arkivera`
   - `Återställ skuld`

5. Destructive
   - `Ta bort`

Likely files:

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerGroup.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsEditorEmptyState.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLifecycleConfirmDialog.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu.tsx` only if a tiny compatible grouped-menu extension is needed
- `Frontend/src/utils/i18n/pages/private/debts/DebtsEditorPage.i18n.ts`

## Important Existing Code To Inspect

Debt frontend:

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx`
- `Frontend/src/Pages/private/debts/components/DebtCreateModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtDetailsModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtPlannedPaymentModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtBalanceModal.tsx`
- `Frontend/src/types/budget/DebtEditorDto.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`

Expense UX anchor:

- `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpenseItemModal.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpenseLedgerRow.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpenseRowActionsMenu.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpensesPlanBalanceStrip.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEntryModalShell.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/EditorPreviewCard.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu.tsx`

Debt backend:

- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`
- `Backend/Application/DTO/Budget/Months/Editor/Debt/*`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/GetBudgetMonthDebtEditorQueryHandler.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/PatchDebtDetails/PatchBudgetMonthDebtDetailsCommandHandler.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/AdjustBalance/AdjustBudgetMonthDebtBalanceCommandHandler.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/CreateDebt/CreateBudgetMonthDebtCommandHandler.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/BudgetMonthDebtMutationRepository.Sql.cs`
- `Backend/Application/Services/Debts/DebtPaymentCalculator.cs`

Dashboard/month totals:

- `Backend/Infrastructure/Repositories/Budget/BudgetDashboard/BudgetMonthDashboardRepository.sql.cs`
- `Backend/Application/Services/Budget/Projections/BudgetDashboardProjector.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthlyTotalsService.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthCloseSnapshotService.cs`

Tests:

- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorReadModelTests.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtCreateAndEditDetailsTests.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtBalanceAdjustmentTests.cs`
- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtLifecycleParticipationTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/Editor/Debts/*`
- `tests/Backend.UnitTests/Services/Budget/Projections/BudgetDashboardProjectorTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/BudgetMonthlyTotalsServiceTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/BudgetMonthCloseSnapshotServiceTests.cs`
- `Frontend/src/Pages/private/debts/components/*.test.tsx`

## Tests To Run During Implementation

Backend focused:

```bash
dotnet test tests/Backend.UnitTests/Backend.UnitTests.csproj --filter "Debt|BudgetMonthlyTotalsService|BudgetMonthCloseSnapshotService|BudgetDashboardProjector"
dotnet test tests/Backend.IntegrationTests/Backend.IntegrationTests.csproj --filter "BudgetMonthDebtEditorReadModel|BudgetMonthDebtCreateAndEditDetails|BudgetMonthDebtBalanceAdjustment|BudgetMonthDebtLifecycleParticipation"
```

Frontend focused:

```bash
cd Frontend
npm test -- --run src/Pages/private/debts
npm run typecheck
```

Browser/E2E after UI polish:

```bash
./scripts/playwright-e2e.sh smoke
```

## Current Open PO Questions

Do not block context intake on these, but surface them before implementing affected behavior:

- Should minimum-payment warnings be included now? Recommendation: advisory amber only.
- Should term months drive payoff projection now? Recommendation: no, separate future PR.
- Should Debt strip prioritize interest/fee/principal over type split? Recommendation: yes.
- Should `Visa återbetalningsförlopp` stay hidden when no history exists? Recommendation: yes.
- Should grouped action menu be implemented as a shared primitive extension or Debt-local wrapper? Recommendation: shared only if Expense behavior remains unchanged.

## Completion For This Intake Step

After reading the above files and understanding the PR queue, stop and say exactly:

```text
OK, ready for the task
```

