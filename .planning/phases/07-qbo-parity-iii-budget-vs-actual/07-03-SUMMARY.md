---
phase: 07-qbo-parity-iii-budget-vs-actual
plan: 03
subsystem: api, ui
tags: [budget, variance, report, csv-export, prisma-raw-sql]

requires:
  - phase: 07-01
    provides: Budget Prisma model with entity+account+year+month data
provides:
  - getBudgetVsActual query function joining actuals with budget data
  - GET /api/entities/:entityId/reports/budget-vs-actual endpoint
  - Budget vs Actual tab on Reports page with variance display, drill-down, and CSV export
affects: []

tech-stack:
  added: []
  patterns: [budget-variance-computation, favorable-unfavorable-coloring]

key-files:
  created:
    - src/app/api/entities/[entityId]/reports/budget-vs-actual/route.ts
  modified:
    - src/lib/queries/report-queries.ts
    - src/app/(auth)/reports/page.tsx
    - src/__tests__/api/budget-report.test.ts

key-decisions:
  - "Variance direction: income favorable = actual > budget, expense favorable = actual < budget"
  - "Full-month budget inclusion: a month's budget is included if YYYYMM falls within start/end date range"
  - "BudgetVsActualTotals interface extracted for reuse across section totals and net income"

patterns-established:
  - "Budget variance computation: income variance = actual - budget, expense variance = budget - actual"
  - "Variance coloring: positive variance = green (favorable), negative = red (unfavorable)"

requirements-completed: [BUDG-03, BUDG-05]

duration: 4min
completed: 2026-04-10
---

# Phase 7 Plan 3: Budget vs Actual Report Summary

**Budget vs actual report with variance analysis joining actuals with budget data, green/red coloring, GL drill-down, and CSV export**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-10T14:05:57Z
- **Completed:** 2026-04-10T14:09:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- getBudgetVsActual query joining posted journal entries with budget amounts, computing variance per account
- Budget vs Actual tab on Reports page with Income/Expense sections, subtotals, and net income row
- Green/red variance coloring for favorable/unfavorable variances
- Account row drill-down to GL Ledger with date range parameters
- CSV export with section headers, subtotals, and net income
- 8 passing tests for variance logic, section totals, and CSV export data format

## Task Commits

Each task was committed atomically:

1. **Task 1: Budget vs Actual query and API endpoint** - `980ba23` (feat)
2. **Task 2: Budget vs Actual tab on Reports page** - `d032d55` (feat)

## Files Created/Modified
- `src/lib/queries/report-queries.ts` - Added getBudgetVsActual function with BudgetVsActualRow/Data/Totals interfaces
- `src/app/api/entities/[entityId]/reports/budget-vs-actual/route.ts` - GET endpoint with auth, entity access, and date range validation
- `src/app/(auth)/reports/page.tsx` - Budget vs Actual tab with variance table, coloring, drill-down, and CSV export
- `src/__tests__/api/budget-report.test.ts` - 8 tests for variance direction, null percent, section totals, CSV format

## Decisions Made
- Variance direction follows accounting convention: income favorable = actual > budget, expense favorable = actual < budget
- Full-month budget inclusion based on YYYYMM comparison (year*100+month between start and end)
- Extracted BudgetVsActualTotals interface for reuse across totalIncome, totalExpenses, and netIncome
- Zero-budget accounts display "--" for budget column and variance % (variancePercent = null)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Budget vs Actual report complete, fulfilling BUDG-03 and BUDG-05
- All budget feature set plans (01 data model, 02 grid UI, 03 report) now delivered
- Plan 04 (if exists) can proceed

## Self-Check: PASSED
