# Budget Period Lifecycle Spec

Last updated: 2026-03-24
Status: Proposed and locked for implementation planning
Scope: Dashboard header flow, budget period lifecycle, eligibility rules, API/data contract changes

## 1. Decision Summary

We will move from a pure calendar `YYYY-MM` month model to a user-specific budget period model.

We will not rely only on a close timestamp.

Reason:
- A close timestamp tells us when a period was closed.
- It does not tell us what the period actually was.
- UI navigation, reporting, ordering, carry-over, and gap detection all still need a stable period identity.

Therefore each budget period must have:
- a stable period key
- a start date
- an end date
- a close-eligible datetime
- a closed-at datetime

## 2. Product Intent

The budgeting cycle should follow the user's real income cycle, not a fixed calendar month.

Example:
- User sets main income day to `25`
- A new budget period becomes eligible to start on the `25th`
- Until then, the current period remains open
- On and after the `25th`, the dashboard highlights a primary action:
  `Close current period and start next`

This remains a combined action in the product and backend flow.
We are not introducing a separate standalone "close only" action in this phase.

## 3. Core Terminology

### Budget Period
A user-specific budgeting cycle. This replaces the idea that every budget cycle is equal to a calendar month.

### Reset Day
The user's configured day-of-month when the next budget period becomes eligible to start.

### Close Eligibility
The exact local datetime when the current open budget period may be closed and advanced.

### Closed At
The actual UTC datetime when the user completed the close-and-advance action.

## 4. Period Identity Model

We will keep a simple human-readable period key, but it will no longer be the only temporal field.

Recommended model:
- `PeriodKey`: string, still `YYYY-MM`
- `PeriodStartLocalDate`: date
- `PeriodEndLocalDate`: date
- `CloseEligibleAtLocal`: datetime
- `ClosedAtUtc`: datetime nullable
- `Timezone`: IANA timezone string at budget level or user level

### Period labeling rule

We will label a period by the month in which it ends.

Example for reset day `25`:
- Period labeled `2026-05`
- Starts `2026-04-25 00:00` local
- Ends `2026-05-24 23:59:59` local
- Becomes closable at `2026-05-25 00:00` local

Why this rule:
- On May 25, the user closes the May budget and starts the June budget
- The visible label matches the month the user feels they just completed
- It aligns well with "close month / start next month" copy

UI should usually show both:
- primary label: `May 2026`
- secondary label: `25 Apr - 24 May`

## 5. Lifecycle States

Status values remain:
- `open`
- `closed`
- `skipped`

Meaning:
- `open`: active editable period
- `closed`: immutable snapshot
- `skipped`: placeholder period inserted when the user jumps ahead

Important:
- `skipped` is read-only
- `skipped` must not be treated as a live dashboard period

## 6. Lifecycle Rules

### First-time bootstrap

When a budget has zero periods:
- backend creates the current eligible period automatically
- status = `open`
- carry-over mode = `none`
- carry-over amount = `null`

### Normal progression

The user may advance only when:
- current local datetime is greater than or equal to `CloseEligibleAtLocal`

Advancing means:
1. snapshot and close current open period
2. optionally create skipped periods if user is behind by more than one period
3. open the next target period

### Closed periods

- cannot be edited
- cannot be reopened in this phase
- always show snapshot totals

### Skipped periods

- are placeholders only
- cannot be opened directly if that would imply reopening history out of order
- should appear in history and navigation only if we intentionally choose to show them

## 7. Reset Day Rules

Each user must have a configurable reset day:
- integer `1-28` for MVP safety

Reason for `1-28`:
- avoids month-length ambiguity
- avoids complex "last day of month" rules in v1
- removes edge cases around February and 30-day months

Later extension:
- allow `29-31`
- resolve by clamping to last day of shorter months

### When reset day changes

If the user changes reset day in settings:
- it applies from the next newly opened period
- it does not rewrite already created historical periods
- it does not mutate the currently open period boundaries

## 8. Timezone Rules

Eligibility must be calculated in the user's timezone, not server UTC.

Required:
- store user or budget timezone
- compute `CloseEligibleAtLocal` in that timezone
- store `ClosedAtUtc` for audit

Display:
- show dates in user locale/timezone
- never base button visibility purely on server date

## 9. Carry-over Rules

Carry-over options remain:
- `none`
- `full`
- `custom`

Definitions:
- `none`: no carry-over
- `full`: use final balance from the closed period snapshot
- `custom`: user enters an amount

Default recommendation for UI:
- preselect `full`

Reason:
- it matches the most intuitive mental model for paycheck-to-paycheck budgeting

Validation:
- `none` requires amount `0`
- `custom` requires amount `>= 0`
- `full` uses the computed final balance of the closed period

## 10. Dashboard Header UX

### Normal state

Show:
- current period label
- date range
- status badge `Open`
- normal navigation
- no strong close CTA

### Upcoming state

Starting 3 days before eligibility, show a soft notice:
- `Your next budget period unlocks on May 25`

This is informational only.

### Eligible state

On and after `CloseEligibleAtLocal`, show a prominent CTA in the header:
- `Close May and start June`

This should be stronger than a glow effect alone.
Recommended:
- highlighted button
- accent border
- short explainer text

### Overdue state

If the period is eligible to close and the user has not advanced after 3 days:
- show a stronger banner state
- keep CTA visible
- keep month navigation usable

Example:
- `Your June budget is ready to start`

