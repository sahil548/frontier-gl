---
phase: 09-bank-transactions
verified: 2026-04-11T06:23:56Z
status: gaps_found
score: 11/13 must-haves verified
gaps:
  - truth: "CSV text can be parsed into structured transaction objects with auto-detected columns (Plan 01 key link: csv-parser validates rows via csvRowSchema.safeParse)"
    status: partial
    reason: "csv-parser.ts does NOT import or use csvRowSchema.safeParse from validators. The key link specified in 09-01-PLAN.md (pattern: 'csvRowSchema\\.safeParse') is absent. csv-parser.ts only imports PapaParse. Row validation happens implicitly via skipEmptyLines and manual field checks, not the Zod schema. The schema exists in validators/bank-transaction.ts but is never called by csv-parser.ts."
    artifacts:
      - path: "src/lib/bank-transactions/csv-parser.ts"
        issue: "Missing import and use of csvRowSchema.safeParse — only imports papaparse"
    missing:
      - "Import csvRowSchema from @/validators/bank-transaction in csv-parser.ts"
      - "Call csvRowSchema.safeParse(row) on each parsed row to validate/coerce fields"
  - truth: "Categorization rules auto-apply via applyRules during CSV import (Plan 04 key link: bank-transactions/route.ts uses applyRules from categorize.ts)"
    status: partial
    reason: "The CSV import route (route.ts) calls matchRule per-transaction in a manual loop instead of calling applyRules. The function applyRules is exported from categorize.ts but is never called anywhere in the codebase (confirmed by grep). Functionally equivalent for single-match-per-transaction, but the Plan 04 key link 'applyRules' pattern is not present."
    artifacts:
      - path: "src/app/api/entities/[entityId]/bank-transactions/route.ts"
        issue: "Imports and calls matchRule directly; applyRules is never imported or called anywhere"
    missing:
      - "Either use applyRules in the CSV import route, or update Plan 04 key_link to reflect that matchRule is used directly"
human_verification:
  - test: "Upload a CSV file in the Bank Feed UI"
    expected: "Transactions appear in queue with correct amounts, dates, and descriptions; duplicate count is shown in toast"
    why_human: "CSV parsing and dedup wiring works in code but the actual browser file upload UX cannot be verified programmatically"
  - test: "Connect a Plaid bank account via Connect Bank Feed button on Holdings page"
    expected: "Plaid Link widget opens, after completing flow transactions appear in Bank Feed queue; institution name and last sync time appear on Holdings row"
    why_human: "Requires live Plaid credentials and browser-based OAuth flow; PLAID_CLIENT_ID and PLAID_SECRET are env-specific"
  - test: "Categorize a transaction and confirm 'Always categorize as...' prompt appears"
    expected: "Prompt shows extracted pattern; clicking 'Yes, create rule' creates rule and shows matched count; 'Customize rule...' opens pre-filled RuleForm sheet"
    why_human: "Interactive UI flow with inline state transitions; cannot verify prompt appearance and dismissal in code"
---

# Phase 09: Bank Transactions Verification Report

