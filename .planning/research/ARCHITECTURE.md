# Architecture Patterns

**Domain:** Multi-entity General Ledger (GL) system for family office accounting
**Researched:** 2026-03-26
**Confidence:** HIGH (double-entry accounting and multi-tenant patterns are well-established; Next.js app structure is mature)

## Recommended Architecture

### High-Level Overview

```
[Browser] --> [Next.js App Router on Vercel]
                  |
                  +-- /app/(auth)       -- Clerk-protected layout
                  |     +-- /dashboard  -- Summary cards, charts
                  |     +-- /entities   -- Entity CRUD
                  |     +-- /accounts   -- Chart of accounts
                  |     +-- /journal    -- Journal entries
                  |     +-- /ledger     -- GL ledger viewer
                  |     +-- /trial-balance
                  |     +-- /periods    -- Period close/reopen
                  |     +-- /settings
                  |
                  +-- /api/v1/          -- REST API (Route Handlers)
                  |     +-- /entities
                  |     +-- /accounts
                  |     +-- /journal-entries
                  |     +-- /ledger
                  |     +-- /trial-balance
                  |     +-- /periods
                  |     +-- /reports
                  |
                  +-- /lib/             -- Shared business logic
                  |     +-- /accounting -- Core GL engine
                  |     +-- /db         -- Prisma client + queries
                  |     +-- /validators -- Zod schemas
                  |
                  +-- [Prisma ORM] --> [PostgreSQL]
```

The architecture follows a **domain-layered monolith** pattern inside Next.js App Router. This is the right call for a solo developer -- no microservices overhead, but clean internal boundaries that could be extracted later if needed.

### Multi-Entity Strategy: Shared Schema with Entity FK

For 5-50 entities, use a **shared database, shared schema** approach where every financial record carries an `entityId` foreign key. This is the correct pattern because:

1. **Consolidated views** are a core feature (querying across entities is a JOIN, not a cross-database call)
2. **Shared chart of accounts templates** become trivial
3. **Single Prisma schema** -- no dynamic schema management
4. **Cost-effective** -- one database, one connection pool

Do NOT use schema-per-tenant or database-per-tenant. Those patterns are for SaaS with thousands of tenants and strict data isolation requirements. Family office accounting with 5-50 entities under one organization does not need that complexity.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Entity Manager** | CRUD for entities (LP, LLC, Corp, Trust), fiscal year config, entity selection state | Accounts, Journal Entries, Periods |
| **Chart of Accounts** | Account CRUD, hierarchical parent/sub-account structure, account numbering, 5-type system | Journal Entries, Ledger, Trial Balance |
| **Journal Entry Engine** | JE creation, line items, debit/credit validation, workflow (Draft/Approved/Posted), reversals | Chart of Accounts, Period Manager, Audit Log |
| **GL Ledger** | Read-only query layer -- transactions for an account with running balance, filtering, pagination | Chart of Accounts, Journal Entry Engine |
| **Trial Balance** | Aggregation query -- all accounts with debit/credit totals for a period, verification check | Chart of Accounts, Journal Entry Engine |
| **Period Manager** | Open/close accounting periods, enforce posting restrictions, year-end close with auto closing entries | Journal Entry Engine, Audit Log |
| **Dashboard** | Aggregation/summary views -- balance cards, charts, period selectors | All read-side components |
| **Audit Log** | Immutable append-only log of all mutations | All write-side components |
| **Auth Layer** | Clerk middleware, user context, organization context | All components (cross-cutting) |
| **API Layer** | REST route handlers, input validation, error handling | All components |

### Data Flow

#### Write Path (Journal Entry Creation)

```
User submits JE form
  --> Client-side Zod validation (debits = credits)
  --> POST /api/v1/journal-entries
  --> Server-side Zod validation (debits = credits, accounts exist, period open)
  --> Prisma transaction:
      1. Create JournalEntry (header)
      2. Create JournalEntryLines (line items)
      3. Update Account balances (denormalized running balance)
      4. Create AuditLog entry
      [All in one DB transaction -- atomicity is non-negotiable]
  --> Return created JE
```

