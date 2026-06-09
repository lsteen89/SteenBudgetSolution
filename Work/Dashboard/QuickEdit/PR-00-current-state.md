# PR 0 - Dashboard Quick Edit Current State

| | |
| --- | --- |
| **Type** | Planning / source analysis, no production code |
| **Depends on** | Existing dashboard quick edit drawer |
| **Blocks** | Designer handoff, BA review, implementation PRs |
| **Risk** | None |

## 1. Why this document exists

The dashboard now exposes four snabb-redigerare:

- income
- expenses
- savings
- debts

They are not in the same product state. Expenses is the most mature. Income,
savings, and debts are lean amount editors. Before handing this to design or BA,
we need a sober inventory of what exists, what each editor does, and where the
current flow is too thin for production-grade UX.

## 2. Source files read

Dashboard entry and routing:

- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/OpenMonthPillarWorkbench.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/PillarWorkbenchCard.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/AttentionLane.tsx`
- `Frontend/src/routes/appRoutes.ts`

Quick drawer:

- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodHeader.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodFooter.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodSection.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/CreateExpenseItemCard.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/income/IncomePanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/savings/SavingsPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/debts/DebtsPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/PeriodQuickAdjustRow.tsx`

Frontend data access:

- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/hooks/budget/editPeriod/invalidateBudgetMonthEditingQueries.ts`
- `Frontend/src/hooks/budget/editPeriod/monthEditorQueryKeys.ts`
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`

Backend contracts:

- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Expenses.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Income.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Debts.cs`

Related planning docs:

- `Work/Dashboard/Expenses/PR-00-source-analysis.md`
- `Work/Dashboard/income/PR-00-source-analysis.md`
- `Work/Dashboard/savings/README.md`
- `Work/Dashboard/Debt/README.md`

## 3. Shared dashboard flow

Open-month dashboard only. Closed and skipped months branch away from the
returning dashboard section, so the quick drawer is not rendered for those
states.

Flow:

1. Dashboard renders `ReturningDashboardSection`.
2. `OpenMonthPillarWorkbench` renders four cards: income, expenses, savings,
   debts.
3. Each card has:
   - primary quick-adjust button
   - secondary full-editor button
4. Quick-adjust sets `periodEditorPanel` in `DashboardContent` and opens
   `EditPeriodDrawer`.
5. Full editor navigates to:
   - `/dashboard/income`
   - `/dashboard/expenses`
   - `/dashboard/savings`
   - `/dashboard/debts`
6. `AttentionLane` can also route attention items into the same quick drawer
   or full editor handlers.

The drawer is a right-side modal sheet. It owns overlay, escape-close behavior,
body scroll lock, header, and selected panel composition. It does not decide
business behavior; each panel owns its own query, draft state, validation, and
save call.

## 4. Shared quick drawer behavior

Common mechanics:

- all four panels are month-scoped
- save uses transactional bulk PATCH endpoints
- successful mutations invalidate month editor queries and the dashboard month
  query for the active `yearMonth`
- footer has Save, Cancel, and Open planning
- Open planning closes the drawer and navigates to the full editor page
- unchanged rows are not sent

Hard boundary:

- The quick drawer is not the full editor. It is currently a fast monthly
  amount adjustment surface. Rich create/delete/lifecycle work mostly belongs
  to the full editor pages today.

## 5. Expenses quick editor

Current user-facing behavior:

- opens from the expenses pillar quick-adjust button
- fetches the combined month editor read model:
  `GET /api/budgets/months/{yearMonth}/editor`
- fetches expense categories
- filters out deleted expense rows
- splits rows into:
  - editable recurring/non-fixed rows
  - subscription rows
- excludes `subscription`, `housing`, and `fixed` from the regular quick-adjust
  section
- renders subscription rows separately
- lets the user edit amount for included rows
- lets the user set subscription lifecycle:
  - active
  - paused
  - cancelled
- paused/cancelled subscriptions are visually marked and do not count in the
  editable total preview
- shows month-only copy
- shows closed/read-only copy if the month is not editable
- disables save when read-only, unchanged, or invalid
- save sends `scope: "currentMonthOnly"` and `updateDefault: false`
- footer summary shows the live monthly effect as a plus/minus delta
- Open planning navigates to `/dashboard/expenses`

Backend contract used:

- read: `GET /months/{yearMonth}/editor`
- bulk save: `PATCH /months/{yearMonth}/expense-items`

Fields sent per changed row:

- `monthExpenseItemId`
- `name`
- `categoryId`
- `amountMonthly`
- `isActive`
- `subscriptionLifecycleStatus`
- `updateDefault: false`
- `scope: "currentMonthOnly"`

Important notes:

- Expenses has the best quick-editor maturity today.
- It has validation, error handling, read-only handling, category labeling,
  subscription lifecycle handling, and a meaningful footer delta.
- `CreateExpenseItemCard` exists but is not currently rendered inside
  `ExpensesPanel`.
- Active toggle support exists in `PeriodQuickAdjustRow`, but the current panel
  passes `showActiveToggle={false}`.

Production gap:

- Fixed/housing costs are intentionally not editable in the quick drawer today.
  BA needs to decide whether this is correct product behavior or only a
  temporary limitation.

## 6. Income quick editor

Current user-facing behavior:

- opens from the income pillar quick-adjust button
- fetches income item rows:
  `GET /api/budgets/months/{yearMonth}/income-items`
- filters out deleted rows
- renders one simple card per row
- lets the user edit only `amountMonthly`
- salary keeps `name: null` in the patch payload
- non-salary rows keep the existing row name
- save sends `scope: "currentMonthOnly"` and `updateDefault: false`
- Open planning navigates to `/dashboard/income`

Backend contract used:

- read: `GET /months/{yearMonth}/income-items`
- bulk save: `PATCH /months/{yearMonth}/income-items`

Fields sent per changed row:

- `monthIncomeItemId`
- `name`
- `amountMonthly`
- `isActive`
- `updateDefault: false`
- `scope: "currentMonthOnly"`

Important notes:

- The backend supports richer behavior than the quick drawer exposes:
  create side/household income, delete side/household income, edit active
  state, and plan scopes.
- Quick drawer does not expose create, delete, active toggle, salary timing,
  scope choice, or validation messaging beyond throwing on invalid parse.

Production gap:

- Income is too bare compared with expenses. It works for fast amount edits,
  but it is not yet a polished quick editor.

## 7. Savings quick editor

Current user-facing behavior:

- opens from the savings pillar quick-adjust button
- fetches savings goals:
  `GET /api/budgets/months/{yearMonth}/savings-goals`
- filters out deleted goals
- filters out closed goals
- renders one simple card per active/open goal
- lets the user edit only `monthlyContribution`
- save sends `scope: "currentMonthOnly"`
- Open planning navigates to `/dashboard/savings`

Backend contract used:

- read: `GET /months/{yearMonth}/savings-goals`
- bulk save: `PATCH /months/{yearMonth}/savings-goals`

Fields sent per changed row:

- `monthSavingsGoalId`
- `monthlyContribution`
- `scope: "currentMonthOnly"`

Important notes:

- The backend and full savings editor support much more:
  savings methods, base savings, create goal, complete/cancel/remove goal,
  rename, target amount change, and one-time transfer.
- Quick drawer ignores base monthly savings completely.
- Quick drawer ignores savings methods.
- Quick drawer ignores one-time transfer and target-date/target-amount changes.
- Closed goals are hidden, not shown as read-only history.

Production gap:

- The dashboard savings quick editor only edits goal contributions. If the
  dashboard pillar total includes base savings or method-driven savings, this
  drawer can feel incomplete because the user cannot adjust the full savings
  number from the quick surface.

## 8. Debts quick editor

Current user-facing behavior:

- opens from the debts pillar quick-adjust button
- fetches debt rows:
  `GET /api/budgets/months/{yearMonth}/debt-items`
- filters out deleted debts
- filters out closed debts
- renders one simple card per active debt
- lets the user edit only `monthlyPayment`
- save sends `scope: "currentMonthOnly"`
- includes a note that this edits planned payment, not debt balance
- Open planning navigates to `/dashboard/debts`

Backend contract used:

- read: `GET /months/{yearMonth}/debt-items`
- bulk save: `PATCH /months/{yearMonth}/debt-items`

Fields sent per changed row:

- `monthDebtId`
- `monthlyPayment`
- `scope: "currentMonthOnly"`

Important notes:

- The full debt editor has a richer read model at:
  `GET /months/{yearMonth}/debt-editor`
- Backend supports create debt, edit debt details, balance adjustment,
  participation, paid-off, archive, restore, and remove actions.
- Quick drawer does not expose balance changes, participation, lifecycle,
  creation, metadata, strategy, or minimum-payment context.

Production gap:

- Debt quick edit is intentionally narrow, but this is dangerous if the UI copy
  is weak. Users can easily confuse planned monthly payment with actual payment
  or balance reduction. BA must lock the terminology.

## 9. Cross-domain API summary

Expenses:

- `GET /months/{yearMonth}/editor`
- `PATCH /months/{yearMonth}/expense-items`
- full editor also has single patch, create, delete

Income:

- `GET /months/{yearMonth}/income-items`
- `PATCH /months/{yearMonth}/income-items`
- full editor also has single patch, create, delete

Savings:

- `GET /months/{yearMonth}/savings-goals`
- `PATCH /months/{yearMonth}/savings-goals`
- full editor also has savings methods, base savings, create, remove,
  complete, cancel, rename, target amount, one-time transfer

Debts:

- `GET /months/{yearMonth}/debt-items`
- `PATCH /months/{yearMonth}/debt-items`
- full editor also has debt-editor read model, create, details patch, balance
  adjustment, participation, paid-off, archive, restore, remove

## 10. Main inconsistencies before design

Brutal version:

- Expenses is a real quick editor.
- Income, savings, and debts are amount editors wearing the same drawer shell.
- Read-only handling is explicit in expenses, mostly absent in the other panels.
- Validation UX is explicit in expenses, weak in the other panels.
- Footer summary is meaningful in expenses, generic in the other panels.
- The drawer claims a shared pattern, but product depth is uneven.
- Savings does not expose base savings, which may make the edited rows fail to
  explain the dashboard savings total.
- Debt copy must be much sharper because amount edited is planned payment, not
  balance or actual payment.

## 11. Designer handoff questions

Designer should decide:

- Should all four quick editors share one visual row pattern, or should
  domain-specific risk shape the rows?
- Should the drawer show a small "what this changes" summary for every domain?
- Should read-only/closed-month states exist defensively in every panel even if
  the dashboard usually prevents opening them?
- Should savings include base savings in the quick drawer?
- Should debts show balance and minimum payment beside planned payment?
- Should income expose active toggles for side/household rows?
- Should create actions belong in the quick drawer, or should quick edit stay
  edit-only with a clear full-editor escape hatch?

## 12. BA handoff questions

BA should lock:

- exact month-only semantics for each domain
- whether quick edits may ever update the budget plan
- whether fixed/housing expenses should be quick-editable
- whether base savings must be quick-editable
- debt terminology:
  - planned payment
  - actual payment
  - balance
  - minimum payment
- which rows should be hidden versus shown disabled:
  - deleted rows
  - closed savings goals
  - closed debts
  - paused/cancelled subscriptions
- empty states for all four panels
- whether full-editor navigation should preserve selected month

## 13. Recommended next sequence

1. Designer handoff: define a unified quick-editor UX contract with domain
   exceptions.
2. BA review: validate semantics, hidden rows, month-only behavior, and debt
   language.
3. Implementation plan: split by shared shell polish first, then per-domain
   panels.
4. Review pass: compare quick drawer behavior against full editor contracts and
   dashboard totals.

Do not start implementation from this document alone. This is the inventory,
not the product decision record.

## 14. Validation

Documentation-only. No build or test run required.
