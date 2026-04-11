# Phase 9: Bank Transactions -- Import & Plaid Integration - Research

**Researched:** 2026-04-11
**Domain:** Bank transaction import (CSV + Plaid API), categorization rules, JE creation from transactions
**Confidence:** HIGH

## Summary

Phase 9 adds the ability to import bank transactions via CSV upload or Plaid bank feed, review/categorize them in a queue, and post them as journal entries. The core technical challenge is threefold: (1) robust CSV parsing for bank statements with variable column layouts, (2) Plaid API integration with secure token storage and cursor-based sync, and (3) a categorization rules engine with substring matching that auto-applies to incoming transactions.

The project already has PapaParse installed (v5.5.3) for CSV parsing, established CSV import patterns (JE import and budget import routes), and a full reconciliation data model (`BankReconciliation` + `BankReconciliationLine`). The Plaid integration requires two new npm packages (`plaid` and `react-plaid-link`), new Prisma models for transactions and Plaid connections, and a Vercel cron job for daily sync. The existing SubledgerItem model with `itemType: BANK_ACCOUNT` provides the natural anchor point for Plaid connections.

**Primary recommendation:** Build in three waves -- (1) schema + CSV import + transaction queue UI, (2) Plaid Link integration + sync, (3) categorization rules engine + auto-apply. Use PapaParse for CSV parsing, the official `plaid` SDK (v41.4.0) for server-side API calls, and `react-plaid-link` (v4.1.1) for the Link widget.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dual interface:** Inbox-style queue page for unreviewed transactions AND inline display on the bank account's subledger/reconciliation page (both views into the same data)
- **Bulk actions:** Checkboxes on each row. Select multiple transactions, assign the same account, post in one click
- **JE creation mode:** CFO can choose per-transaction (or per-batch) whether to post immediately or save as draft
- **Splits:** A single transaction can be split across multiple GL accounts (e.g., $500 Amazon = $300 Office Supplies + $200 Computer Equipment)
- **Connect flow:** "Connect Bank Feed" button on the existing Holdings > Bank Account subledger page. Opens Plaid Link widget. Each subledger bank account can have a Plaid connection
- **Sync frequency:** Daily automatic sync via cron + manual "Sync Now" button anytime
- **Environment:** Production Plaid API from day one (no sandbox phase)
- **Scope:** Bank connections are org-wide (visible across entities), not entity-scoped
- **Plaid product:** Use Transactions API (not Transfer) for pulling bank transaction data
- **Rule creation:** Two paths -- (1) prompt when CFO categorizes a transaction ("Always categorize AMAZON as Office Supplies?"), (2) dedicated rules management page for viewing/editing/deleting rules
- **Matching logic:** Description substring match (case-insensitive) AND optional amount range. E.g., "PAYROLL" between $5000-$10000 -> Payroll Expense
- **Rule scope:** Rules assign both GL account AND optional dimension tags. E.g., "PROPERTY MGMT" -> Property Expense + tag "123 Main St"
- **Replaces existing flow:** New transaction import + categorization becomes the primary bank data workflow. Existing manual reconciliation page becomes secondary/deprecated
- **No auto-reconcile:** Even though a JE was created from a bank transaction, it still requires manual reconciliation in the recon flow. The transaction import and reconciliation remain distinct steps

