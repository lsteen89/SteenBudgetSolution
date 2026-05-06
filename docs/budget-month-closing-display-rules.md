# Budget Month Closing Display Rules

Internal display contract for historical months, carry-over, and month traversal.

## Purpose

This document defines how eBudget should display:

- closed months
- open/next months
- carry-over
- month-to-month comparisons
- skipped months
- closed month recap visuals

The goal is to keep backend and frontend aligned before implementing the closed-month recap and traversal UX.

---

## Current domain model summary

### Core budget tables

The user first defines a core budget in the baseline tables:

- `Income`
- `IncomeSideHustle`
- `IncomeHouseholdMember`
- `ExpenseItem`
- `Savings`
- `SavingsGoal`
- `Debt`

These define the user’s base planning model.

### Monthly tables

Each created month gets its own working copy in the monthly tables:

- `BudgetMonth`
- `BudgetMonthIncome`
- `BudgetMonthIncomeSideHustle`
- `BudgetMonthIncomeHouseholdMember`
- `BudgetMonthExpenseItem`
- `BudgetMonthSavings`
- `BudgetMonthSavingsGoal`
- `BudgetMonthDebt`
- `BudgetMonthChangeEvent`

This means the live working month is always represented by the **monthly tables**, not by the baseline/core tables directly.

### Snapshot source of truth

When a month is closed, the frozen recap totals come from `BudgetMonth`:

- `SnapshotTotalIncomeMonthly`
- `SnapshotTotalExpensesMonthly`
- `SnapshotTotalSavingsMonthly`
- `SnapshotTotalDebtPaymentsMonthly`
- `SnapshotFinalBalanceMonthly`

These values are immutable display totals for the closed month.

---

## Core display principles

1. A closed month is a **read-only historical snapshot**.
2. An open month is a **live editable planning month**.
3. Carry-over is a **month transition concept**, not income.
4. Comparisons should be useful, calm, and easy to scan.
5. Closed months must never look editable.
6. The UI should guide, not judge.
7. Summary first, charts second.

Charts must be derived from the same recap DTO as the summary numbers.
The chart must never calculate alternative totals client-side.

---

## Month traversal states

### Open

An open month is live and editable.

Display:

- live month totals from monthly tables
- carry-over into this month, if any
- editable month controls
- current planning state

### Closed

A closed month is historical and read-only.

Display:

- closed status
- closed date/time
- frozen snapshot totals
- carry-over outcome
- comparison to previous comparable month
- detailed read-only breakdown
- recap visuals

No edit actions should be shown.

### Skipped

A skipped month is closed by user action and is not editable.

Display:

- clear skipped state
- short explanatory message
- no edit actions
- no misleading “live” budget presentation

Recommended copy:

> This month was skipped by user action. It is closed and cannot be edited.

---

## What a closed month shows

A closed month should clearly display the following.

### 1. Header

Show:

- `YearMonth`
- status = `Closed`
- `ClosedAt`
- carry-over outcome badge/field when relevant

### 2. Primary snapshot totals

From `BudgetMonth` snapshot fields:

- Income
- Expenses
- Savings
- Debt payments
- Final balance

These values are frozen and must not change after close.

Closed month header totals must come from `BudgetMonth` snapshot fields only.

The UI must not recompute closed-month headline totals from detail rows client-side.

### 3. Carry-over outcome

Closed month should show whether any amount was carried into the next month.

Examples:

- `Carried into May: €100`
- `No carry-over applied`

Important:
This is informational about what happened during close.
It does **not** change the closed month snapshot totals.

### 4. Comparison against previous comparable month

Compare against the nearest previous **closed, non-skipped month**.

Show:

- delta amount
- delta percent, when meaningful

Examples:

- `Food +200 SEK (+2%)`
- `Savings -500 SEK (-8%)`

### 5. Breakdown sections

Closed month should support read-only breakdowns for:

#### Income

- salary
- side hustles
- household member income
- overrides that existed that month

#### Expenses

- grouped by category
- category totals
- category delta vs previous comparable month

#### Savings

- monthly savings total
- active savings goals that month
- contribution changes

#### Debt

- monthly debt payment total
- debts active that month
- meaningful month-over-month differences

### 6. Subscription overview

