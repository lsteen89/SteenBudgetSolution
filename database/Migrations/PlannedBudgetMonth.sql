-- ##################################################################
-- # Migration: planned budget month status (PR 5)
-- #
-- # Adds the `planned` lifecycle status to BudgetMonth:
-- #   - extends CK_BudgetMonth_Status with 'planned'
-- #   - adds PlannedBudgetId generated column + unique key so at most
-- #     one planned month can exist per budget (same mechanism as the
-- #     one-open-month invariant via OpenBudgetId)
-- #
-- # Matches database/init/04-MonthlyLifeCycle.sql after this change.
-- # Safe to run on a live database: no data is rewritten; existing
-- # rows all have Status in ('open','closed','skipped') so the new
-- # generated column is NULL for every existing row.
-- ##################################################################

ALTER TABLE BudgetMonth
    DROP CONSTRAINT CK_BudgetMonth_Status;

ALTER TABLE BudgetMonth
    ADD CONSTRAINT CK_BudgetMonth_Status
        CHECK (Status IN ('open','planned','closed','skipped'));

ALTER TABLE BudgetMonth
    ADD COLUMN PlannedBudgetId BINARY(16) GENERATED ALWAYS AS (
        CASE WHEN Status = 'planned' THEN BudgetId ELSE NULL END
    ) STORED AFTER OpenBudgetId;

ALTER TABLE BudgetMonth
    ADD UNIQUE KEY UX_BudgetMonth_OnePlannedPerBudget (PlannedBudgetId);
