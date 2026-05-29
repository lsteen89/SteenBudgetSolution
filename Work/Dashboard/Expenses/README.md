# Work — Dashboard / Expenses

Implementation queue for the **expenses editor redesign** from the eBudget
design-system handoff bundle.

## How to use this folder

Each `PR-NN-*.md` file is a self-contained brief for one coding agent. Open one
file, implement that PR only, validate it, append the AI changelog entry, write
`COMMIT_MSG.tmp`, then stop.

Implement PRs in numeric order unless the table says they are independent.

## Source material

- Handoff zip:
  `/Users/linussteen/Downloads/eBudget Design System-handoff(1).zip`
- Primary prototype:
  `ebudget-design-system/project/explorations/expenses/MVP-Expenses v1.html`
- Design-system digest:
  `ebudget-design-system/project/README.md`
- App UI kit:
  `ebudget-design-system/project/ui_kits/app/README.md`
- Existing local handoff:
  `docs/ai/expense-editor-designer-brief.md`
- Shared editor UX contract:
  `docs/money-flow-editor-ux-alignment.md`

The primary prototype is expenses, not income. It shows a page-level spending
hero, an honest balance strip, grouped expense ledgers, month-only create copy,
scope-aware edit modal, and subscription lifecycle controls.

## Savings modal parity

The expense edit module must look and behave as close as possible to the
production savings edit modules. The expenses prototype is useful for flow and
copy, but where it differs from savings, savings wins.

Use these savings files as the visual/interaction reference before touching the
expense modal:

- `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
- `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEntryModalShell.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/MoneyInput.tsx`

Hard rule for PR 3: do not create an expenses-only scope-card visual variant.
The selected month/scope state, including the green border, green fill, radio
indicator, spacing, and footer rhythm, should come from the same shared
components or match the savings module exactly. The screenshots showed the
expense prototype drifting from savings on the selected green state; that drift
is a design defect, not a target.

## Current state — verified in repo

Backend already supports the core expense editor:

- `GET /api/budgets/months/{yearMonth}/editor`
  returns month metadata and `expenseItems`.
- `GET /api/budgets/expense-categories`
  returns category ids/codes/names.
- `POST /api/budgets/months/{yearMonth}/expense-items`
  creates month-only rows.
- `PATCH /api/budgets/months/{yearMonth}/expense-items/{id}`
  edits one row with `currentMonthOnly`, `currentMonthAndBudgetPlan`, or
  `budgetPlanOnly`.
- `PATCH /api/budgets/months/{yearMonth}/expense-items`
  is a real transactional bulk patch.
- `DELETE /api/budgets/months/{yearMonth}/expense-items/{id}`
  soft-deletes the month row.

Data model:

- `ExpenseItem` is the budget-plan/source row.
- `BudgetMonthExpenseItem` is the materialized month row.
- `SourceExpenseItemId = null` means month-only.
- `SourceExpenseItemId != null` means the row can write to the budget plan.
- subscription lifecycle values are already supported:
  `active | paused | cancelled`.

Frontend already has:

- `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
- local expense modal, ledger section, row action menu, delete dialog
- shared editor shell primitives:
  `BudgetEditorPageShell`, `BudgetEntryModalShell`,
  `BudgetEditorRowActionsMenu`, `EditScopeRadioCards`

## Real backend gap

The prototype shows plan-comparison details:

- row badge such as `Changed in May`
- row meta such as `+300 kr compared with the plan`
- modal preview for current-month total vs budget-plan total
- plan-linked rows with quiet plan badges

Today's `BudgetMonthExpenseItemEditorRowDto` does **not** expose source-plan
values. It has only:

- current month row fields
- `sourceExpenseItemId`
- `isMonthOnly`
- `canUpdateDefault`

That is enough for scopes, but not enough to calculate plan deltas honestly.
Do not fake those plan-delta badges in the UI. Add backend read-model support
first, then wire the comparison UI.

## PR queue

| PR | File | Title | Depends on | Side | Status |
| --- | --- | --- | --- | --- | --- |
| 0 | `PR-00-source-analysis.md` | Source analysis and implementation contract | — | Docs | Plan |
| 1 | `PR-01-fe-hero-balance-strip.md` | Page hero + expense balance strip | — | FE | Plan |
| 2 | `PR-02-fe-ledger-groups.md` | Grouped ledger polish + row state model | PR 1 | FE | Plan |
| 3 | `PR-03-fe-modal-scope-preview.md` | Modal copy, scope behavior, and honest preview | PR 2 | FE | Plan |
| 4 | `PR-04-fe-subscription-lifecycle.md` | Subscription lifecycle controls | PR 2 | FE | Plan |
| 5 | `PR-05-be-plan-comparison-read-model.md` | Expose source-plan values for linked expense rows | — | BE | Plan |
| 6 | `PR-06-fe-plan-delta-badges.md` | Wire plan-delta badges and plan-total preview | PR 5 + PR 3 | FE | Plan |
| 7 | `PR-07-expense-editor-e2e.md` | Expense editor E2E coverage | PR 1–6 | FE/E2E | Plan |

Recommended build order:

1. PR 1–4 first. These implement most of the prototype using existing data.
2. PR 5 in parallel if desired. It is a narrow backend read-model extension.
3. PR 6 after PR 5. This is where plan-comparison UI becomes honest.
4. PR 7 last, after UI and API shape settle.

## Non-goals

- Do not change schema unless PR 5 proves a read-model join is insufficient.
- Do not add subscription billing day. The prototype mentions billing dates,
  but the current data model has no such field.
- Do not add future-plan creation. Current create endpoint creates month-only
  rows only.
- Do not replace the existing expense mutation endpoints.
- Do not touch debt, income, savings, dashboard breakdown, Docker, CI, lockfiles,
  auth, or package versions.

## Repo rules every PR agent must follow

- Diagnose first; inspect the nearest current implementation.
- Smallest safe change wins.
- Use existing eBudget tokens and shared editor primitives.
- `decimal` for backend money. Dapper only. Explicit SQL. Parameterized values.
- Closed/skipped/read-only months must not expose edit affordances.
- All strings go through i18n dictionaries.
- After completing a PR:
  1. append to `docs/ai/ai-changelog.md`
  2. write `COMMIT_MSG.tmp`
  3. stop; do not commit or push.
