/*
-- Connect to the master database
USE master;
GO

-- Put the database in single-user mode
ALTER DATABASE SteenBudgetSystem
SET SINGLE_USER
WITH ROLLBACK IMMEDIATE;
GO

-- Delete the database
DROP DATABASE SteenBudgetSystem;
GO
*/
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'SteenBudgetSystem')
BEGIN
CREATE DATABASE SteenBudgetSystem
END
GO
    USE SteenBudgetSystem
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY (1, 1) PRIMARY KEY,
        Persoid CHAR(36) NOT NULL UNIQUE,
        Firstname VARCHAR(50) NOT NULL,
        LastName VARCHAR(50) NOT NULL,
        Email VARCHAR(100) NOT NULL UNIQUE,
        EmailConfirmed bit,
        Password NVARCHAR(100) NOT NULL,
        roles varchar(20) not null,
        FirstLogin BIT DEFAULT 1,
        CreatedBy VARCHAR(50) NOT NULL,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        LastUpdatedTime DATETIME
    )
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='Income')
BEGIN
    CREATE TABLE Income (
        Id INT IDENTITY (1, 1) PRIMARY KEY,
        PersoId CHAR(36),
        MainIncome DECIMAL(10, 2),
        SideIncome DECIMAL(10, 2),
        CreatedBy VARCHAR(50) NOT NULL,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        LastUpdatedTime DATETIME
        FOREIGN KEY (PersoId) REFERENCES Users(PersoId)
    )
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='Partner')
BEGIN
    CREATE TABLE Partner (
        Id INT IDENTITY (1, 1) PRIMARY KEY,
        PersoId CHAR(36),
        PartnerId CHAR(36) UNIQUE,  -- Unique PartnerId
        Name VARCHAR(255),
        CreatedBy VARCHAR(50) NOT NULL,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        LastUpdatedTime DATETIME,
        FOREIGN KEY (PersoId) REFERENCES Users(PersoId)
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='PartnerIncome')
BEGIN
    CREATE TABLE PartnerIncome (
        Id INT IDENTITY (1, 1) PRIMARY KEY,
        PartnerId CHAR(36),  -- Removed unique constraint here
        MainIncome DECIMAL(10, 2),
        SideIncome DECIMAL(10, 2),
        CreatedBy VARCHAR(50) NOT NULL,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        LastUpdatedTime DATETIME,
        FOREIGN KEY (PartnerId) REFERENCES Partner(PartnerId)
    );
END;


IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='UserExpenseRatio')
BEGIN
	CREATE TABLE UserExpenseRatio (
		Id INT IDENTITY (1, 1) PRIMARY KEY,
		PersoId CHAR(36),
		PartnerId CHAR(36) NULL, 
		Ratio DECIMAL(10, 2),
		CreatedBy VARCHAR(50) NOT NULL,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        LastUpdatedTime DATETIME
		FOREIGN KEY (PersoId) REFERENCES Users(PersoId)
	);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='ErrorLog')
BEGIN
    CREATE TABLE ErrorLog (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        CreatedTime DATETIME NOT NULL DEFAULT GETDATE(),
        ErrorMessage NVARCHAR(MAX),
		Caller NVARCHAR(100),
        SubmittedBy NVARCHAR(100), 
        UserInput NVARCHAR(MAX)
    )
END

--insert into Users values('1', 'Linus', 'Steen', 'njur@steen.se','1', 'hemligt', 'salt','1', '1', 'admin', getdate(), getdate())
--insert into Users values('5016b01a-dbc9-46e2-936c-e9235423a789', 'test', 'testsson', 'test@test.se','1', '9et6AQsBXdjS1MkvkE9jM58n8QXXFe51C+WO918KH8QqED3enkfGXzMJZIctC/mf', 'KhA93p5Hxl8zCWSHLQv5nw==','1', '1', 'admin', getdate(), getdate())