### Claude's Discretion
- Duplicate detection algorithm (external ID from Plaid, or hash of amount+date+description for CSV)
- Transaction queue page layout and filter/sort options
- Plaid webhook vs polling for daily sync implementation
- Error handling for failed Plaid connections or expired tokens
- CSV parser column mapping (auto-detect vs user-specified)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BANK-01 | User can upload a bank statement CSV; system parses transactions into a review queue | PapaParse already installed; CSV import pattern from JE/budget imports; new BankTransaction model stores parsed rows |
| BANK-02 | User can connect a bank account via Plaid Link; transactions sync automatically on a schedule | `plaid` SDK (v41.4.0) + `react-plaid-link` (v4.1.1); PlaidConnection model; Vercel cron for daily sync; cursor-based transactionsSync API |
| BANK-03 | User can categorize transactions (assign GL account) and post them as journal entries | Transaction queue UI with account combobox; JE creation follows existing pattern with generateNextEntryNumber; split support via multi-line JE |
| BANK-04 | Categorization rules auto-apply to matching transactions based on description patterns | CategorizationRule model with pattern/amountMin/amountMax; case-insensitive ILIKE substring match; applied at import time |
| BANK-05 | Duplicate detection prevents re-importing the same transaction (by external ID or amount+date+description hash) | Plaid: use transaction_id as externalId; CSV: SHA-256 hash of date+amount+description; unique constraint on externalId per subledger item |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| plaid | 41.4.0 | Server-side Plaid API client | Official Plaid Node.js SDK; TypeScript types built-in; supports transactionsSync cursor-based API |
| react-plaid-link | 4.1.1 | Client-side Plaid Link widget | Official React bindings; usePlaidLink hook; supports React 19 (peer dep ^19) |
| papaparse | 5.5.3 | CSV parsing | Already installed in project; auto-detects delimiters; header: true returns objects |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Schema validation for CSV rows, API inputs, categorization rules | All input validation |
| @tanstack/react-table | 8.21.3 | Transaction queue table with sorting, filtering, bulk selection | Queue page and inline subledger view |
| sonner | 2.0.7 | Toast notifications for import results, sync status | All user feedback |
| date-fns | 4.1.0 | Date formatting and parsing for transaction dates | Display and CSV date parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse | Custom CSV parser (existing JE import pattern) | PapaParse handles edge cases (quoted fields, escaped commas, encoding); already installed; bank CSVs are messy |
| Vercel Cron | Plaid webhooks for SYNC_UPDATES_AVAILABLE | Webhooks are more real-time but require verification, public endpoint, and fallback polling anyway. Cron is simpler for daily sync and already decided by user |
| SHA-256 hash for CSV dedup | Simple string concat | Hash is more collision-resistant and fixed-length for indexing |

**Installation:**
```bash
npm install plaid react-plaid-link
```

**Environment Variables (new):**
```env
# Plaid
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
NEXT_PUBLIC_PLAID_ENV=production

# Vercel Cron
CRON_SECRET=...
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (auth)/
      bank-feed/                     # Transaction queue page (new nav item)
        page.tsx                     # Inbox-style unreviewed transaction queue
      bank-feed/rules/
        page.tsx                     # Categorization rules management
    api/
      entities/[entityId]/
        bank-transactions/
          route.ts                   # GET list, POST import CSV
          [transactionId]/
            route.ts                 # PATCH categorize, POST create JE
          bulk-categorize/
            route.ts                 # POST bulk assign account + post
          rules/
            route.ts                 # GET/POST categorization rules
            [ruleId]/
              route.ts              # PATCH/DELETE individual rule
      plaid/
        create-link-token/
          route.ts                  # POST create Plaid link token
        exchange-token/
          route.ts                  # POST exchange public_token for access_token
        sync/
          route.ts                  # POST trigger manual sync for a connection
      cron/
        plaid-sync/
          route.ts                  # GET daily cron job endpoint
  lib/
    plaid/
      client.ts                     # PlaidApi client singleton
      sync.ts                       # transactionsSync cursor-based loop
    bank-transactions/
      csv-parser.ts                 # PapaParse + column auto-detection
      duplicate-check.ts            # Hash generation + duplicate lookup
      categorize.ts                 # Rule matching engine
      create-je.ts                  # Transaction -> JournalEntry creation
  validators/
    bank-transaction.ts             # Zod schemas for transaction, rule, CSV row
prisma/
  schema.prisma                     # New models: BankTransaction, PlaidConnection, CategorizationRule
```

### Pattern 1: Plaid Connection Flow
**What:** Server creates link_token -> client opens Link widget -> client sends public_token -> server exchanges for access_token -> server stores encrypted access_token
**When to use:** When user clicks "Connect Bank Feed" on a bank account's subledger page

