---
phase: 09-bank-transactions
plan: 03
subsystem: api, ui
tags: [plaid, aes-256-gcm, react-plaid-link, vercel-cron, bank-transactions, encryption]

# Dependency graph
requires:
  - phase: 09-bank-transactions
    provides: BankTransaction, PlaidConnection Prisma models, TransactionSource/Status enums, categorize matchRule
  - phase: 01-foundation
    provides: Prisma client, Clerk auth, API response helpers
provides:
  - PlaidApi client singleton
  - AES-256-GCM access token encryption/decryption
  - Cursor-based transactionsSync engine
  - POST /api/plaid/create-link-token endpoint
  - POST /api/plaid/exchange-token endpoint
  - POST /api/plaid/sync manual sync endpoint
  - GET /api/cron/plaid-sync daily cron endpoint
  - vercel.json cron schedule at 5AM UTC
  - ConnectBankFeed UI component with 4 visual states
  - Holdings page Plaid integration for bank accounts
affects: [09-04]

# Tech tracking
tech-stack:
  added: [plaid@41.4.0, react-plaid-link@4.1.1]
  patterns: [aes-256-gcm-token-encryption, cursor-based-plaid-sync, lazy-link-token-fetch, cron-secret-auth]

key-files:
  created:
    - src/lib/plaid/client.ts
    - src/lib/plaid/encrypt.ts
    - src/lib/plaid/sync.ts
    - src/app/api/plaid/create-link-token/route.ts
    - src/app/api/plaid/exchange-token/route.ts
    - src/app/api/plaid/sync/route.ts
    - src/app/api/cron/plaid-sync/route.ts
    - vercel.json
    - src/components/holdings/connect-bank-feed.tsx
  modified:
    - tests/bank-transactions/plaid-sync.test.ts
    - src/app/(auth)/holdings/page.tsx
    - src/app/api/entities/[entityId]/subledger/route.ts

key-decisions:
  - "Encryption format: iv_hex:authTag_hex:encrypted_hex concatenated string for AES-256-GCM token storage"
  - "Lazy link token fetch: only request Plaid link token on button click, not on component mount"
  - "Plaid update mode: ERROR connections get access_token passed to linkTokenCreate for re-authentication flow"
  - "Sequential cron processing: iterate connections one-by-one to respect Plaid API rate limits"
  - "Auto-categorize during sync: match new Plaid transactions against entity rules immediately on import"

patterns-established:
  - "AES-256-GCM token encryption with random IV per encryption for Plaid access tokens"
  - "Cursor-based pagination: collect ALL pages before persisting, restart on mutation error"
  - "CRON_SECRET bearer token auth pattern for Vercel cron endpoints"
  - "ConnectBankFeed 4-state pattern: null/ACTIVE/ERROR/DISCONNECTED with appropriate UI"

requirements-completed: [BANK-02, BANK-05]

# Metrics
duration: 6min
completed: 2026-04-11
---

# Phase 9 Plan 3: Plaid Integration -- Client, Sync Engine & Connect UI Summary

**Plaid SDK integration with AES-256-GCM encrypted token storage, cursor-based transactionsSync engine, 4 API routes, daily cron, and ConnectBankFeed component on Holdings page**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-11T06:03:43Z
- **Completed:** 2026-04-11T06:09:43Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- PlaidApi client singleton configured for production environment with typed SDK
- AES-256-GCM encrypt/decrypt for access tokens (never stored in plaintext)
- Cursor-based transactionsSync collects all pages atomically before persisting, with mutation error restart
- 4 API routes: create-link-token (with update mode), exchange-token (with initial sync), manual sync, daily cron
- ConnectBankFeed component with 4 visual states and lazy Plaid Link initialization
- Holdings page shows bank feed status and Sync Now for each bank account subledger item
- 9 passing tests covering encryption roundtrip, sign inversion, duplicate skip, error handling, pagination

## Task Commits

Each task was committed atomically:

1. **Task 1: Plaid client, encryption, sync engine, and API routes** - `625b807` (feat)
2. **Task 2: Connect Bank Feed button + Holdings page integration** - `7ab822a` (feat)

## Files Created/Modified
- `src/lib/plaid/client.ts` - PlaidApi singleton with production env config
- `src/lib/plaid/encrypt.ts` - AES-256-GCM encryptToken/decryptToken
- `src/lib/plaid/sync.ts` - Cursor-based syncTransactions with auto-categorization
- `src/app/api/plaid/create-link-token/route.ts` - POST endpoint with update mode for ERROR connections
- `src/app/api/plaid/exchange-token/route.ts` - POST endpoint with encrypted storage and initial sync
- `src/app/api/plaid/sync/route.ts` - POST manual Sync Now endpoint
- `src/app/api/cron/plaid-sync/route.ts` - GET daily cron with CRON_SECRET bearer auth
- `vercel.json` - Cron schedule at 5AM UTC
- `src/components/holdings/connect-bank-feed.tsx` - ConnectBankFeed with 4 visual states
- `tests/bank-transactions/plaid-sync.test.ts` - 9 tests replacing 6 todo stubs
- `src/app/(auth)/holdings/page.tsx` - Added ConnectBankFeed for BANK_ACCOUNT items
- `src/app/api/entities/[entityId]/subledger/route.ts` - Include plaidConnection in response

## Decisions Made
- Encryption format uses `iv_hex:authTag_hex:encrypted_hex` concatenated string for easy parsing
- Lazy link token fetch: Plaid link token requested only on button click, not on component mount
- ERROR connections use Plaid Link update mode by passing access_token to linkTokenCreate
- Cron processes connections sequentially to respect Plaid rate limits
- Auto-categorize during sync: new Plaid transactions matched against entity categorization rules immediately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

This plan requires Plaid API keys and encryption configuration. Environment variables needed:
- `PLAID_CLIENT_ID` - From Plaid Dashboard > Team Settings > Keys
- `PLAID_SECRET` - From Plaid Dashboard > Team Settings > Keys (Production secret)
- `PLAID_ENV` - Set to `production`
- `NEXT_PUBLIC_PLAID_ENV` - Set to `production`
- `PLAID_ENCRYPTION_KEY` - Generate with `openssl rand -hex 32`
- `CRON_SECRET` - Generate with `openssl rand -hex 16`

## Next Phase Readiness
- Plaid connection flow fully operational for bank accounts on Holdings page
- Sync engine ready for daily cron execution once Vercel cron is configured
- Transaction data flows into BankTransaction table with source PLAID for Plan 04 queue UI
- ConnectBankFeed component reusable for any subledger item with Plaid connection

## Self-Check: PASSED

All 13 files verified present. Both task commits verified in git log (625b807, 7ab822a).

---
*Phase: 09-bank-transactions*
*Completed: 2026-04-11*
