# Architecture & Implementation Overview

**Project:** Mini Transaction Ledger

**Stack:** .NET 10, PostgreSQL 16, React 18 (TypeScript, Tailwind CSS), Docker Compose

---

### 1. App Architecture (Frontend-Backend Interaction)

The system is a decoupled client-server web application adhering to double-entry accounting rules:

* **Client Tier (Port 3000):** A React 18 Single-Page Application (SPA) providing interfaces for the Chart of Accounts, Journal Entries, and Chronological Statements.
* **API Tier (Port 8000 $\rightarrow$ 8080):** ASP.NET Core Web API exposing RESTful endpoints (`/api/v1/...`). It performs payload validation, manages business transactions, and handles CORS for local development.
* **Persistence Tier (Port 5432):** PostgreSQL 16 instance accessed via Entity Framework Core 10 using strict decimal precision (`decimal(18, 4)`).
* **Interaction:** The browser issues JSON HTTP requests directly to the API on localhost. State updates (e.g., posted transactions) immediately refresh the client cache and ledger logs.

---

### 2. Key Code Components & Their Purpose

* **`LedgerService` / Domain Engine:** Enforces financial rules—verifies mathematical equilibrium ($\sum \text{Debits} = \sum \text{Credits}$), applies normal-balance math per account type, and snapshots running balances.
* **`AccountsController` & `TransactionsController`:** Expose endpoints for account creation, statement generation, transaction ingestion, and audit inspection.
* **`LedgerDbContext`:** Configures PostgreSQL entity mappings, foreign key relations, and automatically executes database migrations on container boot.
* **`Account`, `Transaction`, and `TransactionSplit` Entities:** Core domain models representing general ledger accounts, immutable business events, and individual debit/credit legs.
* **`JournalView.tsx`:** Consolidates the two-legged transaction entry form (with real-time equilibrium validation) and the master general ledger log into a unified view.
* **`AccountStatementView.tsx`:** Renders chronological T-account ledgers with opening/closing balances and CSV exports.

---

### 3. How the API Works Internally

1. **Validation:** Upon receiving `POST /api/v1/transactions`, the API verifies that split legs are distinct, non-zero, and satisfy $\sum \text{Debits} == \sum \text{Credits}$. Imbalanced requests are rejected immediately with `400 Bad Request`.
2. **Atomic Execution:** Within an explicit database transaction (`BeginTransactionAsync`), target accounts are loaded.
3. **Normal Balance Evaluation:** The engine computes the new balance based on standard conventions:
* *Assets / Expenses:* Increased by Debits, decreased by Credits.
* *Liabilities / Equity / Revenue:* Increased by Credits, decreased by Debits.


4. **Audit Snapshot:** The computed balance is recorded directly on each split (`RunningBalanceAfter`) alongside the transaction header (`TX-XXXXXX`).
5. **Commit:** The database transaction commits all splits and balance updates atomically, returning `201 Created`.

---

### 4. Docker Setup Explanation

The system runs via `docker compose up --build` across three interconnected services on a custom bridge network (`ledger-net`):

* **`ledger-db` (PostgreSQL 16 Alpine):** Stores relational ledger records in a persistent Docker volume (`postgres_data`). A Docker healthcheck (`pg_isready`) ensures the database is fully accepting queries before dependent services initialize.
* **`ledger-backend` (.NET 10):** Multi-stage build producing an optimized binary. Waits on database health, connects via internal container DNS (`Host=postgres-db`), and runs EF Core migrations on startup.
* **`ledger-frontend` (Node 20 Alpine):** Multi-stage build compiling Vite/React assets into `dist/`. Assets are served on port `3000` via a lightweight, native Node HTTP server script (`server.cjs`), avoiding third-party runtime downloads, routing issues, and external web server complexity.