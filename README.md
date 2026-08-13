# HR Employee Records Management System

A simple Employee Records Management System built for the LLI technical
assessment. It covers authenticated access, role-based permissions, full CRUD
over employee records with a full change history, and a filterable report with
summary totals and CSV export — all served over a RESTful API.

**Stack:** ReactJS + Ant Design · ExpressJS · Microsoft SQL Server · JWT authentication

---

## Features

| Feature | Detail |
|---|---|
| **Login** | Short-lived JWT access tokens with revocable refresh tokens, bcrypt-hashed passwords, protected routes, session restored on reload |
| **Roles** | `Admin` writes, `Viewer` reads. Enforced on the API; the UI hides what a viewer cannot do |
| **Create** | Add an employee through a validated Ant Design modal form |
| **Retrieve** | Paged, sortable, searchable table with department and status filters |
| **Update** | Edit through the same form, guarded against two people overwriting each other |
| **Delete** | Soft delete behind a confirmation — the record and its history are retained |
| **Audit trail** | Every write records who did it; updates record the field, the old value and the new value |
| **Report** | Filter by department, status and hire-date range; headcount, payroll and average-salary totals; per-department breakdown; CSV export |

---

## Prerequisites

| Requirement | Version used |
|---|---|
| [Node.js](https://nodejs.org/) | v24 (any current LTS works) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) | 2025 Developer Edition (2019+ works) |
| A SQL client | [MSSQL extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) or SSMS |
| Git | any recent version |

### SQL Server configuration

The application connects over TCP using SQL Authentication, which is **not**
the default. If you are installing SQL Server fresh:

1. Use the **Custom** installation type, not Basic.
2. On the **Database Engine Configuration** screen, choose
   **Mixed Mode (SQL Server authentication and Windows authentication)** and
   set a password for the `sa` account.
3. Open **SQL Server Configuration Manager** →
   *SQL Server Network Configuration* → *Protocols for MSSQLSERVER* →
   **enable TCP/IP**.
4. Double-click **TCP/IP** → *IP Addresses* tab → under **IPAll**, clear
   *TCP Dynamic Ports* and set **TCP Port** to `1433`.
5. **Restart** the SQL Server service — the changes above do not take effect
   until you do.

---

## Setup

### 1. Clone and install

```bash
git clone <repository-url>
cd <repository-folder>
npm run install:all
```

### 2. Create the database

Run the scripts in [`db/`](db/) **in order** against your SQL Server instance:

| Script | What it does |
|---|---|
| [`01_schema.sql`](db/01_schema.sql) | Creates `LLI_HR_DB`, the `Users`, `Departments` and `Employees` tables, and supporting indexes |
| [`02_seed.sql`](db/02_seed.sql) | Default users, 5 departments and 20 sample employees |
| [`03_app_user.sql`](db/03_app_user.sql) | The least-privilege `lli_hr_app` login the API connects as. **Change the password at the top before running.** |
| [`04_governance.sql`](db/04_governance.sql) | Roles, audit trail, soft-delete columns and the concurrency token |
| [`05_search_indexes.sql`](db/05_search_indexes.sql) | Indexes supporting the employee search |
| [`06_refresh_tokens.sql`](db/06_refresh_tokens.sql) | Refresh token storage |

All scripts are safe to re-run — nothing is duplicated or dropped.

**Using VS Code:** connect with the MSSQL extension (`localhost,1433`, SQL
Login, `sa`), open each script, and press `Ctrl+Shift+E`.

**Using SSMS:** connect to `localhost,1433` with SQL Authentication, open each
script, and press F5.

**Or from the command line**, once `server/.env` exists (step 3):

```powershell
$env:DB_ADMIN_USER="sa"
$env:DB_ADMIN_PASSWORD="<your sa password>"
npm run db:schema
npm run db:seed
npm run db:appuser
npm run db:migrate      # runs 04 and 05
node scripts/run-sql.js db/06_refresh_tokens.sql LLI_HR_DB
```

> The schema scripts need an administrator. The application account
> **cannot** create or alter tables, on purpose — see *Security* below. That is
> why the runner takes `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` separately from
> the credentials the API itself uses.

### 3. Configure the backend

```bash
cd server
cp .env.example .env     # Windows: copy .env.example .env
```

Set **`DB_PASSWORD`** to the password you chose in `03_app_user.sql`, and
**`JWT_SECRET`** to a random string of at least 32 characters:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then the frontend:

```bash
cd ../client
cp .env.example .env     # Windows: copy .env.example .env
```

> ⚠️ Real values belong in **`.env`**, never `.env.example`. The example file is
> committed; `.env` is ignored. A test enforces this and fails the build if a
> credential ever appears in a committed template.

The server validates its configuration at startup and exits with a list of what
is wrong, rather than failing later at request time.

### 4. Run it

From the **repository root**:

```bash
npm run dev
```

```
[api] [db] connected to localhost:1433/LLI_HR_DB
[api] [server] listening on http://localhost:5000
[web] VITE ready - Local: http://localhost:5173/
```

Open **http://localhost:5173**.

> Prefer separate terminals? `npm run dev:server` and `npm run dev:client`.

### Root-level scripts

| Command | What it does |
|---|---|
| `npm run install:all` | Installs root, server and client dependencies |
| `npm run dev` | Starts the API and the frontend together |
| `npm test` | Runs the API test suite |
| `npm run lint` / `npm run build` | Lints / builds the client |
| `npm run check` | Lint, build and test — what CI runs |
| `npm run db:*` | Applies the SQL scripts (needs `DB_ADMIN_*`) |

---

## Default logins

| Username | Password | Role | Can do |
|---|---|---|---|
| `admin` | `admin123` | Admin | Everything |
| `viewer` | `viewer123` | Viewer | Read employees and reports only |

Passwords are stored only as bcrypt hashes — the plain values never touch the
database.

---

## Running the tests

```bash
npm test
```

**138 integration tests** run against the real database on the built-in
`node:test` runner. They execute serially because they share one database —
running them in parallel makes the report totals flaky, since employee fixtures
mutate the department the report counts.

| Area | Examples |
|---|---|
| Authentication | Identical 401 for unknown user and wrong password; forged, expired and orphaned tokens rejected; hash never serialised |
| Sessions | Access token is 15 minutes; refresh tokens rotate and are single-use; logout revokes server-side; one session's logout leaves others alive |
| Authorization | Viewer gets 403 on create, update and delete; 403 for a valid account without permission, 401 for no account at all |
| Concurrency | A stale write is refused with 409 and the earlier change survives |
| CRUD | All four operations plus their 400 / 404 / 409 paths |
| Soft delete | Deleted employees vanish from lists, totals and reports; their code and email become reusable; history survives |
| Audit trail | Create, update and delete attributed to a user; only changed fields recorded, with old and new values |
| Reporting | Aggregates cross-checked against returned rows; inclusive date bounds; empty ranges return zeros, not nulls |
| Health | Readiness returns 503 when the database is unreachable; liveness still returns 200 |
| Configuration | Missing, blank, placeholder and too-short values reported; committed templates contain no real credentials |

CI runs the same suite against a SQL Server service container on every push —
see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## How to test manually

### Login and roles
1. Open http://localhost:5173 — you are redirected to `/login`.
2. Enter a wrong password → an inline error, and you stay signed out.
3. Sign in as `admin` / `admin123` → the Employees page, with **Add employee**
   and per-row Edit/Delete.
4. Sign out, then sign in as `viewer` / `viewer123` → the same data, but no
   Add, Edit or Delete controls.
5. Refresh the page → you remain signed in.

### Create · Retrieve · Update · Delete
1. As `admin`, click **Add employee**. Submit the empty form → per-field
   validation. Fill it in and save → the row appears.
2. Add another reusing the same code or email → rejected as a duplicate.
3. Search, filter by department and status, sort by clicking a column header,
   and change pages — all handled in SQL, not in the browser.
4. **Edit** any row, change the salary, save → the table updates.
5. **Delete** a row → confirmation, then it disappears from the list.

### Concurrent edit protection
1. Open the app in two browser tabs, both as `admin`.
2. In both tabs, open **Edit** on the *same* employee.
3. In tab 1, change the salary and save.
4. In tab 2, change the position and save → a warning appears showing what the
   record looks like now, and your change is **not** saved over tab 1's.

### Report
1. Open **Reports**. With no filters you see all 20 employees and the totals.
2. Apply a department, status and hire-date range — the cards, the breakdown
   and the table all update.
3. Click **Export CSV** → `employee-report-YYYY-MM-DD.csv` downloads with the
   filtered rows plus a totals row.

---

## API reference

All business routes are prefixed with `/api/v1`. Every route except
`/auth/login`, `/auth/refresh` and `/auth/logout` requires an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Success | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/health/live` | 200 | — | Process is up |
| `GET` | `/api/health/ready` | 200 / 503 | — | Database is reachable |
| `POST` | `/api/v1/auth/login` | 200 | — | Credentials → access + refresh token |
| `POST` | `/api/v1/auth/refresh` | 200 | — | Rotate refresh token, issue a new access token |
| `POST` | `/api/v1/auth/logout` | **204** | — | Revoke the refresh token |
| `GET` | `/api/v1/auth/me` | 200 | any | The account behind the current token |
| `GET` | `/api/v1/departments` | 200 | any | Department lookup |
| `GET` | `/api/v1/employees` | 200 | any | Paged list. `search`, `departmentId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize` |
| `GET` | `/api/v1/employees/:id` | 200 | any | Single employee |
| `GET` | `/api/v1/employees/:id/history` | 200 | any | Full change history |
| `POST` | `/api/v1/employees` | **201** | Admin | Create |
| `PUT` | `/api/v1/employees/:id` | 200 | Admin | Update — requires `rowVersion` |
| `DELETE` | `/api/v1/employees/:id` | **204** | Admin | Soft delete |
| `GET` | `/api/v1/reports/employees` | 200 | any | Paged rows + unpaged aggregates |
| `GET` | `/api/v1/reports/employees/export` | 200 | any | The same data as CSV |

Health sits outside the version prefix deliberately: it describes the process,
not the business contract, so monitors need not change when the API version does.

### Status codes

| Code | When |
|---|---|
| `400` | Validation failed, unknown department, or a missing `rowVersion` |
| `401` | Missing, invalid or expired token; bad credentials |
| `403` | Valid account without permission for that action |
| `404` | The requested employee does not exist |
| `409` | Duplicate code/email, **or** the record changed since you loaded it |
| `429` | Rate limit exceeded (10 failed logins per 15 minutes per IP) |
| `500` | Unexpected server error — a `requestId` is returned to quote |

### Concurrent updates

`GET` returns a `rowVersion` with every employee. `PUT` must send it back. If
someone else saved in between, the update is refused with `409` and the current
record is returned under `details.current`, so the UI can show what changed.

---

## Security

| Measure | Detail |
|---|---|
| Password storage | bcrypt, cost 10 — never stored or returned in plain text |
| Access tokens | 15 minutes, so a stolen token has a short useful life |
| Refresh tokens | Stored as a SHA-256 hash, rotated on every use, revocable — which is what makes sign-out mean something |
| Brute force | 10 failed logins per 15 min per IP; successes are not counted, so a user cannot lock themselves out |
| Username enumeration | Unknown user and wrong password return an identical 401 |
| Authorization | Role checked on the API, not just hidden in the UI |
| SQL injection | Every query parameterised; `ORDER BY` restricted to a column whitelist |
| Least privilege | The API connects as `lli_hr_app`, which cannot create or drop tables, create logins, or write to the `Users` table |
| Audit immutability | The app may append to `EmployeeAudit` and read it, but `UPDATE` and `DELETE` are denied at the database — a history the app can rewrite is not evidence |
| Transport headers | `helmet` sets CSP, `nosniff`, `X-Frame-Options`, HSTS; removes `X-Powered-By` |
| Payload size | JSON bodies capped at 100 kb |
| Config safety | Startup fails on missing, placeholder or short secrets; a test blocks credentials entering committed templates |

---

## Project structure

```
.
├── .github/workflows/ci.yml     # API tests + client build on every push
├── scripts/run-sql.js           # applies .sql files, splitting on GO
├── db/
│   ├── 01_schema.sql            # database, tables, indexes
│   ├── 02_seed.sql              # users, departments, sample employees
│   ├── 03_app_user.sql          # least-privilege application login
│   ├── 04_governance.sql        # roles, audit trail, soft delete, RowVersion
│   ├── 05_search_indexes.sql    # search supporting indexes
│   └── 06_refresh_tokens.sql    # refresh token storage
├── server/
│   ├── server.js                # entry point, startup and shutdown
│   ├── tests/                   # 138 integration tests (node:test)
│   └── src/
│       ├── app.js               # express app, middleware, route mounting
│       ├── config/db.js         # shared mssql connection pool
│       ├── config/env.js        # startup configuration validation
│       ├── middleware/          # auth, roles, rate limiting, logging, errors
│       ├── routes/              # route definitions
│       ├── controllers/         # HTTP layer only
│       ├── services/            # SQL and business logic
│       ├── validators/          # express-validator rule sets
│       └── utils/csv.js         # CSV escaping helper
└── client/
    └── src/
        ├── api/                 # axios instance and endpoint wrappers
        ├── context/             # auth context and provider
        ├── hooks/               # useAuth, useDebouncedValue
        ├── components/          # layout, route guard, employee form
        ├── pages/               # login, employees, report (lazy loaded)
        └── utils/format.js      # currency and date formatting
```

Controllers only handle HTTP concerns; all SQL lives in the service layer.
Every query is parameterised, so no user input is ever concatenated into SQL.

---

## Challenges Encountered

### 1. SQL Server's defaults do not allow the application to connect

This consumed the most time by a wide margin, and none of it was application
code. Three separate defaults each block a Node connection:

- The installer's **Basic** installation type silently configures **Windows
  Authentication only**. The `mssql`/`tedious` driver connects over TCP with
  SQL Authentication, so the **Custom** path is required to select Mixed Mode
  and set an `sa` password.
- The **Azure Extension for SQL Server** page is enabled by default and blocks
  the wizard until an Azure subscription is supplied. It has to be unchecked.
- SQL Server ships with **TCP/IP disabled**, listening only on shared memory.
  Enabling it, pinning port 1433 under *IPAll* and **restarting the service**
  are all required — and the change silently does nothing without the restart.

The failure mode was a bare `ECONNREFUSED`, which reads like an application bug
and gives no hint the cause is server configuration. A fail-fast connection
check at startup, with a message pointing at the TCP/IP setting, made this far
quicker to diagnose.

A smaller trap: the installer has **two different pages** whose names both
involve "Server Configuration". The authentication mode lives on the first tab
of *Database Engine Configuration*, and its password fields stay greyed out
until the Mixed Mode radio button is selected — which makes it look as though
the field is not editable.

### 2. Distinguishing "not found" from "nothing changed"

A SQL `UPDATE` or `DELETE` against an id that does not exist succeeds happily
and affects zero rows. Returning `200` would tell the client a record was
modified when nothing happened. Both statements select `@@ROWCOUNT` in the same
batch so the service can return a proper `404`.

### 3. Turning database constraint errors into useful responses

A duplicate employee code or email raised a raw SQL Server error that would
otherwise surface as a generic `500`. These are translated by error number —
`2601`/`2627` into a `409` naming the field that clashed, `547` into a `400`
about the department — so the UI can show something actionable.

### 4. Keeping the CSV export authenticated

The export endpoint sits behind the JWT middleware, so a plain `<a href>` would
have hit it without the `Authorization` header and received a `401`. The file is
fetched through the same axios instance with `responseType: 'blob'` and handed
to the browser via an object URL.

Escaping also mattered: a position containing a comma would have shifted every
following column. A helper quotes any field containing a comma, quote or newline.

### 5. Ant Design v6 API changes

The current release deprecates several props used in most online examples —
`Card`'s `headStyle` for `styles.header`, `Select`'s `dropdownMatchSelectWidth`
for `popupMatchSelectWidth`. Static `message.success()` also warns outside a
context holder, so messages come from `App.useApp()`.

### 6. Only validating the happy path

The first version validated request *bodies* thoroughly but left query
*parameters* untouched. `?pageSize=-5` passed straight into the
`OFFSET … FETCH NEXT` clause, where SQL Server rejected it and the client got a
bare `500`. An unknown `status` was worse: it silently returned zero rows, so
the UI looked empty rather than broken.

### 7. `express-validator`'s sanitisers cannot write to `req.query` in Express 5

Adding `.toInt()` to the paging rules appeared to work, but the response kept
echoing `page` back as the string `"2"`. Express 5 exposes `req.query` as a
getter, so sanitised values are computed and discarded. Arithmetic still coerced
correctly, which is why nothing visibly broke. A test asserting `page === 2`
surfaced it; manual testing never would have.

### 8. Integration tests against a shared database cannot run in parallel

Node's test runner executes files in parallel by default. The report totals
tests failed intermittently because employee fixtures in another file create and
delete records in the department the report counts. The suite now runs serially.

### 9. A near-miss with a committed credential

A real database password was typed into `server/.env.example` rather than
`server/.env`. The example file is committed, so it would have been published on
the next push. It was caught before reaching a remote, and a test now fails the
build if a committed template contains anything other than an obvious
placeholder for a password, secret or token — verified by deliberately injecting
a realistic secret and confirming the build fails.

That guard then produced its own false positive: `REFRESH_TOKEN_DAYS=7` matched
purely because the key contains "TOKEN". Durations and counts are now recognised
as configuration rather than credentials.

### 10. `UpdatedAt` cannot be used as a concurrency token

The obvious fix for two users overwriting each other is to compare the row's
last-modified timestamp. That does not work here: `UpdatedAt` is `DATETIME2(0)`,
so it has **one-second resolution** — two edits inside the same second compare
equal and the check passes exactly when it should fail. SQL Server's
`ROWVERSION` is the right type: eight bytes the engine changes on every write,
guaranteed unique within the database. It arrives from the driver as a `Buffer`,
so it travels to the client as base64 and is decoded back for comparison.

### 11. Least privilege has consequences you have to design for

Restricting the application account so it cannot alter the schema is correct,
and it immediately broke the migrations — which is the point, but it means
schema changes need a separate administrative credential and a documented way to
apply them. Creating the `EmployeeAudit` table also silently left the
application unable to use it: `OBJECT_ID()` returns `NULL` for objects you have
no permission on, so the table read as *missing* rather than *forbidden*, which
is a misleading way to discover a permissions gap.

### 12. Soft delete interacts with unique constraints

Retaining deleted rows means a departed employee keeps occupying their employee
code and email forever, so a genuine new hire cannot reuse them. The `UNIQUE`
constraints were replaced with unique indexes **filtered to live rows**, so
uniqueness applies to active records while deleted ones release their values.
