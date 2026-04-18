# AI Changelog

## Current architecture truths

- Dashboard reads must be month-driven for open months.
- Closed months must use snapshot totals only.
- Baseline tables are for setup/default seeding, not live month editing.
- BudgetMonth is the operational container for month lifecycle.
- Dapper is the default data access strategy.

## Recent changes

- Introduced month-aware BudgetMonth child tables for income, expenses, savings, and debts.
- Added lifecycle handling for opening/closing months.
- Dashboard is being migrated from baseline-driven reads to month-driven reads.
- Carry-over is included in live projector calculations.
- Savings goal monthly contribution is stored month-specifically.

## Current focus

- Open month editing flow
- Child-row editing endpoints
- Dashboard consistency with month-driven data
- Regression tests around idempotency and month transitions

## Important constraints

- Keep handlers thin.
- Avoid inventing columns or DTO fields.
- Match existing envelope/result patterns.
- UI must be safe with missing or partial data.