```typescript
// Server: POST /api/plaid/create-link-token
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'production'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

// Create link token
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: userId },
  client_name: 'Frontier GL',
  products: [Products.Transactions],
  country_codes: [CountryCode.Us],
  language: 'en',
  webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
});
return response.data.link_token;
```

```typescript
// Client: usePlaidLink hook on Holdings page
import { usePlaidLink } from 'react-plaid-link';

const { open, ready } = usePlaidLink({
  token: linkToken,  // fetched from create-link-token API
  onSuccess: async (publicToken, metadata) => {
    await fetch('/api/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({
        publicToken,
        subledgerItemId,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
        accountId: metadata.accounts[0]?.id, // Plaid account_id
      }),
    });
  },
});
```

### Pattern 2: Cursor-Based Transaction Sync
**What:** Fetch all new/modified/removed transactions since last cursor using transactionsSync
**When to use:** Daily cron job AND manual "Sync Now" button

```typescript
// lib/plaid/sync.ts
async function syncTransactions(connection: PlaidConnection) {
  let cursor = connection.syncCursor; // null on first sync
  let added: Transaction[] = [];
  let modified: Transaction[] = [];
  let removed: RemovedTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: connection.accessToken, // decrypted
      cursor: cursor || undefined,
      count: 500,
    });

    added = added.concat(response.data.added);
    modified = modified.concat(response.data.modified);
    removed = removed.concat(response.data.removed);
    hasMore = response.data.has_more;
    cursor = response.data.next_cursor;
  }

  // Process all at once (Plaid best practice: collect all pages before persisting)
  // Then update connection.syncCursor = cursor
  return { added, modified, removed, cursor };
}
```

**CRITICAL:** Plaid requires collecting ALL pages before persisting. If a `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` error occurs, restart the entire loop from the original cursor.

### Pattern 3: CSV Column Auto-Detection
**What:** Parse bank CSV with PapaParse, then auto-detect which columns map to date/description/amount
**When to use:** CSV upload for bank statement import

```typescript
// lib/bank-transactions/csv-parser.ts
import Papa from 'papaparse';

const COLUMN_PATTERNS = {
  date: ['date', 'posted date', 'transaction date', 'post date', 'posting date'],
  description: ['description', 'memo', 'narrative', 'details', 'payee', 'name'],
  amount: ['amount', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'debit amount'],
  credit: ['credit', 'deposit', 'credit amount'],
  reference: ['reference', 'ref', 'check number', 'check no', 'reference number'],
};

function detectColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(h => h.toLowerCase().trim());
  const mapping: Partial<ColumnMapping> = {};

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const idx = normalized.findIndex(h => patterns.includes(h));
    if (idx !== -1) mapping[field] = idx;
  }

  return mapping;
}

export function parseBankCsv(csvText: string) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: false });
  const mapping = detectColumns(parsed.meta.fields || []);
  // Map rows using detected columns
}
```

### Pattern 4: Categorization Rule Matching
**What:** Apply rules to incoming transactions based on case-insensitive description substring + optional amount range
**When to use:** After CSV import or Plaid sync, before showing transactions in queue

```typescript
// lib/bank-transactions/categorize.ts
function matchRule(transaction: BankTransaction, rules: CategorizationRule[]): CategorizationRule | null {
  for (const rule of rules) {
    // Case-insensitive description substring match
    if (!transaction.description.toLowerCase().includes(rule.pattern.toLowerCase())) {
      continue;
    }
    // Optional amount range check
    const absAmount = Math.abs(Number(transaction.amount));
    if (rule.amountMin !== null && absAmount < Number(rule.amountMin)) continue;
    if (rule.amountMax !== null && absAmount > Number(rule.amountMax)) continue;

    return rule; // First matching rule wins
  }
  return null;
}
```

### Pattern 5: Transaction -> Journal Entry Creation
**What:** Create a double-entry JE from a categorized bank transaction
**When to use:** When user clicks "Post" or bulk-posts categorized transactions

