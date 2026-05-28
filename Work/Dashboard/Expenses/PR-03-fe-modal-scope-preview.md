# PR 3 — Modal copy, scope behavior, and honest preview

| | |
| --- | --- |
| **Type** | Frontend UI |
| **Depends on** | PR 2 |
| **Blocks** | PR 6, PR 7 |
| **Risk** | Medium — edit semantics must stay honest |

---

## 1. Why this PR exists

The prototype makes the create/edit modal clearer:

- create is explicitly month-only
- edit explains whether the row is month-only or plan-linked
- scope choices are visible only when meaningful
- preview says what will happen

The current modal has the basic fields and scope cards, but create mode does
not strongly explain month-only behavior and the preview is too generic.

## 2. Source files

- `Frontend/src/Pages/private/expenses/components/ExpenseItemModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEntryModalShell.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/MoneyInput.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/EditorPreviewCard.tsx`
- `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`
- `Frontend/src/schemas/dashboard/monthEditor/expenseItem.schemas.ts`

## 3. Implementation

Keep the existing modal shell and form architecture.

Start by comparing `ExpenseItemModal` with `SavingsGoalMonthlyModal` and
`SavingsBaseHabitDialog`. Reuse the savings/shared modal stack wherever the
flows overlap:

- `BudgetEntryModalShell` for dialog frame, header, close action, and modal
  rhythm.
- `MoneyInput` for amount entry.
- `EditScopeRadioCards` for scope choice styling and selected state.
- `CtaButton` / existing footer treatment for cancel/save actions.

The expense modal must not define a local version of the scope-card selected
state. The selected month/scope option should match savings exactly: same green
border, green fill, radio indicator, spacing, and typography. If the expenses
prototype differs from the production savings modal, follow the savings modal.

Create mode:

- add a calm callout:
  `Created only for {month}. It does not change your budget plan.`
- hide scope cards.
- submit the existing create payload only:
  `categoryId`, `name`, `amountMonthly`, `isActive`.

Edit mode:

- linked rows (`canUpdatePlan === true`) show the three scope cards.
- month-only rows hide or disable plan-scope cards and explain:
  `This row only exists in {month}. Future-plan changes are not available.`
- `budgetPlanOnly` must make it visually obvious that the current month row is
  unchanged.

Preview:

- with current API, preview only current row outcome honestly:
  - row name
  - category
  - amount
  - active/inactive
  - scope meaning
- do not display plan total deltas yet. That belongs to PR 6 after PR 5.
- if scope is `budgetPlanOnly`, preview should say current month remains
  unchanged.

## 4. Correct mutation behavior

Preserve current payload logic:

- create uses `createBudgetMonthExpenseItem`
- edit uses `patchBudgetMonthExpenseItem`
- if `canUpdatePlan` is false, force `scope = currentMonthOnly`
- `updateDefault` remains true only when scope is
  `currentMonthAndBudgetPlan` for backwards compatibility

Do not change backend endpoints.

## 5. Acceptance criteria

- Create mode is visibly month-only.
- Month-only edit rows cannot choose plan-writing scopes.
- Linked rows can choose all three scopes.
- Scope cards use the shared `EditScopeRadioCards` styling or an exact shared
  extraction from savings; no expenses-only scope-card CSS variant.
- The selected scope/month state visually matches the savings edit module,
  including green treatment, border, radio, and spacing.
- The modal shell, amount input, footer buttons, and contained dialog density
  match the savings edit modules unless the expense flow needs a real extra
  field.
- `budgetPlanOnly` preview is honest.
- Modal still traps focus and handles escape/dirty discard.
- No hardcoded UI strings.

## 6. Validation

Run:

```bash
cd Frontend
npm run build
npx vitest run ExpenseItemModal
```

Add tests if missing for:

- create mode hides scope cards
- month-only edit disables/hides plan scopes
- linked edit shows plan scopes
- budget-plan-only preview copy

Browser pass:

- create expense
- edit month-only row
- edit plan-linked row
- dirty discard

## 7. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