### Closed period view

Show:
- closed badge
- locked/snapshot messaging
- no edit affordance

## 11. Close-and-Advance Modal

Clicking the header CTA opens a confirmation modal or sheet.

Contents:
- title: `Close May and start June`
- current period summary
- next period summary with date range
- carry-over choice
- optional custom amount input
- message if skipped periods will be created

Confirm button:
- `Close and start next period`

Behavior:
- single backend action
- on success, land user in the new open period
- show toast confirming transition

## 12. Navigation UX

The user should be able to browse period history.

Navigation should support:
- current open period
- closed periods

For `skipped` periods, MVP recommendation:
- either hide them from the main previous/next arrows
- or show them but mark them clearly as `Skipped`

Recommendation:
- hide skipped periods from primary header arrows
- show them only in full history view if needed

Reason:
- they are placeholders, not meaningful budgets to inspect like normal periods

## 13. Backend Contract Changes

The existing month lifecycle endpoint is close to what we need, but the model is too calendar-month-specific.

### Data model changes

Current `BudgetMonth` should evolve with these additions:
- `PeriodStartLocalDate`
- `PeriodEndLocalDate`
- `CloseEligibleAtLocal`
- `ClosedAtUtc` should remain audit field

Current fields to retain:
- `Status`
- `CarryOverMode`
- `CarryOverAmount`
- snapshot totals

New configuration source:
- budget-level or user-level `ResetDayOfMonth`
- budget-level or user-level `Timezone`

### Status endpoint changes

`GET /api/budgets/months/status` should return enough data for header state.

Add:
- `resetDayOfMonth`
- `timezone`
- `canCloseCurrentPeriod`
- `closeEligibleAtLocal`
- `nextPeriodKey`
- `nextPeriodLabel`
- `nextPeriodStartLocalDate`
- `nextPeriodEndLocalDate`

Each period item should include:
- `periodKey`
- `status`
- `periodStartLocalDate`
- `periodEndLocalDate`
- `closeEligibleAtLocal`
- `openedAt`
- `closedAt`

### Advance endpoint

Existing `POST /api/budgets/months/start` already represents the correct combined operation.

Implementation recommendation:
- keep the endpoint in the first phase for speed
- internally reinterpret it as `advance budget period`

Optional later cleanup:
- rename to `/api/budgets/periods/advance`

### Dashboard endpoint

`GET /api/budgets/dashboard` must return:
- live data for `open`
- snapshot totals for `closed`
- non-live placeholder response for `skipped`

Current bug to fix:
- skipped periods must not fall through to live dashboard projection

## 14. Frontend State Changes

The dashboard aggregate needs more than `monthLabel`.

Recommended dashboard summary additions:
- `periodLabel`
- `periodDateRangeLabel`
- `periodStatus`
- `periodKey`
- `canAdvancePeriod`
- `closeEligibleAt`
- `nextPeriodLabel`

The header component should support:
- `open`
- `closed`
- optionally `skipped` if history navigation exposes it

## 15. Migration Strategy

### Phase 1

Keep existing records and derive missing boundaries.

For old `BudgetMonth` rows:
- use `PeriodKey` from existing `YearMonth`
- backfill `PeriodStartLocalDate`
- backfill `PeriodEndLocalDate`
- backfill `CloseEligibleAtLocal`
- leave `ClosedAtUtc` as current `ClosedAt`

### Historical backfill rule

If the user has no stored reset day yet:
- use a default reset day, likely `1`
- or delay lifecycle upgrade until user chooses one

Recommended product behavior:
- force user to choose reset day before first use of the new lifecycle CTA

That gives cleaner future periods and avoids weak assumptions.

## 16. Edge Cases

### User is behind multiple periods

If several periods have passed:
- CTA should propose advancing to the latest eligible period
- backend may create skipped placeholders for missed periods

### User changes timezone

- old periods remain unchanged
- future eligibility calculations use the new timezone
- current open period should keep its already materialized boundary datetimes

### User changes reset day mid-period

- current open period remains unchanged
- next opened period uses new reset day

### First-ever dashboard load

Current frontend race must be fixed:
- dashboard bootstrap and status query can disagree on first load

Recommended fix:
- either bootstrap before both queries
- or have status endpoint also trigger bootstrap

## 17. Out of Scope

Not included in this phase:
- reopen closed periods
- editing historical period boundaries
- per-income-source reset days
- multiple overlapping open periods as a supported state

## 18. Locked Decisions

These decisions are now locked for implementation planning:

1. Budgeting follows user reset day, not fixed calendar month.
2. Close remains part of a combined close-and-open-next action.
3. A close timestamp alone is not enough; we keep stable period identity plus boundary fields.
4. Eligibility is timezone-aware.
5. Reset day is user-configurable.
6. Closed periods are immutable.
7. Skipped periods are placeholders and not live dashboard periods.
8. UI should use a prominent CTA, not only a decorative shine.

## 19. Immediate Implementation Checklist

Before FE work starts, define:
- where `ResetDayOfMonth` is stored
- where `Timezone` is stored
- whether status endpoint will also bootstrap first period
- how skipped periods appear in FE navigation

Before BE work starts, implement:
- new period boundary fields
- eligibility calculation
- skipped-period dashboard fix
- enriched status DTO

Before FE work starts, update:
- header props
- dashboard summary aggregate
- period selector/navigation logic
- close-and-advance modal flow