#### Read Path (GL Ledger)

```
User selects account + date range
  --> GET /api/v1/ledger?accountId=X&from=Y&to=Z&entityId=W
  --> Query JournalEntryLines with JOINs to JournalEntry + Account
  --> Compute running balance (window function or application-side)
  --> Paginate (cursor-based for large datasets, offset for simplicity in v1)
  --> Return paginated results
```

#### Read Path (Trial Balance)

```
User selects period
  --> GET /api/v1/trial-balance?entityId=X&asOf=Y
  --> Aggregate query: SUM(debit), SUM(credit) GROUP BY account
  --> Filter to posted entries only, within date range
  --> Verify total debits = total credits
  --> Return account list with balances
```

#### Read Path (Dashboard)

```
User loads dashboard with entity selector
  --> Multiple parallel API calls (or Server Components with parallel data fetching):
      - GET /api/v1/reports/summary?entityId=X&period=Y
      - GET /api/v1/reports/asset-breakdown?entityId=X
      - GET /api/v1/reports/income-vs-expense?entityId=X
  --> Server-side aggregation queries
  --> Return summary data for cards + charts
```

#### Entity Context Flow

```
Entity selector (header dropdown)
  --> Selection stored in localStorage + URL search params
  --> All API calls include entityId (or "all" for consolidated)
  --> Server validates user has access to entity
  --> Queries scoped by entityId WHERE clause (or no filter for "all")
```

## Core Data Model

```
Entity (id, name, type, fiscalYearEnd, createdAt, updatedAt)
  |
  +-- Account (id, entityId, number, name, type, parentId?, isActive, balance, createdAt, updatedAt)
  |     |
  |     +-- JournalEntryLine (id, journalEntryId, accountId, debit, credit, memo)
  |
  +-- JournalEntry (id, entityId, entryNumber, date, description, status, createdById, approvedById?, postedAt?, createdAt, updatedAt)
  |     |
  |     +-- JournalEntryLine (see above -- belongs to both JE and Account)
  |
  +-- AccountingPeriod (id, entityId, year, month, status, closedAt?, closedById?, reopenedAt?, reopenedById?)
  |
  +-- AuditLog (id, entityId, userId, action, tableName, recordId, oldValues?, newValues?, createdAt)
```

**Key design decisions in the data model:**

1. **Decimal precision for money**: Use `Decimal(19,4)` in PostgreSQL. Prisma maps this to `Decimal` type. Never use float.
2. **Denormalized account balance**: Store current balance on Account record, updated within the same transaction as JE posting. This avoids expensive SUM queries for the chart of accounts list view.
3. **Immutable posted entries**: Once a JE is posted, it cannot be edited -- only reversed with a new offsetting JE. This is a fundamental accounting principle.
4. **Soft entity scoping**: Every financial record has `entityId`. No record exists without an entity.
5. **Entry numbering**: Auto-increment per entity (e.g., "JE-001", "JE-002"). Use a sequence or max+1 within a transaction.

## Patterns to Follow

### Pattern 1: Entity-Scoped Queries via Middleware

**What:** Every database query for financial data must be scoped by entityId. Build a helper that enforces this.
**When:** Every API route and Server Component that touches financial data.
**Example:**
```typescript
// lib/db/scoped-query.ts
export function entityScope(entityId: string | "all") {
  if (entityId === "all") return {};
  return { entityId };
}

// Usage in API route
const accounts = await prisma.account.findMany({
  where: {
    ...entityScope(entityId),
    isActive: true,
  },
  orderBy: { number: "asc" },
});
```

### Pattern 2: Transactional JE Posting

