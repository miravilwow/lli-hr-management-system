/* ============================================================
   LLI HR Employee Records Management System
   02 - Seed data

   Safe to re-run: rows are only inserted when missing.
   Run 01_schema.sql first.

   Default login ...... username: admin
                        password: admin123
   The stored value is a bcrypt hash - the plain password is
   never persisted.
   ============================================================ */

USE LLI_HR_DB;
GO

/* ------------------------------------------------------------
   Default application user
   ------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin')
BEGIN
    INSERT INTO dbo.Users (Username, PasswordHash, FullName)
    VALUES ('admin', '$2b$10$H.q0r94t5rv1.tS9iFJNNOTdXyWg5HoEgR.YCixQzgsL8VjDYaWd.', 'System Administrator');
END
GO

/* ------------------------------------------------------------
   Departments
   ------------------------------------------------------------ */
INSERT INTO dbo.Departments (DepartmentName)
SELECT d.DepartmentName
FROM (VALUES
    ('Human Resources'),
    ('Information Technology'),
    ('Finance'),
    ('Operations'),
    ('Sales and Marketing')
) AS d (DepartmentName)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Departments x WHERE x.DepartmentName = d.DepartmentName
);
GO

/* ------------------------------------------------------------
   Employees

   Deliberately spread across departments, hire years and both
   statuses so the report filters and summary totals have
   meaningful data to work with.
   ------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Employees)
BEGIN
    INSERT INTO dbo.Employees
        (EmployeeCode, FirstName, LastName, Email, DepartmentId, Position, Salary, HireDate, Status)
    SELECT
        e.EmployeeCode, e.FirstName, e.LastName, e.Email,
        d.DepartmentId, e.Position, e.Salary, e.HireDate, e.Status
    FROM (VALUES
        ('EMP-001', 'Maria',    'Santos',     'maria.santos@lli.com',      'Human Resources',        'HR Manager',              85000.00, '2019-03-11', 'Active'),
        ('EMP-002', 'Jose',     'Reyes',      'jose.reyes@lli.com',        'Human Resources',        'HR Associate',            32000.00, '2022-07-04', 'Active'),
        ('EMP-003', 'Andrea',   'Cruz',       'andrea.cruz@lli.com',       'Human Resources',        'Recruitment Specialist',  41000.00, '2023-01-16', 'Active'),
        ('EMP-004', 'Miguel',   'Bautista',   'miguel.bautista@lli.com',   'Information Technology', 'Software Engineer',       95000.00, '2020-09-01', 'Active'),
        ('EMP-005', 'Patricia', 'Villanueva', 'patricia.villanueva@lli.com','Information Technology','Senior Developer',       120000.00, '2018-05-21', 'Active'),
        ('EMP-006', 'Rafael',   'Domingo',    'rafael.domingo@lli.com',    'Information Technology', 'QA Engineer',             68000.00, '2021-11-08', 'Active'),
        ('EMP-007', 'Carmela',  'Aquino',     'carmela.aquino@lli.com',    'Information Technology', 'Systems Analyst',         78000.00, '2022-02-14', 'Active'),
        ('EMP-008', 'Daniel',   'Torres',     'daniel.torres@lli.com',     'Information Technology', 'Junior Developer',        38000.00, '2024-06-03', 'Active'),
        ('EMP-009', 'Isabel',   'Mendoza',    'isabel.mendoza@lli.com',    'Finance',                'Finance Manager',        105000.00, '2017-08-15', 'Active'),
        ('EMP-010', 'Antonio',  'Garcia',     'antonio.garcia@lli.com',    'Finance',                'Accountant',              55000.00, '2021-04-19', 'Active'),
        ('EMP-011', 'Lourdes',  'Ramos',      'lourdes.ramos@lli.com',     'Finance',                'Payroll Officer',         48000.00, '2023-09-11', 'Active'),
        ('EMP-012', 'Francisco','Navarro',    'francisco.navarro@lli.com', 'Finance',                'Audit Associate',         44000.00, '2024-01-08', 'Inactive'),
        ('EMP-013', 'Cristina', 'Flores',     'cristina.flores@lli.com',   'Operations',             'Operations Manager',      92000.00, '2019-10-07', 'Active'),
        ('EMP-014', 'Ramon',    'Delgado',    'ramon.delgado@lli.com',     'Operations',             'Logistics Coordinator',   46000.00, '2022-05-23', 'Active'),
        ('EMP-015', 'Teresa',   'Pascual',    'teresa.pascual@lli.com',    'Operations',             'Warehouse Supervisor',    39000.00, '2023-03-06', 'Active'),
        ('EMP-016', 'Alfredo',  'Castillo',   'alfredo.castillo@lli.com',  'Operations',             'Procurement Officer',     52000.00, '2020-12-01', 'Inactive'),
        ('EMP-017', 'Bianca',   'Lim',        'bianca.lim@lli.com',        'Sales and Marketing',    'Marketing Manager',       88000.00, '2020-02-17', 'Active'),
        ('EMP-018', 'Eduardo',  'Panganiban', 'eduardo.panganiban@lli.com','Sales and Marketing',    'Sales Executive',         42000.00, '2022-09-12', 'Active'),
        ('EMP-019', 'Sofia',    'Gutierrez',  'sofia.gutierrez@lli.com',   'Sales and Marketing',    'Digital Marketing Lead',  72000.00, '2021-06-28', 'Active'),
        ('EMP-020', 'Vicente',  'Alcantara',  'vicente.alcantara@lli.com', 'Sales and Marketing',    'Account Manager',         61000.00, '2024-11-04', 'Active')
    ) AS e (EmployeeCode, FirstName, LastName, Email, DepartmentName, Position, Salary, HireDate, Status)
    INNER JOIN dbo.Departments d ON d.DepartmentName = e.DepartmentName;
END
GO

PRINT 'Seed data inserted. Default login -> username: admin / password: admin123';
GO

SELECT 'Users' AS TableName, COUNT(*) AS RowCount_ FROM dbo.Users
UNION ALL SELECT 'Departments', COUNT(*) FROM dbo.Departments
UNION ALL SELECT 'Employees',   COUNT(*) FROM dbo.Employees;
GO