Subscriptions should be shown explicitly because they are common “leak” expenses.

Closed month should surface:

- subscriptions active that month
- newly added subscriptions
- removed/cancelled subscriptions
- paused/deactivated subscriptions

Recommended labels:

- `New`
- `Paused`
- `Cancelled`
- `Removed`
- `Still active`

### 7. Visual recap

Closed month can include charts, but charts are secondary to summary content.

Recommended order:

1. Header
2. KPI snapshot row
3. One-line takeaway
4. Diagram area with switcher
5. Detailed breakdown sections

---

## What the next month shows

The next month always shows the **live editable month state** from the month-specific tables.

It is seeded from the core budget structure, but all displayed values come from the monthly tables for that month.

It is not a closed snapshot.

Important clarification:
The next month is seeded from the core budget structure, but what the UI displays is the **live monthly version** in the monthly tables.

Display:

- open status
- editable monthly values
- carry-over into this month, if any
- live working values for income, expenses, savings, debts

If useful, the UI may show an informational notice when live monthly values differ from the core/baseline defaults.

Recommended copy:

> Some values in this month differ from your core budget.

That message should be informative, not alarming.

---

## Carry-over display semantics

## Rule

Carry-over is **not income**.

Do not merge carry-over into:

- salary
- side hustle income
- household income
- closed snapshot income totals

Carry-over must be shown as a separate concept.

### On the closed month

Show carry-over as the outcome of the close process.

Examples:

- `Carried into next month: €100`
- `No carry-over applied`

This does not alter the closed month snapshot totals.

### On the next/open month

Show carry-over as a starting adjustment.

Examples:

- `Starting carry-over from April: €100`
- `Carry-over received: €100`

This amount may affect:

- available to budget
- remaining to spend
- overall available planning room

### Calculation display

The UI may show:

- `Available to budget = Carry-over + Income`

That is acceptable.

But the UI must still keep:

- `Income` = actual income only
- `Carry-over` = separate incoming value

### Carry-over modes

#### none

- closed month says no carry-over applied
- next month shows no carry-over value

#### full

- closed month shows exact amount carried forward
- next month shows same amount as starting carry-over

#### custom

Reserved for future support.
Not required for current close flow if current API only supports `none|full`.

---

## Comparison rules

### Comparison baseline

A closed month compares to the nearest previous **closed, non-skipped month**.

Skipped months are not valid comparison baselines.

### If a previous comparable month exists

Show:

- absolute delta
- percentage delta, if meaningful

Apply this to:

- income
- expenses
- savings
- debt payments
- final balance
- expense categories
- subscriptions where useful

### If no previous comparable month exists

Do not fake comparisons.

Show:

- current month values only
- no delta percent
- optional note: `No previous month to compare`

### Subscription comparison rules

Compare subscriptions against the previous comparable month and classify them as:

- new
- removed
- paused
- still active

This should be derived from the monthly expense item rows and relevant category/status logic.

---

## Diagram switcher rules

Closed months may include a chart area with a compact diagram switcher.

This should only appear on **closed months**, not on open live planning months.

### Default chart

Default tab: `Flow`

### Available tabs

- `Flow`
- `Compare`
- `Categories`

### Flow

Shows how money moved through the month.

Suggested model:

- Carry-over
- Income
- Expenses
- Savings
- Debt payments
- Final balance

Important:
Carry-over must be a separate node, not merged into income.

### Compare

Shows this month vs previous comparable month.

Suggested content:

- grouped bars or comparison cards for:
  - income
  - expenses
  - savings
  - debt payments
  - final balance

If there is no previous comparable month:

- disable or hide this tab
- show helper text

### Categories

Shows:

- expense category distribution
- biggest increases
- biggest decreases
- subscription impact

### UX rules

- summary first, diagrams second
- preserve selected chart tab when traversing months
- hide or simplify charts for skipped months
- respect reduced motion settings
- diagrams should support clarity, not decoration

When traversing months:

- open months render the live planning view
- closed months render the recap view
- skipped months render the skipped state view

The UI must switch view mode based on month status automatically.

---

## Edge cases

### No previous month

Behavior:

- no backward traversal before first month
- no comparison block
- closed month still shows full snapshot recap

