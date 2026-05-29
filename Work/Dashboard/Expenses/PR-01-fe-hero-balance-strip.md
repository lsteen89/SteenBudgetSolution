# PR 1 — Page hero + expense balance strip

| | |
| --- | --- |
| **Type** | Frontend UI |
| **Depends on** | Nothing |
| **Blocks** | PR 2, PR 3, PR 7 |
| **Risk** | Medium — main page hierarchy changes |

---

## 1. Why this PR exists

The current expenses page works but reads like a worksheet. The prototype's
biggest improvement is page hierarchy: a spending hero plus an honest balance
strip before the ledger.

This PR changes only the top of the page and supporting derived view-model
logic. It does not change row editing, mutation behavior, or backend contracts.

## 2. Source design

Primary prototype:

- `ebudget-design-system/project/explorations/expenses/MVP-Expenses v1.html`

Relevant sections:

- hero around `expenses-title`
- balance strip around `Månadens utrymme efter utgifter`
- spend meter under the balance breakdown

Reference production style:

- `Frontend/src/Pages/private/savings/components/SavingsSoulHero.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsPlanBalanceStrip.tsx`

## 3. Current data available

From `ExpensesEditorPage`:

- `dashboardAggregate.summary.totalIncome`
- `dashboardAggregate.summary.incomingCarryOverAmount`
- `dashboardAggregate.summary.totalExpenditure`
- `dashboardAggregate.summary.remainingToSpend`
- open month label from `dashboardAggregate.summary.header.periodLabel`
- `editor.expenseItems`
- expense categories

From row/category mapping:

- fixed group can include `housing` and `fixed`
- variable group can include food, transport, clothing, other
- subscription group is `subscription`

## 4. Implementation

Create focused components under:

- `Frontend/src/Pages/private/expenses/components/ExpensesSoulHero.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpensesPlanBalanceStrip.tsx`
- optionally `Frontend/src/Pages/private/expenses/utils/expenseSummary.ts`

Replace `ExpensesEditorWorkspaceBar` in `ExpensesEditorPage` with:

1. `ExpensesSoulHero`
2. `ExpensesPlanBalanceStrip`

Keep `ExpensesEditorWorkspaceBar` only if another page still uses it. If it is
now unused, leave deletion to a cleanup PR unless the removal is clearly local.

Hero requirements:

- title: short, money-first, month-aware.
- shows total monthly expenses.
- shows fixed / variable / subscription split.
- shows remaining after expenses.
- includes primary add action.
- shows read-only pill when `readOnly`.
- uses eBudget tokens and no new palette.
- no mascot requirement. If using a mascot, use an existing asset and keep it
  subtle; do not make the page playful.

Balance strip requirements:

- equation must reconcile:
  `income + carryOver - expenses = remainingAfterExpenses`
- use exactly the values displayed in the strip to derive the headline.
- include compact breakdown terms with testids:
  - `expenses-plan-balance-term-income`
  - `expenses-plan-balance-term-carryOver`
  - `expenses-plan-balance-term-expenses`
  - `expenses-plan-balance-term-remaining`
- use a calm warning tone if remaining is negative.
- include a segmented spend meter by group:
  fixed / variable / subscription.

## 5. i18n

Add strings to existing expense dictionaries or create focused dict files under:

- `Frontend/src/utils/i18n/pages/private/expenses/`

No hardcoded Swedish/English/Estonian strings in JSX.

## 6. Acceptance criteria

- Expenses page no longer starts with the old sticky worksheet bar.
- Hero and balance strip render from real existing data.
- The balance strip math is self-consistent.
- Add button still opens create modal.
- Read-only state is visible and disables add.
- Loading/error/no-open-month states still render.
- No backend changes.

## 7. Validation

Run:

```bash
cd Frontend
npm run build
npx vitest run Expenses
```

If no focused tests exist yet, add small tests for the new summary utility or
balance strip math.

Browser pass required:

- `/dashboard/expenses` desktop
- `/dashboard/expenses` mobile

## 8. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
