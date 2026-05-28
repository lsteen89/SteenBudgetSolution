# Expense Editor Designer-Agent Brief

Date: 2026-05-28

## Goal

Redesign the expenses editor UI from a worksheet-like ledger into a polished
financial planning surface, similar in quality to the second-pass savings
editor. Do not redesign the backend flow. The UI must respect the real expense
lifecycle: wizard-created baseline expense items, open-month materialized rows,
month-only rows, plan-linked rows, edit scopes, read-only closed months, and
dashboard totals.

Use this as the prompt for the designer/implementation agent.

## Designer Agent Prompt

You are redesigning the expenses editor in SteenBudgetSolution.

Your task is to produce a refined React/TypeScript UI for
`Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx` and its local
components. The current implementation works but reads like a boring worksheet.
Make it feel like the current savings editor: calm, useful, visually structured,
money-first, and pleasant to scan.

Before editing, inspect these files:

- `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
- `Frontend/src/Pages/private/expenses/components/*`
- `Frontend/src/Pages/private/expenses/utils/buildExpenseLedgerGroups.ts`
- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsSoulHero.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsPlanBalanceStrip.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalCard.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/*`
- `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`
- `docs/money-flow-editor-ux-alignment.md`

Use the existing eBudget tokens and shared editor primitives. Do not introduce
a new design system, new color palette, new routing model, or backend contract.

## Product Model

Expenses start in the onboarding wizard, then become baseline plan rows, then
get materialized into month-specific rows when a budget month is opened or
accessed.

Main tables:

- `ExpenseCategory`
  - fixed categories seeded in SQL: `Rent`, `Food`, `Transport`, `Clothing`,
    `FixedExpense`, `Subscription`, `Other`.
- `ExpenseItem`
  - baseline/default budget-plan rows.
  - columns: `BudgetId`, `CategoryId`, `Name`, `AmountMonthly`, `IsActive`,
    `EndedAt`.
- `BudgetMonthExpenseItem`
  - month-specific editable rows.
  - columns: `BudgetMonthId`, `SourceExpenseItemId`, `CategoryId`, `Name`,
    `AmountMonthly`, `SubscriptionLifecycleStatus`, `IsActive`, `IsOverride`,
    `IsDeleted`, `SortOrder`.
  - `SourceExpenseItemId = null` means the row exists only in this month.
  - `SourceExpenseItemId != null` means the row is linked to a budget-plan row.

Materialization:

- `BudgetMonthMaterializer` reads active baseline `ExpenseItem` rows.
- It inserts matching `BudgetMonthExpenseItem` rows idempotently.
- Subscription rows default to `SubscriptionLifecycleStatus = active`.
- Non-subscription rows use `SubscriptionLifecycleStatus = null`.
- Materialized rows are unique by `(BudgetMonthId, SourceExpenseItemId)`.

Dashboard totals:

- Dashboard/month totals sum `BudgetMonthExpenseItem.AmountMonthly`.
- Only rows with `IsDeleted = 0` and `IsActive = 1` count.
- Subscription rows count only when lifecycle is `null` or `active`.
- `paused` and `cancelled` subscriptions are excluded from totals.
- Dashboard category totals, top recurring expenses, and subscriptions all use
  the materialized month rows, not the baseline rows.

Month close:

- Month close snapshots `TotalExpensesMonthly`.
- Closed/skipped months must not expose edit affordances.
- The expense editor currently targets the open month.

## Wizard Flow

Wizard expenditure data is flattened into expense items through:

- `Backend/Application/Mappings/Budget/ExpenditureFlatteningMapper.cs`
- `Backend/Infrastructure/Repositories/Budget/Core/ExpenditureRepository.cs`

Wizard sections become flat `ExpenseItem` rows:

- housing/rent/running costs -> housing category
- food store and takeout -> food category
- transport costs -> transport category
- clothing -> clothing category
- insurance/internet/phone/gym/custom fixed costs -> fixed expense category
- subscriptions -> subscription category

Only positive amounts with non-empty names are saved. The expense editor should
therefore treat rows as real monthly planning rows, not as wizard sub-step
fields.

## API Contract

Read:

- `GET /api/budgets/months/{yearMonth}/editor`
  - returns `{ month, expenseItems }`.
  - expense row fields:
    - `id`
    - `sourceExpenseItemId`
    - `categoryId`
    - `name`
    - `amountMonthly`
    - `subscriptionLifecycleStatus`
    - `isActive`
    - `isDeleted`
    - `isMonthOnly`
    - `canUpdateDefault`
- `GET /api/budgets/expense-categories`
  - returns category ids/codes/names for selects and grouping.

Mutations:

- `POST /api/budgets/months/{yearMonth}/expense-items`
  - creates a month-only row.
  - payload: `categoryId`, `name`, `amountMonthly`, `isActive`.
  - no future-plan creation support. UI copy must say create affects this
    month only.
- `PATCH /api/budgets/months/{yearMonth}/expense-items/{monthExpenseItemId}`
  - edits a single row.
  - payload: `name`, `categoryId`, `amountMonthly`, `isActive`,
    `subscriptionLifecycleStatus`, `updateDefault`, `scope`.
- `PATCH /api/budgets/months/{yearMonth}/expense-items`
  - real transactional bulk patch.
  - payload: `{ items: [...] }`.
  - one failed row rolls back all rows.
- `DELETE /api/budgets/months/{yearMonth}/expense-items/{monthExpenseItemId}`
  - soft-deletes the month row only.

Valid edit scopes:

- `currentMonthOnly`
  - updates only `BudgetMonthExpenseItem`.
- `currentMonthAndBudgetPlan`
  - updates the month row and linked `ExpenseItem`.
- `budgetPlanOnly`
  - updates only linked `ExpenseItem`; current month row remains unchanged.

Plan-writing scopes require `sourceExpenseItemId != null`. Month-only rows must
hide or disable plan-scope options.

Backend rejects edits unless the month is open.

## Current Frontend Flow

Current route:

- `/dashboard/expenses`
- `ExpensesEditorPage` finds the open month from `useBudgetMonthsStatusQuery`.
- It loads:
  - month dashboard aggregate for income/expenses/remaining totals
  - month editor rows
  - expense categories

Current UI anatomy:

- sticky `ExpensesEditorWorkspaceBar`
  - shows income, expenses, remaining
  - has add button
- grouped ledger sections
  - fixed
  - variable
  - subscription
- row action menu
  - edit
  - pause/resume
  - delete
- create/edit modal
  - name
  - category
  - amount
  - active toggle
  - edit scope cards in edit mode
  - preview card

Current weaknesses to fix:

- It visually reads as a table/worksheet.
- The top bar is functional but not emotionally useful.
- Groups are just collapsible ledger blocks; they do not tell the user what
  matters.
- Subscription-specific behavior is underused.
- Row status is weak and partly hardcoded (`Pausad` in row UI).
- Empty/loading/error states are basic.
- The savings editor now has a stronger page narrative; expenses should get a
  similar level of polish without copying savings blindly.

## Required UX Direction

Build expenses as a "monthly spending plan" surface.

Recommended structure:

1. Hero / command surface
   - Show current month, total expenses, remaining after expenses, and a useful
     short insight.
   - Keep add action obvious.
   - If read-only, show a clear read-only badge.
   - Do not make this a marketing hero. It is a financial work surface.

2. Expense balance strip
   - Show the equation relevant to expenses:
     `income + carry-over - expenses = remaining after expenses`.
   - Use the same honesty standard as `SavingsPlanBalanceStrip`: values shown
     must reconcile to the displayed result.
   - This strip should make overspending obvious without screaming.

3. Category/group surfaces
   - Replace worksheet feeling with strong grouped sections/cards.
   - Fixed costs, variable costs, and subscriptions can remain the main mental
     model, but make each group useful:
     - total
     - active row count
     - paused/inactive count where relevant
     - largest item or short insight if easy from available data
   - Rows should still be dense enough for repeated editing.

4. Rows
   - Keep action-menu grammar.
   - Money must be aligned and easy to scan.
   - Make active/paused/month-only/plan-linked states legible.
   - Do not bury row actions.
   - Do not convert every row into a huge decorative card.

5. Create/edit modal
   - Keep existing modal shell and validation behavior.
   - Make create mode explicitly month-only.
   - Keep edit scope cards for linked rows.
   - For month-only rows, scope choices must be hidden or disabled with clear
     explanation.
   - Preview should show what changes in current month vs budget plan,
     especially for `budgetPlanOnly`.

6. Subscriptions
   - Subscription rows have a real lifecycle field:
     `active | paused | cancelled`.
   - Current UI mostly toggles `isActive`, not lifecycle.
   - If adding subscription lifecycle controls, wire them to
     `subscriptionLifecycleStatus` and only expose them for subscription
     category rows.
   - Non-subscription rows must send `subscriptionLifecycleStatus = null`.
   - Be explicit in UI: inactive/paused subscriptions do not count in monthly
     totals.

## Design Constraints

Follow repository UI rules:

- Use existing eBudget tokens: `--eb-*`, `bg-eb-surface`, `border-eb-stroke`,
  `text-eb-text`, `text-eb-accent`, `shadow-eb` where appropriate.
- Keep `font-inter`; do not add fonts.
- Use shadcn/eBudget/wizard primitives where already established.
- Application UI: calm, premium, clear, trustworthy.
- Avoid generic dashboard-card soup.
- Avoid loud gradients, novelty animation, excessive glass, fake coaching, and
  marketing behavior.
- No new package dependencies.
- No backend changes unless the requested UI cannot honestly work otherwise.
- No changes to lockfiles, Docker, CI, or package versions.

Use lucide icons where icons help action scanning.

## Technical Guardrails

- Preserve current data fetching model unless there is a narrow reason to
  change it.
- Keep all money values as numbers in FE and decimal in BE. Do not introduce
  float-like financial assumptions in backend.
- Do not fake bulk save with multiple single PATCH calls if a bulk save UI is
  introduced. Use `usePatchBudgetMonthExpenseItemsBulk`.
- Mutations must invalidate month editor/dashboard queries via existing hooks.
- Closed/skipped/read-only states must disable edit affordances.
- Create currently creates month-only rows. Do not imply future-plan creation.
- Delete soft-deletes only the current month row. Do not call it "remove from
  plan".
- Preserve i18n structure. Do not hardcode Swedish UI copy in components.

## Files Likely Touched

Primary:

- `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
- `Frontend/src/Pages/private/expenses/components/*`
- `Frontend/src/Pages/private/expenses/types/expenseEditor.types.ts`
- `Frontend/src/Pages/private/expenses/utils/buildExpenseLedgerGroups.ts`
- `Frontend/src/utils/i18n/pages/private/expenses/*.i18n.ts`

Possible shared components if genuinely reusable:

- `Frontend/src/components/molecules/forms/budgetEditor/*`

Avoid touching:

- backend handlers/repositories
- SQL schema
- package/lock/build config
- unrelated dashboard/savings/debt/income pages

## Validation Expected

At minimum:

- `npm run build` from `Frontend/`
- focused vitest tests for any changed expense components/utilities
- browser pass on `/dashboard/expenses` at desktop and mobile widths

Manual states to verify:

- loading editor
- no open month
- open editable month
- read-only/closed month behavior if reachable with fixtures
- empty groups
- month-only row edit
- plan-linked row edit
- `budgetPlanOnly` preview
- create row
- delete confirmation
- inactive/paused row display
- subscription row display

## Strong Opinion

Do not start by making rows prettier. Start by changing the page hierarchy.
The current page lacks a strong information story. Savings became better
because it got a hero, an honest equation strip, and cards that explain state.
Expenses need the same level of product thinking:

- what is my spending load this month?
- what is fixed vs flexible?
- what costs are currently turned off?
- what rows affect only this month vs my ongoing plan?
- what edit am I about to make?

That is the UI job.
