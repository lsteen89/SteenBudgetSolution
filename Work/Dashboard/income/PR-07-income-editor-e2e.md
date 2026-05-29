# PR 7 — Income Editor E2E Coverage

## Goal

Cover the redesigned income editor with focused Playwright coverage after the
UI and API shape settle.

## Scope

Frontend E2E only.

Likely files:

- `Frontend/e2e/*income*`
- test selectors in income components only where necessary

Do not change seeding unless explicitly approved.

## Scenarios

Minimum scenarios:

- loading state settles into an editable open month
- no-open-month state is calm
- equation strip reconciles displayed terms
- global add creates a month-only income row after choosing type
- group add creates a month-only row with type preselected
- linked row edit with `currentMonthOnly`
- linked row edit with `budgetPlanOnly`, if plan-delta/backend support exists
- inactive row display and activation/deactivation action
- delete confirmation says `Ta bort från {månad}`
- salary cannot be deleted
- read-only/closed month exposes no create/edit/delete affordances if route
  support exists
- income below committed outflows shows calm warn strip state

## Acceptance Criteria

- Tests use real user-facing labels where practical.
- Stable test IDs are added only where label selection is brittle.
- Tests do not assert fake plan deltas.
- Tests avoid unrelated debt/savings/expense/dashboard details except the
  totals needed for the income equation.

## Validation

- Run the new Playwright spec or agreed narrow smoke slice.
- `cd Frontend && npm run build`
