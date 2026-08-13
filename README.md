# HR Employee Records Management System

A simple Employee Records Management System built for the LLI technical
assessment. It covers authenticated access, full CRUD over employee records,
and a filterable report with summary totals and CSV export — all served over a
RESTful API.

**Stack:** ReactJS + Ant Design · ExpressJS · Microsoft SQL Server · JWT authentication

---

## Features

| Feature | Detail |
|---|---|
| **Login** | JWT authentication, bcrypt-hashed passwords, protected routes, session restored on reload |
| **Create** | Add an employee through a validated Ant Design modal form |
| **Retrieve** | Paged, searchable table with department and status filters |
| **Update** | Edit any record through the same form, pre-filled |
| **Delete** | Remove a record behind a confirmation prompt |
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
the default configuration. If you are installing SQL Server fresh:

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

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Create the database

Run the two scripts in the [`db/`](db/) folder, in order, against your SQL
Server instance:

| Script | What it does |
|---|---|
| [`db/01_schema.sql`](db/01_schema.sql) | Creates the `LLI_HR_DB` database, the `Users`, `Departments` and `Employees` tables, and supporting indexes |
| [`db/02_seed.sql`](db/02_seed.sql) | Inserts the default admin user, 5 departments and 20 sample employees |

Both scripts are safe to re-run — nothing is duplicated or dropped.

**Using the VS Code MSSQL extension:** `Ctrl+Shift+P` → *MS SQL: Connect* →
server `localhost,1433`, SQL Login, user `sa`, your password, and trust the
server certificate. Then open each script and press `Ctrl+Shift+E` to execute.

**Using SSMS:** connect to `localhost,1433` with SQL Authentication, open each
script, and press F5.

You should see a final result showing `Users: 1`, `Departments: 5`,
`Employees: 20`.

### 3. Start the backend

```bash
cd server
npm install
cp .env.example .env     # on Windows: copy .env.example .env
```

Edit `server/.env` and set **`DB_PASSWORD`** to your `sa` password, and
**`JWT_SECRET`** to any long random string:

```ini
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=LLI_HR_DB
DB_USER=sa
DB_PASSWORD=your_sa_password_here
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=8h
```

Then start it:

```bash
npm run dev        # or: npm start
```

Expected output:

```
[db] connected to localhost:1433/LLI_HR_DB
[server] listening on http://localhost:5000
```

The server exits immediately with a clear message if it cannot reach the
database, rather than failing on the first request.

### 4. Start the frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env     # on Windows: copy .env.example .env
npm run dev
```

Open **http://localhost:5173**.

---

## Default login

| Username | Password |
|---|---|
| `admin` | `admin123` |

The password is stored only as a bcrypt hash — the plain value never touches
the database.

---

## How to test

### Login
1. Open http://localhost:5173 — you are redirected to `/login`.
2. Enter a wrong password → an inline error appears, and you stay signed out.
3. Sign in with `admin` / `admin123` → you land on the Employees page.
4. Refresh the page → you remain signed in (the token is revalidated).
5. Try visiting http://localhost:5173/employees in a private window → you are
   redirected back to the login screen.

### Create
1. Click **Add employee**.
2. Submit the empty form → per-field validation messages appear.
3. Fill it in and save → a success message shows and the row appears in the table.
4. Add another employee reusing the same employee code or email → the server
   rejects it with a duplicate message.

### Retrieve
1. Type a name, email, code or position into the search box and press Enter.
2. Filter by department and by status.
3. Change pages and page size — paging is done in SQL, not in the browser.

### Update
1. Click **Edit** on any row → the form opens pre-filled.
2. Change the salary, department or status and save → the table reflects it.

### Delete
1. Click **Delete** on any row → a confirmation naming the employee appears.
2. Confirm → the row is removed and the total count drops.

### Report
1. Open **Reports** in the sidebar.
2. With no filters you see all 20 employees, a headcount of 20, and the total
   monthly payroll.
3. Apply a department filter, a status filter and a hire-date range — the
   statistic cards, the per-department breakdown and the table all update.
4. Click **Export CSV** → a `employee-report-YYYY-MM-DD.csv` file downloads
   containing the filtered rows plus a totals row.

### Sign out
Use the menu in the top right → you are returned to the login screen and the
stored token is cleared.

---

## API reference

All routes are prefixed with `/api`. Every route except `POST /auth/login`
requires an `Authorization: Bearer <token>` header.

| Method | Endpoint | Success | Description |
|---|---|---|---|
| `GET` | `/health` | 200 | Liveness check |
| `POST` | `/auth/login` | 200 | Exchange credentials for a JWT |
| `GET` | `/auth/me` | 200 | Return the account behind the current token |
| `GET` | `/departments` | 200 | Department lookup list |
| `GET` | `/employees` | 200 | Paged list. Query: `search`, `departmentId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize` |
| `GET` | `/employees/:id` | 200 | Single employee |
| `POST` | `/employees` | **201** | Create an employee |
| `PUT` | `/employees/:id` | 200 | Update an employee |
| `DELETE` | `/employees/:id` | **204** | Delete an employee |
| `GET` | `/reports/employees` | 200 | Report rows, summary totals and department breakdown. Query: `departmentId`, `status`, `from`, `to` |
| `GET` | `/reports/employees/export` | 200 | The same data as a CSV download |

### Status codes

| Code | When |
|---|---|
| `400` | Validation failed, or a referenced department does not exist |
| `401` | Missing, invalid or expired token; bad login credentials |
| `404` | The requested employee id does not exist |
| `409` | Employee code or email already belongs to another record |
| `500` | Unexpected server error (details are logged, not returned) |

---

## Project structure

```
.
├── db/
│   ├── 01_schema.sql            # database, tables, indexes
│   └── 02_seed.sql              # admin user, departments, sample employees
├── server/
│   ├── server.js                # entry point, startup and shutdown
│   └── src/
│       ├── app.js               # express app, middleware, route mounting
│       ├── config/db.js         # shared mssql connection pool
│       ├── middleware/          # auth, validation, error handling
│       ├── routes/              # route definitions
│       ├── controllers/         # HTTP layer only
│       ├── services/            # SQL and business logic
│       ├── validators/          # express-validator rule sets
│       └── utils/csv.js         # CSV escaping helper
└── client/
    └── src/
        ├── api/                 # axios instance and endpoint wrappers
        ├── context/             # authentication state
        ├── components/          # layout, route guard, employee form
        ├── pages/               # login, employees, report
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
  SQL Authentication, so the **Custom** path is required in order to select
  Mixed Mode and set an `sa` password.
