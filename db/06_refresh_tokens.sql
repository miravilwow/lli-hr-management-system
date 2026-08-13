/* ============================================================
   LLI HR Employee Records Management System
   06 - Refresh tokens

   Addresses F-06 from the architecture review.

   The access token lasted eight hours and signing out only deleted it
   from the browser, so a copy captured beforehand stayed valid for the
   remainder of that window and there was no way to end a session.

   The access token is now short lived (15 minutes) and paired with a
   refresh token recorded here. Because the refresh token is stored, it
   can be revoked - which is what makes signing out actually mean
   something.

   Only a hash of the token is stored, for the same reason passwords are
   hashed: a leak of this table must not hand over usable sessions.

   Safe to re-run. Run after 04_governance.sql.
   ============================================================ */

USE LLI_HR_DB;
GO

IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens
    (
        RefreshTokenId BIGINT       IDENTITY(1,1) NOT NULL,
        UserId         INT          NOT NULL,
        TokenHash      CHAR(64)     NOT NULL,   -- SHA-256 hex of the token
        ExpiresAt      DATETIME2(0) NOT NULL,
        RevokedAt      DATETIME2(0) NULL,
        CreatedAt      DATETIME2(0) NOT NULL
            CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_RefreshTokens PRIMARY KEY (RefreshTokenId),
        CONSTRAINT UQ_RefreshTokens_Hash UNIQUE (TokenHash),
        CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserId)
            REFERENCES dbo.Users (UserId)
    );
END
GO

-- Refresh presents a token and needs the matching live row.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RefreshTokens_Live')
    CREATE INDEX IX_RefreshTokens_Live
        ON dbo.RefreshTokens (TokenHash)
        INCLUDE (UserId, ExpiresAt, RevokedAt)
        WHERE RevokedAt IS NULL;
GO

/* The application issues, revokes and prunes its own sessions, so unlike
   the audit trail it needs full control of this table. */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'lli_hr_app')
BEGIN
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.RefreshTokens TO lli_hr_app;
END
GO

PRINT 'Refresh token storage created.';
GO
