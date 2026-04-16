---
phase: 14-code-hygiene-wizard-fix
plan: 04
subsystem: bank-transactions
tags: [refactor, dead-code-removal, vitest, typescript, audit-cleanup]

# Dependency graph
requires:
  - phase: 09-bank-feed-categorization
    provides: matchRule + applyRules + categorize.test.ts (the orphan being deleted here)
  - phase: 13-test-coverage-gaps
    provides: Position-targeted matchRule test (kept) + Position-targeted applyRules test (deleted with this plan)
provides:
  - "src/lib/bank-transactions/categorize.ts: matchRule + RuleInput + toNum only (applyRules + TransactionInput deleted)"
  - "tests/bank-transactions/categorize.test.ts: 5 tests covering matchRule (4 base + 1 Position-targeted)"
  - "BANK-04 v1.0-MILESTONE-AUDIT orphan-production-export item closed"
affects: [phase-14-other-plans, future-bank-categorization-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Surgical describe-block / it-block removal — preserves sibling test scaffolding (TestRule type, makeRule helper) without rewriting the file"
    - "Export deletion paired with test-import line trim — single source of truth for orphan export removal"

key-files:
  created: []
  modified:
    - "src/lib/bank-transactions/categorize.ts (111 -> 64 lines; -47 lines)"
    - "tests/bank-transactions/categorize.test.ts (162 -> 94 lines; -68 lines / -2 tests)"

key-decisions:
  - "Surgical removal over file rewrite — file was only 162 lines and the deletions were contiguous, so two Edit blocks delivered the cleanup with the smallest possible blast radius"
  - "Did NOT touch RuleInput interface — matchRule constrains <R extends RuleInput>, so it must remain even though it's adjacent to the deleted TransactionInput"
  - "Did NOT add a deprecation/migration notice to categorize.ts — applyRules had zero production callers, so a clean delete is correct (no transition period needed)"
  - "Did NOT preserve a 'matchRule-equivalent of applyRules' as future-proofing — would have been scope creep per CONTEXT.md ('No new batch-categorization endpoint')"

patterns-established:
  - "Orphan-export-deletion pattern: (1) verify zero production callers via grep, (2) delete export + supporting types in source file, (3) trim test imports + delete corresponding test blocks, (4) verify scoped tests still green and tsc clean on touched files"

requirements-completed: [BANK-04]

# Metrics
duration: 4 min
completed: 2026-04-16
---

# Phase 14 Plan 04: Delete applyRules Orphan + Test Cleanup Summary

**Deleted the unused `applyRules<R,T>` export and its `TransactionInput` interface from `src/lib/bank-transactions/categorize.ts` (47 lines removed); removed the corresponding `applyRules` test suites from `tests/bank-transactions/categorize.test.ts` (-2 tests / -68 lines); `matchRule` and `RuleInput` (live production code) preserved.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-16T13:29:47Z
- **Completed:** 2026-04-16T13:33:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Closed BANK-04 v1.0-MILESTONE-AUDIT orphan production export item
- Source file `src/lib/bank-transactions/categorize.ts` shrunk from 111 -> 64 lines
- Test file `tests/bank-transactions/categorize.test.ts` shrunk from 162 -> 94 lines
- Test count delta: -2 (1 standalone applyRules describe + 1 Position-targeted applyRules it-block)
- Live production code path unaffected: `matchRule` import in `src/app/api/entities/[entityId]/bank-transactions/route.ts` (lines 14, 271, 380) and `src/lib/plaid/sync.ts` (line 31, 135) still resolves correctly
- All 5 remaining tests in `categorize.test.ts` green (4 matchRule + 1 Position-targeted matchRule)

## Task Commits

Each task was committed atomically:

1. **Task 1: Surgically remove applyRules + TransactionInput from categorize.ts** — `f26480e` (refactor)
2. **Task 2: Surgically remove applyRules describe blocks from categorize.test.ts** — `91fffe1` (test)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified

- `src/lib/bank-transactions/categorize.ts` — Deleted lines 17-26 (`TransactionInput` interface) and lines 77-111 (`applyRules` function + JSDoc). Kept `RuleInput` interface, `toNum` helper, and `matchRule` function. Final size: 64 lines.
- `tests/bank-transactions/categorize.test.ts` — Trimmed line 2 import to drop `applyRules`. Deleted lines 93-123 (Position-targeted `applyRules` it-block + its NOTE comment) and lines 126-162 (standalone `applyRules` describe). Kept `matchRule` describe (4 tests) and Position-targeted `matchRule` it-block. Final size: 94 lines.

## Decisions Made

- **Surgical removal over file rewrite:** the file was only 162 lines and the deletions were contiguous regions; two `Edit` blocks delivered the cleanup with the smallest possible blast radius (1 + 70 line deletions vs ~200-line replacement).
- **Single Edit collapse for both test deletions:** the Position-targeted `applyRules` it-block (lines 93-123) and the standalone `applyRules` describe (lines 126-162) were adjacent — a single `Edit` covering both targets (closing one describe + deleting the next describe entirely) was cleaner than two separate edits.
- **No deprecation/migration notice:** `applyRules` had zero production callers — clean delete is correct (no transition period needed).
- **No "matchRule-equivalent of applyRules" preserved as future-proofing:** would have been scope creep per CONTEXT.md ("No new batch-categorization endpoint. Inventing a feature to justify keeping `applyRules` would be scope creep.").

## Deviations from Plan

None - plan executed exactly as written.

The plan's `verify` step #4 (`grep -n "matchRule" src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts`) returned zero matches — but this is a stale path reference in PLAN.md, NOT a deviation in execution. The actual production callers are `src/app/api/entities/[entityId]/bank-transactions/route.ts` (lines 14, 271, 380) and `src/lib/plaid/sync.ts` (lines 31, 135, 137). The spirit of the check ("matchRule still imported by live production code") is satisfied — verified directly via Grep across `src/`. The PLAN.md inaccuracy is captured here and does not require any code change.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None. Plan executed cleanly in two atomic commits.

## Issues Encountered

**Parallel-agent file contention (observed, non-blocking):**

During Task 1's commit, the working tree contained unstaged modifications to `src/app/(auth)/budgets/page.tsx` and `src/lib/journal-entries/post.test.ts` from sibling agents executing other Phase 14 plans concurrently (Plan 14-01 RED phase + Plan 14-05 TS sweep #1). Despite explicitly running `git add src/lib/bank-transactions/categorize.ts` (single-file stage), the resulting commit `f26480e` recorded **both** my Task 1 deletion AND the sibling's `budgets/page.tsx` Select onValueChange coalesce fix:

```
 src/app/(auth)/budgets/page.tsx         |  4 +--
 src/lib/bank-transactions/categorize.ts | 47 ---------------------------------
 2 files changed, 2 insertions(+), 49 deletions(-)
```

This is consistent with a race condition where another process performed `git add -u` or similar between my stage and commit calls. The collateral change is **functionally correct work** (it implements Plan 14-05 task 14-04-01 from the VALIDATION.md mapping — Select `onValueChange` null-coalesce at `budgets/page.tsx:746,775`), so the commit is not destructive. I did **not** amend per safety protocol (NEVER amend without explicit user request). The sibling agent (or whoever owns Plan 14-05) will see this work already done in `f26480e` and can adapt accordingly.

Task 2's commit (`91fffe1`) was clean — single file, no sibling contention.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BANK-04 audit item closed; phase-level Success Criterion #1 from CONTEXT.md complete.
- Plan 14-05 (TS/test sweep) is unblocked — its `budgets/page.tsx` task (TS sweep #1) is partially landed via the collateral commit in `f26480e` and may need scope reconciliation, but the work itself is done.
- No blockers introduced. Phase 14 remains on track for `/gsd:verify-work` once all 5 plans land.
- Full test suite: 531 passing / 7 failing (pre-existing `use-entity` localStorage — slated for fix in Plan 14-05 task 14-04-03 via `NODE_OPTIONS="--no-experimental-webstorage"`) / 75 todo / 15 skipped (613 total).
- `npx tsc --noEmit | grep categorize` = zero matches (touched-file TS bar met per CONTEXT.md "Verification Bar").

## Self-Check: PASSED

- FOUND: `.planning/phases/14-code-hygiene-wizard-fix/14-04-SUMMARY.md`
- FOUND: `src/lib/bank-transactions/categorize.ts` (64 lines, was 111)
- FOUND: `tests/bank-transactions/categorize.test.ts` (94 lines, was 162)
- FOUND: commit `f26480e` (Task 1: refactor)
- FOUND: commit `91fffe1` (Task 2: test)
- VERIFIED: 5/5 scoped tests green; zero TS errors mentioning `categorize`; zero references to `applyRules` or `TransactionInput` in either touched file; matchRule live in `src/app/api/entities/[entityId]/bank-transactions/route.ts` and `src/lib/plaid/sync.ts`.

---
*Phase: 14-code-hygiene-wizard-fix*
*Completed: 2026-04-16*
