---
phase: 14-code-hygiene-wizard-fix
plan: 01
subsystem: accounting-engine
tags: [prisma, typescript, transactions, journal-entries, refactor, tdd]

# Dependency graph
requires:
  - phase: 02-accounting-engine
    provides: postJournalEntry public API + AccountBalance upsert pattern
  - phase: 11-positions-overhaul
    provides: tx-aware helper precedent (findOrCreateOBEAccount in opening-balance.ts)
provides:
  - postJournalEntryInTx(tx, journalEntryId, userId) tx-aware helper export
  - postJournalEntry public API unchanged (3-line wrapper delegating to postJournalEntryInTx)
  - regression test for tx-aware helper isolation + wrapper-opens-own-transaction baseline
affects: [14-02, 14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tx-aware helper pattern with Prisma.TransactionClient (preferred over the any-typed PrismaTransactionClient shortcut)"
    - "vi.mock(@/lib/db/prisma) with $transaction spy for isolation testing of tx-aware functions"

key-files:
  created: []
  modified:
    - src/lib/journal-entries/post.ts
    - src/lib/journal-entries/post.test.ts

key-decisions:
  - "Prisma.TransactionClient over any-typed PrismaTransactionClient (the Phase 11 shortcut in opening-balance.ts) — proper IDE autocomplete and a precedent for future tx-aware extractions"
  - "Wrapper delegates via prisma.$transaction(async (tx) => postJournalEntryInTx(tx, ...)) — preserves single source of truth for the post body"
  - "Module-level vi.mock(@/lib/db/prisma) with shared transactionMock spy — enables both isolation (helper does NOT call $transaction) and regression (wrapper calls $transaction once) assertions in the same suite"

patterns-established:
  - "tx-aware helper extraction pattern: internal export takes tx as first arg, public API becomes thin wrapper opening its own $transaction"
  - "Use Prisma.TransactionClient (not any) for new tx-aware helpers"

requirements-completed: [BANK-03]

# Metrics
duration: 3 min
completed: 2026-04-16
---

# Phase 14 Plan 01: postJournalEntryInTx Extraction Summary

**Extracted `postJournalEntryInTx(tx, journalEntryId, userId)` as the canonical tx-aware posting helper using `Prisma.TransactionClient`, with `postJournalEntry` becoming a 3-line wrapper that opens its own `$transaction` and delegates — enabling Plans 14-02 (auto-post default) and 14-03 (bank-tx delegation) to safely call the post body inside their own outer transactions without nesting.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T13:29:29Z
- **Completed:** 2026-04-16T13:32:50Z
- **Tasks:** 2 (TDD: RED + GREEN; no REFACTOR commit needed — extraction was already clean)
- **Files modified:** 2

## Accomplishments

- `postJournalEntryInTx(tx, journalEntryId, userId): Promise<void>` exported from `src/lib/journal-entries/post.ts` using `Prisma.TransactionClient`
- `postJournalEntry(journalEntryId, userId)` public signature unchanged; body is now a 3-line wrapper that calls `prisma.$transaction` and delegates to `postJournalEntryInTx`
- 3 new regression tests in `post.test.ts` covering: named export presence, helper isolation (does NOT open own `$transaction`), and wrapper-opens-own-`$transaction`-once baseline
- All 8 tests in `post.test.ts` pass (5 pre-existing + 3 new)
- Zero new TypeScript errors in touched files (`tsc --noEmit | grep src/lib/journal-entries/post` returns empty)
- Foundation in place for Plans 14-02 (JE POST API auto-post default — WIZ-03) and 14-03 (bank-tx route delegation — BANK-03) to safely import `postJournalEntryInTx`

## Task Commits

Each task was committed atomically following the TDD cycle:

1. **Task 1: Extend post.test.ts with failing test for postJournalEntryInTx (RED)** — `9059bc3` (test)
2. **Task 2: Extract postJournalEntryInTx and refactor postJournalEntry to wrapper (GREEN)** — `0a29270` (feat)

REFACTOR phase: no separate commit — the extraction was already a clean mechanical move with no obvious cleanup. The wrapper is 3 lines as planned.

**Plan metadata:** committed via `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs commit` after this SUMMARY is written.

## Files Created/Modified

- `src/lib/journal-entries/post.ts` — Added `postJournalEntryInTx` export; refactored `postJournalEntry` to a 3-line wrapper. Public API unchanged. Body of helper is the exact existing logic (lines 22-71 of the prior file) operating on a caller-provided `tx: Prisma.TransactionClient`.
- `src/lib/journal-entries/post.test.ts` — Added module-level `vi.mock("@/lib/db/prisma")` with shared `transactionMock` spy. Appended new `describe("postJournalEntryInTx (tx-aware helper)", ...)` block with 3 tests. Existing 5 tests in `Journal Entry Posting` describe block untouched and still green.

## Decisions Made

- **`Prisma.TransactionClient` over `any`-typed `PrismaTransactionClient`** — The Phase 11 `opening-balance.ts` helper used `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `type PrismaTransactionClient = any` as a shortcut. This plan establishes the better pattern (`tx: Prisma.TransactionClient` from `@/generated/prisma/client`) for new tx-aware extractions. Phase 11's existing helper stays as-is per CONTEXT.md's "Holdings OBE path stays as-is" rule.
- **Wrapper delegates inside `prisma.$transaction`** — `postJournalEntry` becomes `return prisma.$transaction(async (tx) => { await postJournalEntryInTx(tx, journalEntryId, userId); })`, preserving a single source of truth for the post body (lock + status update + balance upserts + audit) and ensuring callers of the public API see no behavioral change.
- **Module-level mock for the prisma module** — `vi.mock("@/lib/db/prisma", () => ({ prisma: { $transaction: transactionMock } }))` at the top of the test file enables both sides of the assertion: the helper test calls `postJournalEntryInTx(txMock, ...)` directly and asserts `transactionMock` was called 0 times; the wrapper regression test calls `postJournalEntry(...)` and asserts `transactionMock` was called exactly once. Same spy, opposite assertions, single source of truth.

## Deviations from Plan

None - plan executed exactly as written.

The plan's `<done>` criteria for Task 1 reads "Three new failing tests visible in test output" but Test 3 (the regression assertion that `postJournalEntry` still calls `prisma.$transaction` exactly once) intentionally passes during RED — that test asserts pre-existing correct behavior must be preserved across the refactor, not new behavior to implement. The plan's later qualifier "Failure mode is the missing export, not a test bug. Existing post.test.ts tests still pass OR fail only due to the missing `postJournalEntryInTx` export at top of file" matches what happened: Tests 1 and 2 fail with `expected 'undefined' to be 'function'` and `postJournalEntryInTx is not a function` respectively (the missing-export failure mode); Test 3 passes because it tests the already-correct wrapper behavior.

## Issues Encountered

None. Two TDD cycles executed cleanly. No deviations, no auth gates, no checkpoints.

Pre-existing test failures in `src/__tests__/hooks/use-entity.test.ts` (7 failures from `localStorage.clear is not a function`) are deferred-item #5 from `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` — completely unrelated to `src/lib/journal-entries/post*`. Sanity check confirms no new regressions outside `post.test.ts`.

## User Setup Required

None - no external service configuration required. Pure code refactor.

## Next Phase Readiness

- **Plan 14-02 (JE POST API auto-post default — WIZ-03)** can now `import { postJournalEntryInTx } from "@/lib/journal-entries/post"` and call it from inside the JE POST API handler's `prisma.$transaction` block to auto-post balanced entries without nesting `$transaction` calls.
- **Plan 14-03 (bank-tx route delegation — BANK-03)** can replace the inline `AccountBalance.upsert` loop in the bank-tx POST handler with a single `await postJournalEntryInTx(tx, journalEntryId, userId)` call inside the existing outer `$transaction`, preserving atomicity (JE create + balance upsert + bank-tx status update commit/rollback together).
- Public API of `postJournalEntry` unchanged — existing callers (`/post` route at `src/app/api/entities/[entityId]/journal-entries/[journalEntryId]/post/route.ts:40`, recurring-JE bulk-post code) continue to compile and behave identically.

## Self-Check: PASSED

- [x] FOUND: `src/lib/journal-entries/post.ts` (modified)
- [x] FOUND: `src/lib/journal-entries/post.test.ts` (modified)
- [x] FOUND: `.planning/phases/14-code-hygiene-wizard-fix/14-01-SUMMARY.md` (created)
- [x] FOUND commit `9059bc3` (test: RED phase)
- [x] FOUND commit `0a29270` (feat: GREEN phase)
- [x] `postJournalEntryInTx` declared at `post.ts:22`, called from wrapper at `post.ts:101`
- [x] `postJournalEntryInTx` describe block at `post.test.ts:133` with 3 tests covering import, isolation, and wrapper-regression assertions

---
*Phase: 14-code-hygiene-wizard-fix*
*Completed: 2026-04-16*
