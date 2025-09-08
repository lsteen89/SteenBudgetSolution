-- ##################################################################
-- # SECTION 1: USER AND AUTHENTICATION TABLES
-- ##################################################################

-- Create User table
CREATE TABLE IF NOT EXISTS Users (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Persoid BINARY(16) NOT NULL UNIQUE,
    Firstname VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    EmailConfirmed BOOLEAN,
    Password VARCHAR(100) NOT NULL,
    Roles VARCHAR(20) NOT NULL,
    Locked BOOLEAN DEFAULT FALSE,
    LockoutUntil DATETIME,
    FirstLogin BOOLEAN DEFAULT TRUE,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME
);

-- Create ErrorLog table
CREATE TABLE IF NOT EXISTS ErrorLog (
    LogId INT AUTO_INCREMENT PRIMARY KEY,
    ErrorMessage TEXT,
    Caller VARCHAR(100),
    UserInput TEXT,
    SubmittedBy VARCHAR(100),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create VerificationToken table
CREATE TABLE IF NOT EXISTS VerificationToken (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId BINARY(16) NOT NULL UNIQUE,   
    Token BINARY(16) NOT NULL UNIQUE,     
    TokenExpiryDate DATETIME NOT NULL,
    CreatedBy VARCHAR(50) NOT NULL DEFAULT 'System',
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_VerificationToken_User FOREIGN KEY (PersoId)
        REFERENCES Users(PersoId) ON DELETE CASCADE
);


-- Create RefreshTokens table
CREATE TABLE IF NOT EXISTS RefreshTokens (
    TokenId              BINARY(16)   NOT NULL PRIMARY KEY,
    Persoid              BINARY(16)   NOT NULL,
    SessionId            BINARY(16)   NOT NULL,
    HashedToken          VARCHAR(255) NOT NULL,
    AccessTokenJti       VARCHAR(50)  NOT NULL,
    ExpiresRollingUtc    DATETIME     NOT NULL,
    ExpiresAbsoluteUtc   DATETIME     NOT NULL,
    RevokedUtc           DATETIME     NULL,
    Status               INT          NOT NULL,
    IsPersistent         BOOLEAN      NOT NULL DEFAULT FALSE,
    DeviceId             VARCHAR(255),
    UserAgent            VARCHAR(255),
    CreatedUtc           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (Persoid) REFERENCES Users(Persoid) ON DELETE CASCADE,
    UNIQUE KEY UK_Hashed (HashedToken),
    UNIQUE KEY ux_user_session (Persoid, SessionId)
) ENGINE = InnoDB;

ALTER TABLE RefreshTokens
  ADD INDEX IF NOT EXISTS ix_refreshtokens_abs_exp (ExpiresAbsoluteUtc);

-- Create UserVerificationTracking table
CREATE TABLE UserVerificationTracking (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Persoid BINARY(16) NOT NULL,
    LastResendRequestTime DATETIME,
    DailyResendCount INT DEFAULT 0,
    LastResendRequestDate DATE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_UserVerificationTracking_User FOREIGN KEY (Persoid) REFERENCES Users(Persoid) ON DELETE CASCADE
);

-- ####################################################################
-- # SECTION 1.1: EMAIL TABLES
-- ####################################################################
CREATE TABLE IF NOT EXISTS Email_send_limits (
    User_id BINARY(16) NOT NULL,
    Email_kind TINYINT UNSIGNED NOT NULL,
    `Date` DATE NOT NULL,            -- UTC date bucket
    Sent_count INT UNSIGNED NOT NULL DEFAULT 0,
    Last_sent_at DATETIME(6) NOT NULL,
    PRIMARY KEY (User_id, Email_kind, `Date`)
) ENGINE=InnoDB;


-- ##################################################################
-- # SECTION 2: CORE BUDGET TABLES
-- ##################################################################

CREATE TABLE Budget (
    Id                  BINARY(16)    NOT NULL PRIMARY KEY,
    Persoid             BINARY(16)    NOT NULL,
    DebtRepaymentStrategy VARCHAR(50) NULL,
    CreatedAt           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId     BINARY(16)    NOT NULL,
    UpdatedByUserId     BINARY(16)    NULL,
    CONSTRAINT FK_Budget_User FOREIGN KEY (Persoid) REFERENCES Users(Persoid) ON DELETE CASCADE,
    INDEX IX_Budget_Persoid (Persoid) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE Income (
    Id               BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId         BINARY(16)    NOT NULL,
    NetSalaryMonthly DECIMAL(18,2) NOT NULL DEFAULT 0,
    SalaryFrequency  INT           NOT NULL,
    CreatedAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId  BINARY(16)    NOT NULL,
    UpdatedByUserId  BINARY(16)    NULL,
    CONSTRAINT FK_Income_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,
    INDEX IX_Income_BudgetId (BudgetId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE IncomeSideHustle (
    Id            BINARY(16)    NOT NULL PRIMARY KEY,
    IncomeId      BINARY(16)    NOT NULL,
    Name          VARCHAR(255)  NOT NULL,
    IncomeMonthly DECIMAL(18,2) NOT NULL DEFAULT 0,
    Frequency     INT           NOT NULL,
    CreatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt     DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId BINARY(16)  NOT NULL,
    UpdatedByUserId BINARY(16)  NULL,
    CONSTRAINT FK_IncomeSideHustle_Income FOREIGN KEY (IncomeId) REFERENCES Income(Id) ON DELETE CASCADE,
    INDEX IX_IncomeSideHustle_IncomeId (IncomeId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE ExpenseCategory (
    Id   BINARY(16)   NOT NULL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
(UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21', '-', '')), 'Rent'),
(UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10', '-', '')), 'Food'),
(UNHEX(REPLACE('5eb2896c-59f9-4a18-8c84-4c2a1659de80', '-', '')), 'Transport'),
(UNHEX(REPLACE('e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0', '-', '')), 'Clothing'),
(UNHEX(REPLACE('8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900', '-', '')), 'FixedExpense'),
(UNHEX(REPLACE('9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4', '-', '')), 'Subscription'),
(UNHEX(REPLACE('f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2', '-', '')), 'Other');

CREATE TABLE ExpenseItem (
    Id              BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId        BINARY(16)    NOT NULL,
    CategoryId      BINARY(16)    NOT NULL,
    Name            VARCHAR(255)  NOT NULL,
    AmountMonthly   DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId BINARY(16)    NOT NULL,
    UpdatedByUserId BINARY(16)    NULL,
    CONSTRAINT FK_ExpenseItem_Budget    FOREIGN KEY (BudgetId)   REFERENCES Budget(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ExpenseItem_Category  FOREIGN KEY (CategoryId) REFERENCES ExpenseCategory(Id) ON DELETE RESTRICT,
    INDEX IX_ExpenseItem_BudgetId (BudgetId), -- (INDEX ADDED FOR PERFORMANCE)
    INDEX IX_ExpenseItem_CategoryId (CategoryId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE Savings (
    Id             BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId       BINARY(16)    NOT NULL,
    MonthlySavings DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt      DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId BINARY(16)   NOT NULL,
    UpdatedByUserId BINARY(16)   NULL,
    CONSTRAINT FK_Savings_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,
    INDEX IX_Savings_BudgetId (BudgetId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE SavingsGoal (
    Id           BINARY(16)    NOT NULL PRIMARY KEY,
    SavingsId    BINARY(16)    NOT NULL,
    Name         VARCHAR(255)  NULL,
    TargetAmount DECIMAL(18,2) NULL,
    TargetDate   DATE          NULL,
    AmountSaved  DECIMAL(18,2) NULL,
    CreatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId BINARY(16) NOT NULL,
    UpdatedByUserId BINARY(16) NULL,
    CONSTRAINT FK_SavingsGoal_Savings FOREIGN KEY (SavingsId) REFERENCES Savings(Id) ON DELETE CASCADE,
    INDEX IX_SavingsGoal_SavingsId (SavingsId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

CREATE TABLE Debt (
    Id              BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId        BINARY(16)    NOT NULL,
    Name            VARCHAR(255)  NOT NULL,
    Type            VARCHAR(50)   NOT NULL,
    Balance         DECIMAL(18,2) NOT NULL,
    Apr             DECIMAL(18,2) NOT NULL,
    CreatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CreatedByUserId BINARY(16)    NOT NULL,
    UpdatedByUserId BINARY(16)    NULL,
    CONSTRAINT FK_Debt_Budget FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,
    INDEX IX_Debt_BudgetId (BudgetId) -- (INDEX ADDED FOR PERFORMANCE)
) ENGINE=InnoDB;

-- ##################################################################
-- # SECTION 3: WIZARD TABLES
-- ##################################################################

CREATE TABLE WizardSession (
    WizardSessionId BINARY(16) NOT NULL PRIMARY KEY,
    Persoid BINARY(16) NOT NULL,
    CurrentStep INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
    UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
    UNIQUE KEY UK_Persoid (Persoid),
    CONSTRAINT FK_WizardSession_User FOREIGN KEY (Persoid) REFERENCES Users(Persoid) ON DELETE CASCADE -- (FK ADDED FOR INTEGRITY)
) ENGINE=InnoDB;

CREATE TABLE WizardStepData (
    WizardSessionId BINARY(16) NOT NULL,
    StepNumber INT NOT NULL,
    SubStep INT NOT NULL,
    StepData TEXT NOT NULL,
    DataVersion INT NOT NULL,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
    PRIMARY KEY (WizardSessionId, StepNumber, SubStep),
    CONSTRAINT FK_WizardStepData_WizardSession FOREIGN KEY (WizardSessionId) REFERENCES WizardSession(WizardSessionId) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS EmailRateLimit (
  KeyHash BINARY(32) NOT NULL,
  Kind TINYINT NOT NULL,
  DateUtc DATE NOT NULL,
  SentCount INT NOT NULL DEFAULT 1,
  LastSentAtUtc DATETIME NOT NULL,
  PRIMARY KEY (KeyHash, Kind, DateUtc)
) ENGINE=InnoDB;