**Phase Goal:** CFO can import bank transactions (CSV or automatic Plaid bank feed), review and categorize them, and post them as journal entries — eliminating manual data entry for the most common accounting workflow
**Verified:** 2026-04-11T06:23:56Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BankTransaction, PlaidConnection, and CategorizationRule models exist in Prisma schema with correct fields and relations | VERIFIED | All 3 models at lines 507, 539, 559 of schema.prisma; 3 enums (TransactionSource, TransactionStatus, PlaidConnectionStatus) at lines 489-505; relation fields added to SubledgerItem, Entity, Account, JournalEntry |
| 2 | CSV text can be parsed into structured transaction objects with auto-detected columns | VERIFIED | csv-parser.ts exports parseBankStatementCsv using PapaParse with COLUMN_PATTERNS map; handles standard and split debit/credit columns; 7 passing unit tests |
| 3 | Duplicate transactions are detected by externalId (Plaid) or SHA-256 hash (CSV) | VERIFIED | duplicate-check.ts exports generateTransactionHash (SHA-256, 4 tests pass) and findDuplicates (DB lookup by externalId); CSV import route uses both; Plaid sync uses externalId unique constraint |
| 4 | Categorization rules match transactions by case-insensitive description substring and optional amount range | VERIFIED | categorize.ts exports matchRule and applyRules; 5 passing unit tests confirming case-insensitive match, amountMin/Max range, priority ordering |
| 5 | A categorized bank transaction can be converted into a balanced double-entry journal entry | VERIFIED | create-je.ts exports createJournalEntryFromTransaction; handles expense/deposit and split cases; 5 passing unit tests; connected to transactionId route which calls journalEntry.create |
| 6 | User can upload a bank statement CSV and see parsed transactions in a review queue | VERIFIED | bank-feed/page.tsx (573 lines) has file input, reads file as text, POSTs to /api/entities/[entityId]/bank-transactions; API route parses CSV, deduplicates, returns imported/skipped/categorized counts; toast notification wired |
| 7 | User can assign a GL account to a transaction and post it as a journal entry | VERIFIED | PATCH /[transactionId] categorizes; POST /[transactionId] creates JE via createJournalEntryFromTransaction; account balance update and audit trail wired |
| 8 | User can select multiple transactions, assign the same account, and bulk-post | VERIFIED | bulk-categorize/route.ts wraps all operations in Prisma $transaction; processes each transaction atomically; returns processed/journalEntries/errors |
| 9 | User can split a single transaction across multiple GL accounts | VERIFIED | split-dialog.tsx (301 lines) exists; SplitDialog rendered in bank-feed/page.tsx; POST /[transactionId] accepts splits array; split sum validation in route |
| 10 | User can click Connect Bank Feed on a bank account and complete Plaid Link flow | VERIFIED | connect-bank-feed.tsx (252 lines) uses usePlaidLink; fetches link token lazily on click; exchanges token via /api/plaid/exchange-token; all 4 visual states (not connected, active, error, disconnected) implemented |
| 11 | Plaid access token is stored encrypted (AES-256-GCM) in the database | VERIFIED | encrypt.ts exports encryptToken/decryptToken using aes-256-gcm; exchange-token/route.ts calls encryptToken before upsert; 3 passing encryption tests |
| 12 | CSV import route auto-categorizes using categorize rules — but via matchRule, not applyRules | PARTIAL | CSV import route imports and calls matchRule per row; applyRules is exported from categorize.ts but is never imported or called anywhere in the codebase (Plan 04 key link pattern not satisfied) |
| 13 | csv-parser.ts validates parsed rows via csvRowSchema.safeParse | FAILED | csv-parser.ts only imports papaparse; csvRowSchema.safeParse is never called; Plan 01 key link pattern absent |

