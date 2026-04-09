-- ##################################################################
-- # 04: BudgetMonth + lifecycle tables
-- ##################################################################

-- 1) BudgetMonth 
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


CREATE TABLE BudgetMonthIncome (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId           BINARY(16)    NOT NULL,
    SourceIncomeId          BINARY(16)    NULL, -- baseline row it came from

    NetSalaryMonthly        DECIMAL(18,2) NOT NULL DEFAULT 0,
    SalaryFrequency         INT           NOT NULL,

    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthIncome_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthIncome_SourceIncome
        FOREIGN KEY (SourceIncomeId) REFERENCES Income(Id) ON DELETE SET NULL,

    UNIQUE KEY UX_BudgetMonthIncome_BudgetMonthId (BudgetMonthId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthIncomeSideHustle (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthIncomeId     BINARY(16)    NOT NULL,
    SourceSideHustleId      BINARY(16)    NULL, -- baseline source row

    Name                    VARCHAR(255)  NOT NULL,
    IncomeMonthly           DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency               INT           NOT NULL,

    IsActive                TINYINT(1)    NOT NULL DEFAULT 1,
    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    SortOrder               INT           NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthIncomeSideHustle_BudgetMonthIncome
        FOREIGN KEY (BudgetMonthIncomeId) REFERENCES BudgetMonthIncome(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthIncomeSideHustle_Source
        FOREIGN KEY (SourceSideHustleId) REFERENCES IncomeSideHustle(Id) ON DELETE SET NULL,

    INDEX IX_BudgetMonthIncomeSideHustle_BudgetMonthIncomeId (BudgetMonthIncomeId),
    INDEX IX_BudgetMonthIncomeSideHustle_SourceSideHustleId (SourceSideHustleId),
    
    UNIQUE KEY UX_BudgetMonthIncomeSideHustle_MonthIncome_Source
        (BudgetMonthIncomeId, SourceSideHustleId)

) ENGINE=InnoDB;

CREATE TABLE BudgetMonthIncomeHouseholdMember (
    Id                          BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthIncomeId         BINARY(16)    NOT NULL,
    SourceHouseholdMemberId     BINARY(16)    NULL,

    Name                        VARCHAR(255)  NOT NULL,
    IncomeMonthly               DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency                   INT           NOT NULL,

    IsActive                    TINYINT(1)    NOT NULL DEFAULT 1,
    IsOverride                  TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted                   TINYINT(1)    NOT NULL DEFAULT 0,

    SortOrder                   INT           NOT NULL DEFAULT 0,

    CreatedAt                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt                   DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId             BINARY(16)    NOT NULL,
    UpdatedByUserId             BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthIncomeHouseholdMember_BudgetMonthIncome
        FOREIGN KEY (BudgetMonthIncomeId) REFERENCES BudgetMonthIncome(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthIncomeHouseholdMember_Source
        FOREIGN KEY (SourceHouseholdMemberId) REFERENCES IncomeHouseholdMember(Id) ON DELETE SET NULL,

    UNIQUE KEY UX_BudgetMonthIncomeHouseholdMember_MonthIncome_Source
        (BudgetMonthIncomeId, SourceHouseholdMemberId),

    INDEX IX_BudgetMonthIncomeHouseholdMember_BudgetMonthIncomeId (BudgetMonthIncomeId),
    INDEX IX_BudgetMonthIncomeHouseholdMember_SourceHouseholdMemberId (SourceHouseholdMemberId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthExpenseItem (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId           BINARY(16)    NOT NULL,
    SourceExpenseItemId     BINARY(16)    NULL,

    CategoryId              BINARY(16)    NOT NULL,
    Name                    VARCHAR(255)  NOT NULL,
    AmountMonthly           DECIMAL(18,2) NOT NULL DEFAULT 0,

    IsActive                TINYINT(1)    NOT NULL DEFAULT 1,
    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    SortOrder               INT           NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthExpenseItem_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthExpenseItem_SourceExpenseItem
        FOREIGN KEY (SourceExpenseItemId) REFERENCES ExpenseItem(Id) ON DELETE SET NULL,

    CONSTRAINT FK_BudgetMonthExpenseItem_Category
        FOREIGN KEY (CategoryId) REFERENCES ExpenseCategory(Id) ON DELETE RESTRICT,

    INDEX IX_BudgetMonthExpenseItem_BudgetMonthId (BudgetMonthId),
    INDEX IX_BudgetMonthExpenseItem_SourceExpenseItemId (SourceExpenseItemId),
    INDEX IX_BudgetMonthExpenseItem_CategoryId (CategoryId),
    UNIQUE KEY UX_BudgetMonthExpenseItem_Month_Source (BudgetMonthId, SourceExpenseItemId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthSavings (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId           BINARY(16)    NOT NULL,
    SourceSavingsId         BINARY(16)    NULL,

    MonthlySavings          DECIMAL(18,2) NOT NULL DEFAULT 0,

    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthSavings_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthSavings_SourceSavings
        FOREIGN KEY (SourceSavingsId) REFERENCES Savings(Id) ON DELETE SET NULL,

    UNIQUE KEY UX_BudgetMonthSavings_BudgetMonthId (BudgetMonthId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthSavingsGoal (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthSavingsId    BINARY(16)    NOT NULL,
    SourceSavingsGoalId     BINARY(16)    NULL,

    Name                    VARCHAR(255)  NULL,
    TargetAmount            DECIMAL(18,2) NULL,
    TargetDate              DATE          NULL,
    AmountSaved             DECIMAL(18,2) NULL,
    MonthlyContribution     DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    OpenedAt                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status                  VARCHAR(20)   NOT NULL DEFAULT 'active',
    ClosedAt                DATETIME      NULL,
    ClosedReason            VARCHAR(100)  NULL,

    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    SortOrder               INT           NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthSavingsGoal_BudgetMonthSavings
        FOREIGN KEY (BudgetMonthSavingsId) REFERENCES BudgetMonthSavings(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthSavingsGoal_SourceSavingsGoal
        FOREIGN KEY (SourceSavingsGoalId) REFERENCES SavingsGoal(Id) ON DELETE SET NULL,

    CONSTRAINT CK_BudgetMonthSavingsGoal_Status CHECK (Status IN ('active','closed')),

    UNIQUE KEY UX_BudgetMonthSavingsGoal_MonthSavings_Source
        (BudgetMonthSavingsId, SourceSavingsGoalId),

    INDEX IX_BudgetMonthSavingsGoal_BudgetMonthSavingsId (BudgetMonthSavingsId),
    INDEX IX_BudgetMonthSavingsGoal_SourceSavingsGoalId (SourceSavingsGoalId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthDebt (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId           BINARY(16)    NOT NULL,
    SourceDebtId            BINARY(16)    NULL,

    Name                    VARCHAR(255)  NOT NULL,
    Type                    VARCHAR(50)   NOT NULL,
    Balance                 DECIMAL(18,2) NOT NULL,
    Apr                     DECIMAL(18,2) NOT NULL,
    MonthlyFee              DECIMAL(18,2) NULL,
    MinPayment              DECIMAL(18,2) NULL,
    TermMonths              INT           NULL,
    OpenedAt                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status                  VARCHAR(20)   NOT NULL DEFAULT 'active',
    ClosedAt                DATETIME      NULL,
    ClosedReason            VARCHAR(100)  NULL,

    IsOverride              TINYINT(1)    NOT NULL DEFAULT 0,
    IsDeleted               TINYINT(1)    NOT NULL DEFAULT 0,

    SortOrder               INT           NOT NULL DEFAULT 0,

    CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId         BINARY(16)    NOT NULL,
    UpdatedByUserId         BINARY(16)    NULL,

    CONSTRAINT FK_BudgetMonthDebt_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthDebt_SourceDebt
        FOREIGN KEY (SourceDebtId) REFERENCES Debt(Id) ON DELETE SET NULL,

    CONSTRAINT CK_BudgetMonthDebt_Status CHECK (Status IN ('active','closed')),

    UNIQUE KEY UX_BudgetMonthDebt_Month_Source
        (BudgetMonthId, SourceDebtId),

    INDEX IX_BudgetMonthDebt_BudgetMonthId (BudgetMonthId),
    INDEX IX_BudgetMonthDebt_SourceDebtId (SourceDebtId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthChangeEvent (
    Id                  BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId       BINARY(16)    NOT NULL,

    EntityType          VARCHAR(50)   NOT NULL,   -- expense-item | debt | savings-goal
    EntityId            BINARY(16)    NOT NULL,
    SourceEntityId      BINARY(16)    NULL,

    ChangeType          VARCHAR(20)   NOT NULL,   -- created | updated | deleted | restored

    ChangeSetJson       JSON          NULL,       
    MetadataJson        JSON          NULL,       -- optional, can omit for now

    ChangedAt           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ChangedByUserId     BINARY(16)    NOT NULL,

    CONSTRAINT FK_BudgetMonthChangeEvent_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    INDEX IX_BudgetMonthChangeEvent_BudgetMonthId (BudgetMonthId),
    INDEX IX_BudgetMonthChangeEvent_EntityType_EntityId (EntityType, EntityId),
    INDEX IX_BudgetMonthChangeEvent_ChangedAt (ChangedAt)
) ENGINE=InnoDB;