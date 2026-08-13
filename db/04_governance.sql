/* ============================================================
   LLI HR Employee Records Management System
   04 - Governance: roles, audit trail and soft delete

   Addresses three findings from the architecture review:

     C-01  the system authenticated users but never authorised them,
           so every account could read and change every salary
     C-02  delete was a hard DELETE, destroying employment records
           that normally carry a retention obligation
     C-03  UpdatedAt recorded when a row changed but never who, and
           no history of changes was kept at all

   Safe to re-run. Run after 01_schema.sql and 02_seed.sql.
   ============================================================ */

USE LLI_HR_DB;
GO

/* ------------------------------------------------------------
   C-01  Roles

   Two roles are enough for this system:
     Admin  - full read and write, including salary
     Viewer - read only
   The default is the lower privilege, so a new account cannot
   accidentally be created with write access.
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.Users', 'Role') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD [Role] NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_Role DEFAULT 'Viewer';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
BEGIN
    ALTER TABLE dbo.Users
        ADD CONSTRAINT CK_Users_Role CHECK ([Role] IN ('Admin', 'Viewer'));
END
GO

-- The seeded account is the administrator.
UPDATE dbo.Users SET [Role] = 'Admin' WHERE Username = 'admin' AND [Role] <> 'Admin';
GO

-- A read-only account, so the role split can actually be demonstrated.
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'viewer')
BEGIN
    INSERT INTO dbo.Users (Username, PasswordHash, FullName, [Role])
    VALUES ('viewer', '$2b$10$FouatOA79m7UBgpJV4sToueyJT8k41qrMC0fJIe7FYEM4ryNzwx9S', 'Read Only User', 'Viewer');
END
GO

/* ------------------------------------------------------------
   C-02 / C-03  Ownership and soft delete columns on Employees
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.Employees', 'CreatedBy') IS NULL
    ALTER TABLE dbo.Employees ADD CreatedBy INT NULL;
GO
IF COL_LENGTH('dbo.Employees', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.Employees ADD UpdatedBy INT NULL;
GO
IF COL_LENGTH('dbo.Employees', 'DeletedAt') IS NULL
    ALTER TABLE dbo.Employees ADD DeletedAt DATETIME2(0) NULL;
GO
IF COL_LENGTH('dbo.Employees', 'DeletedBy') IS NULL
    ALTER TABLE dbo.Employees ADD DeletedBy INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_CreatedBy')
    ALTER TABLE dbo.Employees ADD CONSTRAINT FK_Employees_CreatedBy
        FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (UserId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_UpdatedBy')
    ALTER TABLE dbo.Employees ADD CONSTRAINT FK_Employees_UpdatedBy
        FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users (UserId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_DeletedBy')
    ALTER TABLE dbo.Employees ADD CONSTRAINT FK_Employees_DeletedBy
        FOREIGN KEY (DeletedBy) REFERENCES dbo.Users (UserId);
GO

/* ------------------------------------------------------------
   F-01  Optimistic concurrency token

   Two users editing the same employee could silently overwrite each
   other, because the UPDATE wrote every column regardless of what had
   changed underneath.

   ROWVERSION is SQL Server's type for exactly this: an 8-byte value the
   engine changes on every write to the row, guaranteed unique within the
   database. UpdatedAt could not do this job - it is DATETIME2(0), so two
   edits within the same second would compare equal and the check would
   pass when it should fail.
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.Employees', 'RowVersion') IS NULL
    ALTER TABLE dbo.Employees ADD [RowVersion] ROWVERSION;
GO

/* ------------------------------------------------------------
   Uniqueness has to account for soft delete.

   The original UNIQUE constraints covered every row, so a
   soft-deleted employee would permanently reserve their code and
   email and block a genuine new hire from using them. They are
   replaced with unique indexes filtered to live rows: active
   records must still be unique, deleted ones release their values.
   ------------------------------------------------------------ */
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Employees_Code')
    ALTER TABLE dbo.Employees DROP CONSTRAINT UQ_Employees_Code;
GO
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Employees_Email')
    ALTER TABLE dbo.Employees DROP CONSTRAINT UQ_Employees_Email;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Employees_Code_Active')
    CREATE UNIQUE INDEX UX_Employees_Code_Active
        ON dbo.Employees (EmployeeCode) WHERE DeletedAt IS NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Employees_Email_Active')
    CREATE UNIQUE INDEX UX_Employees_Email_Active
        ON dbo.Employees (Email) WHERE DeletedAt IS NULL;
GO

-- Every list and report query filters on DeletedAt IS NULL.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Active')
    CREATE INDEX IX_Employees_Active
        ON dbo.Employees (DeletedAt) INCLUDE (DepartmentId, Status, HireDate);
GO

/* ------------------------------------------------------------
   C-03  Change history

   One row per field changed, so "who raised this salary, from what,
   and when" is answerable. Create and delete are recorded as single
   rows with no field name.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.EmployeeAudit', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmployeeAudit
    (
        EmployeeAuditId BIGINT        IDENTITY(1,1) NOT NULL,
        EmployeeId      INT           NOT NULL,
        Action          NVARCHAR(10)  NOT NULL,
        FieldName       NVARCHAR(50)  NULL,
        OldValue        NVARCHAR(400) NULL,
        NewValue        NVARCHAR(400) NULL,
        ChangedBy       INT           NOT NULL,
        ChangedAt       DATETIME2(0)  NOT NULL
            CONSTRAINT DF_EmployeeAudit_ChangedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_EmployeeAudit PRIMARY KEY (EmployeeAuditId),
        CONSTRAINT CK_EmployeeAudit_Action CHECK (Action IN ('Create', 'Update', 'Delete')),
        CONSTRAINT FK_EmployeeAudit_ChangedBy FOREIGN KEY (ChangedBy)
            REFERENCES dbo.Users (UserId)
    );

    /* Deliberately no FK to Employees: the audit trail must survive the
       employee row, otherwise the history disappears exactly when it
       matters most. */
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmployeeAudit_Employee')
    CREATE INDEX IX_EmployeeAudit_Employee
        ON dbo.EmployeeAudit (EmployeeId, ChangedAt DESC);
GO

/* ------------------------------------------------------------
   Permissions for the application account on the new table.

   The application appends to the audit trail and reads it back, and
   that is all it may ever do. UPDATE and DELETE are denied outright:
   a change history that the application can rewrite is not evidence
   of anything. Correcting a mistaken entry is a DBA action, performed
   deliberately and under a different account.
   ------------------------------------------------------------ */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'lli_hr_app')
BEGIN
    GRANT SELECT, INSERT ON dbo.EmployeeAudit TO lli_hr_app;
    DENY UPDATE, DELETE  ON dbo.EmployeeAudit TO lli_hr_app;
END
GO

PRINT 'Governance objects created.';
PRINT 'Logins -> admin/admin123 (Admin), viewer/viewer123 (Viewer)';
GO

SELECT Username, FullName, [Role] FROM dbo.Users ORDER BY Username;
GO
