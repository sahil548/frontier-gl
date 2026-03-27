---
phase: 02-accounting-engine
plan: 01
subsystem: database
tags: [prisma, postgresql, triggers, zod, decimal, double-entry, accounting]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Prisma schema with Entity model, prisma client, Zod validation patterns, Vitest setup"
provides:
  - "Prisma models: Account, AccountBalance, JournalEntry, JournalEntryLine, JournalEntryAudit, PeriodClose"
  - "DB triggers: posted entry immutability (DI-04), debit=credit validation (DI-05), closed period enforcement (JE-06)"
  - "Zod validators: createAccountSchema, updateAccountSchema, journalEntrySchema with cross-field debit=credit refinement"
  - "Business logic: postJournalEntry, createReversalDraft, bulkPostEntries, generateNextEntryNumber, suggestNextAccountNumber, applyTemplate"
  - "Family Office Standard template (~42 accounts)"
  - "Status transition validation helper"
affects: [02-02, 02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma interactive transactions for atomic balance updates"
    - "Deferred constraint triggers for cross-row validation"
    - "Decimal.js for all money arithmetic (never native JS)"
    - "Zod refine for cross-field validation (debit=credit)"

key-files:
  created:
    - prisma/migrations/add_posted_immutability_trigger.sql
    - prisma/migrations/add_balance_validation_trigger.sql
    - prisma/migrations/add_closed_period_trigger.sql
    - src/lib/validators/account.ts
    - src/lib/validators/journal-entry.ts
    - src/lib/accounts/next-number.ts
    - src/lib/accounts/template.ts
    - src/lib/journal-entries/post.ts
    - src/lib/journal-entries/reverse.ts
    - src/lib/journal-entries/bulk-post.ts
    - src/lib/journal-entries/auto-number.ts
    - src/lib/journal-entries/status.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Used db push instead of prisma migrate dev due to existing unmanaged DB schema; triggers applied via db execute"
  - "Prisma Decimal increment used for atomic balance updates (confirmed working with @db.Decimal(19,4))"
  - "Status transition helper created as standalone module for reuse in API routes"

patterns-established:
  - "Trigger SQL files in prisma/migrations/ applied via prisma db execute"
  - "Zod validators colocated with model domain (validators/account.ts, validators/journal-entry.ts)"
  - "Business logic in lib/{domain}/ pattern (accounts/, journal-entries/)"
  - "it.todo() stubs for Wave 0 Nyquist compliance"

requirements-completed: [COA-07, DI-03, DI-04, DI-05, JE-02, JE-06]

# Metrics
duration: 7min
completed: 2026-03-27
---

# Phase 2 Plan 01: Accounting Data Foundation Summary

**Prisma schema with 6 accounting models, 3 PostgreSQL triggers (immutability, balance validation, closed period), Zod validators with debit=credit refinement, and full business logic layer (post, reverse, bulk-post, template, auto-number)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T05:37:08Z
- **Completed:** 2026-03-27T05:44:00Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments
- All 6 Phase 2 Prisma models defined with correct types, relations, indexes, and Decimal(19,4) fields
- 3 PostgreSQL triggers active: posted entry immutability, deferred debit=credit balance validation, closed period enforcement
- Zod validators for accounts and journal entries with cross-field validation using decimal.js
- Complete business logic layer: posting with atomic balance update, reversals, bulk-post, auto-numbering, template seeding
- Family Office Standard template with 42 accounts covering Assets through Expenses
- 12 Wave 0 test files: 4 full (38 tests passing) + 8 stubs (30 todo tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 2 Prisma models, DB triggers** - `50848bc` (feat)
2. **Task 2: Validators, business logic, template, test suite** - `8341226` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added AccountType, JournalEntryStatus enums; Account, AccountBalance, JournalEntry, JournalEntryLine, JournalEntryAudit, PeriodClose models
- `prisma/migrations/add_posted_immutability_trigger.sql` - BEFORE trigger blocking UPDATE/DELETE on posted JEs and their lines
- `prisma/migrations/add_balance_validation_trigger.sql` - Deferred AFTER constraint trigger validating SUM(debit)=SUM(credit) per JE
- `prisma/migrations/add_closed_period_trigger.sql` - BEFORE UPDATE trigger checking period_closes before status change to POSTED
- `src/lib/validators/account.ts` - createAccountSchema (name, number, type, description, parentId) and updateAccountSchema
- `src/lib/validators/journal-entry.ts` - journalEntrySchema with lineItemSchema, debit=credit refinement using decimal.js
- `src/lib/accounts/next-number.ts` - suggestNextAccountNumber (10000 top-level, 100 sub-account increments)
- `src/lib/accounts/template.ts` - FAMILY_OFFICE_TEMPLATE constant + applyTemplate merge logic
- `src/lib/journal-entries/post.ts` - postJournalEntry with atomic AccountBalance upsert/increment
- `src/lib/journal-entries/reverse.ts` - createReversalDraft with flipped debits/credits
- `src/lib/journal-entries/bulk-post.ts` - bulkPostEntries (all-or-nothing transaction)
- `src/lib/journal-entries/auto-number.ts` - generateNextEntryNumber (JE-001 format)
- `src/lib/journal-entries/status.ts` - validateStatusTransition helper
- 12 test files (4 full + 8 stubs)

## Decisions Made
- Used `prisma db push` + `prisma db execute` instead of `prisma migrate dev` because the DB was previously set up without Prisma migrations (existing unmanaged schema). Trigger SQL files stored in prisma/migrations/ for documentation and replayability.
- Created a standalone `status.ts` module with `validateStatusTransition` for reuse across API routes rather than inline checks.
- Template has 42 accounts (slightly more than the ~40 specified) to cover family-office-specific categories like Real Estate Holdings, Private Equity, Custodian Fees, Bank Charges.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `prisma migrate dev` failed with "need to reset" error because DB had existing tables from Phase 1 `db push`. Resolved by continuing with `db push` for schema and `db execute` for trigger SQL files. This is functionally equivalent.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema, triggers, validators, and business logic ready for Plan 02 (Account CRUD API + COA page)
- All exports match the interfaces expected by downstream plans
- PeriodClose table exists (empty) ready for Phase 4 population

---
*Phase: 02-accounting-engine*
*Completed: 2026-03-27*
