
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

-- Create the database if it doesn't exist
SET @createDB = CONCAT('CREATE DATABASE IF NOT EXISTS ', @dbName, ';');
PREPARE stmt FROM @createDB;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

------------------------
-- SECTION INCOME TABLES
-------------------------

-- Create Income table
CREATE TABLE Income (
    Id               UUID          NOT NULL PRIMARY KEY,
    BudgetId         UUID          NOT NULL,
    NetSalaryMonthly DECIMAL(18,2) NOT NULL DEFAULT 0,
    SalaryFrequency  INT           NOT NULL, -- enum ordinal
    CONSTRAINT FK_Income_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IncomeSideHustle (
    Id             UUID          NOT NULL PRIMARY KEY,
    IncomeId       UUID          NOT NULL,
    Name           VARCHAR(255)  NOT NULL,
    IncomeMonthly  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency      INT           NOT NULL,
    CONSTRAINT FK_IncomeSideHustle_Income FOREIGN KEY (IncomeId) REFERENCES Income(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IncomeHouseholdMember (
    Id             UUID          NOT NULL PRIMARY KEY,
    IncomeId       UUID          NOT NULL,
    Name           VARCHAR(255)  NOT NULL,
    IncomeMonthly  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency      INT           NOT NULL,
    CONSTRAINT FK_IncomeHouseholdMember_Income FOREIGN KEY (IncomeId) REFERENCES Income(Id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- Create UserExpenseRatio table
CREATE TABLE IF NOT EXISTS UserExpenseRatio (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId UUID,
    PartnerId UUID NULL,
    Ratio DECIMAL(10, 2),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId)  -- Reference to 'User'
);

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
(UUID_TO_BIN('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21'),'Rent'),
(UUID_TO_BIN('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10'),'Food'),
(UUID_TO_BIN('5eb2896c-59f9-4a18-8c84-4c2a1659de80'),'Transport'),
(UUID_TO_BIN('e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0'),'Clothing'),
(UUID_TO_BIN('8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900'),'FixedExpense'),
(UUID_TO_BIN('9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4'),'Subscription'),
(UUID_TO_BIN('f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2'),'Other');

/* SAVINGS TABLES */
-- Create the Savings tables
-- Savings
CREATE TABLE Savings (
    Id             UUID          NOT NULL PRIMARY KEY,
    BudgetId       UUID          NOT NULL,
    SavingHabit    VARCHAR(255)  NULL,
    MonthlySavings DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreatedUtc     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- SavingsMethod
CREATE TABLE SavingsMethod (
    Id        UUID         NOT NULL PRIMARY KEY,
    SavingsId UUID         NOT NULL,
    Method    VARCHAR(50)  NOT NULL,
    CONSTRAINT FK_SavingsMethod_Savings
        FOREIGN KEY (SavingsId) REFERENCES Savings(Id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- SavingsGoal
CREATE TABLE SavingsGoal (
    Id           UUID          NOT NULL PRIMARY KEY,
    SavingsId    UUID          NOT NULL,
    Name         VARCHAR(255)  NULL,
    TargetAmount DECIMAL(18,2) NULL,
    TargetDate   DATE          NULL,
    AmountSaved  DECIMAL(18,2) NULL,
    CONSTRAINT FK_SavingsGoal_Savings
        FOREIGN KEY (SavingsId) REFERENCES Savings(Id)
        ON DELETE CASCADE
) ENGINE=InnoDB;