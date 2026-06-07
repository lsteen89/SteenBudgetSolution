# Current Dashboard Analysis

## Entry And Loading Flow

Main route:

- `/dashboard` renders `DashboardContent` inside the private dashboard shell.
- First-time users see `FirstTimeDashboardSection` and can start/resume the setup wizard.
- Returning users load the dashboard only when the wizard is not open.
- A 404-like dashboard failure falls back to first-time setup.
- Other errors render `DashboardErrorState`.

Primary frontend data hook:

- `useDashboardSummary()`
  - loads `GET /api/budgets/months/status`
  - loads `GET /api/budgets/dashboard?yearMonth={selectedYm?}`
  - maps backend DTOs into `DashboardSummary` and `DashboardBreakdown`
  - derives previous/next month navigation from the month status list

## Current Open-Month Display

The open-month dashboard currently shows these blocks:

1. Period control bar
   - previous / current / next month segmented control
   - current month status badge: open / closed / skipped
   - month archive popover
   - lifecycle ribbon: current-state meaning, comparison context, next-month availability
   - close-month CTA when the backend close window says the month can close

2. Open-month hero
   - period label
   - open status pill
   - final remaining balance: `finalBalanceWithCarryMonthly`
   - deficit/surplus tone
   - close availability text
   - primary link to `/dashboard/breakdown`

3. Follow-up strip
   - up to 3 generated prompts based on current summary data
   - overdue close prompt
   - close countdown prompt
   - negative final balance prompt
   - large surplus prompt
   - subscriptions prompt
   - low-savings prompt
   - debt-payment prompt
   - recurring-expense prompt
   - calm empty state when no prompts apply

4. Four open-month pillar cards
   - income total and income source insight
   - expense total and subscription insight
   - savings total
   - debt payment total
   - each card has quick-adjust and full-editor actions

## Current Dashboard Actions

Available from the main open-month dashboard:

- Navigate previous month.
- Navigate next month.
- Open archive popover and jump to a specific month.
- Open financial breakdown page.
- Open quick expense editor drawer.
- Open quick income editor drawer.
- Open quick savings editor drawer.
- Open quick debt editor drawer.
- Navigate to full expense editor page: `/dashboard/expenses`.
- Navigate to full income editor page: `/dashboard/income`.
- Navigate to full savings editor page: `/dashboard/savings`.
- Navigate to full debts editor page: `/dashboard/debts`.
- Start close-month review when eligible.
- Pick carry-over mode in the close modal.
- Optionally mark eligible savings goals completed while closing.
- Confirm close.
- After close, land on the just-closed month recap with handoff.

## Quick Editor Capabilities

The dashboard drawer quick editors are narrower than the full editor pages:

- Expenses quick drawer
  - loads month editor expense rows
  - bulk patches expense items
  - does not expose the full add/edit/delete modal set from the full page

- Income quick drawer
  - loads income item rows
  - bulk patches income items
  - full add/edit/delete lives on `/dashboard/income`

- Savings quick drawer
  - loads savings goal rows
  - bulk patches monthly savings-goal contributions
  - full goal creation, lifecycle, transfers, methods, base savings, rename,
    and target amount edits live on `/dashboard/savings`

- Debts quick drawer
  - loads legacy debt item rows
  - bulk patches planned monthly payments
  - richer debt lifecycle, details, balance adjustment, create, restore/archive,
    and progress flows live on `/dashboard/debts`

## Full Editor Pages Connected From Dashboard

The full editor pages target the open month, not arbitrary closed months:

- Expenses
  - shows expense hero, month-over-month comparison when a real previous
    open/closed month exists, grouped ledger, plan balance strip
  - create expense item
  - edit expense item
  - delete expense item
  - subscription lifecycle fields
  - current-month vs plan scope where allowed

- Income
  - shows income hero, distribution strip, month-over-month comparison
  - create side/household income
  - edit income rows
  - delete income rows
  - current-month vs plan scope where allowed

- Savings
  - shows savings hero, forecast, plan balance strip, methods strip
  - edit base monthly saving
  - create goal
  - edit monthly contribution and target date
  - rename goal
  - change target amount
  - one-time deposit/withdrawal
  - complete/cancel/remove goal
  - add/remove saving methods
  - show old goals

- Debts
  - shows debt hero, balance strip, grouped rows, richer read model
  - edit planned payment
  - create debt
  - edit metadata
  - adjust balance
  - include/skip current month
  - mark paid off
  - archive / restore
  - remove month-only debt
  - show progress

## Current Closed And Skipped States

Closed month:

- `PeriodControlBar` switches to closed/lock state.
- If just closed in this session, `ClosedMonthHandoffCard` appears above recap.
- `ClosedMonthRecapSection` loads `GET /api/budgets/months/{ym}/recap`.
- Header can offer "continue to next month" unless the handoff owns that CTA.

Skipped month:

- `SkippedMonthState` renders instead of open dashboard or recap.
- No editor affordances are exposed.

## Current Data Transformation Notes

Frontend `buildDashboardSummaryAggregate()` derives these open-month summary
values from `BudgetDashboardMonthDto.liveDashboard`:

- total income
- total expenditure
- carry-over amount
- final balance with carry-over
- habit savings
- goal savings
- total savings
- total debt payments
- subscriptions total/count/items
- recurring expense list
- income breakdown items
- expense category breakdown items
- savings breakdown items
- debt breakdown items
- rough emergency-fund amount/months from the first savings goal
- pillar descriptions, including top 3 expense categories

Hard truth: some dashboard "insights" are frontend-derived heuristics, not
backend-owned financial guidance. A redesign can reuse them, but should not
treat them as audited backend facts.

