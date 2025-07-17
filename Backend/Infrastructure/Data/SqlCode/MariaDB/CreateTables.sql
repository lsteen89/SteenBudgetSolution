-- This script creates the necessary tables for the SteenBudgetSystem application.
-- It is designed to be run in a MariaDB environment.
-- Ensure you have the necessary privileges to create databases and tables.
-- Set the environment variable to determine which database to use
-- This script assumes you are using MariaDB 10.2 or later for the RefreshTokens table.

-- It creates the following tables:
-- 1. User
-- 2. Income
-- 3. Partner
-- 4. PartnerIncome
-- 5. UserExpenseRatio
-- 6. ErrorLog
-- 7. VerificationToken
-- 8. UserVerificationTracking
-- 9. FailedLoginAttempts
-- 10. PasswordResetTokens
-- 11. RefreshTokens
-- 12. BlacklistedTokens
-- 13. WizardSession
-- 14. WizardStep
-- 15. RefreshTokens_Archive (for archiving old rows)
-- 16. Trigger for archiving RefreshTokens
-- 17. Create a table for blacklisted tokens
-- 18. Create a table for wizard sessions and steps


-- NOTE --
-- Since this is a work in progress, the script may not include all necessary fields or relationships.
-- It may even contain obsolete tables or fields.

-- DATA TO BE CHANGED (Probably)--
-- PartnerIncome
-- UserExpenseRatio
-- Partner (Scoop of this table is not clear yet)

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
-- Create the tables

-- Create User table
CREATE TABLE IF NOT EXISTS User (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Persoid CHAR(36) NOT NULL UNIQUE,
    Firstname VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    EmailConfirmed BOOLEAN,
    Password VARCHAR(100) NOT NULL,
    roles VARCHAR(20) NOT NULL,
    Locked BOOLEAN DEFAULT FALSE,
    LockoutUntil DATETIME,
    FirstLogin BOOLEAN DEFAULT TRUE,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME
);

-- Create Income table
CREATE TABLE Income (
    -- Keys
    Id UUID PRIMARY KEY,
    BudgetId UUID NOT NULL,
    Persoid UUID NOT NULL,

    -- Main Details
    NetSalary DECIMAL(10, 2) NOT NULL,
    SalaryFrequency TINYINT NOT NULL, --COMMENT 'Maps to the Frequency enum in C#',

    -- Audit Fields
    CreatedBy VARCHAR(255) NOT NULL,
    CreatedTime DATETIME NOT NULL,
    LastUpdatedTime DATETIME NULL,

    --Future: Add foreign key constraints
    -- FOREIGN KEY (BudgetId) REFERENCES Budgets(Id),
    -- FOREIGN KEY (Persoid) REFERENCES Users(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE HouseholdMember (
    -- Keys
    Id UUID PRIMARY KEY,
    IncomeId UUID NOT NULL,

    -- Details
    Name VARCHAR(255) NOT NULL,
    IncomeAmount DECIMAL(10, 2) NOT NULL,
    IncomeFrequency TINYINT NOT NULL --COMMENT 'Maps to the Frequency enum in C#',

    -- Define the relationship to the Income table
    CONSTRAINT fk_householdmember_income
    FOREIGN KEY (IncomeId) REFERENCES Income(Id)
    ON DELETE CASCADE -- If the parent Income record is deleted, delete this too
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SideHustle (
    -- Keys
    Id UUID PRIMARY KEY,
    IncomeId UUID NOT NULL,

    -- Details
    Name VARCHAR(255) NOT NULL,
    MonthlyIncome DECIMAL(10, 2) NOT NULL,

    -- Define the relationship to the Income table
    CONSTRAINT fk_sidehustle_income
    FOREIGN KEY (IncomeId) REFERENCES Income(Id)
    ON DELETE CASCADE -- If the parent Income record is deleted, delete this too
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create UserExpenseRatio table
CREATE TABLE IF NOT EXISTS UserExpenseRatio (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36),
    PartnerId CHAR(36) NULL,
    Ratio DECIMAL(10, 2),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId)  -- Reference to 'User'
);

-- Create ErrorLog table
CREATE TABLE IF NOT EXISTS ErrorLog (
    LogId INT AUTO_INCREMENT PRIMARY KEY,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ErrorMessage TEXT,
    Caller VARCHAR(100),
    SubmittedBy VARCHAR(100),
    UserInput TEXT
);

-- Create VerificationToken table
CREATE TABLE IF NOT EXISTS VerificationToken (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36),
    Token CHAR(36) NOT NULL UNIQUE,
    TokenExpiryDate DATETIME NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId) ON DELETE CASCADE  -- Reference to 'User'
);

-- Create UserVerificationTracking table
CREATE TABLE UserVerificationTracking (
    Id INT PRIMARY KEY AUTO_INCREMENT,           
    PersoId CHAR(36) NOT NULL,                   
    LastResendRequestTime DATETIME,              -- Timestamp of the last resend request
    DailyResendCount INT DEFAULT 0,              -- Counter for resend attempts in the current day
    LastResendRequestDate DATE,                  -- Date of the last resend attempt for daily reset
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the record was created
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Timestamp for last update
    FOREIGN KEY (PersoId) REFERENCES User(PersoId) ON DELETE CASCADE -- Enable cascade delete
);