```typescript
// Debit the categorized account (e.g., Office Supplies), credit the bank account
// For splits: multiple debit lines, one credit line summing to transaction amount
// Uses existing generateNextEntryNumber + JournalEntryAudit pattern

const je = await tx.journalEntry.create({
  data: {
    entityId,
    entryNumber: await generateNextEntryNumber(tx, entityId),
    date: new Date(transaction.date),
    description: transaction.description,
    status: postImmediately ? 'POSTED' : 'DRAFT',
    createdBy: userId,
    postedBy: postImmediately ? userId : null,
    postedAt: postImmediately ? new Date() : null,
    lineItems: {
      create: [
        // Debit: categorized account (or split lines)
        ...debitLines,
        // Credit: bank account (the subledger item's linked GL account)
        { accountId: bankAccountId, credit: transactionAmount, debit: 0, sortOrder: debitLines.length },
      ],
    },
  },
});

// Link transaction to JE
await tx.bankTransaction.update({
  where: { id: transaction.id },
  data: { journalEntryId: je.id, status: 'POSTED' },
});
```

### Anti-Patterns to Avoid
- **Storing Plaid access_token in plaintext:** Encrypt with AES-256 before DB storage. At minimum use a separate column that is never returned in API responses
- **Syncing transactions one-by-one during pagination:** Plaid requires collecting ALL pages before persisting -- partial sync can miss mutations
- **Building custom CSV parser for bank statements:** Bank CSVs are notoriously inconsistent (quoted fields, varying encodings, commas in descriptions). PapaParse handles all edge cases
- **Auto-reconciling transactions to GL:** Per user decision, imported transactions and reconciliation are distinct steps. Do not auto-match

## New Prisma Models

```prisma
model BankTransaction {
  id                String              @id @default(cuid())
  subledgerItemId   String              // Which bank account this belongs to
  externalId        String?             // Plaid transaction_id or CSV hash
  date              DateTime            @db.Date
  description       String
  amount            Decimal             @db.Decimal(19, 4) // Negative = outflow, positive = inflow (Plaid convention inverted for GL)
  originalDescription String?           // Raw description before enrichment
  merchantName      String?             // Plaid-enriched merchant name
  category          String?             // Plaid category
  source            TransactionSource   // CSV or PLAID
  status            TransactionStatus   @default(PENDING)
  // Categorization
  accountId         String?             // GL account assigned by user or rule
  ruleId            String?             // Which rule auto-categorized this
  // Split tracking
  isSplit           Boolean             @default(false)
  parentTransactionId String?           // For split child rows
  // JE link
  journalEntryId    String?
  // Metadata
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  subledgerItem     SubledgerItem       @relation(fields: [subledgerItemId], references: [id])
  account           Account?            @relation(fields: [accountId], references: [id])
  rule              CategorizationRule? @relation(fields: [ruleId], references: [id])
  journalEntry      JournalEntry?       @relation(fields: [journalEntryId], references: [id])
  parent            BankTransaction?    @relation("TransactionSplit", fields: [parentTransactionId], references: [id])
  children          BankTransaction[]   @relation("TransactionSplit")

  @@unique([subledgerItemId, externalId])
  @@index([subledgerItemId, status])
  @@index([subledgerItemId, date])
  @@map("bank_transactions")
}

model PlaidConnection {
  id                String          @id @default(cuid())
  subledgerItemId   String          @unique  // One connection per bank account
  accessToken       String          // Encrypted Plaid access_token
  itemId            String          // Plaid item_id
  institutionId     String?
  institutionName   String?
  plaidAccountId    String?         // Specific Plaid account_id
  syncCursor        String?         // Last transactionsSync cursor
  lastSyncAt        DateTime?
  status            PlaidConnectionStatus @default(ACTIVE)
  error             String?         // Last error message
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  subledgerItem     SubledgerItem   @relation(fields: [subledgerItemId], references: [id])

  @@index([status])
  @@map("plaid_connections")
}

model CategorizationRule {
  id                String          @id @default(cuid())
  entityId          String
  pattern           String          // Case-insensitive substring to match in description
  amountMin         Decimal?        @db.Decimal(19, 4)
  amountMax         Decimal?        @db.Decimal(19, 4)
  accountId         String          // GL account to assign
  dimensionTags     Json?           // { dimensionId: tagId } same format as JE dimension tags
  isActive          Boolean         @default(true)
  priority          Int             @default(0)  // Lower = higher priority
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  entity            Entity          @relation(fields: [entityId], references: [id])
  account           Account         @relation(fields: [accountId], references: [id])
  transactions      BankTransaction[]

  @@index([entityId, isActive])
  @@map("categorization_rules")
}

enum TransactionSource {
  CSV
  PLAID
}

enum TransactionStatus {
  PENDING       // Imported, not yet categorized
  CATEGORIZED   // Account assigned (by user or rule), not yet posted
  POSTED        // JE created and linked
  EXCLUDED      // User explicitly excluded from posting
}

enum PlaidConnectionStatus {
  ACTIVE
  ERROR         // Token expired or institution error
  DISCONNECTED  // User disconnected
}
```

