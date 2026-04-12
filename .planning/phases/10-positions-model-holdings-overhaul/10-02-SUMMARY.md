---
phase: 10-positions-model-holdings-overhaul
plan: 02
subsystem: database, api
tags: [prisma, migration, positions, holdings, bank-transactions, gl-hierarchy]

requires:
  - phase: 10-positions-model-holdings-overhaul
    provides: Position.accountId FK, HOLDING_TYPE_TO_GL/DEFAULT_POSITION_NAME/DEFAULT_POSITION_TYPE constants, createPositionGLAccount/createHoldingSummaryAccount helpers
provides:
  - Data migration script for existing holdings to position model (idempotent, with --dry-run)
  - Library function migrateHoldingsToPositionModel for unit-testable migration logic
  - Bank transaction POST and bulk-categorize routes resolve position-level GL accounts
  - Backward-compatible fallback to subledgerItem.accountId for unmigrated data
affects: [10-03-ui, bank-transactions, bank-feed, reconciliation]

tech-stack:
  added: []
  patterns:
    - "Position-level GL resolution: position?.accountId ?? subledgerItem.accountId for backward compat"
    - "Migration idempotency via position.accountId presence detection"
    - "Standalone runner at scripts/ with inline constants, library function at src/scripts/ for testing"

key-files:
  created:
    - src/scripts/migrate-holdings-positions.ts
    - scripts/migrate-holdings-positions.ts
    - tests/holdings/migration.test.ts
  modified:
    - src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts
    - src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts
    - tests/bank-transactions/create-je.test.ts

key-decisions:
  - "Migration library function in src/scripts/ (testable via vitest), standalone runner in scripts/ (self-contained with inline constants)"
  - "Position-level GL resolution uses nullish coalescing: position?.accountId ?? subledgerItem.accountId"
  - "Migration idempotency detected by checking if any active position has a non-null accountId"

patterns-established:
  - "Bank transaction bankAccountId resolves from default position (oldest active, first created) not holding summary"
  - "Migration scripts split into testable library function + standalone runner"

requirements-completed: [POS-05, POS-08]

duration: 5min
completed: 2026-04-12
---

# Phase 10 Plan 02: Data Migration + Position-Level Bank Transaction Posting Summary

**Idempotent migration script for existing holdings to 3-level GL hierarchy, plus bank transaction posting updated to use position-level GL accounts with backward-compatible fallback**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T18:48:41Z
- **Completed:** 2026-04-12T18:53:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Migration script handles three cases: no-position holdings (creates default position, re-parents GL account), multi-position holdings (creates GL leaf per position), legacy types (INVESTMENT/PRIVATE_EQUITY/RECEIVABLE backward compat)
- Migration is idempotent (detects already-migrated holdings by position.accountId presence) with --dry-run support
- Bank transaction single-post and bulk-categorize routes now resolve bankAccountId from default position's GL leaf account
- Backward compatible: unmigrated holdings still work via subledgerItem.accountId fallback
- 15 total tests passing: 7 migration tests + 8 bank transaction tests (3 new position-level resolution tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Data migration script for existing holdings** - `37f8b45` (feat, TDD)
2. **Task 2: Update bank transaction posting to use position-level GL accounts** - `b042df2` (feat)

## Files Created/Modified
- `src/scripts/migrate-holdings-positions.ts` - Library function for migration logic (unit-testable via vitest)
- `scripts/migrate-holdings-positions.ts` - Standalone runner script with --dry-run support
- `tests/holdings/migration.test.ts` - 7 tests covering all migration cases
- `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` - Position-level bankAccountId resolution in POST handler
- `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts` - Position-level bankAccountId resolution in bulk categorize
- `tests/bank-transactions/create-je.test.ts` - 3 new tests for position-level resolution

## Decisions Made
- Split migration into library function (src/scripts/) and standalone runner (scripts/) -- the library function uses @/ imports for testing, the runner uses inline constants for self-containment outside the TS path mapping context
- Position-level GL resolution uses nullish coalescing (position?.accountId ?? subledgerItem.accountId) so unmigrated data continues to work
- Migration idempotency uses a simple check: if any active position has accountId set, the holding is already migrated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Standalone runner script (scripts/migrate-holdings-positions.ts) initially used relative imports that failed TypeScript compilation because it sits outside the src/ directory with @/ path mapping. Resolved by making the runner self-contained with inline constants and require() instead of ES module imports.
- Pre-existing TS errors in blob-storage.test.ts and add-positions-prompt.tsx (unrelated to this plan) -- not addressed per scope boundary rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Migration script ready to run on existing data (manually via `npx tsx scripts/migrate-holdings-positions.ts` or automated in deploy pipeline)
- Bank transaction posting correctly targets position-level GL accounts
- Plan 03 (UI restructure) can build on the complete data model and API layer

## Self-Check: PASSED

All 6 files verified present. Both task commits (37f8b45, b042df2) verified in git log.

---
*Phase: 10-positions-model-holdings-overhaul*
*Completed: 2026-04-12*