CREATE TABLE IF NOT EXISTS FailedLoginAttempts (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36) NOT NULL,
    AttemptTime DATETIME NOT NULL,
    IpAddress VARCHAR(45) NULL,
 FOREIGN KEY (PersoId) REFERENCES User(PersoId)  ON DELETE CASCADE 
);

CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36) NOT NULL,
    Token CHAR(36) NOT NULL, -- GUID format
    Expiry DATETIME NOT NULL,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId) ON DELETE CASCADE
);

/* -----------------------------------------------------------
   REFRESH-TOKENS TABLE (MariaDB 10.2 +)
   • One row per (user + session) refresh-token
   • At most ONE “active” row per (Persoid, SessionId)
   ----------------------------------------------------------- */

DROP TABLE IF EXISTS RefreshTokens;

CREATE TABLE RefreshTokens (
    TokenId             CHAR(36)     NOT NULL PRIMARY KEY,
    Persoid             CHAR(36)     NOT NULL,
    SessionId           CHAR(36)     NOT NULL,
    HashedToken         VARCHAR(255) NOT NULL,
    AccessTokenJti      VARCHAR(50)  NOT NULL,

    ExpiresRollingUtc   DATETIME     NOT NULL,
    ExpiresAbsoluteUtc  DATETIME     NOT NULL,
    RevokedUtc          DATETIME      NULL,          -- null ⇒ still usable
    Status              INT          NOT NULL,       -- 0 = Inactive, 1 = Active, 2 = Revoked
    IsPersistent        BOOLEAN     NOT NULL DEFAULT FALSE,

    DeviceId            VARCHAR(255),
    UserAgent           VARCHAR(255),
    CreatedUtc          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    /* ---------- indexes ---------- */
    UNIQUE KEY UK_Hashed          (HashedToken),
    INDEX      IX_User            (Persoid),
    INDEX      IX_RollingExp      (ExpiresRollingUtc),
    INDEX      IX_AbsExp          (ExpiresAbsoluteUtc),

    /* at most ONE active row per (user, session) */
    UNIQUE KEY ux_user_session (Persoid, SessionId)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 1) Create archive table and trigger for inserting old rows
CREATE TABLE RefreshTokens_Archive (
    TokenId             CHAR(36)     NOT NULL,
    Persoid             CHAR(36)     NOT NULL,
    SessionId           CHAR(36)     NOT NULL,
    HashedToken         VARCHAR(255) NOT NULL,
    AccessTokenJti      VARCHAR(50)  NOT NULL,
    ExpiresRollingUtc   DATETIME     NOT NULL,
    ExpiresAbsoluteUtc  DATETIME     NOT NULL,
    RevokedUtc          DATETIME      NULL,
    Status              INT          NOT NULL,
    IsPersistent        BOOLEAN     NOT NULL DEFAULT FALSE,
    DeviceId            VARCHAR(255),
    UserAgent           VARCHAR(255),
    CreatedUtc          DATETIME     NOT NULL,
    ArchivedAt          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 2) Archive trigger
DELIMITER $$
CREATE TRIGGER trg_RefreshTokens_Archive
BEFORE UPDATE ON RefreshTokens
FOR EACH ROW
BEGIN
  INSERT INTO RefreshTokens_Archive
    (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
     ExpiresRollingUtc, ExpiresAbsoluteUtc, RevokedUtc, Status, IsPersistent,
     DeviceId, UserAgent, CreatedUtc, ArchivedAt)
  VALUES
    (OLD.TokenId, OLD.Persoid, OLD.SessionId, OLD.HashedToken, OLD.AccessTokenJti,
     OLD.ExpiresRollingUtc, OLD.ExpiresAbsoluteUtc, OLD.RevokedUtc, OLD.Status, OLD.IsPersistent,
     OLD.DeviceId, OLD.UserAgent, OLD.CreatedUtc, NOW());
END$$
DELIMITER ;

CREATE TABLE BlacklistedTokens (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Jti VARCHAR(50) NOT NULL UNIQUE,
    ExpiryDate DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE WizardSession (
  WizardSessionId CHAR(36) NOT NULL,
  Persoid char(36) NOT NULL,
  CurrentStep INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (WizardSessionId),
  UNIQUE KEY UK_Persoid (Persoid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE WizardStep (
  WizardSessionId CHAR(36) NOT NULL,
  StepNumber INT NOT NULL,
  SubStep INT NOT NULL,
  StepData TEXT NOT NULL,
  DataVersion INT NOT NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (WizardSessionId, StepNumber, SubStep),
  CONSTRAINT FK_WizardStep_WizardSession FOREIGN KEY (WizardSessionId)
    REFERENCES WizardSession(WizardSessionId)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
