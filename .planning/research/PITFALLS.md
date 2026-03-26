# Domain Pitfalls

**Domain:** Multi-entity General Ledger / Double-Entry Accounting System
**Project:** Frontier GL
**Researched:** 2026-03-26
**Confidence:** HIGH (accounting system design patterns are well-established; Prisma/PostgreSQL specifics verified against known constraints)

---

## Critical Pitfalls

Mistakes that cause data corruption, rewrites, or fundamental trust loss in a financial system.

---

### Pitfall 1: Floating-Point Money Storage

**What goes wrong:** Using `Float` or JavaScript `number` types for monetary values introduces rounding errors. A $100.10 + $200.20 calculation can yield $300.30000000000004. Over thousands of transactions these errors compound, trial balances fail to reconcile, and the system becomes untrustworthy.

**Why it happens:** JavaScript only has IEEE 754 floats. Prisma's `Float` maps to `double precision` in PostgreSQL. Developers default to these familiar types without understanding the financial implications.

**Consequences:** Trial balance never balances to zero. Penny discrepancies accumulate. Accountant loses trust in the entire system. Retroactive fix requires recomputing every balance.

**Warning signs:**
- Trial balance shows tiny residual (e.g., $0.0000001)
- Account balances don't match when summed vs. stored
- Rounding differences between server and client calculations

**Prevention:**
- Use Prisma `Decimal` type which maps to PostgreSQL `NUMERIC` -- exact precision, no rounding
- Store all money as `Decimal(19,4)` -- 19 digits total, 4 decimal places (standard for accounting)
- Use a library like `decimal.js` or `Prisma.Decimal` on the server side -- never do money math with native JS numbers
- On the client, pass money as strings through the API, convert only for display
- Add a database CHECK constraint: `debit >= 0 AND credit >= 0`

**Detection:** Write a test that sums 10,000 line items and verifies exact balance. If it drifts by even 0.01, the money type is wrong.

**Phase:** Phase 1 (schema design) -- must be correct from the very first migration. Changing money types later requires rewriting every row.

---

### Pitfall 2: Debit/Credit Balance Enforcement Only in Application Code

**What goes wrong:** The double-entry invariant (sum of debits = sum of credits for every journal entry) is enforced only in the API handler or form validation, not in the database. A bug, a direct SQL fix, a migration script, or a race condition bypasses the check and inserts an unbalanced entry. Once one unbalanced entry exists, the entire GL is suspect.

**Why it happens:** Developers think "I validate in my API, that's enough." They underestimate the number of code paths that can write to the database: migrations, admin scripts, bulk imports, Prisma Studio, direct SQL.

**Consequences:** Unbalanced journal entry corrupts the ledger. Trial balance fails. Every downstream report is wrong. Finding and fixing the bad entry in a large dataset is painful.

**Warning signs:**
- Trial balance doesn't balance but all entries "look correct"
- Discrepancies appear after a data migration or manual fix

**Prevention:**
- Create a PostgreSQL trigger or CHECK constraint that fires on INSERT to `JournalEntryLine` and verifies `SUM(debit) = SUM(credit)` for the parent journal entry
- Alternatively, use a database trigger on the journal entry table that runs after all lines are inserted (deferred constraint)
- The Prisma approach: use `$transaction()` for all journal entry creation, and add a raw SQL trigger as a safety net
- Example trigger pattern:

