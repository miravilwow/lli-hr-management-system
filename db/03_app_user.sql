/* ============================================================
   LLI HR Employee Records Management System
   03 - Least-privilege application login

   The application should not connect as `sa`. `sa` is a server-wide
   sysadmin: it can drop any database on the instance, read every other
   database, and create logins. The API only ever reads and writes three
   tables in one database, so that is all its account should be able to
   do.

   Run this after 01_schema.sql, then point server/.env at the login it
   creates instead of `sa`.

   >>> Change the password below before running. <<<
   ============================================================ */

USE master;
GO

DECLARE @password NVARCHAR(128) = N'CHANGE_ME_StrongAppPassword1';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'lli_hr_app')
BEGIN
    DECLARE @createLogin NVARCHAR(MAX) =
        N'CREATE LOGIN lli_hr_app WITH PASSWORD = ''' + REPLACE(@password, '''', '''''') + N''',
          DEFAULT_DATABASE = LLI_HR_DB,
          CHECK_POLICY = ON;';
    EXEC sp_executesql @createLogin;
END
GO

USE LLI_HR_DB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'lli_hr_app')
BEGIN
    CREATE USER lli_hr_app FOR LOGIN lli_hr_app;
END
GO

/* ------------------------------------------------------------
   Grant only what the API actually performs.

   Deliberately NOT granted:
     - db_owner / db_ddladmin  (no schema changes at runtime)
     - CREATE/DROP TABLE       (migrations are a deploy-time concern)
     - access to any other database
   ------------------------------------------------------------ */
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Employees   TO lli_hr_app;
GRANT SELECT                          ON dbo.Departments TO lli_hr_app;
GRANT SELECT                          ON dbo.Users       TO lli_hr_app;
GO

/* The API authenticates users but never creates or edits them, so it is
   explicitly denied write access to the credential table. A SQL
   injection flaw in the auth path could then not add an account. */
DENY INSERT, UPDATE, DELETE ON dbo.Users TO lli_hr_app;
GO

PRINT 'Created login lli_hr_app with least-privilege grants.';
PRINT 'Update server/.env:  DB_USER=lli_hr_app  and  DB_PASSWORD=<the password set above>';
GO

/* Verification - lists exactly what the account can do. */
SELECT
    p.permission_name,
    p.state_desc,
    OBJECT_NAME(p.major_id) AS object_name
FROM sys.database_permissions p
INNER JOIN sys.database_principals u ON u.principal_id = p.grantee_principal_id
WHERE u.name = 'lli_hr_app'
ORDER BY object_name, p.permission_name;
GO