**Required relation additions to existing models:**
- `SubledgerItem` needs `bankTransactions BankTransaction[]` and `plaidConnection PlaidConnection?`
- `Entity` needs `categorizationRules CategorizationRule[]`
- `Account` needs `bankTransactions BankTransaction[]` and `categorizationRules CategorizationRule[]`
- `JournalEntry` needs `bankTransaction BankTransaction?`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom string split parser | PapaParse (already installed) | Bank CSVs have quoted fields, commas in descriptions, varying encodings, BOM markers; PapaParse handles all edge cases |
| Plaid API communication | Raw HTTP/fetch calls | `plaid` SDK v41.4.0 | Auto-generated TypeScript types, proper error handling, pagination helpers, request signing |
| Plaid Link UI widget | Custom OAuth flow | `react-plaid-link` v4.1.1 | Plaid-hosted UI handles bank authentication, MFA, institution search; compliance requirement |
| Transaction amount sign convention | Custom normalization | Plaid standard: positive = money leaving account | Plaid uses positive for outflows; convert at import time to match GL convention |
| Scheduled sync | Custom interval/setTimeout | Vercel Cron Jobs | Production-grade, handles deployment, configurable schedule, CRON_SECRET auth |

**Key insight:** Plaid integration has strict compliance and security requirements. The official SDKs handle token exchange, request signing, and error codes in ways that would be error-prone to replicate.

## Common Pitfalls

### Pitfall 1: Plaid Amount Sign Convention
**What goes wrong:** Plaid reports amounts with positive = money leaving the user's account (expenses), negative = money entering (deposits). This is the opposite of typical accounting convention where debits increase asset accounts.
**Why it happens:** Plaid follows the "bank statement" perspective, not the "GL" perspective.
**How to avoid:** Invert the sign at import time. Store in the BankTransaction.amount as the GL-perspective amount: positive = deposit/inflow, negative = withdrawal/outflow. Document this clearly.
**Warning signs:** All expenses showing as credits and all income as debits in JE lines.

### Pitfall 2: Partial Sync Pagination
**What goes wrong:** If you persist transactions page-by-page during a transactionsSync pagination loop and a `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` error occurs mid-loop, you end up with partial data and an invalid cursor.
**Why it happens:** Plaid's backend can mutate data during pagination. The entire paginated result set must be treated atomically.
**How to avoid:** Collect ALL pages into memory arrays (added, modified, removed) THEN persist everything in a single database transaction. On mutation error, restart from the original cursor.
**Warning signs:** Missing transactions, cursor pointing to wrong position, duplicate imports.

### Pitfall 3: CSV Column Variation
**What goes wrong:** Different banks export CSVs with wildly different column names ("Transaction Date" vs "Date" vs "Posted Date"), different amount representations (single "Amount" column with +/- vs separate "Debit"/"Credit" columns), and different date formats (MM/DD/YYYY vs YYYY-MM-DD vs DD/MM/YYYY).
**Why it happens:** No universal bank CSV standard exists.
**How to avoid:** Implement fuzzy column detection with fallback to user-specified mapping. Support both single-amount and split debit/credit column formats. Use multiple date format parsers.
**Warning signs:** All amounts being 0, dates parsed incorrectly, columns mapped to wrong fields.

