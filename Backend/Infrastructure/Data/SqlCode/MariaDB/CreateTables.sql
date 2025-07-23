-- ##################################################################
-- # DEPRECATED - DO NOT USE
-- ##################################################################
-- # This script is no longer maintained.
-- # The canonical database schema is now managed by Docker initialization.
-- # See: /database/init/01-full-schema.sql
-- ##################################################################


-- This script creates the necessary tables for the SteenBudgetSystem application related to 
-- user management and wizard functionality.

-- It is designed to be run in a MariaDB environment.
-- Ensure you have the necessary privileges to create databases and tables.
-- Set the environment variable to determine which database to use
-- This script assumes you are using MariaDB 10.2 or later for the RefreshTokens table.





-- It creates the following tables:
-- 1. User
-- 2. ErrorLog
-- 3. VerificationToken
-- 5. UserVerificationTracking
-- 6. FailedLoginAttempts
-- 7. PasswordResetTokens
-- 8. RefreshTokens
-- 9. BlacklistedTokens
-- 10. WizardSession
-- 11. WizardStep
-- 12. RefreshTokens_Archive (for archiving old rows)
-- 13. Trigger for archiving RefreshTokens
-- 14. Create a table for blacklisted tokens
-- 15. Create a table for wizard sessions and steps



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
    Persoid BINARY(16) NOT NULL UNIQUE,
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
    PersoId BINARY(16),
    Token CHAR(36) NOT NULL UNIQUE,
    TokenExpiryDate DATETIME NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId) ON DELETE CASCADE  -- Reference to 'User'
);

-- Create UserVerificationTracking table
CREATE TABLE UserVerificationTracking (
    Id INT PRIMARY KEY AUTO_INCREMENT,           
    PersoId BINARY(16) NOT NULL,                   
    LastResendRequestTime DATETIME,              -- Timestamp of the last resend request
    DailyResendCount INT DEFAULT 0,              -- Counter for resend attempts in the current day
    LastResendRequestDate DATE,                  -- Date of the last resend attempt for daily reset
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the record was created
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Timestamp for last update
    FOREIGN KEY (PersoId) REFERENCES User(PersoId) ON DELETE CASCADE -- Enable cascade delete
);

CREATE TABLE IF NOT EXISTS FailedLoginAttempts (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId BINARY(16) NOT NULL,
    AttemptTime DATETIME NOT NULL,
    IpAddress VARCHAR(45) NULL,
 FOREIGN KEY (PersoId) REFERENCES User(PersoId)  ON DELETE CASCADE 
);

CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId BINARY(16) NOT NULL,
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
    TokenId             BINARY(16)         NOT NULL PRIMARY KEY,
    Persoid             BINARY(16)         NOT NULL,
    SessionId           BINARY(16)         NOT NULL,
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
    TokenId             BINARY(16)         NOT NULL,
    Persoid             BINARY(16)         NOT NULL,
    SessionId           BINARY(16)         NOT NULL,
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
  WizardSessionId BINARY(16) NOT NULL,
  Persoid BINARY(16) NOT NULL,
  CurrentStep INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (WizardSessionId),
  UNIQUE KEY UK_Persoid (Persoid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE WizardStep (
  WizardSessionId BINARY(16) NOT NULL,
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

