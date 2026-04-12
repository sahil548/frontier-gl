---
phase: 12-reporting-fixes-onboarding-wizard
plan: 01
subsystem: database, api
tags: [prisma, cash-flow, enum, migration, zod, backfill]

# Dependency graph
requires:
  - phase: 12-00
    provides: "Research and planning context for Phase 12"
provides:
  - "CashFlowCategory enum (OPERATING, INVESTING, FINANCING, EXCLUDED)"
  - "Account.cashFlowCategory nullable field"
  - "Account.isContra boolean field"
  - "ColumnMapping model for saved CSV import mappings"
  - "Entity.wizardProgress Json field"
  - "inferCashFlowCategory backfill utility"
  - "HEDGE_FUND_TEMPLATE chart of accounts"
  - "Account API routes accept/return cashFlowCategory and isContra"
affects: [12-02, 12-03, 12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CashFlowCategory enum for static cash flow classification"
    - "Name-based inference for backfill migration"
    - "Template-driven cashFlowCategory pre-fill"

key-files:
  created:
    - "src/lib/accounts/cash-flow-backfill.ts"
  modified:
    - "prisma/schema.prisma"
    - "src/lib/validators/account.ts"
    - "src/lib/accounts/template.ts"
    - "src/app/api/entities/[entityId]/accounts/route.ts"
    - "src/app/api/entities/[entityId]/accounts/[accountId]/route.ts"
    - "src/__tests__/utils/cash-flow-backfill.test.ts"
    - "src/lib/validators/account.test.ts"

key-decisions:
  - "Name-based inference matches existing report-queries.ts cash flow logic exactly"
  - "HEDGE_FUND_TEMPLATE uses prime brokerage structure with long/short securities"
  - "applyTemplate signature extended with template name parameter (backward compatible)"

patterns-established:
  - "CashFlowCategory enum: OPERATING for working capital, INVESTING for investments, FINANCING for debt/equity, EXCLUDED for cash"
  - "Template cashFlowCategory pre-fill: balance sheet accounts get category, income/expense get null"

requirements-completed: [SCHEMA-01, CF-01, CF-03]

# Metrics
duration: 8min
completed: 2026-04-12
---

# Phase 12 Plan 01: Schema Migration + Backfill + Templates Summary

**CashFlowCategory enum, isContra flag, ColumnMapping model, backfill utility, hedge fund template, and API route updates for cash flow classification**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-12T21:10:27Z
- **Completed:** 2026-04-12T21:19:21Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- CashFlowCategory enum (OPERATING, INVESTING, FINANCING, EXCLUDED) added to Prisma schema with Account.cashFlowCategory and isContra fields
- ColumnMapping model and Entity.wizardProgress field added for wizard/CSV import support
- inferCashFlowCategory backfill utility with 22 tests covering all classification paths
- HEDGE_FUND_TEMPLATE with prime brokerage, long/short securities, and partner capital accounts
- Account API routes (create, update, get) accept and serialize cashFlowCategory and isContra

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + validators + backfill utility** - `4eda5d8` (feat) -- TDD: 46 tests passing
2. **Task 2: Update COA templates and account API routes** - `65bf2b0` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - CashFlowCategory enum, Account fields, ColumnMapping model, Entity.wizardProgress
- `src/lib/accounts/cash-flow-backfill.ts` - inferCashFlowCategory + backfillAllAccounts utility
- `src/lib/validators/account.ts` - Extended with cashFlowCategory (nativeEnum) and isContra (boolean)
- `src/lib/accounts/template.ts` - FAMILY_OFFICE_TEMPLATE with cashFlowCategory, new HEDGE_FUND_TEMPLATE, updated applyTemplate
- `src/app/api/entities/[entityId]/accounts/route.ts` - POST accepts new fields, GET serializes them
- `src/app/api/entities/[entityId]/accounts/[accountId]/route.ts` - PUT accepts new fields, GET serializes them
- `src/__tests__/utils/cash-flow-backfill.test.ts` - 22 tests for inferCashFlowCategory
- `src/lib/validators/account.test.ts` - 9 new tests for cashFlowCategory and isContra validation

## Decisions Made
- Name-based inference matches existing report-queries.ts cash flow logic exactly for backward compatibility
- HEDGE_FUND_TEMPLATE uses prime brokerage structure with long/short securities and partner capital
- applyTemplate signature extended with templateName parameter, defaults to "family_office" for backward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema migration complete with all fields needed by Plans 02-05
- cashFlowCategory can be used immediately by cash flow refactoring (Plan 02)
- isContra ready for contra display logic (Plan 03)
- ColumnMapping and wizardProgress ready for onboarding wizard (Plan 04)
- Backfill utility ready for migrating existing accounts

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-12*