### Pitfall 4: Duplicate Detection Edge Cases
**What goes wrong:** Two transactions on the same date for the same amount at the same merchant (e.g., buying coffee twice in one day) get flagged as duplicates and only one is imported.
**Why it happens:** Hash-based dedup using date+amount+description produces identical hashes for legitimately different transactions.
**How to avoid:** For Plaid, always use transaction_id (globally unique). For CSV, include the row index or line number in the hash, OR present potential duplicates to the user for confirmation rather than silently deduplicating.
**Warning signs:** User reports missing transactions that appear on their bank statement.

### Pitfall 5: Plaid Access Token Expiry and Institutional Errors
**What goes wrong:** Plaid access tokens can become invalid when users change their bank password, when institutions require re-authentication, or when Plaid rotates keys.
**Why it happens:** Banks require periodic re-authentication; Plaid's ITEM_LOGIN_REQUIRED error indicates the user must go through Link again.
**How to avoid:** Handle ITEM_LOGIN_REQUIRED by storing the error status on PlaidConnection, showing a "Reconnect" button in the UI, and using Plaid's update mode Link flow (pass existing access_token to linkTokenCreate).
**Warning signs:** Cron sync jobs silently failing, transactions stopping without user notification.

### Pitfall 6: Split Transaction Amounts Not Summing
**What goes wrong:** When splitting a $500 transaction into $300 + $200, rounding errors or user mistakes cause the split lines to not sum to the original amount.
**Why it happens:** Decimal arithmetic edge cases and no server-side validation.
**How to avoid:** Validate at the API level that SUM(split amounts) === original transaction amount. Use Decimal.js (already installed) for precise arithmetic. The last split line should auto-calculate as remainder.
**Warning signs:** Unbalanced journal entries being created.

## Code Examples

### Vercel Cron Job Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/plaid-sync",
      "schedule": "0 5 * * *"
    }
  ]
}
```

### Cron Job Route (secured)
```typescript
// src/app/api/cron/plaid-sync/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get all active Plaid connections
  const connections = await prisma.plaidConnection.findMany({
    where: { status: 'ACTIVE' },
    include: { subledgerItem: true },
  });

  const results = [];
  for (const conn of connections) {
    try {
      const { added, modified, removed, cursor } = await syncTransactions(conn);
      // Persist transactions + update cursor in single transaction
      results.push({ id: conn.id, added: added.length, modified: modified.length, removed: removed.length });
    } catch (error) {
      // Update connection status to ERROR
      await prisma.plaidConnection.update({
        where: { id: conn.id },
        data: { status: 'ERROR', error: error.message },
      });
      results.push({ id: conn.id, error: error.message });
    }
  }

  return Response.json({ synced: results.length, results });
}
```

### Duplicate Detection Hash
```typescript
// lib/bank-transactions/duplicate-check.ts
import { createHash } from 'crypto';

export function generateTransactionHash(
  date: string,
  amount: string,
  description: string,
  rowIndex?: number
): string {
  const normalized = `${date}|${parseFloat(amount).toFixed(4)}|${description.trim().toLowerCase()}${rowIndex !== undefined ? `|${rowIndex}` : ''}`;
  return createHash('sha256').update(normalized).digest('hex');
}

export async function findDuplicates(
  subledgerItemId: string,
  hashes: string[]
): Promise<Set<string>> {
  const existing = await prisma.bankTransaction.findMany({
    where: { subledgerItemId, externalId: { in: hashes } },
    select: { externalId: true },
  });
  return new Set(existing.map(t => t.externalId).filter(Boolean) as string[]);
}
```

### PapaParse Bank CSV Import
```typescript
// lib/bank-transactions/csv-parser.ts
import Papa from 'papaparse';

