---
phase: 10-positions-model-holdings-overhaul
plan: 01
subsystem: database, api
tags: [prisma, enum, gl-hierarchy, positions, holdings, subledger]

requires:
  - phase: 09-bank-transactions
    provides: SubledgerItem model, bank transaction posting flow, existing HOLDING_TYPE_TO_GL
provides:
  - Expanded SubledgerItemType enum (16 values: 13 new + 3 legacy)
  - Position.accountId FK to Account (nullable for migration compat)
  - HOLDING_TYPE_TO_GL mapping (16 types) and DEFAULT_POSITION_NAME mapping
  - createPositionGLAccount and createHoldingSummaryAccount helper functions
  - 3-level GL hierarchy auto-creation on holding and position creation
affects: [10-02-migration, 10-03-ui, 11-categorization, bank-transactions]

tech-stack:
  added: []
  patterns:
    - "3-level COA hierarchy: type parent > holding summary (+100) > position leaf (+10)"
    - "Shared GL account creation helpers in src/lib/holdings/position-gl.ts"
    - "Shared constants (HOLDING_TYPE_TO_GL, DEFAULT_POSITION_NAME, DEFAULT_POSITION_TYPE) in src/lib/holdings/constants.ts"

key-files:
  created:
    - src/lib/holdings/constants.ts
    - src/lib/holdings/position-gl.ts
    - tests/holdings/enum-types.test.ts
    - tests/holdings/position-gl.test.ts
    - tests/holdings/holding-gl.test.ts
  modified:
    - prisma/schema.prisma
    - src/app/api/entities/[entityId]/subledger/route.ts
    - src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts

key-decisions:
  - "Keep legacy enum values (INVESTMENT, PRIVATE_EQUITY, RECEIVABLE) alongside new values for data compatibility"
  - "Position.accountId nullable initially for migration compatibility (Plan 02 will backfill)"
  - "DEFAULT_POSITION_TYPE maps holding types to initial position types (CASH for bank/brokerage, OTHER for loans/equipment)"
  - "Position GL accounts named after position name since COA hierarchy provides context"

patterns-established:
  - "GL account creation helpers accept Prisma tx as first arg for transaction safety"
  - "Holding creation auto-creates summary account + default position + position GL leaf in one transaction"

requirements-completed: [POS-01, POS-02, POS-03, POS-04]

duration: 5min
completed: 2026-04-12
---

# Phase 10 Plan 01: Schema Expansion + GL Hierarchy Summary

**Expanded SubledgerItemType to 16 values, added Position.accountId FK, built 3-level GL hierarchy auto-creation (type parent > holding summary > position leaf)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T18:41:36Z
- **Completed:** 2026-04-12T18:46:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SubledgerItemType enum expanded from 7 to 16 values (13 new canonical types + 3 legacy kept for data compatibility)
- Position.accountId optional FK added to anchor positions to GL leaf accounts
- Shared constants and GL account creation helpers extracted to src/lib/holdings/
- Holding POST now creates 3-level GL hierarchy: summary account + default position + position GL leaf
- Position POST now auto-creates GL leaf account under holding's summary account
- 16 unit tests covering enum mappings, position GL creation (+10 stepping), and holding GL creation (+100 stepping)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema expansion + shared constants + test stubs** - `5d04958` (feat)
2. **Task 2: Update subledger + position API routes for 3-level GL hierarchy** - `4c7e3ff` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Expanded SubledgerItemType enum, added Position.accountId + Account relation
- `src/lib/holdings/constants.ts` - HOLDING_TYPE_TO_GL, DEFAULT_POSITION_NAME, DEFAULT_POSITION_TYPE mappings
- `src/lib/holdings/position-gl.ts` - createPositionGLAccount (+10 stepping), createHoldingSummaryAccount (+100 stepping)
- `src/app/api/entities/[entityId]/subledger/route.ts` - 3-level GL hierarchy on holding creation, positions in GET response
- `src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts` - GL leaf account auto-creation on position creation, account info in responses
- `tests/holdings/enum-types.test.ts` - Enum coverage tests (8 tests)
- `tests/holdings/position-gl.test.ts` - Position GL creation tests (4 tests)
- `tests/holdings/holding-gl.test.ts` - Holding summary GL creation tests (4 tests)

## Decisions Made
- Kept legacy enum values (INVESTMENT, PRIVATE_EQUITY, RECEIVABLE) alongside new values -- existing database rows reference them and prisma db push cannot remove values in use
- Position.accountId is nullable initially to allow the migration script (Plan 02) to backfill existing positions
- Added DEFAULT_POSITION_TYPE constant to map holding types to sensible default position types (e.g., CASH for bank/brokerage, PRIVATE_EQUITY for private funds, REAL_PROPERTY for real estate)
- PrismaTx interface defined generically in position-gl.ts so both real Prisma transactions and test mocks satisfy it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Prisma client needed explicit regeneration (`prisma generate`) after schema push for TypeScript types to recognize new enum values and Position.accountId field. Resolved by running generate before type checking.
- Pre-existing type error in tests/attachments/blob-storage.test.ts (unrelated to this plan) -- out of scope, not addressed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema and helpers ready for Plan 02 (data migration for existing holdings)
- Plan 03 (UI restructure) can reference new constants and API response shapes
- All holding types and GL hierarchy patterns established for downstream consumption

---
*Phase: 10-positions-model-holdings-overhaul*
*Completed: 2026-04-12*