**What:** All mutations that affect account balances must happen in a single Prisma `$transaction`.
**When:** Creating, posting, or reversing journal entries.
**Example:**
```typescript
// lib/accounting/post-journal-entry.ts
export async function postJournalEntry(jeId: string) {
  return prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.findUniqueOrThrow({
      where: { id: jeId },
      include: { lines: true },
    });

    // Verify period is open
    const period = await tx.accountingPeriod.findFirst({
      where: {
        entityId: je.entityId,
        year: je.date.getFullYear(),
        month: je.date.getMonth() + 1,
        status: "CLOSED",
      },
    });
    if (period) throw new Error("Cannot post to closed period");

    // Update JE status
    await tx.journalEntry.update({
      where: { id: jeId },
      data: { status: "POSTED", postedAt: new Date() },
    });

    // Update account balances
    for (const line of je.lines) {
      await tx.account.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: line.debit.minus(line.credit),
            // For contra accounts, sign convention handles this
          },
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        entityId: je.entityId,
        action: "POST",
        tableName: "JournalEntry",
        recordId: jeId,
      },
    });
  });
}
```

### Pattern 3: Server Actions for Mutations, Route Handlers for API

**What:** Use Next.js Server Actions for form submissions in the UI. Use Route Handlers (`/api/v1/...`) for the REST API surface.
**When:** Server Actions for internal UI flows. Route Handlers when external clients or the "API-first" requirement matters.
**Why:** Server Actions reduce boilerplate for form handling. Route Handlers fulfill the API-first constraint. Both call the same business logic in `/lib/accounting/`.

```typescript
// lib/accounting/create-journal-entry.ts  <-- shared business logic
export async function createJournalEntry(data: CreateJEInput) { ... }

// app/(auth)/journal/actions.ts  <-- Server Action (UI)
"use server";
import { createJournalEntry } from "@/lib/accounting/create-journal-entry";
export async function createJEAction(formData: CreateJEInput) {
  return createJournalEntry(formData);
}

// app/api/v1/journal-entries/route.ts  <-- Route Handler (API)
import { createJournalEntry } from "@/lib/accounting/create-journal-entry";
export async function POST(req: Request) {
  const data = await req.json();
  return Response.json(await createJournalEntry(data));
}
```

### Pattern 4: Balance Sign Convention

**What:** Use the standard accounting sign convention where debits are positive for Asset/Expense accounts and credits are positive for Liability/Equity/Income accounts.
**When:** Everywhere balances are stored, computed, or displayed.
**Why:** Consistent sign convention prevents bugs in consolidation, trial balance, and financial reports.

```typescript
// lib/accounting/balance.ts
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

const DEBIT_NORMAL: AccountType[] = ["ASSET", "EXPENSE"];
const CREDIT_NORMAL: AccountType[] = ["LIABILITY", "EQUITY", "INCOME"];

export function normalBalance(type: AccountType): "DEBIT" | "CREDIT" {
  return DEBIT_NORMAL.includes(type) ? "DEBIT" : "CREDIT";
}

// When computing balance change from a JE line:
// balance += debit - credit (for debit-normal accounts)
// balance += credit - debit (for credit-normal accounts)
```

### Pattern 5: Prisma Client Singleton (Serverless)

