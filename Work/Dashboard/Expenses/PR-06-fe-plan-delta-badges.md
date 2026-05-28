# PR 6 — Wire plan-delta badges and plan-total preview

| | |
| --- | --- |
| **Type** | Frontend UI / API wiring |
| **Depends on** | PR 5 + PR 3 |
| **Blocks** | PR 7 |
| **Risk** | Medium — financial comparison semantics |

---

## 1. Why this PR exists

After PR 5 exposes source-plan values, the frontend can honestly implement the
prototype's plan-aware details:

- changed-in-current-month badge
- amount delta compared with plan
- plan-linked/month-only distinction
- modal preview for current month vs budget plan

Do not implement this before PR 5.

## 2. Data after PR 5

Each expense row has:

- current month values:
  - `name`
  - `categoryId`
  - `amountMonthly`
  - `isActive`
  - `subscriptionLifecycleStatus`
- source plan values:
  - `sourceName`
  - `sourceCategoryId`
  - `sourceAmountMonthly`
  - `sourceIsActive`

## 3. Derived semantics

For linked rows only:

- amount changed when `amountMonthly !== sourceAmountMonthly`
- name changed when trimmed name differs
- category changed when category ids differ
- active changed when `isActive !== sourceIsActive`

`changedInMonth = any of the above`

Amount delta:

```ts
amountDelta = currentEffectiveAmount - sourceEffectiveAmount
```

Where:

- current effective amount is `amountMonthly` only when the row counts in the
  current month total.
- source effective amount is `sourceAmountMonthly` only when `sourceIsActive`
  is true.

Subscription lifecycle nuance:

- source plan has no lifecycle field.
- lifecycle paused/cancelled is a current-month exclusion. Treat it as current
  effective amount `0` for total comparison.

## 4. UI

Rows:

- changed linked rows get a calm `Changed this month` badge.
- month-only rows get `Only this month`.
- optional plan-linked badge should stay quiet; do not stamp `Plan` on every
  row unless it improves scanning.
- row meta can say `+300 kr compared with the plan` or
  `300 kr lower than the plan`.

Group headers:

- if changed rows exist in a group, show a subtle count or insight.

Modal preview:

- current-month preview:
  - affected by `currentMonthOnly` and `currentMonthAndBudgetPlan`
  - unchanged by `budgetPlanOnly`
- budget-plan preview:
  - affected by `currentMonthAndBudgetPlan` and `budgetPlanOnly`
  - unchanged by `currentMonthOnly`
- preview must use source values and current values, not guessed totals.

If calculating total plan amount is too noisy for this PR, show row-level plan
effect instead. Do not fake a full plan total without deriving it from all row
source values.

## 5. Tests

Add utility tests for:

- unchanged linked row
- amount-increased linked row
- inactive current month vs active source
- paused subscription current month vs active source
- month-only row
- `budgetPlanOnly` preview current unchanged / plan changed

## 6. Acceptance criteria

- Plan delta UI appears only when source-plan data exists.
- Month-only rows do not claim plan comparison.
- `budgetPlanOnly` preview is accurate.
- Paused/cancelled subscriptions compare as zero current-month effect.
- No backend changes in this PR.

## 7. Validation

Run:

```bash
cd Frontend
npm run build
npx vitest run Expenses
```

Browser pass:

- linked unchanged row
- linked changed row
- month-only row
- budget-plan-only edit
- paused subscription

## 8. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
