---
phase: 11-categorization-ux-opening-balances
plan: 03
subsystem: api
tags: [journal-entries, opening-balance, prisma, subledger, holdings, equity]

requires:
  - phase: 11-01
    provides: "Schema extensions (CategorizationRule positionId, reconciliationStatus), Position model with accountId"
provides:
  - "Opening balance JE auto-generation on holding creation"
  - "Adjusting JE auto-generation on holding balance edit"
  - "findOrCreateOBEAccount for Opening Balance Equity (3900)"
  - "Pure testable functions: determineJEDirection, computeAdjustment"
  - "Holdings date picker for opening balance date"
affects: [12-period-close]

tech-stack:
  added: []
  patterns:
    - "Opening balance JE generation inside Prisma $transaction for atomicity"
    - "Pure function extraction (determineJEDirection, computeAdjustment) for unit testability of transaction logic"
    - "AccountBalance upsert with increment for atomic balance updates in JE posting"

key-files:
  created:
    - "src/lib/bank-transactions/opening-balance.ts"
  modified:
    - "src/app/api/entities/[entityId]/subledger/route.ts"
    - "src/app/api/entities/[entityId]/subledger/[itemId]/route.ts"
    - "src/app/(auth)/holdings/page.tsx"
    - "tests/bank-transactions/opening-balance.test.ts"

key-decisions:
  - "Opening balance JE uses position GL leaf account (not summary account) for accurate position-level posting"
  - "PUT handler wrapped in $transaction to make adjusting JE + update atomic"
  - "Date picker uses native HTML date input for simplicity, required validation via toast"

patterns-established:
  - "Pattern: Generate POSTED JE directly (skip DRAFT) for system-generated entries"
  - "Pattern: AccountBalance upsert with Prisma.Decimal increment for double-entry balance tracking"

requirements-completed: [OBE-01, OBE-02, OBE-03]

duration: 5min
completed: 2026-04-12
---

# Phase 11 Plan 03: Opening Balance JE Auto-Generation Summary

**Opening balance JE auto-generation on holding creation with TDD-tested direction logic, adjusting JE on balance edit, and date picker UI**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T19:54:53Z
- **Completed:** 2026-04-12T19:59:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Opening balance lib module with 5 exported functions: determineJEDirection, computeAdjustment (pure), findOrCreateOBEAccount, generateOpeningBalanceJE, generateAdjustingJE
- Subledger POST handler atomically creates opening balance JE inside existing $transaction when balance > 0
- Subledger PUT handler wrapped in $transaction with adjusting JE when balance changes
- Holdings form shows date picker when creating with non-zero balance, validates date is required

## Task Commits

Each task was committed atomically:

1. **Task 1: Opening balance lib module with TDD** - `d025d94` (feat)
2. **Task 2: Subledger API integration + holdings date picker** - `efbd4d8` (feat)

## Files Created/Modified
- `src/lib/bank-transactions/opening-balance.ts` - Opening balance JE generation with direction detection and OBE account management
- `tests/bank-transactions/opening-balance.test.ts` - 10 unit tests for pure direction and adjustment functions
- `src/app/api/entities/[entityId]/subledger/route.ts` - POST handler extended with openingBalanceDate field and JE generation
- `src/app/api/entities/[entityId]/subledger/[itemId]/route.ts` - PUT handler wrapped in $transaction with adjusting JE
- `src/app/(auth)/holdings/page.tsx` - Date picker field, validation, and JE creation toast

## Decisions Made
- Opening balance JE uses position GL leaf account (not holding summary account) for accurate position-level posting
- PUT handler wrapped in $transaction to make adjusting JE + update atomic
- Date picker uses native HTML date input for simplicity, required validation via toast on submit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Opening balance infrastructure complete for all holding types
- Adjusting JE mechanism ready for any future balance change workflows
- Ready for plan 04 (categorization UX)

## Self-Check: PASSED

All 5 files verified present. Both commit hashes (d025d94, efbd4d8) confirmed in git log.

---
*Phase: 11-categorization-ux-opening-balances*
*Completed: 2026-04-12*
