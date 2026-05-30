# PR 6 — Frontend Plan Delta Badges

## Goal

Render income plan exceptions only after PR 5 exposes source-plan fields.

## Scope

Frontend only.

Likely files:

- income row/group VM utility
- income row rendering
- income modal preview, if backed by real fields
- income i18n dictionaries/tests

## Real Signals

Render `Ändrad i {månad}` only when:

- `sourceIncomeItemId != null`
- source-plan values are present
- current month differs from source plan by amount, name, or active state

Amount semantics:

- current amount greater than source amount is positive/good
- current amount lower than source amount is lower-income/negative
- inactive current month compared with active source means income is removed
  for this month

Do not render changed state for:

- month-only rows
- linked rows with missing source fields
- unchanged rows

## Row State Priority

If multiple states apply, keep the row readable:

1. `Inaktiv denna månad`
2. `Bara {månad}`
3. `Ändrad i {månad}`

Normal linked rows still show no `Plan` pill.

## Acceptance Criteria

- Changed badge appears only from backend source-plan comparison.
- Month-only rows continue to show `Bara {månad}`.
- Inactive rows show `Inaktiv denna månad`.
- Normal linked rows stay quiet.
- Positive income delta is never styled as expense-danger/red.

## Validation

- Add utility tests for all comparison cases.
- Add row rendering tests for badge/no-badge cases.
- Run focused income tests.
- `cd Frontend && npm run build`