**Score:** 11/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | BankTransaction, PlaidConnection, CategorizationRule models + enums | VERIFIED | All 3 models + 3 enums present; existing models have relation fields |
| `src/validators/bank-transaction.ts` | 7 Zod schemas exported | VERIFIED | csvRowSchema, csvImportSchema, bankTransactionSchema, categorizationRuleSchema, bulkCategorizeSchema, splitLineSchema, splitTransactionSchema all exported |
| `src/lib/bank-transactions/csv-parser.ts` | PapaParse-based CSV parser with column auto-detection | VERIFIED | 172 lines; exports parseBankStatementCsv; COLUMN_PATTERNS map; detectColumns helper |
| `src/lib/bank-transactions/duplicate-check.ts` | SHA-256 hash generation and duplicate lookup | VERIFIED | exports generateTransactionHash and findDuplicates |
| `src/lib/bank-transactions/categorize.ts` | Rule matching engine | VERIFIED | exports matchRule and applyRules |
| `src/lib/bank-transactions/create-je.ts` | Transaction to JournalEntry creation | VERIFIED | exports createJournalEntryFromTransaction; handles split/non-split, expense/deposit |
| `src/app/api/entities/[entityId]/bank-transactions/route.ts` | GET list + POST CSV import endpoints | VERIFIED | GET with pagination/filters; POST with parse, dedup, auto-categorize; both export GET and POST |
| `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` | PATCH categorize + POST create JE | VERIFIED | PATCH updates accountId/status; POST builds JE, creates it, updates balances, updates transaction status |
| `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts` | POST bulk assign account and post | VERIFIED | Atomic Prisma transaction; handles both categorize-only and post-immediately paths |
| `src/app/(auth)/bank-feed/page.tsx` | Transaction queue page with filter tabs and bulk actions | VERIFIED | 573 lines; Tabs (All/Pending/Categorized/Posted) with count badges; CSV import button; bank account selector; SplitDialog and CategorizePrompt integrated |
| `src/components/bank-feed/transaction-table.tsx` | TanStack Table with checkboxes, account combobox, status badges | VERIFIED | 361 lines; compact prop at line 68; bulk action bar at line 321; source column hidden in compact mode |
| `src/lib/plaid/client.ts` | PlaidApi client singleton | VERIFIED | exports plaidClient using Configuration with PLAID_ENV |
| `src/lib/plaid/sync.ts` | Cursor-based sync loop and transaction persistence | VERIFIED | exports syncTransactions; collects all pages before persisting; handles MUTATIONS_DURING_PAGINATION; auto-categorizes via matchRule |
| `src/lib/plaid/encrypt.ts` | AES-256-GCM encrypt/decrypt for access tokens | VERIFIED | exports encryptToken and decryptToken; validates PLAID_ENCRYPTION_KEY length |
| `src/app/api/plaid/create-link-token/route.ts` | POST endpoint to create Plaid Link token | VERIFIED | exports POST; Clerk auth; checks for existing ERROR connection for update mode |
| `src/app/api/plaid/exchange-token/route.ts` | POST endpoint to exchange public_token for access_token | VERIFIED | exchanges token, encrypts, upserts PlaidConnection, triggers immediate syncTransactions |
| `src/app/api/cron/plaid-sync/route.ts` | GET cron endpoint for daily sync | VERIFIED | verifies CRON_SECRET bearer token; processes connections sequentially; returns synced/errors/results |
| `vercel.json` | Cron schedule for daily Plaid sync | VERIFIED | "path": "/api/cron/plaid-sync", "schedule": "0 5 * * *" |
| `src/app/api/entities/[entityId]/bank-transactions/rules/route.ts` | GET list + POST create categorization rules | VERIFIED | GET with priority sort; POST with retroactive matching of PENDING transactions; returns matchedCount |
| `src/app/api/entities/[entityId]/bank-transactions/rules/[ruleId]/route.ts` | PATCH update + DELETE deactivate individual rules | VERIFIED | PATCH updates partial fields; DELETE soft-deletes (isActive=false) |
| `src/app/(auth)/bank-feed/rules/page.tsx` | Rules management page with list and form | VERIFIED | 313 lines; lists rules with pattern, amount range, account, match count; Edit and Delete actions |
| `src/components/bank-feed/rule-form.tsx` | Rule create/edit form in Sheet slide-over | VERIFIED | 312 lines; supports create/edit mode; pattern, amount range, account fields |
| `src/components/holdings/inline-bank-transactions.tsx` | Inline bank transaction list for Holdings page bank account rows | VERIFIED | 210 lines; fetches with subledgerItemId filter; TransactionTable compact=true; status summary badges; "View all in Bank Feed" link |
| `src/components/bank-feed/categorize-prompt.tsx` | Post-categorize rule creation prompt | VERIFIED | 160 lines; POST to rules API; "Customize rule..." opens RuleForm; ruleId guard prevents double-prompt |
| `src/components/holdings/connect-bank-feed.tsx` | Plaid Link connect button for Holdings page | VERIFIED | 252 lines; all 4 states implemented; usePlaidLink; lazy link token fetch |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| csv-parser.ts | src/validators/bank-transaction.ts | csvRowSchema.safeParse | NOT WIRED | csv-parser.ts imports only papaparse; csvRowSchema never called in parser |
| create-je.ts | prisma.journalEntry.create | JE creation with debit/credit lines | PARTIAL | create-je.ts is a pure function (no DB call); journalEntry.create is called in [transactionId]/route.ts which imports create-je.ts — the chain works end-to-end |
| bank-feed/page.tsx | /api/entities/[entityId]/bank-transactions | fetch for list and CSV import | WIRED | Lines 163 (GET list) and 225 (POST import) both call the correct URL |
| bank-transactions/route.ts | csv-parser.ts | parseBankStatementCsv call | WIRED | Line 6 imports, line 185 calls parseBankStatementCsv |
| [transactionId]/route.ts | create-je.ts | createJournalEntryFromTransaction call | WIRED | Line 6 imports, line 191 calls createJournalEntryFromTransaction |
| connect-bank-feed.tsx | /api/plaid/create-link-token | fetch + usePlaidLink | WIRED | usePlaidLink at line 83; fetch to /api/plaid/create-link-token at line 95 |
| exchange-token/route.ts | encrypt.ts | encryptToken before DB storage | WIRED | Line 4 imports encryptToken; line 39 calls encryptToken(accessToken) |
| cron/plaid-sync/route.ts | sync.ts | syncTransactions for each connection | WIRED | Line 2 imports syncTransactions; line 36 calls it per connection |
| bank-feed/rules/page.tsx | /api/entities/[entityId]/bank-transactions/rules | fetch for CRUD | WIRED | Line 80 fetches GET; line 122 calls DELETE |
| categorize-prompt.tsx | /api/entities/[entityId]/bank-transactions/rules | POST to create rule | WIRED | Line 75-82 POSTs to rules endpoint with pattern/accountId |
| bank-transactions/route.ts | categorize.ts | applyRules during CSV import | NOT WIRED | matchRule is called directly (line 233); applyRules is never called anywhere in the codebase |
| inline-bank-transactions.tsx | /api/entities/[entityId]/bank-transactions | fetch with subledgerItemId filter | WIRED | Line 70 builds params with subledgerItemId; line 73 fetches |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| BANK-01 | 09-01, 09-02, 09-04 | User can upload a bank statement CSV; system parses transactions into a review queue | SATISFIED | CSV import API parses, deduplicates, auto-categorizes; bank-feed/page.tsx renders queue with tabs; transaction-table.tsx renders rows |
| BANK-02 | 09-03 | User can connect a bank account via Plaid Link; transactions sync automatically on a schedule | SATISFIED | connect-bank-feed.tsx + create-link-token/exchange-token routes implement Plaid Link; cron job in vercel.json syncs daily at 5AM UTC; syncTransactions cursor-based loop implemented |
| BANK-03 | 09-02, 09-04 | User can categorize transactions (assign GL account) and post them as journal entries | SATISFIED | PATCH [transactionId] categorizes; POST [transactionId] creates balanced JE; bulk-categorize handles multiple; inline-bank-transactions supports both from Holdings page |
| BANK-04 | 09-01, 09-04 | Categorization rules auto-apply to matching transactions based on description patterns | SATISFIED | matchRule called during CSV import and Plaid sync; rules/route.ts retroactively applies to PENDING transactions; rules CRUD fully wired |
| BANK-05 | 09-01, 09-02, 09-03 | Duplicate detection prevents re-importing the same transaction | SATISFIED | generateTransactionHash (SHA-256) for CSV; externalId unique constraint for Plaid; findDuplicates checks DB before import |

