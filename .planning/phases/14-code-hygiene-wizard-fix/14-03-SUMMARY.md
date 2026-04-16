---
phase: 14-code-hygiene-wizard-fix
plan: 03
subsystem: bank-transactions
tags: [prisma, typescript, transactions, journal-entries, refactor, audit-trail, bank-transactions, tdd]

# Dependency graph
requires:
  - phase: 14-code-hygiene-wizard-fix
    provides: postJournalEntryInTx tx-aware helper (Plan 14-01)
  - phase: 02-accounting-engine
    provides: postJournalEntry public API + AccountBalance upsert pattern
provides:
  - Bank-tx POST handler delegates AccountBalance upsert + POSTED audit to postJournalEntryInTx
  - Audit ordering corrected from POSTED→CREATED to CREATED→POSTED (matches /post route)
  - Period-close trigger errors now propagate from bank-tx POST (today's inline path silently bypassed enforcement)
  - Audit-ordering regression test in tests/bank-transactions/create-je.test.ts
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delegate to tx-aware helper inside outer prisma.dollar-transaction — preserves atomicity without nested transactions"
    - "Mirror-inline test pattern (Pattern A) for non-extractable route handler logic — recreate the inner sequence in-test and assert behavioral contract"

key-files:
  created: []
  modified:
    - src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts
    - tests/bank-transactions/create-je.test.ts

key-decisions:
  - "Always create JE as DRAFT in the route, then let postJournalEntryInTx flip status to POSTED — single source of truth for the post body (status flip + balance upsert + POSTED audit)"
  - "Move CREATED audit BEFORE the post call so audit ordering becomes CREATED→POSTED (consistent with the standalone /post endpoint flow; today's POSTED-then-CREATED order corrected)"
  - "Coalesce response status to 'POSTED' when postImmediately is true — the local `result` object is the pre-post snapshot returned by tx.journalEntry.create and still reads 'DRAFT'; without this, the API response would silently misreport status"
  - "Pattern A mirror-inline tests over Pattern B function-extraction — the bank-tx POST handler's inner sequence cannot be cleanly extracted (owns auth, validation, outer transaction); recreating the sequence in-test captures the contract without touching production"

patterns-established:
  - "Delegate-to-tx-helper pattern: when refactoring inline logic to a tx-aware helper, ALWAYS verify the local snapshot returned by the create call — it predates the helper's mutations and may need coalescing in the response shape"
  - "Mirror-inline test for route audit ordering: assert call sequence on a captured array, not on individual mock invocation counts — order is the contract, not arity"

requirements-completed: [BANK-03]

# Metrics
duration: 3 min
completed: 2026-04-16
---

# Phase 14 Plan 03: Bank-Tx POST Delegation Summary

**Refactored the bank-tx POST handler at `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` to delegate `AccountBalance.upsert` + the POSTED audit to `postJournalEntryInTx` (Plan 14-01), eliminating ~17 lines of inlined logic and correcting the audit ordering from POSTED-then-CREATED to the conventional CREATED-then-POSTED — closing BANK-03 maintenance-coupling risk while preserving all-or-nothing atomicity inside the existing outer `prisma.$transaction`.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T13:41:59Z
- **Completed:** 2026-04-16T13:45:39Z
- **Tasks:** 2 (TDD: RED + GREEN; no separate REFACTOR commit needed — refactor was clean)
- **Files modified:** 2

## Accomplishments

- Bank-tx POST handler no longer inlines `tx.accountBalance.upsert` — the inline loop (was ~lines 293-313) and the redundant POSTED audit (was ~lines 315-323) are gone
- Single call to `await postJournalEntryInTx(tx, je.id, userId)` runs inside the existing outer `prisma.$transaction` when `postImmediately === true` — atomicity preserved
- JE create now always uses `status: "DRAFT"`; `postJournalEntryInTx` flips it to POSTED and stamps `postedBy`/`postedAt`
- CREATED audit moved to run BEFORE the post call → audit ordering now CREATED→POSTED (matches the standalone `/post` endpoint flow)
- API response status coalesced to "POSTED" when `postImmediately` is true (Rule 1 fix — see Deviations)
- New audit-ordering regression test in `tests/bank-transactions/create-je.test.ts`: 2 new `it()` blocks asserting CREATED-before-POSTED when `postImmediately=true`, and CREATED-only when `postImmediately=false`
- All 60 bank-transactions tests pass (50 pre-existing + 8 new from Plans 13-02/14-04 + 2 new audit-ordering)
- Zero new TypeScript errors in the touched route file (`tsc --noEmit | grep "bank-transactions/\[transactionId\]/route.ts"` returns empty)
- `grep -n "accountBalance.upsert"` in the touched route file returns zero matches — single source of truth confirmed
- Period-close trigger errors will now properly propagate from `postJournalEntryInTx` (today's inline `tx.accountBalance.upsert` bypassed period-close enforcement because no trigger fires on raw upsert)

## Task Commits

Each task was committed atomically following the TDD cycle:

1. **Task 1: Add audit-ordering regression test (RED)** — `f1ec02c` (test)
2. **Task 2: Delegate bank-tx POST to postJournalEntryInTx (GREEN)** — `7a012a5` (feat)

REFACTOR phase: no separate commit — the refactor was a mechanical inline-to-helper-call replacement plus an audit reorder; no obvious cleanup left.

**Plan metadata:** committed via `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs commit` after this SUMMARY is written.

## Files Created/Modified

- `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` — Added `import { postJournalEntryInTx } from "@/lib/journal-entries/post"`; refactored the inner `prisma.$transaction` body to (1) always create the JE as DRAFT (drop the `jeInput.status` conditional and drop `postedBy`/`postedAt` from the create), (2) write the CREATED audit BEFORE any post, (3) call `postJournalEntryInTx(tx, je.id, userId)` when `postImmediately === true`, (4) coalesce the response `status` to "POSTED" when `postImmediately` is true (the local `result` object is the pre-post snapshot). Net delta: 23 lines added, 40 removed.
- `tests/bank-transactions/create-je.test.ts` — Added `vi` to vitest imports + `Prisma` import + module-level `vi.mock("@/lib/db/prisma")` so `postJournalEntryInTx` imports cleanly without a real DB client. Appended new `describe("BANK-03: bank-tx POST audit ordering (post-refactor)", ...)` block with 2 tests: (1) the primary CREATED-before-POSTED assertion mirroring the post-refactor inner sequence, (2) a sanity test asserting only CREATED fires when `postImmediately === false`. The 8 pre-existing `createJournalEntryFromTransaction` tests are untouched and still green.

## Decisions Made

- **Always create as DRAFT, let `postJournalEntryInTx` flip the status** — Removes the `jeInput.status` conditional and the `postedBy`/`postedAt` fields from the `tx.journalEntry.create` call. Single source of truth: the canonical post body (status flip + balance upsert + POSTED audit) lives in `src/lib/journal-entries/post.ts` and is invoked by both this route and the standalone `/post` route.
- **Move CREATED audit BEFORE the post call** — Today's order is `POSTED` → `CREATED` (oddly inverted from the rest of the codebase). The natural place to put the CREATED audit post-refactor is BEFORE `postJournalEntryInTx` (which writes its own POSTED audit), giving the conventional CREATED → POSTED flow that matches the standalone `/post` route and the rest of the audit trail UX. RESEARCH.md's Pitfall 2 confirmed no test asserts the reversed order.
- **Coalesce response `status` to "POSTED" when posting** — The local `result` returned by the `prisma.$transaction` callback is the JE snapshot returned by `tx.journalEntry.create` BEFORE `postJournalEntryInTx` ran. It still reads `status: "DRAFT"`. Without coalescing, the API response would silently misreport every immediately-posted bank-tx JE as DRAFT — a silent regression. Cheaper than re-fetching the JE inside the transaction.
- **Pattern A mirror-inline tests over Pattern B function extraction** — The bank-tx POST handler's inner sequence (auth → validation → `prisma.$transaction(async (tx) => {...})` → response shape) cannot be cleanly extracted into a callable function for unit testing without rewriting the route. Pattern A (recreate the inner sequence in-test against a tx mock) captures the audit-ordering contract without forcing a production refactor — established in Phase 13 per STATE.md decision log, applied here for the first audit-ordering assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Coalesce API response status to "POSTED" when postImmediately is true**
- **Found during:** Task 2 (post-implementation review of the success response shape)
- **Issue:** The local `result` object returned by `prisma.$transaction(async (tx) => { ...; return je; })` is the snapshot returned by `tx.journalEntry.create`, which now always uses `status: "DRAFT"`. Post-refactor, `postJournalEntryInTx` mutates the persisted row to POSTED, but the local `result.status` still reads "DRAFT". The success response at the bottom of the POST handler serializes `status: result.status`, so without intervention every immediately-posted bank-tx JE would API-respond as DRAFT — a silent regression in the response contract.
- **Fix:** Changed `status: result.status` to `status: postImmediately ? "POSTED" : result.status` in the success response. Inline coalesce avoids an extra DB round-trip to re-fetch the JE.
- **Files modified:** `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` (1 line change in the response shape)
- **Commit:** Folded into Task 2 commit `7a012a5` (single GREEN commit for the refactor)
- **Why auto-fixed:** Direct correctness regression caused by my refactor to the SAME file. Rule 1 (auto-fix bugs) — no architectural decision needed. The fix is a one-line response-shape adjustment, not a structural change.

### Pre-existing Failing Test (Out of Scope)

**1. `src/__tests__/components/je-form-draft-opt-out.test.tsx` fails with `expected undefined to be 'DRAFT'`**
- **Discovered:** Full-suite verification (`npm test`) at end of Plan 14-03
- **Source:** Wave 0 RED test added by Plan 14-02 commit `06938ce` ("test(14-02): add Wave 0 regression tests for WIZ-03 and JE form opt-out")
- **Reason for not fixing:** Out of scope per `<scope_boundary>` — Plan 14-02 is still pending (per STATE.md `incomplete_plans: ["14-02-PLAN.md", "14-03-PLAN.md"]`). The test is intentionally RED awaiting Plan 14-02's GREEN implementation in `src/components/journal-entries/je-form.tsx`. Logged here for SUMMARY traceability; will be closed when Plan 14-02 executes.
- **Action taken:** None. Plan 14-03's verification bar is bank-transactions tests green + touched-file tsc clean — both achieved.

### Plan Wording Aside

- The plan's `<action>` for Task 1 said the test "should FAIL (or, if the file currently has no audit-ordering coverage, pass trivially because the test directly exercises the post-refactor sequence). Either is acceptable RED-phase outcome — what matters is the test exists before Task 2 changes the route." — In execution, both new `it()` blocks pass on first run because the test mirrors the post-refactor sequence directly (it instantiates `postJournalEntryInTx` and writes the CREATED audit before calling it). This matches the plan's "either is acceptable" qualifier.

## Issues Encountered

None blocking. Two TDD cycles executed cleanly. No checkpoints. No auth gates. No architectural decisions required.

The single Rule 1 deviation (response status coalesce) was caught by self-review of the changed file before commit, not by a test failure — the existing test suite did not assert on the API response status field.

## User Setup Required

None — pure code refactor with no external service configuration.

## Next Phase Readiness

- **BANK-03 (v1.0-MILESTONE-AUDIT.md item)** is now closed: bank-tx POST no longer inlines `AccountBalance.upsert`; delegates to `postJournalEntryInTx` (single source of truth).
- **Phase 14 remaining work:** Plan 14-02 (JE POST API auto-post default — WIZ-03) is the only remaining incomplete plan in this phase. Plans 14-01, 14-04, 14-05, and now 14-03 are complete.
- **Phase 14 completion:** When Plan 14-02 lands, the failing `je-form-draft-opt-out.test.tsx` test will turn green (Plan 14-02's audit-switch will add `status: 'DRAFT'` to the manual JE form's POST body), and Phase 14 will be ready for `/gsd:verify-work`.
- **No downstream callers affected.** The bank-tx POST API public response shape is unchanged (same fields; status is more accurate now); the inner refactor is invisible to clients. Existing UI in the bank-feed page continues to work without changes.

## Self-Check: PASSED

- [x] FOUND: `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` (modified)
- [x] FOUND: `tests/bank-transactions/create-je.test.ts` (modified)
- [x] FOUND: `.planning/phases/14-code-hygiene-wizard-fix/14-03-SUMMARY.md` (created)
- [x] FOUND commit `f1ec02c` (test: RED phase — audit-ordering regression test)
- [x] FOUND commit `7a012a5` (feat: GREEN phase — delegate bank-tx POST to postJournalEntryInTx)
- [x] `postJournalEntryInTx` import added at top of route file
- [x] `accountBalance.upsert` returns zero matches in the route file (`grep -n "accountBalance.upsert" src/app/api/entities/\[entityId\]/bank-transactions/\[transactionId\]/route.ts`)
- [x] `tsc --noEmit | grep "bank-transactions/\[transactionId\]/route.ts"` returns zero matches
- [x] All 60 `tests/bank-transactions/` tests pass (`npx vitest run tests/bank-transactions/`)
- [x] BANK-03 audit item flagged as complete in this SUMMARY

---
*Phase: 14-code-hygiene-wizard-fix*
*Completed: 2026-04-16*