```sql
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit NUMERIC(19,4);
  total_credit NUMERIC(19,4);
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: debits=% credits=%',
      NEW.journal_entry_id, total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

- ALSO validate in application code (defense in depth), but never rely on it alone

**Detection:** Run a periodic reconciliation query: `SELECT journal_entry_id FROM journal_entry_lines GROUP BY journal_entry_id HAVING SUM(debit) != SUM(credit)`. This should always return zero rows.

**Phase:** Phase 1 (schema + migration) -- the trigger should be in the initial migration alongside the tables.

---

### Pitfall 3: Mutable Posted Journal Entries

**What goes wrong:** The system allows editing or deleting journal entries that have been posted. An accountant "fixes" a posted entry by changing the amounts. The audit trail is broken -- there's no record of what the original entry was. Financial statements for prior periods silently change.

**Why it happens:** It feels user-friendly to let people edit their mistakes. Developers unfamiliar with accounting don't realize that immutability of posted entries is a fundamental accounting principle, not a nice-to-have.

**Consequences:** Audit trail is destroyed. Prior-period financial statements become unreliable. If the system is ever audited (tax, legal, investor due diligence), mutable entries are a disqualifying finding.

**Warning signs:**
- UPDATE statements against posted journal entries in the codebase
- No reversing entry workflow
- Accountant reports "I fixed it" instead of "I reversed and re-entered it"

**Prevention:**
- Database-level protection: add a trigger that prevents UPDATE or DELETE on journal entries where `status = 'POSTED'`
- Application-level: the only way to "correct" a posted entry is to create a reversing entry (equal and opposite) and then create a new correct entry
- Draft entries CAN be edited freely -- only posted entries are immutable
- Provide a one-click "Reverse" action that auto-creates the offsetting entry

```sql
CREATE OR REPLACE FUNCTION prevent_posted_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'POSTED' THEN
    RAISE EXCEPTION 'Cannot modify or delete a posted journal entry. Create a reversing entry instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_posted_edit
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_posted_mutation();
```

**Detection:** Grep codebase for any UPDATE/DELETE on journal entries that doesn't filter by `status != 'POSTED'`.

**Phase:** Phase 1 (core journal entry feature) -- build reversal workflow from day one instead of edit-in-place.

---

### Pitfall 4: Missing or Broken Entity Isolation (Multi-Tenancy Leaks)

**What goes wrong:** In a multi-entity system, queries forget the `WHERE entity_id = ?` filter. Account A from Entity X appears in Entity Y's trial balance. Or worse, a journal entry references accounts from two different entities, creating a cross-entity imbalance.

**Why it happens:** Every single query, every single API endpoint, every single report must include entity scoping. It only takes one missed filter to leak data. With 20+ entities, this is especially dangerous because the system "mostly works" -- the leak is subtle.

**Consequences:** Wrong financial data shown for an entity. Consolidated views double-count or miss transactions. Cross-entity journal entries that create phantom balances. Complete loss of trust.

**Warning signs:**
- Trial balance totals don't match between entity view and consolidated view
- Accounts appear in entity selector that don't belong to that entity
- Running balances differ when viewing same account from different entity contexts

**Prevention:**
- Add `entity_id` as a required foreign key on EVERY financial table: `accounts`, `journal_entries`, `journal_entry_lines`, `periods`, `balances`
- Create a Prisma middleware or utility function that automatically injects `entity_id` into every query -- never rely on individual developers remembering
- Add a database constraint: journal entry lines can only reference accounts that belong to the same entity as the journal entry
- Pattern: create a `scopedPrisma(entityId)` wrapper that adds the filter to all queries

```typescript
// Every financial query MUST go through this
function scopedQuery(entityId: string) {
  return {
    where: { entityId },
  };
}
```

- Add a CHECK constraint or trigger: all `journal_entry_lines.account_id` must reference an account with the same `entity_id` as the parent `journal_entry.entity_id`
- Write integration tests that create data in Entity A and verify it NEVER appears when querying Entity B

**Detection:** Write a test that creates entries in two entities, then queries each entity and asserts zero cross-contamination.

**Phase:** Phase 1 (schema design + middleware) -- entity isolation must be foundational, not bolted on.

---

### Pitfall 5: Period Close That Doesn't Actually Prevent Posting

**What goes wrong:** The period close feature sets a flag (`is_closed = true`) but the journal entry creation endpoint doesn't check it. Or it checks at the application layer but not in the database, so direct SQL or a race condition allows posting to a closed period.

**Why it happens:** Period close is often built as a UI feature (hide the button) rather than a data integrity constraint. The developer thinks "the UI won't let them" but forgets about API calls, scripts, and race conditions.

**Consequences:** Transactions posted to closed periods. Financial statements that were "final" silently change. Year-end close entries are invalidated.

**Warning signs:**
- Closed period check is only in a React component, not in the API
- No database-level constraint on posting date vs. closed periods
- Accountant reports balances changed after period close

**Prevention:**
- Store closed periods in a `periods` table with `entity_id`, `year`, `month`, `is_closed`
- Add a database trigger on journal entry INSERT that checks: the posting date's period must not be closed for that entity
- Also check in the API handler (defense in depth)
- Period reopen must require admin role and create an audit log entry

```sql
CREATE OR REPLACE FUNCTION check_period_open()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM periods
    WHERE entity_id = NEW.entity_id
      AND year = EXTRACT(YEAR FROM NEW.posting_date)
      AND month = EXTRACT(MONTH FROM NEW.posting_date)
      AND is_closed = true
  ) THEN
    RAISE EXCEPTION 'Cannot post to closed period %-%',
      EXTRACT(YEAR FROM NEW.posting_date),
      EXTRACT(MONTH FROM NEW.posting_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Detection:** Write a test that closes a period, then attempts to insert a journal entry via Prisma `$executeRaw` (bypassing app logic). It must fail.

**Phase:** Phase 1 (period management feature) -- must be enforced at DB layer from the start.

---

### Pitfall 6: Computing Balances On-The-Fly Without Caching

**What goes wrong:** Every time the trial balance, dashboard, or account ledger loads, the system runs `SELECT SUM(debit) - SUM(credit) FROM journal_entry_lines WHERE account_id = ?`. With thousands of entries per account, this becomes painfully slow. The dashboard takes 10+ seconds. Reports time out on Vercel's serverless functions (which have execution time limits).

**Why it happens:** It's the simplest correct approach and works fine with 100 entries. Developers don't anticipate that a family office with 10 entities and 3 years of data can easily have 50,000+ line items.

**Consequences:** Slow dashboard and reports. Vercel serverless function timeouts (10s on hobby, 60s on pro). Unresponsive UI leads to user abandonment.

**Warning signs:**
- Dashboard load time exceeds 2 seconds
- Trial balance query takes longer as months pass
- Vercel function logs show timeout errors

**Prevention:**
- Use a **materialized balance** pattern: maintain a `account_balances` table with `entity_id`, `account_id`, `period_year`, `period_month`, `debit_total`, `credit_total`, `balance`
- Update this table whenever a journal entry is posted (via database trigger or application logic inside the same transaction)
- Trial balance reads from this pre-computed table -- O(n) on accounts, not on transactions
- Keep the SUM query as a verification tool (run nightly or on-demand to verify materialized balances match)
- For Vercel specifically: the hobby tier has a 10-second function timeout. Any query that scans all transactions WILL hit this limit at scale

**Detection:** Monitor query execution time. If any financial query exceeds 500ms with test data of 10,000 entries, the architecture needs materialized balances.

**Phase:** Phase 1 (design decision) -- the balance table should be in the initial schema. Retrofitting materialized balances after building reports on raw SUMs requires rewriting every query.

---

### Pitfall 7: Year-End Close That Loses Data

**What goes wrong:** The year-end close process zeroes out revenue and expense accounts by either deleting transactions or creating a single closing entry without preserving the detail. After close, there's no way to see what happened in the prior year. Or the closing entry amount is wrong because it was calculated from cached balances that were stale.

**Why it happens:** Year-end close is conceptually simple (zero out temporaries, move net to retained earnings) but the implementation has many edge cases: partial-year entities, entities with different fiscal year ends, reopening a closed year.

**Consequences:** Prior-year detail is lost. Net income carried to retained earnings is wrong. Reopening a year requires manual recalculation.

**Warning signs:**
- Year-end close deletes transactions instead of creating offsetting entries
- Closing entry amounts don't match the sum of revenue/expense for the year
- No way to view prior-year transactions after close

**Prevention:**
- Year-end close creates explicit closing journal entries (one per revenue/expense account), debiting/crediting each account to zero and posting the net to Retained Earnings
- These closing entries are regular journal entries with a special `entry_type = 'CLOSING'` flag -- they are visible and auditable
- NEVER delete or modify existing entries during year-end close
- Calculate closing amounts from raw transaction sums (not cached balances) within a single transaction
- Support different fiscal year ends per entity (the `entity.fiscal_year_end` field)
- Test edge case: entity created mid-year with only 6 months of data

**Detection:** After year-end close, verify: (1) all revenue/expense accounts have zero balance for the closed year, (2) retained earnings increased by exactly the net income amount, (3) all original transactions are still visible.

**Phase:** Phase 1 (period close feature) -- but can be implemented after basic journal entries and trial balance are working. This is one of the last Phase 1 features.

---

## Moderate Pitfalls

---

### Pitfall 8: Account Numbering Collisions Across Entities

**What goes wrong:** The chart of accounts uses globally unique account numbers. Entity A has account 1000 (Cash) and Entity B also needs 1000 (Cash). The system rejects it as a duplicate, forcing awkward numbering schemes like "A-1000" and "B-1000".

**Prevention:**
- Account numbers must be unique per entity, not globally: `UNIQUE(entity_id, account_number)`
- Each entity gets its own independent chart of accounts with its own numbering
- For consolidated views, display as "Entity Name - Account Number - Account Name"
- Consider a template CoA that can be cloned when creating a new entity

**Phase:** Phase 1 (schema design) -- the unique constraint definition.

---

### Pitfall 9: Prisma Decimal Serialization Gotcha

**What goes wrong:** Prisma returns `Decimal` fields as `Prisma.Decimal` objects, not JavaScript numbers. When these are serialized to JSON for the API response, they become strings like `"1234.5600"`. The frontend receives strings instead of numbers, comparisons break, and arithmetic in React components fails silently.

**Prevention:**
- Establish a consistent serialization strategy from day one
- In API responses, serialize Decimals as strings (this is correct -- JSON has no decimal type)
- On the frontend, use a helper to convert: `parseFloat(value)` for display, but NEVER do arithmetic on the client with parsed floats
- All financial arithmetic must happen server-side with `Prisma.Decimal` or `decimal.js`
- Create a shared type/utility: `formatMoney(value: string): string` for display
- Test serialization: write an integration test that creates a journal entry with `$1234.56`, fetches it via API, and verifies the response format

**Phase:** Phase 1 (API layer) -- establish the pattern with the very first endpoint that returns money.

---

### Pitfall 10: Consolidated View Double-Counting

**What goes wrong:** The "All Entities" consolidated view sums balances across entities but doesn't handle intercompany transactions. Entity A owes Entity B $50,000. In the consolidated view, this shows as both a receivable (Entity A) and a payable (Entity B), inflating the balance sheet by $50,000.

**Prevention:**
- For Phase 1 (no intercompany): the consolidated view is a simple sum across entities, which is acceptable because intercompany transactions are out of scope
- Document this limitation clearly in the UI: "Consolidated view does not eliminate intercompany balances"
- When intercompany is added (Phase 2), implement elimination entries that zero out intercompany receivables/payables in consolidated views
- Design the schema now to support future intercompany elimination: include a `counterparty_entity_id` nullable field on journal entries

**Phase:** Phase 2 (intercompany transactions) -- but the schema should accommodate it in Phase 1 by including the nullable field.

---

### Pitfall 11: No Audit Trail From Day One

**What goes wrong:** The system tracks "who created" but not "who approved," "who posted," "when was it modified," or "what was the previous value." Three months in, the accountant needs to know who approved a suspicious entry and there's no record.

**Prevention:**
- Every journal entry stores: `created_by`, `created_at`, `approved_by`, `approved_at`, `posted_by`, `posted_at`
- Create an `audit_log` table that records every state change: `entity_id`, `table_name`, `record_id`, `action` (CREATE/UPDATE/DELETE/APPROVE/POST/REVERSE), `user_id`, `timestamp`, `old_values` (JSON), `new_values` (JSON)
- Log period close/reopen events
- This table is append-only -- no updates or deletes allowed (enforce via trigger)
- Prisma middleware can automatically log changes

**Phase:** Phase 1 (foundational) -- the audit log table and logging middleware should be in the initial schema.

---

### Pitfall 12: Vercel Serverless Cold Start + Heavy Queries

**What goes wrong:** Vercel serverless functions cold-start in 200-500ms. Combined with Prisma's own connection overhead and a heavy trial balance query, the first request after idle can take 5-8 seconds. Accountants clicking "Trial Balance" wait too long and retry, potentially causing duplicate submissions.

**Prevention:**
- Use Prisma Accelerate or PgBouncer for connection pooling -- raw Prisma connections in serverless = connection exhaustion
- Pre-compute balances (see Pitfall 6) so queries are fast even on cold start
- Use Vercel's `maxDuration` config to extend timeout for financial report endpoints
- Implement optimistic UI: show loading states immediately, prevent double-submission
- Consider Vercel cron jobs for pre-warming if cold starts become a real issue
- Set `DATABASE_URL` to a connection pooler URL (Supabase provides this out of the box with their pgbouncer port 6543)

**Phase:** Phase 1 (deployment configuration) -- set up connection pooling before going live.

---

### Pitfall 13: Running Balance Calculation Order Ambiguity

**What goes wrong:** The GL ledger shows a "running balance" column. But when two journal entries have the same date, the running balance depends on which one comes first. Different sort orders produce different running balances, confusing the accountant.

**Prevention:**
- Always sort by `(posting_date, created_at, id)` -- the tiebreaker must be deterministic
- Document the sort order in the UI (e.g., "Sorted by date, then entry order")
- Store a sequence number on journal entries (auto-incrementing per entity) to provide an unambiguous ordering
- Running balance = opening balance + cumulative sum of (debits - credits) in sort order

**Phase:** Phase 1 (GL ledger feature) -- must be decided before building the ledger viewer.

---

## Minor Pitfalls

---

### Pitfall 14: Chart of Accounts Hierarchy Performance

**What goes wrong:** Parent/sub-account hierarchy is modeled as a simple `parent_id` self-reference. Computing a parent account's balance requires recursive queries to sum all children. With 3+ levels of nesting, this becomes slow and complex.

**Prevention:**
- For Phase 1 with 2-3 levels of hierarchy, recursive CTEs in PostgreSQL are fine
- If hierarchy gets deeper, consider a materialized path pattern: store `path` as `"1000.1010.1011"` for fast subtree queries
- Keep hierarchy shallow (max 3-4 levels) -- this matches accounting convention

**Phase:** Phase 1 (chart of accounts) -- the simple self-reference is fine for v1, but design the schema to support materialized paths later.

---

### Pitfall 15: CSV/PDF Export Timeout on Large Datasets

**What goes wrong:** Exporting a full-year GL ledger to CSV or PDF runs as a serverless function. With 10,000+ rows, the function times out before the export completes.

**Prevention:**
- Stream CSV exports (don't build the entire file in memory)
- For PDF, consider client-side generation (using a library like `jsPDF` or `@react-pdf/renderer`) to offload from the server
- Paginate exports: allow exporting a date range rather than "everything"
- Set appropriate `maxDuration` for export endpoints in `vercel.json`

**Phase:** Phase 1 (export feature) -- design with streaming in mind, but this only becomes a real issue at scale.

---

### Pitfall 16: localStorage Entity Selection Desync

**What goes wrong:** The selected entity is stored in localStorage. The user has two browser tabs open. They switch entities in Tab A. Tab B still shows the old entity. They create a journal entry in Tab B -- it goes to the wrong entity.

**Prevention:**
- Include `entity_id` as a required field in every API request body -- never infer it from localStorage on the server
- The server must validate that the user has access to the specified entity
- localStorage is only for UI convenience (pre-selecting the dropdown), not for data routing
- Consider using the BroadcastChannel API to sync entity selection across tabs

**Phase:** Phase 1 (entity selector) -- enforce entity_id in API requests from the first endpoint.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema Design | Wrong money type (Float instead of Decimal) | Use `Decimal(19,4)` from first migration |
| Schema Design | Globally unique account numbers | `UNIQUE(entity_id, account_number)` |
| Schema Design | No entity_id on financial tables | Add to every table, add FK constraints |
| Journal Entries | Mutable posted entries | DB trigger to prevent, build reversal workflow |
| Journal Entries | Balance check only in app code | DB trigger + app validation (defense in depth) |
| Trial Balance | On-the-fly SUM queries | Materialized balance table from day one |
| Period Close | UI-only enforcement | DB trigger on posting date vs closed periods |
| Year-End Close | Data loss or wrong closing amounts | Explicit closing JEs, calculate from raw data |
| GL Ledger | Ambiguous running balance sort | Deterministic sort: date + created_at + id |
| Deployment | Serverless timeouts on queries | Connection pooling + materialized balances |
| API Design | Decimal serialization surprises | Strings in JSON, arithmetic only server-side |
| Multi-Entity | Cross-entity data leaks | Middleware-level entity scoping, integration tests |
| Exports | Timeout on large exports | Streaming CSV, client-side PDF |
| Entity Selector | localStorage desync across tabs | Entity ID in every API request body |
| Audit Trail | Missing change history | Append-only audit_log table from day one |
| Consolidated View | Intercompany double-counting | Document limitation in Phase 1, schema prep for Phase 2 |

---

## Sources

- Accounting system design: based on established double-entry bookkeeping principles (Pacioli's method, GAAP requirements for audit trails and period close)
- Prisma Decimal handling: known behavior documented in Prisma ORM documentation for PostgreSQL Decimal/Numeric types
- Vercel serverless constraints: Vercel platform documentation on function timeouts and cold starts
- PostgreSQL trigger patterns: standard PostgreSQL PL/pgSQL documentation
- ERPNext GL module, BLNK ledger, Django Ledger: open-source accounting system patterns (referenced in PROJECT.md)
- Connection pooling for serverless: established pattern for Prisma + Vercel deployments using PgBouncer or Prisma Accelerate

**Confidence note:** These pitfalls are drawn from well-established accounting system design principles and known Prisma/Vercel/PostgreSQL behaviors. The accounting domain is stable -- these same pitfalls have been documented across decades of GL system development. Confidence is HIGH for all critical and moderate pitfalls.