All 5 requirements (BANK-01 through BANK-05) are satisfied. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/bank-transactions/categorize.ts` | 73 | `return null` | Info | Legitimate: matchRule returns null when no rule matches — correct behavior, not a stub |
| `src/app/api/entities/[entityId]/bank-transactions/rules/route.ts` | 11 | `return null` | Info | Legitimate: serializeDecimal returns null for null Decimal fields — not a stub |
| No blocker anti-patterns found | — | — | — | No TODO/FIXME/placeholder comments in phase files; no empty implementations |

### Human Verification Required

#### 1. CSV File Upload Flow

**Test:** Select a bank CSV file using the "Import CSV" button on the Bank Feed page (must first select a bank account from the dropdown)
**Expected:** Toast notification shows "Imported N transactions, M duplicates skipped, K auto-categorized"; transactions appear in the All tab with correct amounts and dates
**Why human:** Browser file picker, file.text() reading, and toast rendering cannot be tested programmatically

#### 2. Plaid Link Connection Flow

**Test:** Navigate to Holdings page, expand a BANK_ACCOUNT row, click "Connect Bank Feed" button
**Expected:** Plaid Link widget opens in a modal; after completing authentication, toast shows "Connected to [institution]! Synced N transactions"; institution name and green dot appear on the bank account row
**Why human:** Requires live Plaid credentials (PLAID_CLIENT_ID, PLAID_SECRET), browser-based Plaid Link OAuth widget, and a real bank account in Plaid Sandbox or Production

#### 3. Categorize Prompt and Rule Creation

**Test:** On the Bank Feed page, assign a GL account to a PENDING transaction using the account combobox
**Expected:** After categorization succeeds, an inline prompt appears: "Always categorize transactions containing '[PATTERN]' as [ACCOUNT]?"; clicking "Yes, create rule" shows matched count; "Customize rule..." opens the RuleForm Sheet
**Why human:** Inline UI state transitions and prompt visibility cannot be verified without rendering in a browser

### Gaps Summary

Two key links from the PLAN frontmatter are not implemented as specified:

**Gap 1 — csvRowSchema.safeParse not called in csv-parser.ts (Plan 01 key link)**
The plan specified that csv-parser.ts would validate parsed rows using `csvRowSchema.safeParse` from the validators module. In practice, csv-parser.ts only imports papaparse and validates rows implicitly via skipEmptyLines and manual null checks. The Zod schema exists but is never invoked by the parser. This means parsed rows reaching the API could contain edge-case types that the schema would have caught (though the API route does apply its own validation). This is a minor wiring gap — the system functions correctly end-to-end, but the declared contract (parser validates via Zod schema) is not honored.

**Gap 2 — applyRules not called anywhere (Plan 04 key link)**
The plan specified that the CSV import route would call `applyRules` from categorize.ts. The route instead calls `matchRule` per transaction in a manual loop. `applyRules` is exported but never imported or called anywhere in the production codebase. Functionally the behavior is equivalent for single-match-per-transaction use cases, but the declared architectural intent (batch-processing via applyRules) is not followed. The tests for applyRules pass, but the function is dead production code.

**Note on overall goal achievement:** Despite these two wiring gaps, the phase goal is substantively achieved. The CFO can import bank transactions via CSV (BANK-01), connect Plaid bank feeds (BANK-02), categorize and post as journal entries (BANK-03), use auto-categorization rules (BANK-04), and duplicate detection works (BANK-05). The gaps are architectural/contract gaps rather than functional blockers.

---

_Verified: 2026-04-11T06:23:56Z_
_Verifier: Claude (gsd-verifier)_