export function parseBankStatementCsv(csvText: string): ParsedTransaction[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Keep as strings for precise decimal handling
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse errors: ${result.errors.map(e => e.message).join('; ')}`);
  }

  const mapping = detectColumns(result.meta.fields || []);
  // ... map rows using detected columns
}
```

## Discretion Recommendations

### Duplicate Detection Algorithm (Claude's Discretion)
**Recommendation:** Use Plaid `transaction_id` as externalId for Plaid-sourced transactions (globally unique, HIGH confidence). For CSV imports, use SHA-256 hash of `date|amount|description` as externalId. Include row index in the hash only when two rows within the same CSV have identical date+amount+description (detect this during parsing and append a suffix). Present potential duplicates to the user with a "Skip duplicates" checkbox rather than silently dropping them.

### Transaction Queue Page Layout (Claude's Discretion)
**Recommendation:** TanStack Table with these columns: Date, Description, Amount, Source (CSV/Plaid badge), Account (combobox or rule-applied indicator), Status (PENDING/CATEGORIZED/POSTED), Actions. Filter tabs at top: All | Pending | Categorized | Posted. Sort by date descending. Bulk action bar appears when rows are selected (matching existing JE bulk action pattern). Amount column right-aligned with color coding (green for deposits, red for withdrawals).

### Plaid Webhook vs Polling (Claude's Discretion)
**Recommendation:** Use Vercel Cron for daily sync (simpler, no public webhook endpoint to maintain, no verification logic needed). Add a `/api/plaid/webhook` endpoint as a future enhancement stub that returns 200 OK but does not process events yet. This matches the user's stated "daily automatic sync via cron" preference. The manual "Sync Now" button calls the same sync logic on demand.

### Error Handling for Failed Plaid Connections (Claude's Discretion)
**Recommendation:** PlaidConnection.status tracks ACTIVE/ERROR/DISCONNECTED. On sync failure: if ITEM_LOGIN_REQUIRED, set status to ERROR with user-facing message "Bank requires re-authentication" and show a "Reconnect" button that opens Link in update mode. For transient errors (network, rate limit), retry once then log. Show connection status badge on the Holdings subledger page (green dot = active, yellow dot = needs attention, red dot = disconnected).

### CSV Parser Column Mapping (Claude's Discretion)
**Recommendation:** Auto-detect first using fuzzy header matching (see COLUMN_PATTERNS above). If auto-detection finds date + (amount OR debit+credit) + description, proceed automatically. If any required column is missing, show a column mapping dialog where the user selects which CSV column maps to each required field. Cache the mapping per institution/counterparty for future uploads.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/transactions/get` (date-range polling) | `/transactions/sync` (cursor-based) | Plaid recommends sync as primary since 2023 | No missed transactions, handles modifications and removals |
| Public key + env auth | Link token flow | link_token replaced public_key in 2020 | More secure, short-lived tokens, server-side initialization |
| Plaid Categories taxonomy | Personal Finance Categories | v2 taxonomy since 2023 | More granular, hierarchical categories; optional to use |

**Deprecated/outdated:**
- `public_key` initialization: Replaced by link_token flow. Must use linkTokenCreate endpoint
- `/transactions/get` as primary sync method: Still works but sync is recommended for all new integrations
- Plaid legacy categories: Being replaced by personal_finance_category; both still returned

## Open Questions

1. **Access Token Encryption**
   - What we know: Plaid access tokens must be encrypted at rest. AES-256-GCM is the standard
   - What's unclear: Whether to use Node.js crypto module directly or a KMS. For a v1 app on Vercel, full KMS may be overkill
   - Recommendation: Use Node.js `crypto.createCipheriv` with AES-256-GCM. Store encryption key as `PLAID_ENCRYPTION_KEY` env var. Sufficient for v1; can migrate to KMS later

2. **Bank Feed Nav Item Placement**
   - What we know: Context says "between Reports and Budgets" in sidebar
   - What's unclear: Exact label -- "Bank Feed" vs "Transactions" vs "Bank Transactions"
   - Recommendation: Use "Bank Feed" with the `Landmark` icon (already imported in holdings page). Place between Reports and Budgets in the navItems array

3. **Plaid Rate Limits**
   - What we know: Plaid has rate limits per item and per client
   - What's unclear: Exact limits for production tier
   - Recommendation: Process connections sequentially in cron (not in parallel) to stay within limits. Add 100ms delay between connections if needed

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose tests/bank-transactions/` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BANK-01 | CSV parsing produces correct transaction objects | unit | `npx vitest run tests/bank-transactions/csv-parser.test.ts -x` | Wave 0 |
| BANK-01 | CSV column auto-detection matches known patterns | unit | `npx vitest run tests/bank-transactions/csv-parser.test.ts -x` | Wave 0 |
| BANK-02 | Plaid sync loop collects all pages before persisting | unit | `npx vitest run tests/bank-transactions/plaid-sync.test.ts -x` | Wave 0 |
| BANK-02 | Plaid connection status updates on error | unit | `npx vitest run tests/bank-transactions/plaid-sync.test.ts -x` | Wave 0 |
| BANK-03 | Transaction -> JE creates balanced double-entry | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | Wave 0 |
| BANK-03 | Split transactions sum to original amount | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | Wave 0 |
| BANK-04 | Categorization rules match by pattern + amount range | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Wave 0 |
| BANK-04 | Rules apply dimension tags alongside GL account | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Wave 0 |
| BANK-05 | Duplicate detection by externalId prevents reimport | unit | `npx vitest run tests/bank-transactions/duplicate-check.test.ts -x` | Wave 0 |
| BANK-05 | CSV hash handles same-day same-amount transactions | unit | `npx vitest run tests/bank-transactions/duplicate-check.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/bank-transactions/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/bank-transactions/csv-parser.test.ts` -- covers BANK-01
- [ ] `tests/bank-transactions/plaid-sync.test.ts` -- covers BANK-02
- [ ] `tests/bank-transactions/create-je.test.ts` -- covers BANK-03
- [ ] `tests/bank-transactions/categorize.test.ts` -- covers BANK-04
- [ ] `tests/bank-transactions/duplicate-check.test.ts` -- covers BANK-05

## Sources

### Primary (HIGH confidence)
- [Plaid Transactions API docs](https://plaid.com/docs/api/products/transactions/) -- transactionsSync endpoint, request/response fields, cursor behavior
- [Plaid Add Transactions guide](https://plaid.com/docs/transactions/add-to-app/) -- Full integration flow: link token, exchange, sync pattern
- [Plaid Webhooks API](https://plaid.com/docs/api/webhooks/) -- Transaction webhook types, verification process
- npm registry: `plaid@41.4.0` -- TypeScript types built-in, axios dependency
- npm registry: `react-plaid-link@4.1.1` -- React 19 peer dep support confirmed
- [PapaParse docs](https://www.papaparse.com/docs) -- CSV parsing options, header detection

### Secondary (MEDIUM confidence)
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) -- vercel.json crons config, CRON_SECRET auth pattern
- [Plaid security best practices](https://www.fintegrationfs.com/post/plaid-token-storage-best-practices-us-compliance) -- AES-256-GCM encryption, KMS recommendations
- [Plaid Sync migration guide](https://plaid.com/docs/transactions/sync-migration/) -- Cursor pagination mutation handling

### Tertiary (LOW confidence)
- Plaid production rate limits: Not verified from official source; sequential processing recommended as safe default

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- plaid SDK versions verified via npm registry, react-plaid-link React 19 support confirmed
- Architecture: HIGH -- Patterns based on official Plaid docs + established project conventions (CSV import, API routes, Prisma models)
- Pitfalls: HIGH -- Amount sign convention and pagination behavior documented in official Plaid docs; CSV edge cases well-established
- Prisma models: MEDIUM -- Schema design follows project conventions but specific field choices are recommendations
- Plaid rate limits: LOW -- Production limits not verified from official docs

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (Plaid SDK updates monthly; check for breaking changes)
