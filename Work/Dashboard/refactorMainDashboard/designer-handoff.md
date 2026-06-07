# Designer Handoff - Main Open-Month Dashboard

## Product Direction

Design this as a financial command center for the currently open month, not a
marketing dashboard and not a generic analytics wall.

The dashboard must answer:

- How much money is left this month?
- Why is that the number?
- What changed or needs attention?
- What is safe to adjust now?
- Is it time to close the month?
- Where should the user go next if they want deeper editing?

## Hard Data Boundaries

Already available in one main read:

- current selected month and lifecycle state
- close-window state and overdue state
- currency
- carry-over amount
- income totals and income source rows
- expense category totals
- savings totals and goal rows
- debt total balance, monthly payments, and debt rows
- recurring expenses
- subscription total/count/items
- final remaining balance with carry-over

Available through extra reads only when needed:

- month list/archive/status
- closed-month recap
- close-month savings goal completion candidates
- expense editor rows and category metadata
- income editor rows
- savings goals/methods/old goals
- debt editor rich read model

Not available today:

- actual bank transactions
- actual spend progress against budgets
- transaction categories by date
- weekly/daily burn rate
- due dates for bills/debts
- historical trend series in one endpoint
- backend-ranked "next best action" feed
- expense line items in the main dashboard category summaries

If the design needs any of those unavailable items, call it out as an endpoint
request. Do not fake it in UI copy.

## Current UX Problems Worth Solving

Blunt version:

- The dashboard has useful actions, but the hierarchy is not sharp enough.
- The open-month hero tells the remaining number, but not enough context around
  where the money went.
- Follow-up prompts are simple frontend heuristics. They can feel helpful, but
  they are not a real prioritized action model.
- The four pillar cards duplicate the full editor navigation pattern without
  giving enough dense information.
- Quick edit vs full edit is not obvious enough.
- Savings and debts have richer backend/editor capabilities than the current
  open-month dashboard reveals.
- The breakdown page exists, but the main dashboard hands off to it instead of
  absorbing the most important reasoning inline.

## Keep These Existing Capabilities

Do not design a dashboard that loses these:

- Month navigation.
- Month archive access.
- Open/closed/skipped state.
- Clear close-month eligibility.
- Close-month CTA when eligible.
- Read-only behavior for closed/skipped months.
- Fast route to deeper breakdown.
- Fast route to expenses/income/savings/debts editors.
- Quick adjustment affordances for the four pillars.
- Deficit state must be obvious without shame copy.
- Positive surplus should feel actionable, not celebratory noise.

## Suggested MVP Dashboard Information Architecture

This is a technical recommendation, not a locked design:

1. Month control rail
   - current month
   - open status
   - previous/next/archive
   - close readiness

2. Money state hero
   - remaining money
   - compact equation: income + carry-over - expenses - savings - debts
   - deficit/surplus explanation
   - close-month state

3. Action/attention lane
   - max 3 prioritized items
   - source each item from existing data where possible
   - if you need backend-ranked action priority, request endpoint support

4. Financial flow / allocation section
   - income, expenses, savings, debt, remaining
   - must reconcile exactly with backend numbers
   - do not introduce "spend so far" language; we do not have transactions

5. Pillar workbench
   - income: salary/side/household split
   - expenses: top categories, recurring/subscription pressure
   - savings: base vs goals, goal progress
   - debts: monthly payment, total balance, strategy
   - each pillar should have one primary action and one deeper route

6. Close-month affordance
   - only prominent when eligible/overdue
   - otherwise a quiet countdown/status

## Likely Endpoint Requests

The designer should request backend/API work if the desired design needs:

- An explicit dashboard action feed with backend-owned severity, labels, and
  action targets.
- Previous-month comparison summary delivered with the dashboard payload.
- Expense line items inside dashboard category summaries.
- A dashboard-specific savings goal progress summary, not just raw goal rows.
- A dashboard-specific debt summary from the rich debt editor read model.
- A historical mini-trend endpoint.
- Bill/debt due dates.
- Any "spent today", "spent this week", "burn rate", or transaction feed.

Strong opinion: for the MVP, avoid new endpoints unless the design cannot be
honest without them. The existing API can support a much better dashboard if
the design sticks to planned budget data and month lifecycle.

## Implementation Constraints For Later

- Use existing eBudget tokens and Inter.
- Keep strings in i18n dictionaries.
- Preserve money math exactly; display is allowed to change, source formulas
  are not.
- Do not make closed/skipped months editable.
- Do not let quick actions imply edits that are only available in full editor.
- If the dashboard aggregates or prioritizes items client-side, keep that logic
  named and testable.
- Avoid a design that requires fetching every editor endpoint on initial
  dashboard load; use lazy loading for drawer/detail interactions.

## Designer Deliverable Expected Next

Provide a design handoff that includes:

- desktop and mobile layout direction
- visible components and states
- which current data fields each component consumes
- which existing actions each CTA triggers
- explicit list of any required new endpoint fields
- empty/loading/error/read-only/overdue-close states
