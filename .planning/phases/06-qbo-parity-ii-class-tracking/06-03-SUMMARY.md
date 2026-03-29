---
phase: 06-qbo-parity-ii-class-tracking
plan: 03
subsystem: reports, api, ui
tags: [prisma-raw-sql, dimension-slicing, column-per-tag, trial-balance-filter, income-statement]

# Dependency graph
requires:
  - phase: 06-qbo-parity-ii-class-tracking
    provides: Dimension and DimensionTag models, CRUD API, JE line tagging
  - phase: 03-ledger-and-trial-balance
    provides: Trial Balance queries and page
  - phase: 05-cash-accrual-toggle
    provides: Income Statement with cash/accrual basis
provides:
  - Income Statement dimension column-per-tag view (sliced by any dimension)
  - Trial Balance dimension filtering with AND logic across dimensions
  - DimensionedIncomeStatementData types for column-per-tag layout
  - DimensionFilter type for multi-dimension TB filtering
  - IncomeStatementView reusable component
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [dimension-column-per-tag-sql, inner-join-and-filter-pattern, prisma-dynamic-joins]

key-files:
  created:
    - src/components/reports/income-statement-view.tsx
    - src/app/(auth)/reports/income-statement/page.tsx
  modified:
    - src/lib/queries/report-queries.ts
    - src/lib/queries/trial-balance-queries.ts
    - src/app/api/entities/[entityId]/reports/income-statement/route.ts
    - src/app/api/entities/[entityId]/trial-balance/route.ts
    - src/app/(auth)/reports/page.tsx
    - src/app/(auth)/trial-balance/page.tsx

key-decisions:
  - "LEFT JOIN dimension tags for P&L column-per-tag: NULL tag_id becomes Unclassified bucket"
  - "INNER JOIN per dimension filter for TB AND logic -- only lines tagged with ALL specified tags"
  - "Extracted IncomeStatementView as reusable component from reports page for standalone use"
  - "HAVING clause to exclude zero-balance accounts when dimension filters active on TB"

patterns-established:
  - "Dimension slicing pattern: LEFT JOIN dimension_tags with GROUP BY account+tag for column-per-tag layout"
  - "AND-filter pattern: one INNER JOIN per dimension filter with Prisma.raw aliases for dynamic SQL"

requirements-completed: [CLASS-03, CLASS-04, CLASS-05]

# Metrics
duration: 9min
completed: 2026-03-29
---

# Phase 6 Plan 03: Dimension Report Slicing Summary

**P&L column-per-tag view with dimension picker plus TB multi-dimension AND filtering with dynamic INNER JOIN pattern**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-29T11:48:38Z
- **Completed:** 2026-03-29T11:58:26Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Income Statement "View by" dimension picker showing column-per-tag layout with tag columns + Unclassified + Total
- Trial Balance per-dimension filter dropdowns with AND logic across dimensions
- Cash/accrual toggle works independently of dimension slicing
- CSV export includes tag columns when dimension view is active
- Reports without dimension parameters behave exactly as before (CLASS-05 backward compat)

## Task Commits

Each task was committed atomically:

1. **Task 1: Income Statement query and UI with dimension column-per-tag view** - `26b723a` (feat)
2. **Task 2: Trial Balance dimension filtering** - `9fa624c` (feat)

## Files Created/Modified
- `src/lib/queries/report-queries.ts` - Added DimensionedIncomeStatementData types, getIncomeStatementByDimension with LEFT JOIN dimension tags
- `src/lib/queries/trial-balance-queries.ts` - Added DimensionFilter type, dynamic INNER JOINs for AND filtering, HAVING for zero-balance exclusion
- `src/app/api/entities/[entityId]/reports/income-statement/route.ts` - Accept optional dimensionId query param
- `src/app/api/entities/[entityId]/trial-balance/route.ts` - Parse JSON-encoded dimensionFilters, Zod validation
- `src/app/(auth)/reports/page.tsx` - Replaced inline IS tab with IncomeStatementView component
- `src/components/reports/income-statement-view.tsx` - Reusable IS component with dimension picker, column-per-tag layout, CSV export
- `src/app/(auth)/reports/income-statement/page.tsx` - Standalone IS page with basis toggle
- `src/app/(auth)/trial-balance/page.tsx` - Dimension filter dropdowns, fetch dimensions, filter state management

## Decisions Made
- LEFT JOIN for P&L dimension slicing (entries without tags show in Unclassified column, totals reconcile)
- INNER JOIN per dimension filter for TB AND logic (one join alias per filter using Prisma.raw)
- Extracted IncomeStatementView as separate component to reduce reports page complexity and enable standalone page
- JSON.stringify for dimension filter dependency key in useCallback to prevent infinite re-renders

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Select onValueChange types `string | null`**
- **Found during:** Task 1 (build verification)
- **Issue:** base-ui Select's onValueChange passes `string | null`, not compatible with `Dispatch<SetStateAction<string>>`
- **Fix:** Wrapped with `(v) => setSelectedDimensionId(v ?? "none")` to handle null
- **Files modified:** src/components/reports/income-statement-view.tsx
- **Verification:** Build succeeded
- **Committed in:** 26b723a (Task 1 commit)

**2. [Rule 1 - Bug] Prisma.join separator must be string, not Prisma.sql**
- **Found during:** Task 2 (build verification)
- **Issue:** `Prisma.join(clauses, Prisma.sql` backtick `)` fails -- second arg must be string type
- **Fix:** Changed to `Prisma.join(joinClauses, "\n")`
- **Files modified:** src/lib/queries/trial-balance-queries.ts
- **Verification:** Build succeeded
- **Committed in:** 9fa624c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both were type-level fixes discovered during compilation. No scope creep.

## Issues Encountered
None beyond the type fixes noted in deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dimension reporting complete: P&L can be sliced by any dimension, TB can be filtered by any combination
- All CLASS requirements (CLASS-01 through CLASS-05) addressed across plans 06-01 through 06-03
- Phase 6 complete -- ready for Phase 7

## Self-Check: PASSED

All 8 files verified present. Both task commits (26b723a, 9fa624c) confirmed in git log.

---
*Phase: 06-qbo-parity-ii-class-tracking*
*Completed: 2026-03-29*
