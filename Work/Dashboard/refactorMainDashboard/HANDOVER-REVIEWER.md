# Handover - Reviewer

You are reviewing the open-month main dashboard refactor.

## Current PR Context

This folder currently represents a planning PR, not an implementation PR.

For the planning PR, review the handover package itself:

- `PR-DESCRIPTION.md`
- `PR-SEQUENCE.md`
- `README.md`
- `current-dashboard-analysis.md`
- `endpoint-inventory.md`
- `designer-handoff.md`
- `HANDOVER-IMPLEMENTOR.md`
- this reviewer handover

Planning PR acceptance is different from implementation acceptance:

- It should contain only files under `Work/Dashboard/refactorMainDashboard/`.
- It should not contain frontend, backend, endpoint, package, lockfile, Docker,
  CI, or generated design bundle files.
- It should make the implementation sequence reviewable before code is written.
- It should explicitly preserve the hard constraints around money math,
  carry-over, lazy editor reads, quick drawer scope, and read-only months.

If code changes are present in this planning PR, reject the PR as wrong scope.

Review in code-review mode: findings first, ordered by severity, with file and
line references. Prioritize financial correctness, data honesty, lifecycle
safety, over-fetching, and implementation drift from the locked design.

## Required Context

Read these before reviewing:

1. `Work/Dashboard/refactorMainDashboard/HANDOVER-IMPLEMENTOR.md`
2. `Work/Dashboard/refactorMainDashboard/current-dashboard-analysis.md`
3. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`
4. `Work/Dashboard/refactorMainDashboard/designer-handoff.md`
5. the fetched design bundle and its README:

```text
https://api.anthropic.com/v1/design/h/Cv7t6hvUuMlNMEbmxAoIBQ?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Review against:

```text
explorations/dashboard/dashboard.html
```

The mockup wins on look and behaviour. The local handoff docs win on endpoint
reality and money/data honesty.

## Must-Reject Issues

Reject the implementation if any of these occur:

- Uses transaction, spending-progress, "spent so far", burn-rate, due-date, or
  actual-bank-account language.
- Computes money in a way that does not reconcile:
  `income + carryOver - expenses - savings - debts = remaining`.
- Folds carry-over into income.
- Shows remaining value that can drift from backend
  `finalBalanceWithCarryMonthly`.
- Fetches editor/detail endpoints on initial dashboard load instead of lazy
  loading them on interaction.
- Shows edit affordances on closed or skipped months.
- Adds create/delete/lifecycle/transfer/archive/restore/balance-adjust controls
  to quick-adjust drawers.
- Presents client-side attention ranking as backend-authored advice.
- Adds a new palette, font, or unrelated design system.
- Hardcodes user-facing strings instead of i18n.
- Changes close-month backend contracts or lifecycle behaviour without an
  explicit task.

## Design Compliance Checklist

The implementation should match the locked direction:

- Spine layout, not cockpit/two-pane.
- Section order:
  1. MonthRail
  2. MoneyState with inline allocation
  3. conditional CloseBand
  4. AttentionLane capped at 3
  5. Pillar workbench
- Allocation is a flow bar, not equation-only or waterfall-only.
- Deficit state shows where planned money runs out without shame copy.
- `/dashboard/breakdown` still exists, but the main dashboard explains the
  core allocation inline.
- Mobile is a clean single column with no overlap or clipped button text.
- Desktop stays within the existing calm eBudget shell.

## Data And Endpoint Review

Verify the dashboard initial render uses only:

- `GET /api/budgets/months/status`
- `GET /api/budgets/dashboard?yearMonth={optional}`

Allowed lazy reads:

- close-month savings goal completion candidates only when close modal opens
- editor reads only when quick drawers or full editor pages open
- closed recap only for closed month recap rendering

Flag if the dashboard loads these on initial open-month render:

- `/editor`
- `/income-items`
- `/savings-goals`
- `/savings-methods`
- `/debt-items`
- `/debt-editor`
- `/expense-categories`

Those are not allowed unless the user explicitly opens a drawer/page that needs
them.

## Money Correctness Review

Check:

- money values use existing formatting helpers
- no `float`-style imprecision patterns are introduced
- allocation bar and term cells use the same source values
- positive, zero, and negative remaining all reconcile
- `remaining` equals the backend projection, not an independent frontend
  invention
- carry-over is displayed separately
- savings includes base savings plus goal contributions
- debt term uses monthly debt payments, not total debt balance
- debt total balance is only contextual

Expected formula:

```text
income + carryOver - expenses - savings - debts = remaining
```

## Lifecycle Review

Check states:

- open normal
- close window upcoming
- eligible to close
- overdue for close
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

## Quick Vs Full Editor Review

Quick actions:

- expenses quick drawer: bulk patch only
- income quick drawer: bulk patch only
- savings quick drawer: bulk contribution patch only
- debt quick drawer: bulk planned-payment patch only

Full editor routes must remain:

- `/dashboard/expenses`
- `/dashboard/income`
- `/dashboard/savings`
- `/dashboard/debts`

Flag any UI copy that implies the quick drawer can add/remove/complete/transfer
when it cannot.

## Attention Lane Review

Check:

- max 3 items
- ranking logic is named and unit-tested
- items derive only from existing dashboard summary data
- there is an honest "how chosen" explanation or equivalent
- actions route to real surfaces
- no backend-authored wording unless a backend feed exists

## Accessibility And Visual QA

Check:

- keyboard access for rail, archive, quick actions, close CTA, and drawer
  trigger controls
- visible focus states
- button labels fit on mobile
- money values do not overlap adjacent content
- reduced-motion preference is respected for any new animation
- no nested-card clutter
- no decorative background that fights the app shell
- loading states do not cause large layout jumps

Use browser or Playwright screenshots for at least:

- desktop open normal
- mobile open normal
- desktop deficit
- desktop eligible/overdue close
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

Report missing validation as residual risk.

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
