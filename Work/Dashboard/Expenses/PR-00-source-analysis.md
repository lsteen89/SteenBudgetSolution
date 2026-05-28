# PR 0 — Source analysis and implementation contract

| | |
| --- | --- |
| **Type** | Planning / no production code |
| **Depends on** | Nothing |
| **Blocks** | PR 1–7 |
| **Risk** | None |

---

## 1. Why this PR exists

The expenses prototype is large and opinionated. Before implementation starts,
the team needs one source-of-truth contract that separates:

- what the prototype can be built with today's API
- what needs backend read-model support
- what should be deferred because the data model does not support it

This PR is documentation-only. No production code changes.

## 2. Source files to read

From the handoff zip:

- `ebudget-design-system/README.md`
- `ebudget-design-system/project/README.md`
- `ebudget-design-system/project/SKILL.md`
- `ebudget-design-system/project/ui_kits/app/README.md`
- `ebudget-design-system/project/explorations/expenses/MVP-Expenses v1.html`

From repo:

- `docs/ai/expense-editor-designer-brief.md`
- `docs/money-flow-editor-ux-alignment.md`
- `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
- `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`
- `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
- `Frontend/src/Pages/private/expenses/components/*`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Expenses.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Expense/*`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/BudgetMonthEditorRepository.Sql.cs`

## 3. Contract extracted from the prototype

Implement these concepts:

- page-level hero: total expenses for the open month, split by fixed/variable/subscription,
  remaining after expenses, add action, read-only pill.
- balance strip: `income + carry-over - expenses = remaining after expenses`.
- segmented spend meter: fixed / variable / subscription.
- grouped sections:
  - fixed costs
  - variable costs
  - subscriptions
- group headers show total, active count, inactive/paused count, and largest item.
- rows show name, category/meta, amount, state badge, action menu.
- create modal makes month-only behavior explicit.
- edit modal keeps scope choices and preview.
- subscription rows can use lifecycle `active | paused | cancelled`.
- expense edit modal should visually inherit the savings edit module:
  same shell, same scope-card selected state, same primary/secondary footer
  treatment, same input density, and no expenses-only green variant.

Do **not** implement these prototype details until data exists:

- billing-day copy for subscriptions
- plan-delta badges such as `+300 kr compared with the plan`
- current-month-vs-plan total preview based on real source-plan totals

Those are covered by PR 5 + PR 6.

## 4. Current API support

Already supported:

- current month row reads
- category reads
- create month-only row
- single-row patch with scope
- bulk patch with transaction
- delete month row
- subscription lifecycle mutation through `subscriptionLifecycleStatus`

Not currently supported:

- baseline/source row values in the editor DTO
- baseline/source total for the budget plan
- row-level delta between materialized month row and source plan row

## 5. Acceptance criteria

- This work folder exists under `Work/Dashboard/Expenses`.
- README and PR briefs describe the implementation sequence.
- Backend gaps are explicit and not hidden inside frontend PRs.
- No production code changed.

## 6. Validation

Documentation-only. No build or tests required.

## 7. Wrap-up

Append a changelog entry and write `COMMIT_MSG.tmp`.
