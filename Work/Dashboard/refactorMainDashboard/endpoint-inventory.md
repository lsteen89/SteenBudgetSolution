# Endpoint Inventory

All routes below are under authenticated `api/budgets`.

## Dashboard Reads

| Method | Route | Used By | Response | Notes |
| --- | --- | --- | --- | --- |
| GET | `/dashboard?yearMonth={YYYY-MM?}` | main dashboard, breakdown page, full editors | `BudgetDashboardMonthDto` | Main projection for open/closed/skipped month. Omitting `yearMonth` resolves an accessible month. |
| GET | `/months/status` | month navigation, archive, open-month detection | `BudgetMonthsStatusDto` | Gives open month, current month, gap count, suggested action, and month list. |
| GET | `/months/{yearMonth}/recap` | closed month recap | `BudgetMonthRecapDto` | Closed-month detail surface only. |
| GET | `/expense-categories` | expense editor | `ExpenseCategoryDto[]` | Category metadata for editor forms/groups. |

## Month Lifecycle

| Method | Route | Used By | Response | Notes |
| --- | --- | --- | --- | --- |
| POST | `/months/start` | start/continue month flows | `BudgetMonthsStatusDto` | Starts target month and can close previous open month / create skipped months. |
| GET | `/months/{yearMonth}/close/savings-goal-completion-candidates` | close-month modal | `SavingsGoalCompletionCandidateDto[]` | Read-only candidate list; fetched only while modal is open. |
| POST | `/months/{yearMonth}/close` | close-month modal | `CloseBudgetMonthResultDto` | Closes month, snapshots totals, returns next month/carry-over outcome. |

## Open-Month Dashboard DTO Shape

`GET /dashboard` returns:

- `currencyCode`
- `month`
  - `yearMonth`
  - `status`: `open | closed | skipped`
  - `carryOverMode`
  - `carryOverAmount`
  - `isCloseWindowOpen`
  - `closeWindowOpensAtUtc`
  - `closeEligibleAtUtc`
  - `isOverdueForClose`
- `liveDashboard` for open months
- `snapshotTotals` for closed months

`liveDashboard` contains:

- `budgetId`
- `income`
  - salary, side-hustle total, household-member total, total income
  - income payment timing
  - side hustle rows
  - household member rows
- `expenditure`
  - total monthly expenses
  - category summaries
  - category item arrays currently empty in the dashboard projection
- `savings`
  - base monthly saving
  - total goal contributions
  - total monthly savings
  - `isMonthOnly`
  - goal rows with name/target/date/saved/contribution/favorite
- `debt`
  - total debt balance
  - total monthly payments
  - repayment strategy
  - debt rows with name/type/balance/apr/monthly payment
- carry-over and disposable/final balance numbers
- `recurringExpenses`
- `subscriptions`

## Expense Editor Endpoints

| Method | Route | Response | Notes |
| --- | --- | --- | --- |
| GET | `/months/{yearMonth}/editor` | `BudgetMonthEditorDto` | Month metadata + expense item rows. |
| POST | `/months/{yearMonth}/expense-items` | `BudgetMonthExpenseItemEditorRowDto` | Create month expense item. |
| PATCH | `/months/{yearMonth}/expense-items/{monthExpenseItemId}` | `BudgetMonthExpenseItemEditorRowDto` | Edit one expense row; supports plan scope where allowed. |
| PATCH | `/months/{yearMonth}/expense-items` | `BudgetMonthExpenseItemEditorRowDto[]` | Transactional bulk patch. |
| DELETE | `/months/{yearMonth}/expense-items/{monthExpenseItemId}` | `{ deleted: true }` | Delete expense item. |

## Income Editor Endpoints

| Method | Route | Response | Notes |
| --- | --- | --- | --- |
| GET | `/months/{yearMonth}/income-items` | `BudgetMonthIncomeItemEditorRowDto[]` | Month income rows. |
| POST | `/months/{yearMonth}/income-items` | `BudgetMonthIncomeItemEditorRowDto` | Create side-hustle or household-member income. |
| PATCH | `/months/{yearMonth}/income-items/{monthIncomeItemId}` | `BudgetMonthIncomeItemEditorRowDto` | Edit one income row; supports plan scope where allowed. |
| PATCH | `/months/{yearMonth}/income-items` | `BudgetMonthIncomeItemEditorRowDto[]` | Transactional bulk patch. |
| DELETE | `/months/{yearMonth}/income-items/{monthIncomeItemId}` | `{ deleted: true }` | Delete income item. |

