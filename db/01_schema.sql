/* ============================================================
   LLI HR Employee Records Management System
   01 - Database schema

   Safe to re-run: every object is created only if missing.
   Run this script first, then 02_seed.sql.
   ============================================================ */

IF DB_ID('LLI_HR_DB') IS NULL
BEGIN
    CREATE DATABASE LLI_HR_DB;
END
GO

USE LLI_HR_DB;
GO

/* ------------------------------------------------------------
   Users - application login accounts
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserId       INT             IDENTITY(1,1) NOT NULL,
        Username     NVARCHAR(50)    NOT NULL,
        PasswordHash NVARCHAR(255)   NOT NULL,   -- bcrypt hash, never a plain password
        FullName     NVARCHAR(100)   NOT NULL,
        CreatedAt    DATETIME2(0)    NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_Users      PRIMARY KEY (UserId),
        CONSTRAINT UQ_Users_Name UNIQUE (Username)
    );
END
GO

/* ------------------------------------------------------------
   Departments - lookup table for employee grouping
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.Departments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departments
    (
        DepartmentId   INT           IDENTITY(1,1) NOT NULL,
        DepartmentName NVARCHAR(100) NOT NULL,

        CONSTRAINT PK_Departments      PRIMARY KEY (DepartmentId),
        CONSTRAINT UQ_Departments_Name UNIQUE (DepartmentName)
    );
END
GO

/* ------------------------------------------------------------
   Employees - the main CRUD entity
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employees
    (
        EmployeeId   INT            IDENTITY(1,1) NOT NULL,
        EmployeeCode NVARCHAR(20)   NOT NULL,
        FirstName    NVARCHAR(50)   NOT NULL,
        LastName     NVARCHAR(50)   NOT NULL,
        Email        NVARCHAR(100)  NOT NULL,
        DepartmentId INT            NOT NULL,
        Position     NVARCHAR(100)  NOT NULL,
        Salary       DECIMAL(18,2)  NOT NULL,
        HireDate     DATE           NOT NULL,
        Status       NVARCHAR(20)   NOT NULL CONSTRAINT DF_Employees_Status    DEFAULT 'Active',
        CreatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt    DATETIME2(0)   NULL,

        CONSTRAINT PK_Employees            PRIMARY KEY (EmployeeId),
        CONSTRAINT UQ_Employees_Code       UNIQUE (EmployeeCode),
        CONSTRAINT UQ_Employees_Email      UNIQUE (Email),
        CONSTRAINT FK_Employees_Department FOREIGN KEY (DepartmentId)
            REFERENCES dbo.Departments (DepartmentId),
        CONSTRAINT CK_Employees_Status     CHECK (Status IN ('Active', 'Inactive')),
        CONSTRAINT CK_Employees_Salary     CHECK (Salary >= 0)
    );
END
GO

/* ------------------------------------------------------------
   Indexes supporting the employee list filters and the report
   ------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_DepartmentId' AND object_id = OBJECT_ID('dbo.Employees'))
    CREATE INDEX IX_Employees_DepartmentId ON dbo.Employees (DepartmentId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Status' AND object_id = OBJECT_ID('dbo.Employees'))
    CREATE INDEX IX_Employees_Status ON dbo.Employees (Status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_HireDate' AND object_id = OBJECT_ID('dbo.Employees'))
    CREATE INDEX IX_Employees_HireDate ON dbo.Employees (HireDate);
GO

PRINT 'Schema created successfully. Next, run 02_seed.sql.';
GO
