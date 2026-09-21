# Mini Transaction Ledger

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/SaifullahMnsur-Again/Mini-Transaction-Ledger)

**Repository URL:** [https://github.com/SaifullahMnsur-Again/Mini-Transaction-Ledger](https://github.com/SaifullahMnsur-Again/Mini-Transaction-Ledger)

---

Mini Transaction Ledger is a robust, full-stack double-entry bookkeeping engine and financial transaction ledger built with **.NET 10**, **PostgreSQL 16**, and **React 18** with **Tailwind CSS**.

The system enforces atomic ledger posting, strict mathematical equilibrium ($\sum \text{Debits} = \sum \text{Credits}$), accounting normal-balance conventions across five standard account classifications, and chronological T-account statement generation with running balance audit trails.

---

## Tech Stack

- **Backend:** .NET 10 (ASP.NET Core Web API, C#)
- **Data & ORM:** PostgreSQL 16, Entity Framework Core 10 (Code-First Migrations)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Heroicons
- **Containerization & Orchestration:** Docker, Docker Compose (Multi-stage builds)
- **Architecture Standard:** Domain-Driven Design (DDD), Clean Double-Entry Accounting Core, RESTful API (v1)

---

## System Architecture

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'darkMode': true, 'background': '#0d1117', 'mainBkg': '#161b22', 'nodeBorder': '#30363d', 'titleColor': '#58a6ff', 'edgeLabelBackground': '#161b22'}}}%%
graph TD
    subgraph Client ["Frontend Layer (Docker: Port 3000)"]
        UI["React 18 + Vite SPA"]
        COA["Chart of Accounts View"]
        JV["Journal & Post View"]
        SV["Account Statement View"]
        UI --> COA
        UI --> JV
        UI --> SV
    end

    subgraph API ["Backend API Layer (Docker: Port 8000)"]
        AC["AccountsController"]
        TC["TransactionsController"]
        LE["Ledger Engine Core"]
        VAL["Equilibrium Validator (Dr == Cr)"]
        NB["Normal Balance Evaluator"]
        
        AC --> LE
        TC --> LE
        LE --> VAL
        LE --> NB
    end

    subgraph Database ["Persistence Layer (Docker: Port 5432)"]
        EF["Entity Framework Core 10"]
        PG[("PostgreSQL 16")]
        EF --> PG
    end

    UI -->|"HTTP / REST JSON (/api/v1)"| AC
    UI -->|"HTTP / REST JSON (/api/v1)"| TC
    LE --> EF

    style Client fill:#161b22,stroke:#58a6ff,stroke-width:2px,color:#58a6ff
    style API fill:#161b22,stroke:#3fb950,stroke-width:2px,color:#3fb950
    style Database fill:#161b22,stroke:#d29922,stroke-width:2px,color:#d29922
    style UI fill:#21262d,stroke:#58a6ff,color:#f0f6fc
    style COA fill:#21262d,stroke:#30363d,color:#f0f6fc
    style JV fill:#21262d,stroke:#30363d,color:#f0f6fc
    style SV fill:#21262d,stroke:#30363d,color:#f0f6fc
    style AC fill:#21262d,stroke:#30363d,color:#f0f6fc
    style TC fill:#21262d,stroke:#30363d,color:#f0f6fc
    style LE fill:#21262d,stroke:#3fb950,color:#f0f6fc
    style VAL fill:#21262d,stroke:#30363d,color:#f0f6fc
    style NB fill:#21262d,stroke:#30363d,color:#f0f6fc
    style EF fill:#21262d,stroke:#30363d,color:#f0f6fc
    style PG fill:#21262d,stroke:#d29922,color:#f0f6fc

