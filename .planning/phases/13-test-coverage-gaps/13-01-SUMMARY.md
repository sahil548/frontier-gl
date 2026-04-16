---
phase: 13-test-coverage-gaps
plan: 01
subsystem: testing
tags: [vitest, regression-tests, dimensions, prisma-mock, vi.hoisted]

# Dependency graph
requires:
  - phase: 06-dimensions
    provides: getIncomeStatement(..., dimensionId) dispatcher and getTrialBalance(..., dimensionFilters) filter branch
provides:
  - "Regression tests for dimensioned Income Statement (CLASS-03)"
  - "Regression tests for Trial Balance dimension filter (CLASS-04)"
  - "Regression tests for Unclassified bucket aggregation (CLASS-05)"
affects: [future-refactor-of-report-queries, future-refactor-of-trial-balance-queries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for top-level Prisma mock reference in tests that import @/lib/db/prisma"
    - "Snake_case mock row shape matching raw SQL aliases (Pitfall 3)"
    - "Twin mockResolvedValueOnce for dimensioned IS queries (rows + allTags, Pitfall 4)"

key-files:
  created:
    - tests/dimensions/income-statement-by-dimension.test.ts
    - tests/dimensions/tb-dimension-filter.test.ts
    - tests/dimensions/unclassified-entries.test.ts
  modified: []

key-decisions:
  - "Used vi.hoisted() pattern instead of top-level const because @/ path alias module resolution fails with plain top-level mock refs"
  - "Public getIncomeStatement(..., dimensionId) dispatcher called (not private getIncomeStatementByDimension) per Pitfall 1 — zero production refactor"
  - "Scope-respect: left sibling-agent Plan 02 modifications (auto-reconcile/categorize/etc.) untouched"

patterns-established:
  - "Pattern 1: vi.hoisted() with destructured mock refs for Prisma $queryRaw mocking via @/ aliased imports"
  - "Pattern 2: Two sequential mockResolvedValueOnce for functions that issue multiple $queryRaw calls"

requirements-completed: [CLASS-03, CLASS-04, CLASS-05]

# Metrics
duration: 8min
completed: 2026-04-16
---

# Phase 13 Plan 01: Dimensions Test Coverage Backfill Summary

**Three new Prisma-mocked Vitest files giving regression coverage to the Phase 6 dimensioned income statement and trial-balance filter mapping layers (CLASS-03/04/05), with zero production source changes.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-16T05:51:22Z
- **Completed:** 2026-04-16T06:00:00Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- Created `tests/dimensions/income-statement-by-dimension.test.ts` with 3 live assertions covering the dimensioned IS mapping (INCOME/EXPENSE row routing, tag columns, Unclassified bucket, section totals, twin-query contract)
- Created `tests/dimensions/tb-dimension-filter.test.ts` with 4 live assertions covering both filter and no-filter branches of `getTrialBalance`, with explicit `typeof number` guards against string leakage
- Created `tests/dimensions/unclassified-entries.test.ts` with 3 live assertions covering both Unclassified code paths (null tag + out-of-dimension tag) and a mixed-split case
- Full suite stays green: 530 passing (was 504 baseline; +26 passing = 10 new from this plan + 16 from sibling-agent Plan 02 work). Seven pre-existing `localStorage.clear` failures in `use-entity.test.ts` remain unchanged (tracked in `deferred-items.md`)

## Task Commits

Each task was committed atomically:

1. **Task 1: CLASS-03 income statement by dimension** — `7584f5c` (test)
2. **Task 2: CLASS-04 trial balance dimension filter** — `7233ce8` (test)
3. **Task 3: CLASS-05 Unclassified bucket aggregation** — `eb1ba50` (test)

**Plan metadata:** pending (docs commit after SUMMARY finalization)

## Files Created/Modified

- `tests/dimensions/income-statement-by-dimension.test.ts` — 3 `it(...)` blocks: INCOME-tag mapping, EXPENSE-tag symmetry, twin-query contract (CLASS-03)
- `tests/dimensions/tb-dimension-filter.test.ts` — 4 `it(...)` blocks: single-filter branch + no-filter (omitted) + no-filter (empty array) + multi-filter branch (CLASS-04)
- `tests/dimensions/unclassified-entries.test.ts` — 3 `it(...)` blocks: null-tag path, out-of-dimension-tag path, mixed-split case (CLASS-05)

No files under `src/` were modified. Verified via `git diff --name-only 7584f5c^ eb1ba50 -- 'src/'` returning empty.

## Test Counts

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Passing tests (full suite) | 504 | 530 | +26 (10 from this plan + 16 from sibling-agent Plan 02) |
| Failing tests (full suite) | 7 pre-existing | 7 pre-existing | 0 new |
| `it.todo` stubs (full suite) | 87 | 75 | -12 (sibling-agent Plan 02 conversions) |
| `it.todo` in my 3 new files | N/A | 0 | — |
| Total `it(...)` in my 3 new files | 0 | 10 | +10 |

Per-file `it(...)` count: CLASS-03: 3 | CLASS-04: 4 | CLASS-05: 3 = **10 new live assertions**.

## Decisions Made

1. **`vi.hoisted()` pattern adopted (Rule 3 — Blocking).** Initial top-level `const mockQueryRaw = vi.fn()` + `vi.mock("@/lib/db/prisma", ...)` threw `ReferenceError: Cannot access 'mockQueryRaw' before initialization` because `vi.mock` is hoisted to the top of the module. The sibling `plaid-sync.test.ts` uses a relative path (`../../src/lib/db/prisma`) which evidently takes a different resolution path. With the `@/` alias via `vite-tsconfig-paths`, module initialization order required explicit `vi.hoisted()`. Used the documented Vitest pattern: `const { mockQueryRaw } = vi.hoisted(() => ({ mockQueryRaw: vi.fn() }));`. This is a test-side-only adjustment — no production change.

2. **Public dispatcher only (Pitfall 1 honored).** Imported `getIncomeStatement` (the public function at `report-queries.ts:100`) and passed a truthy `dimensionId` to exercise the private `getIncomeStatementByDimension` code path. Zero production re-exports.

3. **Scope discipline vs sibling agent.** At execution start, `git status` showed unrelated modifications to `tests/bank-transactions/auto-reconcile.test.ts` and `tests/bank-transactions/categorize.test.ts` (pending changes from a sibling Plan 13-02 agent). Staged only my Plan 13-01 files individually; did NOT use `git add .` or touch Plan 02 work. Sibling agent committed their changes as `bebf051` and `a67ef44` during my execution window — verified my three commits (`7584f5c`, `7233ce8`, `eb1ba50`) contain only `tests/dimensions/` files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vi.hoisted()` pattern required for Prisma mock via `@/` alias**
- **Found during:** Task 1 (first `npx vitest run`)
- **Issue:** Vitest threw `ReferenceError: Cannot access 'mockQueryRaw' before initialization` because `vi.mock(...)` is hoisted above the top-level `const mockQueryRaw = vi.fn()`. The referenced Example 1 in RESEARCH.md used the top-level-const form that works for relative paths (as in `plaid-sync.test.ts`) but not for `@/` aliased paths in this vitest 4.1.2 setup.
- **Fix:** Wrapped the mock reference in `vi.hoisted()`: `const { mockQueryRaw } = vi.hoisted(() => ({ mockQueryRaw: vi.fn() }));`. Applied the same pattern preemptively to Tasks 2 and 3.
- **Files modified:** `tests/dimensions/income-statement-by-dimension.test.ts` (during Task 1, before first commit), and applied at-write-time for Tasks 2 and 3.
- **Verification:** All three files pass `npx vitest run` individually and in the focused `tests/dimensions/` suite.
- **Committed in:** Folded into the Task 1 commit `7584f5c` (fix applied before commit, not a follow-up commit).

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Zero scope creep. The `vi.hoisted()` pattern is a test-infrastructure-only adjustment that made Example 1 work with the `@/` alias used by this codebase. All three files use the same shape as documented in RESEARCH.md Examples 1-3; only the top-level mock-reference wrapper differs.

## Issues Encountered

None beyond the `vi.hoisted` adjustment documented above. The three pre-existing test failures in `use-entity.test.ts` (`localStorage.clear is not a function`) are documented in `deferred-items.md` and were not caused by nor affected by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 13-02** (CAT-03, REC-01, REC-04, OBE-03, CAT-01) was executed in parallel by a sibling agent during this plan's window and is already committed (`bebf051`, `a67ef44`). ROADMAP progress tracking for Phase 13 should reflect both plans landed.
- CLASS-03/04/05 now have regression coverage. Future refactors of `src/lib/queries/report-queries.ts` or `src/lib/queries/trial-balance-queries.ts` row-mapping code will trigger CI signal on break.
- The `vi.hoisted()` pattern is documented here as a reusable convention for future Prisma-mocking tests that import via the `@/` alias.

## Self-Check

- [x] `tests/dimensions/income-statement-by-dimension.test.ts` exists — VERIFIED
- [x] `tests/dimensions/tb-dimension-filter.test.ts` exists — VERIFIED
- [x] `tests/dimensions/unclassified-entries.test.ts` exists — VERIFIED
- [x] Commit `7584f5c` present — VERIFIED via `git log --oneline --grep="13-01"`
- [x] Commit `7233ce8` present — VERIFIED
- [x] Commit `eb1ba50` present — VERIFIED
- [x] Zero `it.todo` in all three new files — VERIFIED (grep returned 0 matches)
- [x] 10 new `it(...)` blocks (3+4+3) — VERIFIED
- [x] `npx vitest run tests/dimensions/` exits 0 (25 passing) — VERIFIED
- [x] `npm test` full-suite delta: +10 passing from this plan, 0 new failures — VERIFIED
- [x] Zero files under `src/` modified — VERIFIED via `git diff --name-only 7584f5c^ eb1ba50 -- 'src/'` empty

## Self-Check: PASSED

---
*Phase: 13-test-coverage-gaps*
*Completed: 2026-04-16*
