---
phase: 07-qbo-parity-iii-budget-vs-actual
plan: 01
subsystem: api, database
tags: [prisma, zod, budget, fiscal-year, csv-import, decimal]

requires:
  - phase: 07-00
    provides: test stubs for budget validators, fiscal year utility, and API endpoints
provides:
  - Budget Prisma model with entity+account+year+month unique constraint
  - getFiscalYearMonths and getFiscalYearDateRange fiscal year utilities
  - budgetLineSchema, budgetUpsertSchema, budgetCsvRowSchema Zod validators
  - GET/PUT /budgets and POST /budgets/import API endpoints
affects: [07-02-budget-grid-ui, 07-03-budget-vs-actual-report]

tech-stack:
  added: []
  patterns: [fiscal-year-month-sequence, budget-upsert-transaction, csv-budget-import]

key-files:
  created:
    - src/lib/utils/fiscal-year.ts
    - src/validators/budget.ts
    - src/app/api/entities/[entityId]/budgets/route.ts
    - src/app/api/entities/[entityId]/budgets/import/route.ts
  modified:
    - prisma/schema.prisma
    - src/__tests__/utils/fiscal-year.test.ts
    - src/__tests__/validators/budget.test.ts
    - src/__tests__/api/budgets.test.ts
    - src/__tests__/api/budget-import.test.ts

key-decisions:
  - "Prisma.Decimal import from @/generated/prisma/client matching existing project pattern"
  - "Budget CSV import accepts JSON body { csv: '...' } matching existing COA import pattern"
  - "Zero-amount budget rows filtered out at API level to keep DB clean"

patterns-established:
  - "Fiscal year month computation: getFiscalYearMonths computes 12-month sequence from FYE string"
  - "Budget upsert transaction: array of prisma.budget.upsert calls in $transaction"

requirements-completed: [BUDG-01, BUDG-02, BUDG-04]

duration: 5min
completed: 2026-04-10
---

# Phase 7 Plan 1: Budget Data Model and API Summary

**Budget Prisma model with fiscal-year-aligned CRUD endpoints and CSV import using entity-scoped upsert transactions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-10T13:58:26Z
- **Completed:** 2026-04-10T14:03:17Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Budget model in Prisma with entityId+accountId+year+month unique constraint and Decimal(19,4) amount
- Fiscal year utility computing correct 12-month sequences for any FYE (standard 12-31 and non-standard like 03-31, 06-30)
- Zod validators for budget upsert and CSV import with decimal precision preservation
- GET/PUT budget endpoints with entity access checks and INCOME/EXPENSE filtering
- CSV import endpoint with flexible header parsing, account lookup, and upsert behavior
- 35 passing tests across 4 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Budget model, fiscal year utility, and Zod validators** - `abc279a` (feat)
2. **Task 2: Budget CRUD and CSV import API endpoints** - `1e06812` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Budget model with unique constraint and indexes
- `src/lib/utils/fiscal-year.ts` - getFiscalYearMonths and getFiscalYearDateRange utilities
- `src/validators/budget.ts` - budgetLineSchema, budgetUpsertSchema, budgetCsvRowSchema
- `src/app/api/entities/[entityId]/budgets/route.ts` - GET and PUT budget endpoints
- `src/app/api/entities/[entityId]/budgets/import/route.ts` - POST CSV import endpoint
- `src/__tests__/utils/fiscal-year.test.ts` - 7 tests for fiscal year month sequences
- `src/__tests__/validators/budget.test.ts` - 11 tests for Zod schema validation
- `src/__tests__/api/budgets.test.ts` - 10 tests for budget API validation
- `src/__tests__/api/budget-import.test.ts` - 7 tests for CSV import validation

## Decisions Made
- Used `@/generated/prisma/client` import path for Prisma namespace matching existing project convention
- Budget CSV import accepts JSON body `{ csv: "..." }` matching existing COA import route pattern
- Zero-amount budget rows filtered at API level before upsert to keep database clean
- Role check via entityAccess lookup (Owner/Editor only for writes) matching team route pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma import path**
- **Found during:** Task 2 (API endpoints)
- **Issue:** Import `@/generated/prisma` doesn't resolve; project uses `@/generated/prisma/client`
- **Fix:** Changed import to `@/generated/prisma/client` in both route files
- **Files modified:** budgets/route.ts, budgets/import/route.ts
- **Verification:** `npx tsc --noEmit` passes for all budget files
- **Committed in:** 1e06812 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial import path correction. No scope creep.

## Issues Encountered
- Database unreachable during `prisma db push` (network/Neon connectivity). Schema is correct; push deferred to when database is available. Prisma generate succeeded.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Budget data layer complete: model, utilities, validators, and endpoints ready
- Plan 02 (budget grid UI) can consume GET/PUT endpoints
- Plan 03 (budget vs actual report) can query budget data via fiscal year

## Self-Check: PASSED

All 9 files verified present. Both task commits (abc279a, 1e06812) verified in git log.

---
*Phase: 07-qbo-parity-iii-budget-vs-actual*
*Completed: 2026-04-10*