### Deficit

Behavior:

- final balance shown in red
- state clearly that the month closed in deficit
- tone remains calm and neutral
- future guidance may suggest easy wins

Recommended tone:

> This month closed with a deficit. Review recurring costs and variable spending as you plan the next month.

### Skipped month

Behavior:

- show skipped state clearly
- no edit actions
- no misleading recap if there is no meaningful working data
- comparison blocks may be omitted or simplified

### Full carry-over

Behavior:

- closed month shows exact amount carried forward
- next month shows exact starting carry-over
- do not merge it into income labels or snapshot totals

### Full carry-over amount rule

`full` carry-over means:

`CarryOverAmount = max(SnapshotFinalBalanceMonthly, 0)`

If the closed month ends in deficit, full carry-over resolves to `0`.

A deficit is displayed as a deficit. It is not transferred as negative carry-over.

### No carry-over

Behavior:

- closed month explicitly says no carry-over was applied
- next month shows no carry-over value

### Carry-over storage ownership

`BudgetMonth.CarryOverMode` and `BudgetMonth.CarryOverAmount` represent carry-over **received by this month from the previous month**.

Example:

- April closes with full carry-over of €100.
- May receives `CarryOverMode = full`, `CarryOverAmount = 100`.
- April recap may display `Carried into May: €100` by reading the next month transition result.

A closed month's snapshot totals are never modified by carry-over.

---

## DTO needs for recap

The existing close response DTO is enough for the close action itself, but not enough for the full historical recap view.

A dedicated recap/read DTO is needed.

### Current close result is sufficient for:

- close confirmation
- next month transition
- immediate success toast
- top-level post-close UI refresh

### A recap DTO should provide:

#### Month meta

- `YearMonth`
- `Status`
- `OpenedAt`
- `ClosedAt`
- `CarryOverMode`
- `CarryOverAmount`

#### Snapshot totals

- `TotalIncomeMonthly`
- `TotalExpensesMonthly`
- `TotalSavingsMonthly`
- `TotalDebtPaymentsMonthly`
- `FinalBalanceMonthly`

#### Comparison summary

- previous comparable month key
- delta amounts
- delta percentages
  for:
- income
- expenses
- savings
- debt payments
- final balance

#### Expense category breakdown

- current closed month category totals
- previous comparable month category totals
- delta amount
- delta percent

#### Subscription insight block

- active subscriptions
- new subscriptions
- removed subscriptions
- paused subscriptions

### Subscription status derivation

Subscription labels must only be shown when they can be derived reliably.

Initial supported subscription statuses:

- `New`
- `Removed`
- `Still active`

Optional future statuses:

- `Paused`
- `Cancelled`

These must only be shown if the backend can distinguish them reliably.
Otherwise, the UI must not infer them.

### Delta percent rules

Percentage delta is only shown when the previous value is greater than zero.

If previous value is `0` or missing:

- show absolute delta only
- hide percentage delta

Formula:

`deltaAmount = current - previous`

`deltaPercent = previous > 0 ? deltaAmount / previous * 100 : null`

### Delta tone rules

Delta color depends on the metric.

For expenses:

- increase = attention
- decrease = positive

For savings and final balance:

- increase = positive
- decrease = attention

For income:

- increase = neutral/positive
- decrease = attention

Do not color all positive numbers green blindly.

#### Savings detail

- active savings goals that month
- contribution levels
- changes from previous comparable month where relevant

#### Debt detail

- debts active that month
- debt payment levels
- major changes where relevant

#### Chart-ready summary data

Optional but useful:

- flow data
- category distribution data
- comparison chart data

---

## Implementation notes

1. Closed month recap should be a dedicated read-only mode, not the open-month dashboard with disabled controls.
2. Open month continues to use live monthly tables.
3. Carry-over must always be explicit and separate from income.
4. Comparison should skip skipped months.
5. Diagram switcher is additive and secondary to summary.
6. The bird theme can support delight, but never at the cost of clarity.

---

## Final rules summary

- Closed month = frozen snapshot
- Open month = live editable month
- Skipped month = closed by user action
- Carry-over = separate month transition concept, not income
- Comparison = nearest previous closed, non-skipped month
- Recap = summary first, diagrams second
