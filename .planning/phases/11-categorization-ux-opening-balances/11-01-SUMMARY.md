---
phase: 11-categorization-ux-opening-balances
plan: 01
subsystem: database, api
tags: [prisma, positions, categorization, reconciliation, bank-transactions]

requires:
  - phase: 10-positions-model-holdings-overhaul
    provides: Position model with GL anchoring, SubledgerItem relations
  - phase: 09-bank-feed-categorization
    provides: CategorizationRule, BankTransaction models, categorize engine
provides:
  - positionId on CategorizationRule for position-targeted categorization rules
  - positionId and reconciliationStatus on BankTransaction for reconciliation tracking
  - Position reverse relations to CategorizationRule and BankTransaction
  - Entity-wide positions API endpoint with holding metadata
  - Wave 0 test stubs for OBE, REC, and CAT requirements
affects: [11-02, 11-03, 11-04]

tech-stack:
  added: []
  patterns: [refine validator for mutual exclusivity, optional FK with position-targeted rules]

key-files:
  created:
    - src/app/api/entities/[entityId]/positions/route.ts
    - tests/bank-transactions/opening-balance.test.ts
    - tests/bank-transactions/position-picker.test.ts
    - tests/bank-transactions/auto-reconcile.test.ts
    - tests/bank-transactions/reconciliation-summary.test.ts
  modified:
    - prisma/schema.prisma
    - src/validators/bank-transaction.ts
    - src/lib/bank-transactions/categorize.ts
    - src/app/api/entities/[entityId]/bank-transactions/rules/route.ts
    - tests/bank-transactions/categorize.test.ts

key-decisions:
  - "accountId optional on CategorizationRule with refine requiring at least one of accountId/positionId"
  - "reconciliationStatus as String with PENDING default rather than enum for flexibility"

patterns-established:
  - "Refine validator pattern: z.object().refine() for requiring at least one of N optional fields"
  - "Position-targeted rules: positionId on rules, GL resolved at apply-time not rule-creation time"

requirements-completed: [CAT-01, CAT-03]

duration: 5min
completed: 2026-04-12
---

# Phase 11 Plan 01: Schema + Validators + Positions API Summary

**Prisma schema extended with positionId on rules and transactions, reconciliationStatus tracking, entity-wide positions API, and Wave 0 test stubs for OBE/REC/CAT requirements**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T19:45:39Z
- **Completed:** 2026-04-12T19:50:19Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Prisma schema extended with positionId on CategorizationRule and BankTransaction, reconciliationStatus on BankTransaction, and Position reverse relations
- Validators updated with refine enforcing at least one of accountId or positionId on categorization rules
- Entity-wide positions API endpoint returning positions with holding metadata, GL account info
- 4 new Wave 0 test stub files (20 todo tests) covering OBE-01/02/03, REC-01, REC-04, CAT-01, CAT-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + validator + categorize engine extension** - `fe24a8e` (feat)
2. **Task 2: Positions API endpoint + Wave 0 test stubs** - `f7435d1` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - positionId on CategorizationRule/BankTransaction, reconciliationStatus, Position reverse relations
- `src/validators/bank-transaction.ts` - accountId optional with refine, positionId/reconciliationStatus fields
- `src/lib/bank-transactions/categorize.ts` - RuleInput extended with positionId, nullable accountId
- `src/app/api/entities/[entityId]/bank-transactions/rules/route.ts` - Position validation, positionId in rule create/retroactive match
- `src/app/api/entities/[entityId]/positions/route.ts` - New entity-wide positions list endpoint
- `tests/bank-transactions/opening-balance.test.ts` - OBE-01/02/03 stubs (8 todos)
- `tests/bank-transactions/position-picker.test.ts` - CAT-01 stubs (4 todos)
- `tests/bank-transactions/auto-reconcile.test.ts` - REC-01 stubs (3 todos)
- `tests/bank-transactions/reconciliation-summary.test.ts` - REC-04 stubs (3 todos)
- `tests/bank-transactions/categorize.test.ts` - CAT-03 position-targeted rule stubs (2 todos)

## Decisions Made
- Made accountId optional on CategorizationRule with Zod refine requiring at least one of accountId/positionId -- existing rules continue working via accountId, new position-targeted rules use positionId
- Used String type with default "PENDING" for reconciliationStatus rather than a Prisma enum for flexibility with future status values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated rules API for position-targeted rule support**
- **Found during:** Task 1 (schema + validator changes)
- **Issue:** Rules POST endpoint assumed accountId was always present -- would crash on position-targeted rules with no accountId
- **Fix:** Made account validation conditional on accountId presence, added positionId validation, updated create data and retroactive matching to include positionId
- **Files modified:** src/app/api/entities/[entityId]/bank-transactions/rules/route.ts
- **Verification:** Code review confirms correct null handling for both paths
- **Committed in:** fe24a8e (Task 1 commit)

**2. [Rule 1 - Bug] Updated TestRule type in categorize tests**
- **Found during:** Task 1
- **Issue:** TestRule type had `accountId: string` (non-nullable) which no longer matched the updated `RuleInput` interface
- **Fix:** Changed to `accountId: string | null` and added optional `positionId` field
- **Files modified:** tests/bank-transactions/categorize.test.ts
- **Verification:** All 5 existing categorize tests pass
- **Committed in:** fe24a8e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness with the new optional accountId. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation ready for position-targeted categorization UX (plan 02)
- Positions API ready for position picker component
- reconciliationStatus field ready for auto-reconcile on post (plan 03/04)
- Wave 0 test stubs ready to be filled in by subsequent plans

## Self-Check: PASSED

All 8 created/modified files verified on disk. Both task commits (fe24a8e, f7435d1) verified in git log.

---
*Phase: 11-categorization-ux-opening-balances*
*Completed: 2026-04-12*
