# PR Sequence - Open-Month Main Dashboard Refactor

## PR Type

Planning PR. This sequence is not an implementation PR and must not contain code
changes.

## Base Inputs

Read in this order:

1. `README.md`
2. `current-dashboard-analysis.md`
3. `endpoint-inventory.md`
4. `designer-handoff.md`
5. `HANDOVER-IMPLEMENTOR.md`
6. `HANDOVER-REVIEWER.md`

External design reference fetched for this sequence:

```text
https://api.anthropic.com/v1/design/h/Cv7t6hvUuMlNMEbmxAoIBQ?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Relevant design bundle files:

- `explorations/dashboard/dashboard.html`
- `explorations/dashboard/dashboard-handoff.md`
- `explorations/dashboard/dashboard-pre-implementation-brief.md`
- `explorations/dashboard/sections.jsx`
- `explorations/dashboard/pillars.jsx`
- `explorations/dashboard/directions.jsx`
- `explorations/dashboard/data.jsx`
- `explorations/dashboard/shared.jsx`

## Locked Implementation Direction

- Layout: Spine, single narrative column.
- Section order:
  1. Month rail
  2. Money state anchor with inline allocation
  3. Conditional close band
  4. Attention lane capped at 3
  5. Pillar workbench, 2 by 2 on desktop and single-column on mobile
- Allocation visual: flow bar only.
- Existing `/dashboard/breakdown` remains, but the dashboard must explain the
  core allocation inline.
- No new endpoints are required for the recommended MVP. Endpoint requests are
  non-blocking follow-ups only.

## Implementation PR Slices

### P0 - AllocationBar and dashboard terms aggregator

Build a reusable allocation flow bar and a named reconciler for:

```text
income + carryOver - expenses - savings - debts = remaining
```

`remaining` must equal backend `finalBalanceWithCarryMonthly`.

### P1 - Dashboard shell and MonthRail

Reskin the current period control area into MonthRail while preserving existing
month navigation, archive, lifecycle state, and close readiness behaviour.

### P2 - MoneyState

Implement remaining-money anchor plus inline allocation explanation using P0.
Cover surplus, zero, and deficit states.

### P3 - Pillar workbench

Replace the current four open-month cards with dense income, expenses, savings,
and debts workbench cards. Each pillar has exactly one quick-adjust action and
one full editor route.

### P4 - Attention lane

Replace the current follow-up strip with capped, named, unit-tested client-side
attention ranking. Label the ranking as on-device guidance.

### P5 - CloseBand and state matrix

Implement eligible and overdue close band treatments, plus all non-happy states:
upcoming close, zero remaining, deficit, no savings, no debts, no recurring or
subscriptions, loading, error, closed read-only, and skipped read-only.

### P6 - Close-month flow integration

Wire MonthRail and CloseBand CTAs to the existing close-month modal flow. Do not
redesign the modal or change backend lifecycle contracts.

### P7 - Endpoint request notes

Document non-blocking backend requests only if the implementation proves they
are needed. Do not request transactions, spend progress, burn rate, due dates,
or banking-style data for this MVP.

## Hard Review Gates

Reject any implementation that:

- uses transaction, spend-progress, burn-rate, due-date, or actual-bank-account
  language
- computes remaining differently from backend `finalBalanceWithCarryMonthly`
- folds carry-over into income
- fetches editor endpoints on initial dashboard render
- exposes edit affordances on closed or skipped months
- expands quick drawers beyond bulk patch semantics
- presents client-derived attention ranking as backend advice
- hardcodes user-facing strings
- introduces a new palette, font, or unrelated design system
