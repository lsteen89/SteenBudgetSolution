# PR 6: Editor Selected-Month Refactor

## Goal

Refactor full editor pages so they can safely edit a selected open or planned month instead of always using `openMonthYearMonth`.

## Scope In

- Keep existing editor routes as current/open-month defaults:
  - `/dashboard/income`
  - `/dashboard/expenses`
  - `/dashboard/savings`
  - `/dashboard/debts`
- Add selected-month support, likely through query param:

```text
/dashboard/income?yearMonth=2026-06
```

- Ensure query hooks use selected month.
- Ensure mutation hooks use selected month.
- Preserve read-only behavior for closed/skipped months.
- Allow planned-month editing only where backend PR 5 supports it.
- Make edit scope explicit in UI and API payloads.

## Scope Out

- No quick drawer future editing.
- No planned-month creation UX.
- No arbitrary future month route model.
- No budget-plan editor redesign.
- No silent fallback to open month if selected month exists but request fails.

## Backend Files / Areas Likely Touched

- Existing editor query/mutation guards may need to allow `planned` alongside `open`.
- `Backend/Application/Features/Budgets/Months/Editor/*`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/*`
- Month mutability helpers/errors.

## Frontend Files / Areas Likely Touched

- `Frontend/src/Pages/private/income/*`
- `Frontend/src/Pages/private/expenses/*`
- `Frontend/src/Pages/private/savings/*`
- `Frontend/src/Pages/private/debts/*`
- editor hooks/services for income, expenses, savings, debts.
- route helpers.
- editor i18n.
- editor page tests.

## Data Contracts / DTOs

Edit scopes must be explicit:

| Scope | Meaning |
| --- | --- |
| `currentMonthOnly` | Edit current open month only |
| `plannedMonthOnly` | Edit next planned month only |
| `plannedMonthAndBudgetPlan` | Edit planned month and recurring plan |
| `budgetPlanOnly` | Edit recurring plan only |

Exact backend naming can vary, but the concepts cannot blur.

## Tests Required

- Default editor route still edits active/open month.
- `?yearMonth=` causes reads to target selected month.
- Mutations target selected month.
- Closed/skipped selected months are read-only.
- Planned month can be edited only after backend supports planned.
- Plan-forward controls show only for source-linked rows.
- Month-only rows do not show plan-forward controls.

## Risks

- High risk of editing the wrong month.
- Query param can create hidden state if not displayed clearly.
- Existing editor hooks may silently depend on `openMonthYearMonth`.
- Plan-forward actions can be exposed for month-only rows by mistake.

## Dependencies

- PR 5.

## Definition Of Done

- Full editors are selected-month aware.
- The selected month is visible and unambiguous.
- Reads and writes use the same selected month.
- Closed/skipped read-only protection still works.
- Current-month default behavior is preserved.

