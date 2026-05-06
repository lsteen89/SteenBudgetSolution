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

## Change log

- 2026-05-06 — Deterministic E2E seeder gains a per-user `BudgetTimelineProfile` so scenario-specific accounts can ship their own baseline subscriptions without mutating shared E2E users. Adds rename + subscription-lifecycle scenario operations (with change events) and a seed-time invariant hook. New `e2e-recap-subscriptions@local.test` user covers the closed-month recap subscription block (active by source, renamed same source, new, removed, paused, cancelled) and asserts paused/cancelled are excluded from the active subscription total. Files touched: `Backend.Tools/BudgetTimelineSeeder.cs`, `Backend.Tools/BudgetTimelineScenarioData.cs`, `Backend.Tools/BudgetTimelineProfile.cs` (new), `Backend.Tools/BudgetTimelineProfiles.cs` (new), `Backend.Tools/Program.cs`, `Frontend/e2e/helpers/e2eUsers.ts`, `Frontend/e2e/close-month/closed-month-recap-subscriptions.spec.ts` (new), `docs/playwright-e2e.md`. Risks/follow-up: backend builds clean; the focused Playwright spec was not run in this change because the local E2E stack (MariaDB :3307 + backend on :5001 + Vite on :5173) was not provisioned in the working environment — verify with `npm run test:e2e:full -- --grep "recap-subscriptions"` before relying on it in CI.
