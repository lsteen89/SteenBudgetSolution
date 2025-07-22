
-- This script creates the necessary tables for the SteenBudgetSystem application related to 
-- budget managenent

-- It is designed to be run in a MariaDB environment.
-- Ensure you have the necessary privileges to create databases and tables.
-- Set the environment variable to determine which database to use
-- This script assumes you are using MariaDB 10.2

-- Declare the environment variable (either 'prod' or 'test')
SET @env = 'test';  -- Change this to 'prod' for production

-- Set the database name based on the environment
SET @dbName = IF(@env = 'prod', 'SteenBudgetSystemPROD', 'SteenBudgetSystemTEST');

-- Use the selected database
SET @useDB = CONCAT('USE ', @dbName, ';');
PREPARE stmt FROM @useDB;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- Small notes on relationships:
-- BudgetId in Income table is a foreign key that references the Budgets table.
-- Persoid in Income table is a foreign key that references the Users table.
-- HouseholdMember and SideHustle tables reference the Income table.
-- 

-- Create the tables

-- MAIN INCOME TABLE

CREATE TABLE Budget (
    Id                      BINARY(16)   NOT NULL PRIMARY KEY,
    UserId                  BINARY(16)   NOT NULL,
    BudgetId				BINARY(16)  NOT NULL UNIQUE, -- Unique identifier for the budget
    DebtRepaymentStrategy   VARCHAR(50)  NULL,
    CreatedAt               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT FK_Budget_User FOREIGN KEY (UserId) REFERENCES User(PersoId) ON DELETE CASCADE
) ENGINE=InnoDB;

------------------------
-- SECTION INCOME TABLES
-------------------------

-- Create Income table
CREATE TABLE Income (
    Id               BINARY(16)          NOT NULL PRIMARY KEY,
    BudgetId         BINARY(16)          NOT NULL,
    NetSalaryMonthly DECIMAL(18,2) NOT NULL DEFAULT 0,
    SalaryFrequency  INT           NOT NULL, -- enum ordinal
    CONSTRAINT FK_Income_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IncomeSideHustle (
    Id             BINARY(16)          NOT NULL PRIMARY KEY,
    IncomeId       BINARY(16)          NOT NULL,
    Name           VARCHAR(255)  NOT NULL,
    IncomeMonthly  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency      INT           NOT NULL,
    CONSTRAINT FK_IncomeSideHustle_Income FOREIGN KEY (IncomeId) REFERENCES Income(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IncomeHouseholdMember (
    Id             BINARY(16)          NOT NULL PRIMARY KEY,
    IncomeId       BINARY(16)          NOT NULL,
    Name           VARCHAR(255)  NOT NULL,
    IncomeMonthly  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency      INT           NOT NULL,
    CONSTRAINT FK_IncomeHouseholdMember_Income FOREIGN KEY (IncomeId) REFERENCES Income(Id) ON DELETE CASCADE
) ENGINE=InnoDB;


-------------------------
-- SECTION EXPENSE TABLES
-------------------------
-- Create Expense table
CREATE TABLE ExpenseCategory (
    Id   BINARY(16)    NOT NULL PRIMARY KEY,
    Name VARCHAR(100)  NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE ExpenseItem (
    Id           BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId     BINARY(16)    NOT NULL,
    CategoryId   BINARY(16)    NOT NULL,
    Name         VARCHAR(255)  NOT NULL,
    AmountMonthly DECIMAL(18,2) NOT NULL DEFAULT 0,
    JsonData    JSON          NULL,  -- Original JSON data for the expense item
    CreatedUtc   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedUtc DATETIME   NULL,  -- Optional last updated timestamp

    CONSTRAINT FK_ExpenseItem_Category FOREIGN KEY (CategoryId) REFERENCES ExpenseCategory(Id) ON DELETE RESTRICT,
    CONSTRAINT FK_ExpenseItem_Budget   FOREIGN KEY (BudgetId)   REFERENCES Budget(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IX_ExpenseItem_Budget ON ExpenseItem (BudgetId);
CREATE INDEX IX_ExpenseItem_BudgetCategory ON ExpenseItem (BudgetId, CategoryId);

-- INCOME SEED
INSERT INTO ExpenseCategory (Id, Name) VALUES
(BINARY(16)_TO_BIN('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21'),'Rent'),
(BINARY(16)_TO_BIN('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10'),'Food'),
(BINARY(16)_TO_BIN('5eb2896c-59f9-4a18-8c84-4c2a1659de80'),'Transport'),
(BINARY(16)_TO_BIN('e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0'),'Clothing'),
(BINARY(16)_TO_BIN('8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900'),'FixedExpense'),
(BINARY(16)_TO_BIN('9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4'),'Subscription'),
(BINARY(16)_TO_BIN('f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2'),'Other');

/* SAVINGS TABLES */
-- Create the Savings tables
-- Savings
CREATE TABLE Savings (
    Id             BINARY(16)          NOT NULL PRIMARY KEY,
    BudgetId       BINARY(16)          NOT NULL,
    MonthlySavings DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreatedUtc     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- SavingsMethod
CREATE TABLE SavingsMethod (
    Id        BINARY(16)         NOT NULL PRIMARY KEY,
    SavingsId BINARY(16)         NOT NULL,
    Method    VARCHAR(50)  NOT NULL,
    CONSTRAINT FK_SavingsMethod_Savings
        FOREIGN KEY (SavingsId) REFERENCES Savings(Id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- SavingsGoal
CREATE TABLE SavingsGoal (
    Id           BINARY(16)          NOT NULL PRIMARY KEY,
    SavingsId    BINARY(16)          NOT NULL,
    Name         VARCHAR(255)  NULL,
    TargetAmount DECIMAL(18,2) NULL,
    TargetDate   DATE          NULL,
    AmountSaved  DECIMAL(18,2) NULL,
    CONSTRAINT FK_SavingsGoal_Savings
        FOREIGN KEY (SavingsId) REFERENCES Savings(Id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


/* * DEBT TABLE
 * These tables are used to manage debts in the eBudget application.
 * They include the Debt table, which holds core debt information, and optional fields for monthly fees,
 * minimum payments, and term months.
 */

CREATE TABLE Debt (
    Id               BINARY(16)     NOT NULL PRIMARY KEY,
    BudgetId         BINARY(16)     NOT NULL,

    -- Core Debt Info --
    Name             VARCHAR(255)   NOT NULL, -- Name of the debt (e.g., "Credit Card", "Student Loan")
    Type             VARCHAR(50)    NOT NULL,  -- "revolving", "installment", etc.
    Balance          DECIMAL(18,2)  NOT NULL, -- Current balance of the debt
    Apr              DECIMAL(18,2)  NOT NULL, -- Represents the annual percentage rate (APR) for the debt
    
    -- Optional / Conditional Info --
    MonthlyFee       DECIMAL(18,2)  NULL, -- Monthly fee associated with the debt (e.g., credit card annual fee)
    MinPayment       DECIMAL(18,2)  NULL, -- Minimum payment required for the debt (e.g., credit card minimum payment)
    TermMonths       INT            NULL, -- Number of months for the debt term (e.g., 36 months for a car loan)

    -- Timestamps 
    CreatedAt        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME       NULL ON UPDATE CURRENT_TIMESTAMP,

    -- User Tracking
    CreatedByUserId BINARY(16) NOT NULL,
    UpdatedByUserId BINARY(16) NULL

    CONSTRAINT FK_Debt_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE
) ENGINE=InnoDB;