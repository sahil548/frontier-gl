---
phase: 12-reporting-fixes-onboarding-wizard
plan: 00
subsystem: testing
tags: [vitest, test-stubs, wave-0, nyquist]

# Dependency graph
requires: []
provides:
  - "Test stub files for all Phase 12 utility functions (CF, contra, rate, opening-balance, LLM mapper)"
  - "Test stub files for Phase 12 API endpoints (rate-budget, column-mappings, cash-flow-field)"
  - "Extended account validator tests with Phase 12 cashFlowCategory/isContra todos"
affects: [12-01, 12-02, 12-03, 12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Commented-out imports in test stubs to avoid parse errors before implementation files exist"]

key-files:
  created:
    - src/__tests__/utils/cash-flow-backfill.test.ts
    - src/__tests__/utils/contra-netting.test.ts
    - src/__tests__/utils/rate-based-budget.test.ts
    - src/__tests__/utils/opening-balance.test.ts
    - src/__tests__/utils/llm-column-mapper.test.ts
    - src/__tests__/queries/cash-flow-field.test.ts
    - src/__tests__/api/rate-budget.test.ts
    - src/__tests__/api/column-mappings.test.ts
  modified:
    - src/lib/validators/account.test.ts

key-decisions:
  - "Commented-out imports in test stubs to avoid parse errors before implementation files exist (Phase 7 pattern)"

patterns-established:
  - "Wave 0 test stub pattern: test.todo() with commented imports for Nyquist validation"

requirements-completed: [SCHEMA-01]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 12 Plan 00: Wave 0 Test Stubs Summary

**39 test.todo() stubs across 9 files (8 new, 1 extended) covering cash flow, contra netting, rate budgets, opening balances, LLM mapping, and account schema extensions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T21:09:56Z
- **Completed:** 2026-04-12T21:13:42Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created 5 utility function test stubs (cash-flow-backfill, contra-netting, rate-based-budget, opening-balance, llm-column-mapper)
- Created 3 API/query test stubs (cash-flow-field, rate-budget, column-mappings)
- Extended existing account validator tests with 4 Phase 12 cashFlowCategory/isContra todos
- All 9 files parseable by vitest with 39 total todo placeholders

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unit test stubs for utility functions** - `b4ef393` (test)
2. **Task 2: Create API test stubs and extend account validator tests** - `1c96617` (test)

## Files Created/Modified
- `src/__tests__/utils/cash-flow-backfill.test.ts` - CF-01 cash flow category inference stubs (6 todos)
- `src/__tests__/utils/contra-netting.test.ts` - CONTRA-01 netting logic stubs (4 todos)
- `src/__tests__/utils/rate-based-budget.test.ts` - RATE-01 budget computation stubs (4 todos)
- `src/__tests__/utils/opening-balance.test.ts` - WIZ-03 balance check stubs (4 todos)
- `src/__tests__/utils/llm-column-mapper.test.ts` - CSV-01/CSV-02 column mapping stubs (6 todos)
- `src/__tests__/queries/cash-flow-field.test.ts` - CF-02 field-based classification stubs (4 todos)
- `src/__tests__/api/rate-budget.test.ts` - RATE-02 rate-based budget API stubs (3 todos)
- `src/__tests__/api/column-mappings.test.ts` - CSV-04 saved mappings API stubs (4 todos)
- `src/lib/validators/account.test.ts` - SCHEMA-01 extended with Phase 12 todos (4 todos)

## Decisions Made
- Commented-out imports in test stubs to avoid parse errors before implementation files exist (continues Phase 7 pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored linter-expanded test stubs to todo form**
- **Found during:** Post-Task 2 verification
- **Issue:** Linter auto-expanded test.todo() stubs into real tests with assertions against non-existent implementation code, causing import/assertion failures
- **Fix:** Restored cash-flow-backfill.test.ts and account.test.ts to their intended test.todo() stub form
- **Files modified:** src/__tests__/utils/cash-flow-backfill.test.ts, src/lib/validators/account.test.ts
- **Verification:** All 9 files pass vitest with 39 todos, 15 existing tests still passing
- **Committed in:** a8eef33

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary to maintain correct stub-only state. No scope creep.

## Issues Encountered
None beyond the linter expansion addressed above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 39 test stubs ready for Plans 01-05 to fill in with real implementations
- Existing test suite unaffected (15 account validator tests still passing)
- queries/ test directory created (was missing)

## Self-Check: PASSED

- 9/9 files found on disk
- 3/3 commits found in git log (b4ef393, 1c96617, a8eef33)

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-12*
