---
phase: 12-reporting-fixes-onboarding-wizard
plan: 03
subsystem: api, ui, budgets
tags: [decimal.js, rate-based, budget, holdings, sheet, upsert]

# Dependency graph
requires:
  - phase: 12-01
    provides: "Schema with Budget model (year/month/amount), SubledgerItem.fairMarketValue field"
provides:
  - "computeMonthlyBudget utility (holdingValue * rate / 12)"
  - "POST /api/entities/:entityId/budgets/rate-target endpoint"
  - "Budget page 'Generate from Rate' Sheet UI with recalculate"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rate-based budget: snapshot computation stored as regular budget rows"
    - "Upsert-based recalculation: same endpoint re-POSTed overwrites old values"

key-files:
  created:
    - "src/lib/budgets/rate-based.ts"
    - "src/app/api/entities/[entityId]/budgets/rate-target/route.ts"
  modified:
    - "src/app/(auth)/budgets/page.tsx"
    - "src/__tests__/utils/rate-based-budget.test.ts"
    - "src/__tests__/api/rate-budget.test.ts"

key-decisions:
  - "computeMonthlyBudget uses Decimal.js for financial precision, rounds to 4 decimal places matching Decimal(19,4)"
  - "Recalculate uses same POST endpoint with upsert (no separate recalculate route needed)"
  - "Holdings fetched from /subledger endpoint, filtered to items with fairMarketValue"

patterns-established:
  - "Rate budget computation: holdingValue.times(rate).dividedBy(12).toDecimalPlaces(4)"
  - "Sheet slide-over for budget generation form with summary cards showing previous generations"

requirements-completed: [RATE-01, RATE-02]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 12 Plan 03: Rate-Based Budget Targets Summary

**computeMonthlyBudget utility with Decimal.js precision, rate-target API endpoint generating 12 monthly budget lines, and budget page Sheet UI with holding/account/rate selectors and recalculate button**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T21:24:01Z
- **Completed:** 2026-04-12T21:29:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- computeMonthlyBudget utility computes holdingValue * rate / 12 with 4 decimal precision using Decimal.js
- POST /api/entities/:entityId/budgets/rate-target generates 12 monthly budget lines via upsert for a fiscal year
- Budget page "Generate from Rate" Sheet with holding picker, income account selector, rate input, and recalculate button
- 16 tests passing (6 computation unit tests + 10 validation schema tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rate-based budget computation utility and API endpoint** - `094a579` (test) + `390ce12` (feat) -- TDD: 16 tests passing
2. **Task 2: Budget page UI integration for rate-based targets with recalculate** - `7dbab1e` (feat)

## Files Created/Modified
- `src/lib/budgets/rate-based.ts` - computeMonthlyBudget utility with RateBudgetInput interface
- `src/app/api/entities/[entityId]/budgets/rate-target/route.ts` - POST endpoint with Zod validation, holding lookup, 12-month budget generation via upsert
- `src/app/(auth)/budgets/page.tsx` - Sheet slide-over with holding selector, income account selector, rate input, generate button, and recalculate per-entry
- `src/__tests__/utils/rate-based-budget.test.ts` - 6 unit tests for computeMonthlyBudget (precision, zero handling, overflow)
- `src/__tests__/api/rate-budget.test.ts` - 10 validation tests for rate-target schema (CUID, rate bounds, fiscal year)

## Decisions Made
- computeMonthlyBudget uses Decimal.js for financial precision, rounds to 4 decimal places matching DB Decimal(19,4)
- No separate recalculate endpoint: same POST with upsert naturally overwrites previous budget amounts
- Holdings sourced from /subledger endpoint, filtered client-side to items with non-null fairMarketValue
- Annual rate input accepts percentage (0-100) in UI, converts to decimal (0-1) for API
- Rate target entries persist in component state for session-level recalculate access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rate-based budgets fully operational, integrating with existing budget grid
- Generated values appear as normal editable cells in budget grid
- Recalculate button available for any previously generated rate target in current session

## Self-Check: PASSED

All 5 created/modified files verified on disk. All 3 task commits (094a579, 390ce12, 7dbab1e) found in git history.

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-12*