## Savings Editor Endpoints

| Method | Route | Response | Notes |
| --- | --- | --- | --- |
| GET | `/months/{yearMonth}/savings-goals` | `BudgetMonthSavingsGoalEditorRowDto[]` | Active/current month goal rows. |
| GET | `/months/{yearMonth}/savings-goals/old` | `BudgetMonthSavingsGoalArchiveRowDto[]` | Previous/old goals. |
| GET | `/months/{yearMonth}/savings-methods` | `SavingsMethodDto[]` | Current month savings methods. |
| POST | `/months/{yearMonth}/savings-methods` | `SavingsMethodDto` | Add savings method. |
| DELETE | `/months/{yearMonth}/savings-methods/{savingsMethodId}` | `{ deleted: bool }` | Remove savings method. |
| POST | `/months/{yearMonth}/savings-goals` | `BudgetMonthSavingsGoalEditorRowDto` | Create goal. |
| PATCH | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}` | `BudgetMonthSavingsGoalEditorRowDto` | Edit monthly contribution / target date. |
| PATCH | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/name` | `BudgetMonthSavingsGoalEditorRowDto` | Rename goal. |
| PATCH | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/target-amount` | `BudgetMonthSavingsGoalEditorRowDto` | Change target amount. |
| POST | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/transfer` | `BudgetMonthSavingsGoalEditorRowDto` | One-time deposit/withdrawal; non-idempotent. |
| PATCH | `/months/{yearMonth}/savings-goals` | `BudgetMonthSavingsGoalEditorRowDto[]` | Transactional bulk monthly contribution patch. |
| POST | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/complete` | `BudgetMonthSavingsGoalEditorRowDto` | Complete goal. |
| POST | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/cancel` | `BudgetMonthSavingsGoalEditorRowDto` | Cancel goal. |
| PATCH | `/months/{yearMonth}/base-savings` | `BudgetMonthBaseSavingsEditorDto` | Edit base monthly savings. |
| POST | `/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/remove` | `BudgetMonthSavingsGoalEditorRowDto` | Remove goal. |

## Debt Editor Endpoints

| Method | Route | Response | Notes |
| --- | --- | --- | --- |
| GET | `/months/{yearMonth}/debt-items` | `BudgetMonthDebtEditorRowDto[]` | Legacy simpler debt rows; still used by quick drawer. |
| GET | `/months/{yearMonth}/debt-editor` | `BudgetMonthDebtEditorDto` | Rich read model with hero/summary/rows/actions/recent events. |
| PATCH | `/months/{yearMonth}/debt-items/{monthDebtId}` | `BudgetMonthDebtEditorRowDto` | Edit planned monthly payment. |
| POST | `/months/{yearMonth}/debt-items` | `CreateBudgetMonthDebtResponseDto` | Create debt; supports current month and plan scopes. |
| PATCH | `/months/{yearMonth}/debt-items/{monthDebtId}/details` | `BudgetMonthDebtEditorRowDto` | Edit metadata; balance excluded. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/balance-adjustments` | `AdjustBudgetMonthDebtBalanceResponseDto` | Absolute balance correction event; non-idempotent. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/participation` | `BudgetMonthDebtLifecycleActionResponseDto` | Include/skip debt this month. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/mark-paid-off` | `BudgetMonthDebtLifecycleActionResponseDto` | Mark source debt paid off; optionally set balance zero. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/archive` | `BudgetMonthDebtLifecycleActionResponseDto` | Archive source debt. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/restore` | `BudgetMonthDebtLifecycleActionResponseDto` | Restore source debt. |
| POST | `/months/{yearMonth}/debt-items/{monthDebtId}/remove` | `BudgetMonthDebtLifecycleActionResponseDto` | Remove month-only debt row. |
| PATCH | `/months/{yearMonth}/debt-items` | `BudgetMonthDebtEditorRowDto[]` | Transactional bulk monthly payment patch. |

## Important Gaps In Existing Projection

The main dashboard projection is good for totals and broad rows. It is weaker
for dense dashboard decisions:

- Expense category `items` are currently empty in the dashboard projection.
- No previous-month comparison bundle is included; pages fetch previous month
  separately and derive comparisons client-side.
- No backend-authored insight severity or prioritized action list exists.
- No due-date/payment calendar beyond income close-window timing.
- No transaction/spending actuals; this app is budget-plan based.
- No trend history endpoint.
- No grouped debt editor read model in the main dashboard payload.
- No per-row edit permissions in the main dashboard payload except where editor
  read models are fetched separately.

