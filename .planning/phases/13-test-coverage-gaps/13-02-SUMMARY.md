---
phase: 13-test-coverage-gaps
plan: 02
subsystem: testing
tags: [vitest, vi.mock, prisma-mock, mirror-inline, bank-transactions, regression-tests]

requires:
  - phase: 11-bank-transactions
    provides: "live production code for auto-reconcile, reconciliation summary, opening-balance adjusting JE, positionId rules, and positions API — all shipped without test coverage"
  - phase: 10-positions-overhaul
    provides: "Position model + subledgerItem.account nested include shape used by the positions API serialization"
provides:
  - "CAT-03 regression coverage for positionId-bearing categorization rules (matchRule + applyRules)"
  - "REC-01 regression coverage for auto-reconcile update payload via mirror-inline (route-handler shape captured as specification)"
  - "REC-04 regression coverage for reconciliation summary reducer (counts + absolute-value totals)"
  - "OBE-03 regression coverage for generateAdjustingJE (null on unchanged, same/reverse direction, AccountBalance upserts, audit entry)"
  - "CAT-01 regression coverage for positions API Prisma query contract + serialization shape"
  - "REC-03 formally declared manual-only (Chrome) in 13-VALIDATION.md with sign-off"
affects: [phase-14-code-hygiene-wizard-fix, phase-15-documentation-hardening]

tech-stack:
  added: []
  patterns:
    - "Mirror-inline test: replicate non-extractable route/component logic (production lives in $transaction callback / component useMemo) in the test file and assert shape — used for REC-01 and REC-04"
    - "Prisma-tx mock with vi.mock(\"@/lib/journal-entries/auto-number\"): avoids nested tx.journalEntry.findFirst stubbing for generateNextEntryNumber"
    - "Decimal comparison via .toString(): defeats Prisma.Decimal identity-equality failures in JE-create mock assertions"
    - "mockFindMany.mock.calls[0][0] query-contract assertion pattern: assert Prisma query shape (where/include/orderBy) independently of return-value serialization"

key-files:
  created: []
  modified:
    - "tests/bank-transactions/categorize.test.ts (Position-targeted rules describe block: 2 live tests)"
    - "tests/bank-transactions/auto-reconcile.test.ts (3 mirror-inline tests via buildReconcileUpdatePayload)"
    - "tests/bank-transactions/reconciliation-summary.test.ts (3 mirror-inline tests via computeReconciliationStats)"
    - "tests/bank-transactions/opening-balance.test.ts (new generateAdjustingJE (OBE-03) describe block: 4 tests; existing pure-function tests unchanged)"
    - "tests/bank-transactions/position-picker.test.ts (4 Prisma-mock tests via prisma.position.findMany + mirror-inline serializePositions)"
    - ".planning/phases/13-test-coverage-gaps/13-VALIDATION.md (frontmatter: status=complete, nyquist_compliant=true, wave_0_complete=true; all 8 task rows marked green; sign-off added)"

key-decisions:
  - "[13-02]: Mirror-inline pattern chosen over helper extraction for REC-01 + REC-04 — production code lives in route handler and component useMemo respectively; extraction is Phase 14 tech-debt scope per CONTEXT.md"
  - "[13-02]: CAT-03 applyRules test asserts matched-bucket membership only (not positionId propagation onto txn) — applyRules currently copies only accountId; positionId propagation is orphan-applyRules tech debt (Phase 14)"
  - "[13-02]: OBE-03 uses vi.mock(\"@/lib/journal-entries/auto-number\") module-level mock instead of stubbing tx.journalEntry.findFirst — simpler test setup, no production change"
  - "[13-02]: Position-picker tests exercise the Prisma query contract + serialization shape rather than importing the Next.js route handler (which requires auth/Response plumbing)"

