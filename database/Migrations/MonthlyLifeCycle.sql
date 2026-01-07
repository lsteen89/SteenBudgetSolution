-- 2026_01_07 - MonthlyLifeCycle.sql
-- Migration script to add BudgetMonth table and lifecycle fields to Debt, ExpenseItem, IncomeSideHustle, and IncomeHouseholdMember tables.

-- ##################################################################
-- # MIGRATION: BudgetMonth + lifecycle fields
-- ##################################################################

-- 1) BudgetMonth (new table)
CREATE TABLE BudgetMonth (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId                BINARY(16)    NOT NULL,

    YearMonth               CHAR(7)       NOT NULL, -- "YYYY-MM"
    Status                  VARCHAR(10)   NOT NULL DEFAULT 'open',   -- open|closed|skipped

    OpenedAt                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ClosedAt                DATETIME      NULL,

    CarryOverMode           VARCHAR(10)   NOT NULL DEFAULT 'none',   -- none|full|custom
    CarryOverAmount         DECIMAL(18,2) NULL,

    SnapshotTotalIncomeMonthly         DECIMAL(18,2) NULL,
    SnapshotTotalExpensesMonthly       DECIMAL(18,2) NULL,
    SnapshotTotalSavingsMonthly        DECIMAL(18,2) NULL,
    SnapshotTotalDebtPaymentsMonthly   DECIMAL(18,2) NULL,
    SnapshotFinalBalanceMonthly        DECIMAL(18,2) NULL,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonth_Budget
        FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,

    CONSTRAINT CK_BudgetMonth_YearMonth
        CHECK (YearMonth REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),

    CONSTRAINT CK_BudgetMonth_Status
        CHECK (Status IN ('open','closed','skipped')),

    CONSTRAINT CK_BudgetMonth_CarryOverMode
        CHECK (CarryOverMode IN ('none','full','custom')),

    CONSTRAINT CK_BudgetMonth_CarryOverAmount_CustomOnly
        CHECK (
            (CarryOverMode <> 'custom' AND CarryOverAmount IS NULL)
            OR (CarryOverMode = 'custom' AND CarryOverAmount IS NOT NULL AND CarryOverAmount >= 0)
        ),

    UNIQUE KEY UX_BudgetMonth_BudgetId_YearMonth (BudgetId, YearMonth),
    KEY IX_BudgetMonth_BudgetId_Status (BudgetId, Status)
) ENGINE=InnoDB;


-- 2) Debt lifecycle fields
ALTER TABLE Debt
    ADD COLUMN OpenedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN ClosedAt     DATETIME     NULL,
    ADD COLUMN Status       VARCHAR(20)  NOT NULL DEFAULT 'active',
    ADD COLUMN ClosedReason VARCHAR(100) NULL;

ALTER TABLE Debt
    ADD CONSTRAINT CK_Debt_Status CHECK (Status IN ('active','closed'));

ALTER TABLE Debt
    ADD INDEX IX_Debt_BudgetId_Status (BudgetId, Status);

UPDATE Debt
SET OpenedAt = COALESCE(OpenedAt, CreatedAt),
    Status = COALESCE(Status, 'active')
WHERE OpenedAt IS NULL OR Status IS NULL;


-- 3) Optional effective-dating for MVP
ALTER TABLE ExpenseItem
    ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN EndedAt  DATETIME    NULL;

ALTER TABLE ExpenseItem
    ADD INDEX IX_ExpenseItem_BudgetId_IsActive (BudgetId, IsActive);

ALTER TABLE IncomeSideHustle
    ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN EndedAt  DATETIME    NULL;

ALTER TABLE IncomeSideHustle
    ADD INDEX IX_IncomeSideHustle_IncomeId_IsActive (IncomeId, IsActive);

ALTER TABLE IncomeHouseholdMember
    ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN EndedAt  DATETIME    NULL;

ALTER TABLE IncomeHouseholdMember
    ADD INDEX IX_IncomeHouseholdMember_IncomeId_IsActive (IncomeId, IsActive);