**What:** Use a singleton pattern for Prisma Client to avoid exhausting database connections on Vercel serverless.
**When:** Always -- this is mandatory for serverless deployments.
**Example:**
```typescript
// lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Next.js App Structure

```
src/
  app/
    layout.tsx                    -- Root layout (ClerkProvider, ThemeProvider)
    (auth)/
      layout.tsx                  -- Authenticated layout (sidebar, header, entity selector)
      dashboard/
        page.tsx                  -- Dashboard with summary cards + charts
      entities/
        page.tsx                  -- Entity list
        [entityId]/
          page.tsx                -- Entity detail/edit
        new/
          page.tsx                -- Create entity
      accounts/
        page.tsx                  -- Chart of accounts (tree view)
        [accountId]/
          page.tsx                -- Account detail/edit
        new/
          page.tsx                -- Create account
      journal/
        page.tsx                  -- Journal entry list
        [entryId]/
          page.tsx                -- JE detail/edit
        new/
          page.tsx                -- Create JE
      ledger/
        page.tsx                  -- GL ledger viewer
      trial-balance/
        page.tsx                  -- Trial balance report
      periods/
        page.tsx                  -- Period management (open/close)
      settings/
        page.tsx                  -- App settings
    api/
      v1/
        entities/
          route.ts                -- GET (list), POST (create)
          [entityId]/
            route.ts              -- GET, PUT, DELETE
        accounts/
          route.ts
          [accountId]/
            route.ts
        journal-entries/
          route.ts
          [entryId]/
            route.ts
            post/
              route.ts            -- POST to change status to POSTED
            reverse/
              route.ts            -- POST to create reversing entry
        ledger/
          route.ts                -- GET with query params
        trial-balance/
          route.ts                -- GET with query params
        periods/
          route.ts
          [periodId]/
            close/
              route.ts            -- POST
            reopen/
              route.ts            -- POST
        reports/
          summary/
            route.ts
    (public)/
      sign-in/[[...sign-in]]/
        page.tsx                  -- Clerk sign-in
      sign-up/[[...sign-up]]/
        page.tsx                  -- Clerk sign-up
  components/
    ui/                           -- shadcn/ui components (auto-generated)
    layout/
      sidebar.tsx                 -- Navigation sidebar
      header.tsx                  -- Top bar with entity selector
      entity-selector.tsx         -- Dropdown for entity switching
    accounts/
      account-form.tsx
      account-tree.tsx            -- Hierarchical account display
    journal/
      journal-entry-form.tsx
      line-items-table.tsx        -- Editable debit/credit line items
      journal-entry-status.tsx    -- Status badge + workflow actions
    ledger/
      ledger-table.tsx
      ledger-filters.tsx
    trial-balance/
      trial-balance-table.tsx
    dashboard/
      summary-cards.tsx
      asset-breakdown-chart.tsx
      income-expense-chart.tsx
      equity-trend-chart.tsx
    periods/
      period-grid.tsx
      period-close-dialog.tsx
  lib/
    accounting/
      create-journal-entry.ts
      post-journal-entry.ts
      reverse-journal-entry.ts
      close-period.ts
      reopen-period.ts
      year-end-close.ts
      trial-balance.ts
      balance.ts                  -- Sign convention helpers
    db/
      prisma.ts                   -- Singleton client
      scoped-query.ts             -- Entity scoping helpers
    validators/
      account.ts                  -- Zod schemas for Account
      journal-entry.ts            -- Zod schemas for JE (with debit=credit check)
      entity.ts                   -- Zod schemas for Entity
      period.ts                   -- Zod schemas for Period
    utils/
      currency.ts                 -- Decimal formatting, display
      date.ts                     -- Fiscal year, period helpers
      export.ts                   -- CSV/PDF generation
  hooks/
    use-entity.ts                 -- Entity selection context + localStorage
    use-accounts.ts               -- Account data fetching
    use-journal-entries.ts        -- JE data fetching
  types/
    index.ts                      -- Shared TypeScript types
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Floating Point for Money
**What:** Using JavaScript `number` or PostgreSQL `float` for monetary values.
**Why bad:** `0.1 + 0.2 = 0.30000000000000004`. In accounting, a 1-cent discrepancy fails the trial balance.
**Instead:** Use PostgreSQL `Decimal(19,4)` and Prisma `Decimal` type. Use a library like `decimal.js` for client-side math if needed. Prisma returns `Decimal` objects -- do not cast to `number`.

### Anti-Pattern 2: Editing Posted Journal Entries
**What:** Allowing users to modify a JE after it has been posted.
**Why bad:** Breaks the audit trail. Accounting standards require immutability of posted records.
**Instead:** Create a reversing entry (offsetting JE) and then create a new corrected JE. This preserves the full history.

### Anti-Pattern 3: Computing Balances on Read
**What:** Running `SUM(debit) - SUM(credit)` every time you display an account balance.
**Why bad:** Becomes slow as transaction volume grows. The chart of accounts page would trigger N aggregate queries.
**Instead:** Maintain a denormalized `balance` field on Account, updated within the JE posting transaction. Use the aggregate query only for verification (trial balance) and reconciliation.

### Anti-Pattern 4: Client-Side Only Validation
**What:** Validating debit=credit only in the browser.
**Why bad:** API-first means external clients bypass the UI. A malformed API call could create an unbalanced entry.
**Instead:** Validate at three layers: (1) client-side for UX, (2) Zod schema in API route/Server Action, (3) PostgreSQL CHECK constraint or trigger as the final safety net.

