# Challenges Log (working notes)

Running log kept during development. Folded into the README's
"Challenges Encountered" section at the end.

---

## 1. SQL Server was not installed and required specific configuration

The machine had Node, npm and Git ready, but no SQL Server instance at all.
Installing it surfaced three non-obvious requirements:

- The installer's **Basic** installation type silently configures **Windows
  Authentication only**. The Node `mssql`/`tedious` driver connects over TCP
  using SQL Authentication, so the **Custom** install path had to be used
  instead in order to select **Mixed Mode** and set an `sa` password.
- The **Azure Extension for SQL Server** page is enabled by default and blocks
  the wizard until an Azure subscription is supplied. It had to be unchecked.
- The installer has two different pages both involving the words "Server
  Configuration" — the service-accounts page and the first tab of *Database
  Engine Configuration*. The authentication mode lives on the latter, and its
  password fields stay disabled until the Mixed Mode radio button is selected.

## 2. SQL Server does not accept TCP connections out of the box

After a successful install the Node app still could not connect. SQL Server
ships with the **TCP/IP protocol disabled**, so it listens only on shared
memory / named pipes. This required, in SQL Server Configuration Manager:

- enabling **TCP/IP** under *Protocols for MSSQLSERVER*
- clearing **TCP Dynamic Ports** and setting **TCP Port = 1433** under *IPAll*
- **restarting** the SQL Server service, as neither change takes effect until
  the service is recycled

The failure mode was a generic `ECONNREFUSED`, which looks like an application
bug rather than a server configuration issue.
