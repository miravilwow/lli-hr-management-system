/* ============================================================
   LLI HR Employee Records Management System
   05 - Search supporting indexes

   Addresses C-06 from the architecture review.

   The employee search runs LIKE '%term%' across five columns. A leading
   wildcard is non-sargable: SQL Server cannot seek, so it must read
   every row. Correct at 20 employees, and the first thing to fall over
   at 50,000.

   The complete fix is a full-text index with CONTAINS. That requires the
   Full-Text Search feature, which is NOT part of a Database Engine only
   installation - the script for it is at the bottom of this file, ready
   to run once the feature is present.

   What this script does in the meantime is narrow the scan. The search
   still reads every row, but it reads them from slim, covering indexes
   rather than dragging the full clustered index through memory. On a
   wide table that is a large constant-factor win, and it is the most
   that can be done without full-text.

   Safe to re-run. Run after 04_governance.sql.
   ============================================================ */

USE LLI_HR_DB;
GO

/* Name search: covers the two name columns plus what the list projects,
   filtered to live rows so deleted employees are not scanned at all. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Search_Name')
    CREATE INDEX IX_Employees_Search_Name
        ON dbo.Employees (LastName, FirstName)
        INCLUDE (EmployeeCode, Email, Position, DepartmentId, Salary, HireDate, Status)
        WHERE DeletedAt IS NULL;
GO

/* Code and email are the selective fields. A prefix search on these -
   'EMP-01%' rather than '%EMP-01%' - can seek these indexes, so a client
   that searches by code gets an index seek instead of a scan. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Search_Code')
    CREATE INDEX IX_Employees_Search_Code
        ON dbo.Employees (EmployeeCode)
        WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Search_Email')
    CREATE INDEX IX_Employees_Search_Email
        ON dbo.Employees (Email)
        WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Search_Position')
    CREATE INDEX IX_Employees_Search_Position
        ON dbo.Employees (Position)
        WHERE DeletedAt IS NULL;
GO

PRINT 'Search indexes created.';
GO

/* ============================================================
   The real fix, for when Full-Text Search is installed.

   Add the feature through the SQL Server installer
   (Database Engine Services -> Full-Text and Semantic Extractions
   for Search), then run the statements below - each as its own
   batch - and switch the search predicate in employeeService to
   CONTAINS.

       CREATE FULLTEXT CATALOG HrCatalog AS DEFAULT;

       CREATE FULLTEXT INDEX ON dbo.Employees
           (FirstName, LastName, Email, EmployeeCode, Position)
           KEY INDEX PK_Employees
           ON HrCatalog
           WITH CHANGE_TRACKING AUTO;

   The query then becomes, roughly:

       WHERE CONTAINS((FirstName, LastName, Email, EmployeeCode, Position), @searchTerm)

   which seeks the full-text index instead of scanning the table.

   Note: batch separators are deliberately not written inside this
   comment. The runner splits on them without parsing comments, so a
   separator here would tear the block apart.
   ============================================================ */