### Anti-Pattern 5: No Entity Scoping on Queries
**What:** Forgetting to filter by `entityId` and accidentally showing data from other entities.
**Why bad:** Data leakage between entities, incorrect balances.
**Instead:** Use the `entityScope()` helper on every query. Consider a Prisma middleware that warns or errors if `entityId` is missing from financial table queries.

### Anti-Pattern 6: Direct Database Mutations Outside Transactions
**What:** Updating account balance in a separate query from creating the JE line.
**Why bad:** If the second query fails, the balance is out of sync with actual entries. Recovering requires manual reconciliation.
**Instead:** Always use `prisma.$transaction()` for any operation that touches multiple tables.

## Serverless Considerations (Vercel)

| Concern | Impact | Mitigation |
|---------|--------|------------|
| **Cold starts** | First request after idle is slower | Prisma singleton pattern, minimal bundle size per route |
| **Connection pooling** | Each serverless function opens a connection; can exhaust DB pool | Use Prisma Accelerate or PgBouncer (Supabase includes this). Set `connection_limit=1` in Prisma datasource for serverless. |
| **Execution timeout** | Vercel Hobby: 10s, Pro: 60s | Year-end close with many accounts could hit this. For v1 with <50 entities, unlikely. Monitor and move to background job if needed. |
| **No persistent state** | Cannot keep in-memory caches across requests | Use PostgreSQL as single source of truth. Denormalized balances on Account table serve as "cache". |
| **Concurrent writes** | Two users posting JEs simultaneously could race on balance update | Prisma `$transaction` with isolation level. PostgreSQL row-level locking handles this. Use `SELECT ... FOR UPDATE` on account rows within the transaction. |

## Scalability Considerations

| Concern | At 3 entities (launch) | At 20 entities | At 50 entities |
|---------|----------------------|----------------|----------------|
| **Data volume** | ~1K JEs/year | ~10K JEs/year | ~25K JEs/year |
| **Query performance** | No concerns | Add indexes on (entityId, date), (accountId, date) | Consider materialized views for trial balance |
| **Connection pool** | 5 connections sufficient | 10 connections | 20 connections, definitely need PgBouncer |
| **Year-end close** | <1s | <5s | Monitor, may need batching |
| **Consolidated view** | Trivial | Add query caching | Pre-compute summaries nightly |

## Suggested Build Order (Dependencies)

This ordering reflects hard dependencies -- each layer requires the one before it.

```
Phase 1: Foundation (must be first)
  1. Prisma schema + DB setup
  2. Clerk auth integration
  3. App shell (layout, sidebar, entity selector)
  4. Entity CRUD

Phase 2: Core Accounting Engine (depends on Foundation)
  5. Chart of Accounts (depends on Entity)
  6. Journal Entry creation + validation (depends on Accounts)
  7. JE workflow: Draft -> Approved -> Posted (depends on JE creation)
  8. Reversing entries (depends on JE posting)

Phase 3: Read Views (depends on Core Engine)
  9. GL Ledger viewer (depends on posted JEs)
  10. Trial Balance (depends on posted JEs + Accounts)
  11. Period close/reopen (depends on JE posting)

Phase 4: Dashboard + Polish (depends on Read Views)
  12. Dashboard summary cards (depends on Accounts + JEs)
  13. Dashboard charts (depends on summary queries)
  14. CSV/PDF export (depends on Ledger + Trial Balance)
  15. Mobile responsiveness
```

**Rationale:** You cannot build journal entries without accounts. You cannot build the ledger without journal entries. You cannot build the dashboard without data to summarize. This ordering ensures each phase produces a testable, usable increment.

## Sources

- Prisma documentation on serverless deployment and connection management (training data, MEDIUM confidence)
- ERPNext GL architecture patterns (referenced in PROJECT.md as inspiration, training data)
- Double-entry accounting standards (GAAP principles, HIGH confidence -- these are stable and well-established)
- Next.js App Router conventions (training data, HIGH confidence -- well-documented patterns)
- PostgreSQL decimal precision best practices for financial systems (training data, HIGH confidence)