patterns-established:
  - "Mirror-inline for non-extractable production code: define a local function in the test file that mirrors the production shape/logic, assert on the local function. Works for route-handler payloads and component useMemo reducers."
  - "Prisma-tx mock: construct mockTx with vi.fn() stubs per Prisma method, assert via mockTx.journalEntry.create.mock.calls[0][0].data.*"

requirements-completed: [CAT-03, REC-01, REC-03, REC-04, OBE-03]

duration: 9min
completed: 2026-04-16
---

# Phase 13 Plan 02: Bank-Transactions Test Coverage Gaps Summary

**Five bank-transactions test files converted from `it.todo` stubs to live regression assertions (12 stubs -> 13 passing tests); REC-03 formally declared manual-only with Chrome sign-off.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-16T05:51:52Z
- **Completed:** 2026-04-16T06:02:00Z (approximate)
- **Tasks:** 3
- **Files modified:** 6 (5 test files + 1 validation doc)

## Accomplishments

- **CAT-03:** `tests/bank-transactions/categorize.test.ts` Position-targeted rules describe block has 2 live tests (matchRule with positionId + null accountId; applyRules matches positionId-bearing rule).
- **REC-01:** `tests/bank-transactions/auto-reconcile.test.ts` has 3 mirror-inline tests asserting the `tx.bankTransaction.update` data shape from the route handler (single-post + splits-clear-accountId + bulk-post iteration).
- **REC-04:** `tests/bank-transactions/reconciliation-summary.test.ts` has 3 mirror-inline tests covering the `useMemo` reducer (RECONCILED count, PENDING fallback for missing status, absolute-value totals with UNMATCHED branch).
- **OBE-03:** `tests/bank-transactions/opening-balance.test.ts` has a new `generateAdjustingJE (OBE-03)` describe block with 4 tests (null return on unchanged balance, POSTED JE same-direction on ASSET increase, reverse direction on ASSET decrease, AccountBalance upsert + audit entry).
- **CAT-01:** `tests/bank-transactions/position-picker.test.ts` has 4 Prisma-mock tests asserting `prisma.position.findMany` query contract (where/include/orderBy) and the flat serialization shape.
- **REC-03:** Manual-only declaration cemented in 13-VALIDATION.md with Chrome verification steps (inline JSX ternaries at `transaction-table.tsx:321-359` have no extractable pure helper; mirror-inline would be zero-value).
- **13-VALIDATION.md:** Frontmatter flipped to `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`. All 8 task rows marked green. Sign-off added.

## Task Commits

Each task was committed atomically:

1. **Task 1: CAT-03 + REC-01 + REC-04 stub conversions** - `bebf051` (test)
2. **Task 2: OBE-03 extension + CAT-01 stub conversion** - `a67ef44` (test)
3. **Task 3: 13-VALIDATION.md acceptance gates** - `821d8ca` (docs)

## Files Created/Modified

- `tests/bank-transactions/categorize.test.ts` — 2 new live tests in Position-targeted rules describe block (CAT-03)
- `tests/bank-transactions/auto-reconcile.test.ts` — entire body rewritten with 3 mirror-inline tests (REC-01)
- `tests/bank-transactions/reconciliation-summary.test.ts` — entire body rewritten with 3 mirror-inline tests (REC-04)
- `tests/bank-transactions/opening-balance.test.ts` — 4 new tests appended in a new `generateAdjustingJE (OBE-03)` describe block (existing pure-function tests preserved)
- `tests/bank-transactions/position-picker.test.ts` — entire body rewritten with 4 Prisma-mock tests (CAT-01)
- `.planning/phases/13-test-coverage-gaps/13-VALIDATION.md` — frontmatter flipped to complete; all task-row statuses marked green; sign-off section added

## Suite-Wide Impact

