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
CREATE TABLE IF NOT EXISTS Income (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36),
    MainIncome DECIMAL(10, 2),
    SideIncome DECIMAL(10, 2),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId)  -- Reference to 'User'
);

-- Create Partner table
CREATE TABLE IF NOT EXISTS Partner (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PersoId CHAR(36),
    PartnerId CHAR(36) UNIQUE,  -- Unique PartnerId
    Name VARCHAR(255),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME,
    FOREIGN KEY (PersoId) REFERENCES User(PersoId)  -- Reference to 'User'
);

-- Create PartnerIncome table
CREATE TABLE IF NOT EXISTS PartnerIncome (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    PartnerId CHAR(36),  -- Removed unique constraint here
    MainIncome DECIMAL(10, 2),
    SideIncome DECIMAL(10, 2),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastUpdatedTime DATETIME,
    FOREIGN KEY (PartnerId) REFERENCES Partner(PartnerId)
);

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

CREATE TABLE RefreshTokens (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    Persoid CHAR(36) NOT NULL,
    SessionId CHAR(36) NOT NULL,
    RefreshToken VARCHAR(255) NOT NULL,
    AccessTokenJti VARCHAR(50) NOT NULL,
    RefreshTokenExpiryDate  DATETIME NOT NULL,
    AccessTokenExpiryDate DATETIME NOT NULL,
    DeviceId VARCHAR(255),
    UserAgent VARCHAR(255),
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX IDX_RefreshToken (RefreshToken),
    INDEX IDX_Persoid (Persoid),
    UNIQUE (Persoid, SessionId)
);

CREATE TABLE BlacklistedTokens (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Jti VARCHAR(50) NOT NULL UNIQUE,
    ExpiryDate DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE WizardSession (
  WizardSessionId CHAR(36) NOT NULL,
  Email VARCHAR(256) NOT NULL,
  CurrentStep INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (WizardSessionId),
  UNIQUE KEY UK_Email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE WizardStep (
  WizardSessionId CHAR(36) NOT NULL,
  StepNumber INT NOT NULL,
  StepData TEXT NOT NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (WizardSessionId, StepNumber),
  CONSTRAINT FK_WizardStep_WizardSession FOREIGN KEY (WizardSessionId)
    REFERENCES WizardSession(WizardSessionId)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