- The **Azure Extension for SQL Server** page is enabled by default and blocks
  the wizard until an Azure subscription is supplied. It has to be unchecked.
- SQL Server ships with the **TCP/IP protocol disabled**, listening only on
  shared memory. Enabling TCP/IP, pinning port 1433 under *IPAll* and
  **restarting the service** are all required — and the changes silently do
  nothing without that restart.

The failure mode was a bare `ECONNREFUSED`, which reads like an application bug
and gives no hint that the cause is server configuration. Adding a fail-fast
connection check at startup, with a message pointing at the TCP/IP setting,
made this far quicker to diagnose.

A smaller trap: the installer has **two different pages** whose names both
involve "Server Configuration" — the service-accounts page, and the first tab
of *Database Engine Configuration*. The authentication mode lives on the
latter, and its password fields stay greyed out until the Mixed Mode radio
button is selected, which makes it look as though the field is not editable.

### 2. Distinguishing "not found" from "nothing changed" on update and delete

A SQL `UPDATE` or `DELETE` against an id that does not exist succeeds happily
and affects zero rows. Returning `200` in that case would tell the client a
record was modified when nothing happened. Both statements now select
`@@ROWCOUNT` in the same batch, and the service returns `null`/`false` when it
is zero so the controller can respond with a proper `404`.

### 3. Turning database constraint errors into useful responses

Inserting a duplicate employee code or email raised a raw SQL Server error that
would otherwise have surfaced as a generic `500`. These are translated by error
number — `2601`/`2627` into a `409` naming the field that clashed, and `547`
(foreign key) into a `400` about the department — so the UI can show the user
something actionable instead of "Internal server error".

### 4. Keeping the CSV export authenticated

The export endpoint sits behind the JWT middleware, so a plain `<a href>` link
would have hit it without the `Authorization` header and received a `401`. The
file is instead fetched through the same axios instance with
`responseType: 'blob'`, and handed to the browser via an object URL, which
keeps the download authenticated and preserves the server's filename.

Escaping also mattered: a position or department containing a comma would have
shifted every following column. A small helper quotes any field containing a
comma, quote or newline and doubles inner quotes.

### 5. Ant Design v6 API changes

The current Ant Design release deprecates several props used in most online
examples — `Card`'s `headStyle` in favour of `styles.header`, `Select`'s
`dropdownMatchSelectWidth` in favour of `popupMatchSelectWidth`, and `Menu`
children in favour of `items`. Static `message.success()` calls also warn
outside a context holder, so messages are taken from `App.useApp()` with the
app wrapped in Ant Design's `<App>` component.

### 6. Resetting pagination when filters change

Filtering while on page 3 initially returned an empty table: the new result set
had fewer pages than the current page number. Any filter change now resets the
page back to 1.
