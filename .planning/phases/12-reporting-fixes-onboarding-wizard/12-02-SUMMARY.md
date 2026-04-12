---
phase: 12-reporting-fixes-onboarding-wizard
plan: 02
subsystem: queries, ui
tags: [cash-flow, contra-accounts, report-queries, account-form, balance-sheet, vitest]

# Dependency graph
requires:
  - phase: 12-01
    provides: "CashFlowCategory enum, Account.cashFlowCategory/isContra fields, extended validators"
provides:
  - "Field-based cash flow classification via classifyCashFlowRow pure function"
  - "getCashFlowStatement refactored to use cashFlowCategory field"
  - "Consolidated cash flow inherits field-based classification"
  - "Account form with cashFlowCategory dropdown and isContra toggle"
  - "BalanceSheetView component with contra-netting display"
  - "applyContraNetting utility for parent/contra grouping"
affects: [12-03, 12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function extraction for testable SQL post-processing logic"
    - "Contra netting as display-only grouping (no data mutation)"
    - "Conditional form fields based on account type using watch()"

key-files:
  created:
    - "src/lib/queries/cash-flow-classify.ts"
    - "src/lib/accounts/contra-netting.ts"
    - "src/components/reports/balance-sheet-view.tsx"
  modified:
    - "src/lib/queries/report-queries.ts"
    - "src/components/accounts/account-form.tsx"
    - "src/app/(auth)/reports/page.tsx"
    - "src/__tests__/queries/cash-flow-field.test.ts"
    - "src/__tests__/utils/contra-netting.test.ts"

key-decisions:
  - "Extracted classifyCashFlowRow as pure function for testability rather than testing through DB"
  - "Contra netting uses Math.abs for contra balance deduction (handles both positive and negative raw values)"
  - "Balance sheet SQL query extended with isContra and parentId for contra display support"

patterns-established:
  - "classifyCashFlowRow: Pure function for cash flow section routing by cashFlowCategory field"
  - "applyContraNetting: Display-only grouping that preserves raw balances"
  - "BalanceSheetView: Reusable component with contra-aware section rendering"

requirements-completed: [CF-02, CF-03, CONTRA-01, CONTRA-02]

# Metrics
duration: 8min
completed: 2026-04-12
---

# Phase 12 Plan 02: Cash Flow Field Refactor + Contra Netting Summary

**Field-based cash flow classification replacing name matching, account form with cashFlowCategory/isContra controls, and balance sheet contra netting display**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-12T21:23:51Z
- **Completed:** 2026-04-12T21:32:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- getCashFlowStatement refactored from name-matching to cashFlowCategory field-based classification with 11 unit tests
- Account form extended with conditional cashFlowCategory dropdown and isContra toggle (visible only for ASSET/LIABILITY/EQUITY)
- BalanceSheetView component created with contra account grouping: parent/Less:/Net display pattern
- applyContraNetting utility with 6 tests covering single contra, multiple contras, standalone contras, and mixed scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor cash flow queries to use cashFlowCategory field** - `c9477ae` (test, RED) + `062ea70` (feat, GREEN) -- TDD: 11 tests passing
2. **Task 2: Account form extensions and balance sheet contra netting** - `c8c46d4` (feat) -- 6 tests passing

## Files Created/Modified
- `src/lib/queries/cash-flow-classify.ts` - Pure function for cash flow row classification by cashFlowCategory
- `src/lib/accounts/contra-netting.ts` - applyContraNetting utility for parent/contra grouping
- `src/components/reports/balance-sheet-view.tsx` - Reusable BalanceSheetView with contra-aware rendering
- `src/lib/queries/report-queries.ts` - Refactored getCashFlowStatement and getBalanceSheet queries
- `src/components/accounts/account-form.tsx` - Added cashFlowCategory Select and isContra Checkbox
- `src/app/(auth)/reports/page.tsx` - Uses BalanceSheetView component for single-entity balance sheet
- `src/__tests__/queries/cash-flow-field.test.ts` - 11 tests for field-based classification
- `src/__tests__/utils/contra-netting.test.ts` - 6 tests for contra netting utility

## Decisions Made
- Extracted classifyCashFlowRow as a pure function for unit testing without DB mocking
- Contra netting uses Math.abs on contra balances for consistent deduction regardless of sign convention
- Balance sheet SQL extended with isContra/parentId to support display-only contra grouping
- Cash balance query uses cashFlowCategory='EXCLUDED' instead of LOWER(name) LIKE '%cash%'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended ReportRow interface with isContra/parentId**
- **Found during:** Task 2 (Balance sheet contra netting)
- **Issue:** ReportRow interface lacked isContra and parentId fields needed for contra grouping
- **Fix:** Added optional isContra and parentId to ReportRow, updated getBalanceSheet SQL to select them
- **Files modified:** src/lib/queries/report-queries.ts
- **Verification:** Contra netting utility receives proper data shape
- **Committed in:** c8c46d4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for contra netting to function -- ReportRow needed the fields to pass through to the view component. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cash flow classification fully field-based, ready for any future category additions
- Contra netting display pattern established for balance sheet
- Account form extensions ready for use in onboarding wizard (Plan 04)
- BalanceSheetView component reusable for both single-entity and potential consolidated views

## Self-Check: PASSED

All 8 files verified present. All 3 commits verified in git log.

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-12*
