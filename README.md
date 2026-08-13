# HR Employee Records Management System

An employee records system built for the LLI technical assessment: authenticated
access with role-based permissions, full CRUD over employee records with a
change history, and a filterable report with summary totals and CSV export —
all served over a RESTful API.

**Stack:** ReactJS + Ant Design · ExpressJS · Microsoft SQL Server · JWT authentication

---

## Features

| Feature | Detail |
|---|---|
| **Login** | Short-lived JWT access tokens with revocable refresh tokens, bcrypt-hashed passwords, protected routes, session restored on reload |
| **Roles** | `Admin` can write, `Viewer` can only read. Enforced on the API; the UI hides what a viewer cannot do |
| **Create** | Add an employee through a validated modal form |
| **Retrieve** | Paged, sortable, searchable table with department and status filters |
| **Update** | Edit the same record safely — two people editing at once cannot overwrite each other |
| **Delete** | Soft delete behind a confirmation; the record and its history are retained |
| **Report** | Filter by department, status and hire-date range; headcount, payroll and average salary; per-department breakdown; CSV export |
| **Responsive** | Tables become card lists on mobile, navigation becomes a drawer, dialogs go full-screen |
| **Theme** | Light and dark, following the operating system by default |

---

## Prerequisites

| Requirement | Version used |
|---|---|
| [Node.js](https://nodejs.org/) | v24 (any current LTS works) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) | 2025 Developer Edition (2019+ works) |
| A SQL client | [MSSQL extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) or SSMS |
| Git | any recent version |

---

## Step 1 — Configure SQL Server

The application connects over TCP using SQL Authentication, which is **not** how
SQL Server is configured out of the box. If you are installing it fresh:

1. Run the installer and choose **Custom**, not Basic.
2. On the **Azure Extension for SQL Server** page, **untick** the checkbox — it
   is enabled by default and will block the wizard asking for a subscription.
3. Under **Feature Selection**, tick only **Database Engine Services**.
4. On **Database Engine Configuration**, choose
   **Mixed Mode (SQL Server authentication and Windows authentication)**, set a
   password for the `sa` account, and click **Add Current User**.
5. Finish the install.

Then enable network access:

6. Open **SQL Server Configuration Manager**
   (`Win+R` → `SQLServerManager17.msc`).
7. **SQL Server Network Configuration** → **Protocols for MSSQLSERVER** →
   right-click **TCP/IP** → **Enable**.
8. Double-click **TCP/IP** → **IP Addresses** tab → scroll to **IPAll** → clear
   **TCP Dynamic Ports** and set **TCP Port** to `1433`.
9. **SQL Server Services** → right-click **SQL Server (MSSQLSERVER)** →
   **Restart**. The changes above do nothing until you do this.

Verify: connect to `localhost,1433` with SQL Authentication as `sa`.

---

## Step 2 — Clone and install

```bash
git clone https://github.com/miravilwow/lli-hr-management-system.git
cd lli-hr-management-system
npm run install:all
```

That installs the root, server and client dependencies in one go.

---

## Step 3 — Create the database

Run the scripts in [`db/`](db/) **in order**:

| # | Script | What it does |
|---|---|---|
| 1 | [`01_schema.sql`](db/01_schema.sql) | Creates `LLI_HR_DB` and the `Users`, `Departments` and `Employees` tables |
| 2 | [`02_seed.sql`](db/02_seed.sql) | Adds the default users, 5 departments and 20 sample employees |
| 3 | [`03_app_user.sql`](db/03_app_user.sql) | Creates the least-privilege login the API uses — **change the password at the top of the file first** |
| 4 | [`04_governance.sql`](db/04_governance.sql) | Roles, audit trail, soft-delete columns, concurrency token |
| 5 | [`05_search_indexes.sql`](db/05_search_indexes.sql) | Indexes supporting employee search |
| 6 | [`06_refresh_tokens.sql`](db/06_refresh_tokens.sql) | Refresh token storage |

Every script is safe to re-run.

**Using VS Code:** `Ctrl+Shift+P` → *MS SQL: Connect* → `localhost,1433`, SQL
Login, `sa`, your password, trust the certificate. Then open each script in
order and press `Ctrl+Shift+E`.

**Using SSMS:** connect to `localhost,1433` with SQL Authentication, open each
script in order and press F5.

After script 2 you should see `Users: 2`, `Departments: 5`, `Employees: 20`.
After script 4, a table listing `admin / Admin` and `viewer / Viewer`.

---

## Step 4 — Configure the application

```bash
cd server
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

Open `server/.env` and set two values:

```ini
DB_PASSWORD=the_password_you_chose_in_03_app_user.sql
JWT_SECRET=a_random_string_of_at_least_32_characters
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then the frontend:

```bash
cd ../client
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

The client's defaults work as-is for local development.

> Put real values in **`.env`**, never in `.env.example` — the example file is
> committed to git. A test enforces this and fails the build if a credential
> ever appears in a committed template.

The server checks its configuration at startup and exits with a list of what is
wrong, rather than failing later on the first request.

---

## Step 5 — Run it

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

Prefer separate terminals? `npm run dev:server` and `npm run dev:client`.

### Available scripts

| Command | What it does |
|---|---|
| `npm run install:all` | Installs root, server and client dependencies |
| `npm run dev` | Starts the API and frontend together |
| `npm test` | Runs the API test suite |
| `npm run lint` | Lints the client |
| `npm run build` | Production build of the client |
| `npm run check` | Lint, build and test — what CI runs |

---

## Logins

| Username | Password | Role | Can do |
|---|---|---|---|
| `admin` | `admin123` | Admin | Everything |
| `viewer` | `viewer123` | Viewer | Read employees and reports only |

---

## Step 6 — How to test it

### Automated tests

```bash
npm test
```

**141 integration tests** run against the real database, covering authentication,
sessions, authorization, all four CRUD operations with their error paths, soft
delete, the audit trail, report arithmetic, CSV escaping and configuration
validation. A full run leaves the database exactly as it found it.

### Manual walkthrough

**Login and roles**
1. Open http://localhost:5173 — you are redirected to `/login`.
2. Enter a wrong password → an inline error appears and you stay signed out.
3. Sign in as `admin` / `admin123` → the Employees page, with **Add employee**
   and per-row actions.
4. Sign out, sign in as `viewer` / `viewer123` → same data, but the Add and
   Delete controls are gone.
5. Refresh the page → you stay signed in.

**Create**
1. As `admin`, click **Add employee**.
2. Submit the empty form → each field shows its own validation message.
3. Fill it in and save → the row appears in the table.
4. Add another using the same employee code or email → rejected as a duplicate.

**Retrieve**
1. Type into the search box — it searches name, email, code and position.
2. Filter by department and by status.
3. Click a column header to sort, or use the **Sort by** dropdown for salary and
   hire date.
4. Change pages and page size. All of this happens in SQL, not in the browser.

**View**
1. Click the **eye** icon on any row.
2. The details view shows salary, hire date, length of service and the record's
   change history.

**Update**
1. From the details view, click **Edit details**.
2. Change the salary and save → the table reflects it.
3. Open the record again → the change is listed in the history with your name.

**Status**
1. Open a record and click **Mark inactive** → confirm.
2. Filter the table by *Inactive* → the employee is there.

**Delete**
1. Click the **delete** icon on a row → a confirmation naming the employee.
2. Confirm → it disappears from the list and the total drops.

**Concurrent edits** *(the interesting one)*
1. Open the app in **two browser tabs**, both as `admin`.
2. In both tabs, open **Edit** on the *same* employee.
3. In tab 1, change the salary and save.
4. In tab 2, change the position and save → a warning appears showing what the
   record looks like now, and **your change is not saved over tab 1's**.

**Report**
1. Open **Reports**. With no filters you see all 20 employees and the totals.
2. Apply a department, status and hire-date range — the cards, the per-department
   breakdown and the table all update.
3. Click **Export CSV** → a dated file downloads with the filtered rows and a
   totals row.

**Responsive**
1. Narrow the browser (or use the device toolbar in DevTools).
2. The navigation becomes a drawer, the table becomes a list of cards, and the
   dialogs fill the screen.

**Theme**
Use the sun/moon button in the header. Your choice is remembered.

---

## API reference

Business routes are prefixed with `/api/v1`. Everything except `/auth/login`,
`/auth/refresh` and `/auth/logout` needs an `Authorization: Bearer <token>` header.

| Method | Endpoint | Success | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/health/live` | 200 | — | Process is up |
| `GET` | `/api/health/ready` | 200 / 503 | — | Database is reachable |
| `POST` | `/api/v1/auth/login` | 200 | — | Credentials → access + refresh token |
| `POST` | `/api/v1/auth/refresh` | 200 | — | Rotate the refresh token, issue a new access token |
| `POST` | `/api/v1/auth/logout` | 204 | — | Revoke the refresh token |
| `GET` | `/api/v1/auth/me` | 200 | any | The account behind the current token |
| `GET` | `/api/v1/departments` | 200 | any | Department lookup |
| `GET` | `/api/v1/employees` | 200 | any | Paged list — `search`, `departmentId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize` |
| `GET` | `/api/v1/employees/:id` | 200 | any | One employee |
| `GET` | `/api/v1/employees/:id/history` | 200 | any | Change history |
| `POST` | `/api/v1/employees` | 201 | Admin | Create |
| `PUT` | `/api/v1/employees/:id` | 200 | Admin | Update — requires `rowVersion` |
| `DELETE` | `/api/v1/employees/:id` | 204 | Admin | Soft delete |
| `GET` | `/api/v1/reports/employees` | 200 | any | Paged rows plus unpaged totals |
| `GET` | `/api/v1/reports/employees/export` | 200 | any | The same data as CSV |

### Status codes

| Code | When |
|---|---|
| `400` | Validation failed, unknown department, or a missing `rowVersion` |
| `401` | Missing, invalid or expired token; bad credentials |
| `403` | Valid account without permission for that action |
| `404` | The employee does not exist |
| `409` | Duplicate code/email, **or** the record changed since you loaded it |
| `429` | Rate limit exceeded — 10 failed logins per 15 minutes per IP |
| `500` | Unexpected error; a `requestId` is returned so it can be traced |

---

## Project structure

```
.
├── .github/workflows/ci.yml     # tests + build on every push
├── scripts/run-sql.js           # applies .sql files, splitting on GO
├── db/                          # schema, seed and migration scripts
├── server/
│   ├── server.js                # entry point
│   ├── tests/                   # 141 integration tests
│   └── src/
│       ├── app.js               # express app and route mounting
│       ├── config/              # database pool, startup config checks
│       ├── middleware/          # auth, roles, rate limiting, logging, errors
│       ├── routes/              # route definitions
│       ├── controllers/         # HTTP layer only
│       ├── services/            # SQL and business logic
│       ├── validators/          # request validation rules
│       └── utils/               # CSV helper
└── client/
    └── src/
        ├── api/                 # axios instance and endpoint wrappers
        ├── context/             # authentication state
        ├── hooks/               # useAuth, useDebouncedValue, useThemeMode
        ├── components/          # layout, route guard, modals
        ├── pages/               # login, employees, report
        ├── theme.js             # design tokens
        └── utils/               # formatting
```

Controllers only handle HTTP; all SQL lives in the service layer. Every query is
parameterised, so no user input is ever concatenated into SQL.

---

## Challenges Encountered

### 1. SQL Server will not accept a connection out of the box

This took the most time by a wide margin, and none of it was application code.
Three separate defaults each block a Node connection, and none of them announce
themselves:

- The installer's **Basic** option silently configures **Windows Authentication
  only**. The `mssql` driver connects over TCP with SQL Authentication, so the
  Custom path is required just to reach the Mixed Mode setting.
- The **Azure Extension** page is ticked by default and refuses to let you past
  without an Azure subscription.
- **TCP/IP is disabled**, so SQL Server listens only on shared memory. Enabling
  it, pinning port 1433, and restarting the service are all required — and the
  change silently does nothing without that restart.

The symptom was a bare `ECONNREFUSED`, which reads like an application bug and
gives no hint the cause is server configuration. Adding a connection check at
startup, with a message pointing at the TCP/IP setting, made it far quicker to
diagnose the next time.

### 2. Two users editing the same record silently destroyed each other's work

Opening the same employee in two tabs, changing the salary in one and the
position in the other, meant the second save reverted the first — and both users
saw a success message. Nothing was logged. A salary simply changed back.

The obvious fix is to compare the row's last-modified timestamp, and that does
not work here: `UpdatedAt` is `DATETIME2(0)`, so it has **one-second
resolution**. Two edits inside the same second compare equal, and the check
passes exactly when it should fail. The fix was SQL Server's `ROWVERSION` — eight
bytes the engine changes on every write to the row. The client sends it back with
the update, the `UPDATE` matches on it, and a stale write affects zero rows and
returns `409`.

### 3. `express-validator`'s sanitisers do nothing in Express 5

Adding `.toInt()` to the paging rules looked correct, but the API kept echoing
`page` back as the string `"2"`. Express 5 exposes `req.query` as a getter, so
the sanitised values are computed and then thrown away. Arithmetic still coerced
the strings correctly, which is why nothing visibly broke — the paging worked,
the response type was just wrong.

A test asserting `page === 2` is what caught it. No amount of clicking through
the UI would have.

### 4. Only validating the happy path

Request bodies were validated thoroughly from the start; query parameters were
not. `?pageSize=-5` passed the negative number straight into the
`OFFSET … FETCH NEXT` clause, where SQL Server rejected it and the client got a
bare `500`. An unknown `status` was worse — it silently returned zero rows, so
the screen looked empty rather than broken.

### 5. A hard delete throws away more than the row

`DELETE FROM Employees` removes the employment record permanently, which is the
wrong behaviour for HR data and also destroys the subject of the audit trail.
Switching to a soft delete then broke uniqueness in a way I did not anticipate: a
departed employee kept occupying their employee code and email forever, so a
genuine new hire could not reuse them. The `UNIQUE` constraints had to become
unique indexes **filtered to live rows**.

### 6. Restricting the database account has knock-on effects

Moving the application off `sa` onto an account that can only touch three tables
is correct, and it immediately broke the migrations — which is the point, but it
means schema changes need a separate administrative credential and a documented
way to run them.

It also caused a genuinely confusing bug. After creating the audit table, the
application could not use it, and `OBJECT_ID('dbo.EmployeeAudit')` returned
`NULL` — because that function returns `NULL` for objects you have no permission
on. The table read as *missing* rather than *forbidden*, which is a misleading
way to discover a permissions gap.

### 7. My own test suite was corrupting the database

Tests created employee fixtures and cleaned up by calling the `DELETE` endpoint —
which, after the change above, is a **soft** delete. The rows never went away.
Nearly two hundred of them accumulated, and two seeded employees had been left
soft-deleted, so searching for them returned nothing and it looked like the search
had broken.

Teardown now deletes fixtures for real, and purges any left behind by a run that
failed partway. It deliberately does not touch the audit table: the application
account is denied `DELETE` there, and a change history the application can erase
is not evidence of anything. That guarantee is worth more than tidy test data.

### 8. Integration tests against one database cannot run in parallel

Node's test runner executes files in parallel by default. The report totals tests
began failing intermittently, because employee fixtures created in another file
were being counted by the report mid-assertion. The suite now runs serially,
which for about ten seconds of runtime is the right trade.

### 9. A credential nearly made it into the repository

A real database password was typed into `server/.env.example` instead of
`server/.env`. The example file is committed, so it would have been published on
the next push. It was caught before it reached a commit, and a test now fails the
build if any committed template contains something other than an obvious
placeholder for a password, secret or token.

That guard then produced its own false positive: `REFRESH_TOKEN_DAYS=7` tripped
it purely because the key contains the word "TOKEN". Durations and counts are now
recognised as configuration rather than credentials.

### 10. Ant Design's Layout header is dark by default

In light mode the header was unreadable — the controls were there but invisible.
`Layout.Header` defaults to a dark navy background, and the theme had overridden
the sider's background but not the header's, so a dark bar was being painted
behind contents styled for a light surface. It looked like the buttons were
missing rather than mis-coloured.

### 11. Inferring existence from the wrong thing

`GET /employees/:id/history` decided whether an employee existed by checking
whether it had any audit rows. Every one of the twenty seeded employees predates
the audit trail, so all of them reported `404` when their history was requested —
the details view would have failed on every record shipped with the system.
Existence has to be checked against the employee itself, using a lookup that
deliberately ignores the soft-delete flag so the history outlives the deletion.

### 12. Seven columns do not fit on a phone

The employee table originally showed code, name, email, department, position,
salary, hire date and status. On a desktop it forced a horizontal scrollbar and
truncated every cell; on a phone it was unusable. Salary and hire date moved into
a details view — they are figures you look up, not something you scan a list by —
and below the medium breakpoint each record renders as a card instead of a row.