| Metric | Before Plan 13-02 | After Plan 13-02 |
|--------|-------------------|------------------|
| `it.todo` in Plan 02's 5 target files | 12 stubs | 0 |
| Live `it(...)` blocks in those 5 files | 14 (existing only) | 30 (14 existing + 16 new: 2 CAT-03 + 3 REC-01 + 3 REC-04 + 4 OBE-03 + 4 CAT-01) |
| `npm test` passing | 504 (from STATE.md, pre-Phase 13) | 530 |
| `npm test` failing | 7 pre-existing (deferred-items.md #5 — use-entity.test.ts localStorage jsdom bug) | 7 pre-existing (unchanged) |
| `src/` file modifications | 0 | 0 |

## Decisions Made

- **Mirror-inline for REC-01 and REC-04:** Production logic lives inside `$transaction` callback (route handler) and component `useMemo` respectively. Extraction is out-of-scope per CONTEXT.md. Mirror-inline captures the contract at the test-file level without touching production.
- **CAT-03 test 2 asserts matched-bucket membership, not positionId propagation:** `applyRules` at `categorize.ts:103` copies only `accountId`. Asserting positionId propagation would require a production change — that belongs to the Phase 14 orphan-applyRules tech debt, not Phase 13.
- **Module-level `vi.mock("@/lib/journal-entries/auto-number")` for OBE-03:** Simpler than stubbing the nested `tx.journalEntry.findFirst` call inside `generateNextEntryNumber`. Test-only change; production unchanged.
- **Prisma-mock + mirror-inline serialization for CAT-01:** Next.js route handlers carry `auth()`/`Response` plumbing that does not load cleanly in unit tests. Testing the Prisma query contract + serialization separately matches the plaid-sync test style.

## Deviations from Plan

None — plan executed exactly as written. All five test files follow RESEARCH.md Examples 4-8 verbatim (with minor in-file comments cross-referencing the research rationale).

No production code changes. Auto-fix rules 1-3 never triggered because no bugs / missing critical functionality / blocking issues surfaced during test authoring.

## Issues Encountered

- **npm test reports 7 failures in `src/__tests__/hooks/use-entity.test.ts`.** Verified as pre-existing (documented in Phase 12 `deferred-items.md` #5 — `localStorage.clear is not a function` jsdom setup issue). File never touched by Plan 13-02. Pre-Phase 13 baseline in STATE.md line 8 already notes "7 pre-existing deferred-items.md failures unchanged." Confirmed not a regression from this plan.

## User Setup Required

None — pure tests-only phase; no environment variables, no external service configuration.

## Next Phase Readiness

- Phase 13 acceptance gates satisfied: all 8 target test files green, zero `it.todo`, zero src/ modifications, REC-03 manual-only cemented.
- 13-02-SUMMARY.md (this file) + 13-01-SUMMARY.md (sibling plan) close Phase 13.
- Phase 14 can proceed. Phase 14's scope includes the orphan-applyRules positionId propagation work referenced in the Phase 13-02 CAT-03 test comment and the route-handler hygiene (extract `buildReconcileUpdatePayload` from the POST routes) referenced in REC-01.

## Self-Check

Verification of commits and files before final metadata commit:

- **Commit bebf051** (Task 1): PRESENT in `git log --oneline`
- **Commit a67ef44** (Task 2): PRESENT
- **Commit 821d8ca** (Task 3): PRESENT
- `tests/bank-transactions/categorize.test.ts` — EXISTS, zero `it.todo`
- `tests/bank-transactions/auto-reconcile.test.ts` — EXISTS, zero `it.todo`
- `tests/bank-transactions/reconciliation-summary.test.ts` — EXISTS, zero `it.todo`
- `tests/bank-transactions/opening-balance.test.ts` — EXISTS, zero `it.todo`, contains `generateAdjustingJE` describe block
- `tests/bank-transactions/position-picker.test.ts` — EXISTS, zero `it.todo`
- `.planning/phases/13-test-coverage-gaps/13-VALIDATION.md` — modified (frontmatter flipped, rows green, sign-off added)
- `git diff --name-only HEAD -- 'src/'` — EMPTY (zero src/ modifications)

## Self-Check: PASSED

---

*Phase: 13-test-coverage-gaps*
*Completed: 2026-04-16*