```

---

## Data Model & Relationships (ERD)

```mermaid
%%{init: {
  'theme': 'default',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#0f172a',
    'primaryBorderColor': '#2563eb',
    'lineColor': '#2563eb',
    'secondaryColor': '#f1f5f9',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#2563eb',
    'clusterBkg': '#f8fafc',
    'entityBkg': '#ffffff',
    'entityBorder': '#2563eb',
    'entityTextColor': '#0f172a',
    'attributeBackgroundColorOdd': '#ffffff',
    'attributeBackgroundColorEven': '#f8fafc',
    'attributeBoxBorderColor': '#cbd5e1'
  }
}}%%
erDiagram
    ACCOUNT ||--o{ TRANSACTION_SPLIT : "participates in"
    TRANSACTION ||--|{ TRANSACTION_SPLIT : "contains legs"

    ACCOUNT {
        uuid Id PK
        string AccountNumber UK "e.g. 1010-CASH"
        string Name
        int Type "Asset(1), Liability(2), Equity(3), Revenue(4), Expense(5)"
        string Currency "BDT, USD, etc."
        decimal CurrentBalance "Running Net Balance"
        timestamp CreatedAtUtc
    }

    TRANSACTION {
        uuid Id PK
        string TransactionId UK "e.g. TX-A1B2C3"
        string Description
        timestamp PostedAtUtc
    }

    TRANSACTION_SPLIT {
        uuid Id PK
        uuid TransactionId FK
        uuid AccountId FK
        int EntryType "Debit(1) or Credit(2)"
        decimal Amount "Positive quantity > 0"
        decimal RunningBalanceAfter "Audit trail snapshot"
    }

```

---

## Inner Workings & Ledger Mechanics

### 1. Atomic Transaction Sequence & Equilibrium Validation

Every financial transaction passes through strict invariant validation before any persistence occurs:

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'actorBkg': '#21262d',
    'actorBorder': '#58a6ff',
    'actorTextColor': '#ffffff',
    'actorLineColor': '#30363d',
    'signalColor': '#58a6ff',
    'signalTextColor': '#ffffff',
    'labelBoxBkgColor': '#161b22',
    'labelBoxBorderColor': '#58a6ff',
    'labelTextColor': '#ffffff',
    'loopTextColor': '#ffffff',
    'noteBorderColor': '#30363d',
    'noteBkgColor': '#161b22',
    'noteTextColor': '#ffffff',
    'activationBorderColor': '#58a6ff',
    'activationBkgColor': '#30363d'
  }
}}%%
sequenceDiagram
    autonumber
    actor User as Client / User
    participant Front as React SPA
    participant Controller as TransactionsController
    participant Engine as Ledger Engine
    participant DB as PostgreSQL (via EF Core)

    User->>Front: Enter Memo, Debit Leg, Credit Leg & Amount
    Front->>Front: Verify Client-Side Equilibrium (Dr == Cr)
    Front->>Controller: POST /api/v1/transactions
    Controller->>Engine: Validate Invariants
    
    alt Sum(Debits) != Sum(Credits) OR Self-Transfer
        Engine-->>Controller: Reject: Imbalanced / Circular Transfer
        Controller-->>Front: 400 Bad Request
        Front-->>User: Display Error Banner
    else Invariants Verified (Dr == Cr)
        Engine->>DB: Begin DB Transaction
        Engine->>DB: Apply Normal Balance adjustments (Assets/Liab/Eq/Rev/Exp)
        Engine->>DB: Compute RunningBalanceAfter for each Split
        Engine->>DB: Insert Transaction & Split records
        Engine->>DB: Commit DB Transaction
        DB-->>Engine: Success
        Engine-->>Controller: Return TransactionResponse
        Controller-->>Front: 201 Created (TX-XXXXXX assigned)
        Front-->>User: Render Receipt Card & Refresh Journal Feed
    end

```

### 2. Normal Balance Conventions

Account balances adjust strictly based on standard financial accounting principles:

| Classification | Normal Balance | Impact of Debit ($+$) | Impact of Credit ($-$) |
| --- | --- | --- | --- |
| **Asset** | Debit | Increases Balance ($+$) | Decreases Balance ($-$) |
| **Expense** | Debit | Increases Balance ($+$) | Decreases Balance ($-$) |
| **Liability** | Credit | Decreases Balance ($-$) | Increases Balance ($+$) |
| **Equity** | Credit | Decreases Balance ($-$) | Increases Balance ($+$) |
| **Revenue** | Credit | Decreases Balance ($-$) | Increases Balance ($+$) |

### 3. Chronological Statement Audit Trails (T-Accounts)

When requesting an Account Statement (`/api/v1/accounts/{accountNumber}/statement`), the engine:

1. Queries all splits associated with the targeted account in ascending order of posting timestamp (`PostedAtUtc`).
2. Reconstructs opening and closing balance baselines.
3. Outputs an immutable chronological ledger displaying transaction references, counter-party legs, debit/credit categorizations, and running balance progression after every transaction.

### 4. Precision & Financial Consistency Guarantees

* **Decimal Precision:** All monetary amounts are handled strictly as fixed-point `decimal` (`decimal(18, 4)` in SQL) to prevent floating-point inaccuracies.
* **Atomicity:** Posting a transaction executes within an explicit database transaction (`BEGIN TRANSACTION ... COMMIT`). If balance computation or split insertion fails for any leg, the entire batch rolls back.
* **Immutability:** Posted journal entries and splits cannot be modified or deleted. Adjustments require compensating reversing entries, preserving an auditable history.

---

## Setup & Run Instructions

### Prerequisites

* [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed on the host machine.
* Ports `3000` (Frontend), `8000` (Backend API), and `5432` (PostgreSQL) available.

### 1. Launch with Docker Compose (Recommended)

From the project root directory:

```bash
# Clone repository
git clone https://github.com/SaifullahMnsur-Again/Mini-Transaction-Ledger.git
cd Mini-Transaction-Ledger

# Build and start all services in detached mode
docker compose up --build -d
```

Check the health status of all containers:

```bash
docker compose ps
```

Once running:

* **Web UI:** http://localhost:3000
* **Backend API:** http://localhost:8000/api/v1/accounts
* **PostgreSQL Port:** `localhost:5432` (`POSTGRES_DB=ledger_db`, `POSTGRES_USER=postgres`)

### 2. Manual Local Development Setup (Alternative)

#### Backend (.NET 10)

```bash
cd backend
dotnet restore
dotnet run
```

#### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

---

## API Reference Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/accounts` | Retrieve all accounts in the Chart of Accounts |
| `POST` | `/api/v1/accounts` | Create a new general ledger account |
| `GET` | `/api/v1/accounts/{accountNumber}/statement` | Retrieve chronological statement and running balances for an account |
| `GET` | `/api/v1/accounts/metadata/entry-types` | Fetch entry types metadata (`Debit = 1`, `Credit = 2`) |
| `POST` | `/api/v1/transactions` | Post an atomic, balanced double-entry transaction |
| `GET` | `/api/v1/transactions` | Retrieve all historical journal transactions |
| `GET` | `/api/v1/transactions/{id}` | Inspect a transaction and its ledger legs by ID |

---

## Verification & Testing Workflow

1. Open **http://localhost:3000**.
2. Under **Chart of Accounts**, create at least two accounts (e.g., an **Asset** account `1010-CASH` and an **Equity** account `3010-CAPITAL`).
3. Navigate to **Journal & Transactions**:
* Set `1010-CASH` as the **Debit Leg** and `3010-CAPITAL` as the **Credit Leg**.
* Input amount `50000.00` with description `Initial Shareholder Capital`.
* Observe the live invariant pill validate equilibrium (`Balanced: Dr == Cr`).
* Click **Commit Transaction** to post the entry.


4. Verify the new transaction displays under the **General Ledger Journal Log** below. Click **Inspect ↗** to open the audit modal.
5. Switch to the **Account Statement** tab, select `1010-CASH`, and review the chronological audit trail, KPI cards, and CSV export.