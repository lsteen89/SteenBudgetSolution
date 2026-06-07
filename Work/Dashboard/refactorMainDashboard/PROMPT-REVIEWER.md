# Prompt - Reviewer

You are reviewing the open-month main dashboard refactor for
SteenBudgetSolution.

Review in code-review mode. Findings first. Be strict: financial correctness,
data honesty, lifecycle safety, lazy loading, and implementation drift matter
more than visual taste.

## Required Context

Read these before reviewing:

1. `AGENTS.md`
2. `PROJECT.md`
3. `.agents/instructions/frontend-ui.instructions.md`
4. `Work/Dashboard/refactorMainDashboard/README.md`
5. `Work/Dashboard/refactorMainDashboard/current-dashboard-analysis.md`
6. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`
7. `Work/Dashboard/refactorMainDashboard/designer-handoff.md`
8. `Work/Dashboard/refactorMainDashboard/PR-SEQUENCE.md`
9. `Work/Dashboard/refactorMainDashboard/HANDOVER-IMPLEMENTOR.md`
10. `Work/Dashboard/refactorMainDashboard/HANDOVER-REVIEWER.md`

Fetch and inspect the design bundle:

```text
https://api.anthropic.com/v1/design/h/Cv7t6hvUuMlNMEbmxAoIBQ?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Review against:

- `explorations/dashboard/dashboard.html`
- `explorations/dashboard/dashboard-handoff.md`
- `explorations/dashboard/sections.jsx`
- `explorations/dashboard/pillars.jsx`
- `explorations/dashboard/directions.jsx`
- `explorations/dashboard/data.jsx`
- `explorations/dashboard/shared.jsx`

The mockup wins on look and behaviour. The local handoff docs win on endpoint
reality and money/data honesty. Backend reality wins over both.

## Review Target

Review the implementation diff, not only the final UI. Confirm that the change
matches the locked Spine direction and does not introduce unrelated refactors.

Expected implemented direction:

- MonthRail
- MoneyState with inline allocation
- conditional CloseBand
- AttentionLane capped at 3
- 2 by 2 pillar workbench on desktop, single-column on mobile
- flow allocation bar only

## Must-Reject Issues

Reject the implementation if any of these occur:

- Uses transaction, spend-progress, "spent so far", burn-rate, due-date, or
  actual-bank-account language.
- Computes money in a way that does not reconcile:
  `income + carryOver - expenses - savings - debts = remaining`.
- Shows remaining value that can drift from backend
  `finalBalanceWithCarryMonthly`.
- Folds carry-over into income.
- Fetches editor/detail endpoints on initial dashboard load instead of lazy
  loading them on interaction.
- Shows edit affordances on closed or skipped months.
- Adds create/delete/lifecycle/transfer/archive/restore/balance-adjust controls
  to quick-adjust drawers.
- Presents client-side attention ranking as backend-authored advice.
- Adds a new palette, font, or unrelated design system.
- Hardcodes user-facing strings instead of i18n.
- Changes close-month backend contracts or lifecycle behaviour.

## Data And Endpoint Checks

Verify initial open-month dashboard render uses only:

- `GET /api/budgets/months/status`
- `GET /api/budgets/dashboard?yearMonth={optional}`

Allowed lazy reads:

- close-month savings goal completion candidates only when close modal opens
- editor reads only when quick drawers or full editor pages open
- closed recap only for closed month recap rendering

Flag initial-render calls to:

- `/editor`
- `/income-items`
- `/savings-goals`
- `/savings-methods`
- `/debt-items`
- `/debt-editor`
- `/expense-categories`

## Money Correctness Checks

Check:

- allocation helper/aggregator is named and unit-tested
- displayed term cells and allocation bar use the same source values
- positive, zero, and negative remaining all reconcile
- carry-over is displayed separately
- savings includes base savings plus goal contributions
- debt term uses monthly debt payments, not total debt balance
- debt total balance is contextual only
- no unsafe floating-point display drift is introduced
- money formatting uses existing helpers

Expected formula:

```text
income + carryOver - expenses - savings - debts = remaining
```

`remaining` must equal backend `finalBalanceWithCarryMonthly`.

## Lifecycle Checks

Check:

- open normal state
- close window upcoming
- eligible close
- overdue close
- zero remaining
- negative remaining
- no savings
- no debts
- no subscriptions/recurring expenses
- closed read-only
- skipped read-only
- first-time setup fallback
- dashboard load error
- closed recap remains intact
- post-close handoff remains intact

Close CTA rules:

- only eligible/overdue open months can start close flow
- closed/skipped never show close CTA
- close candidates fetch only when modal opens
- successful close lands on just-closed recap/handoff as before

## Quick Vs Full Editor Checks

Quick actions must remain narrow:

- expenses quick drawer: bulk patch only
- income quick drawer: bulk patch only
- savings quick drawer: bulk contribution patch only
- debt quick drawer: bulk planned-payment patch only

Full editor routes must remain:

- `/dashboard/expenses`
- `/dashboard/income`
- `/dashboard/savings`
- `/dashboard/debts`

Flag UI copy that implies quick drawers can add, remove, complete, transfer,
archive, restore, or adjust debt balances.

## Attention Lane Checks

Check:

- max 3 visible items
- ranking logic is named and unit-tested
- items derive only from existing dashboard summary data
- there is an honest "how these are chosen" explanation or equivalent
- actions route to real quick drawers, full editors, breakdown, or close flow
- no backend-authored wording unless a backend feed exists

## Accessibility And Visual QA

Check:

- keyboard access for rail, archive, quick actions, close CTA, and drawer
  trigger controls
- visible focus states
- button labels fit on mobile
- money values do not overlap adjacent content
- reduced-motion preference is respected
- no nested-card clutter
- no decorative background that fights the existing app shell
- loading states do not cause large layout jumps

Use browser or Playwright screenshots for at least:

- desktop open normal
- mobile open normal
- desktop deficit
- desktop eligible or overdue close
- closed/skipped read-only if easy to seed/mock

If visual verification cannot be run, say so explicitly.

## Test Expectations

At minimum, expect:

- aggregator/reconciliation unit tests
- attention-ranking unit tests
- dashboard component/hook tests for major states
- focused existing dashboard tests updated, not deleted
- `npm run build` from `Frontend/`

Good additional coverage:

- Playwright smoke for dashboard open-month load
- drawer lazy-load behaviour
- close CTA integration

## Review Output Format

Lead with findings:

```text
Findings
- [P1] path/to/file.tsx:123 - Problem. Why it matters. Fix.

Open Questions
- ...

Validation Reviewed
- ...

Summary
- ...
```

If there are no findings, say that directly and still list remaining test or
visual QA gaps.
