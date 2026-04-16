---
phase: 14-code-hygiene-wizard-fix
plan: 05
subsystem: testing
tags: [typescript, tsc, vitest, jsdom, node25, base-ui-select, vercel-blob, refactor, cleanup]

# Dependency graph
requires:
  - phase: 12-reporting-fixes-onboarding-wizard
    provides: deferred-items.md catalog of 7 pre-existing TS/test issues (items #2 and #4 already RESOLVED in 12-07)
  - phase: 12-reporting-fixes-onboarding-wizard
    provides: cashFlowCategory + isContra fields on SerializedAccount (Phase 12 superset)
provides:
  - Single canonical SerializedAccount type at src/types/account.ts (3 consumers updated)
  - tsc --noEmit clean across all 6 touched source/test files
  - 7 use-entity.test.ts assertions recovered (Node 25 localStorage shadow fixed)
  - vitest 4-compatible mock-call pattern in blob-storage tests
  - All 5 remaining Phase 12 deferred items closed (items #1, #3, #5, #6, #7)
affects: [14-validation, future-phases-needing-typed-account-shape]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coalesce null at base-ui Select onValueChange call sites: (v) => setFoo(v ?? '<sentinel>'); avoid SafeSelect wrapper"
    - "Canonical serialized model types in src/types/<model>.ts; consumers import via @/types/<model> (mirrors @/types/index.ts SerializedEntity pattern)"
    - "vitest 4 mock-call: vi.mocked(fn)(...args) instead of (fn as ReturnType<typeof vi.fn>)(...args) for callable narrowing"
    - "Disable Node 25 experimental built-in localStorage at the script level via NODE_OPTIONS='--no-experimental-webstorage' so jsdom's localStorage takes over"

key-files:
  created:
    - src/types/account.ts
  modified:
    - src/app/(auth)/budgets/page.tsx
    - src/app/(auth)/accounts/page.tsx
    - src/components/accounts/account-table.tsx
    - src/components/accounts/account-form.tsx
    - src/components/csv-import/column-mapping-ui.tsx
    - tests/attachments/blob-storage.test.ts
    - package.json
    - .planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md

key-decisions:
  - "Coalesce-at-call-site over SafeSelect wrapper: per CONTEXT.md Deferred Ideas, no abstraction beyond audit-flagged surface; (v) => setFoo(v ?? '') keeps state types as string"
  - "Canonical SerializedAccount lives at src/types/account.ts (single deep import), not src/types/index.ts barrel: matches existing project style (e.g., @/types/SerializedEntity)"
  - "NODE_OPTIONS in package.json scripts.test (not vitest.config.ts): the issue is a Node global, not jsdom URL config; spelled-out --no-experimental-webstorage chosen over --no-webstorage alias for maintainer discoverability"
  - "vi.mocked(put)(...) over (put as ReturnType<typeof vi.fn>)(...): vitest 4 narrowed Mock<Procedure | Constructable> makes the cast non-callable; vi.mocked returns MockInstance<typeof fn> which is callable"
  - "blob-storage.test.ts companion cast file as unknown as Blob: avoid restructuring the test (per plan: type-only fix); mock ignores body type at runtime"

patterns-established:
  - "Coalesce-at-call-site for base-ui Select: (v) => setStringStateSetter(v ?? '') or (v) => handler(role, v ?? '__none__') depending on the sink semantics"
  - "Single-source-of-truth serialized model types in src/types/<model>.ts with deep imports"
  - "vi.mocked(...) for vitest 4 mock invocation; reserve ReturnType<typeof vi.fn> casts for pure assertion access (e.g., mockResolvedValue, mock.calls)"

requirements-completed: [DEFERRED-ITEMS]

# Metrics
duration: 7 min
completed: 2026-04-16
---

# Phase 14 Plan 05: Deferred Items Sweep Summary

**Closed all 5 remaining Phase 12 pre-existing TS/test issues — tsc clean across 6 touched files, +7 use-entity tests recovered via Node 25 localStorage flag, single-source-of-truth SerializedAccount type extracted.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-16T13:29:28Z
- **Completed:** 2026-04-16T13:37:15Z
- **Tasks:** 6
- **Files modified:** 8 (1 created + 7 modified)

## Accomplishments

- **Item #1 (Select null-coalesce in budgets):** 2 sites in `src/app/(auth)/budgets/page.tsx` lines 746, 775 — `(v) => setFoo(v ?? "")`
- **Item #3 (SerializedAccount canonical):** New `src/types/account.ts` with full superset shape (incl. Phase 12 `cashFlowCategory` + `isContra`); 3 consumers (`accounts/page.tsx`, `account-table.tsx`, `account-form.tsx`) now import from `@/types/account`
- **Item #5 (Node 25 localStorage shadow):** `NODE_OPTIONS="--no-experimental-webstorage"` added to `package.json scripts.test`; recovered 7/7 `use-entity.test.ts` assertions
- **Item #6 (column-mapping-ui Select):** Inline `?? "__none__"` coalesce at line 230 — sentinel matches `handleRoleChange` clear semantics
- **Item #7 (vitest 4 Mock callable):** `(put as ReturnType<typeof vi.fn>)(...)` → `vi.mocked(put)(...)` at lines 35, 43; companion `as unknown as Blob` cast for the post-fix `PutBody` requirement
- **deferred-items.md:** All 5 items marked `RESOLVED in Phase 14:` with fix description and commit reference; items #2/#4 RESOLVED-in-12-07 notes preserved intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Coalesce Select onValueChange in budgets/page.tsx** — `f26480e` (sibling Plan 14-04 commit accidentally included these 2 line edits; see Deviations below)
2. **Task 2: Canonicalize SerializedAccount** — `3e43f49` (refactor)
3. **Task 3: NODE_OPTIONS in package.json test script** — `49b776d` (chore)
4. **Task 4: column-mapping-ui handler coalesce** — `94d62d9` (fix)
5. **Task 5: vi.mocked(put|del) for vitest 4** — `b04fa60` (test)
6. **Task 6: deferred-items.md RESOLVED status** — `37d92e4` (docs)

**Plan metadata:** Final commit pending after this SUMMARY (docs: complete plan)

## Files Created/Modified

- `src/types/account.ts` — NEW: canonical `SerializedAccount` type with `cashFlowCategory` + `isContra` (Phase 12 fields)
- `src/app/(auth)/budgets/page.tsx` — 2 Select onValueChange handlers wrapped with null coalesce
- `src/app/(auth)/accounts/page.tsx` — Replaced local `type SerializedAccount` with `import type` from `@/types/account`
- `src/components/accounts/account-table.tsx` — Replaced local `type SerializedAccount` with `import type` from `@/types/account`
- `src/components/accounts/account-form.tsx` — Replaced local `type SerializedAccount` (the canonical shape) with `import type` from `@/types/account`
- `src/components/csv-import/column-mapping-ui.tsx` — `(val) => handleRoleChange(role, val ?? "__none__")` at line 230
- `tests/attachments/blob-storage.test.ts` — `vi.mocked(put)(path, file as unknown as Blob, ...)` and `vi.mocked(del)(url)` at lines 35, 43
- `package.json` — `"test": "NODE_OPTIONS=\"--no-experimental-webstorage\" vitest run --reporter=verbose"`
- `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` — appended `**RESOLVED in Phase 14:**` markers under items #1, #3, #5, #6, #7

## Decisions Made

- **Coalesce at call site, not state type widening:** Per CONTEXT.md "Deferred Ideas", no SafeSelect wrapper — keep state types as `string`, fix at every Select onValueChange that calls a `Dispatch<string>` setter.
- **Direct deep import for canonical type:** `@/types/account` (not a `@/types/index.ts` re-export). Matches existing project style (e.g., `@/types/SerializedEntity`) per RESEARCH.md.
- **NODE_OPTIONS at script level, not vitest config:** The issue is a Node global (Node 25 ships experimental built-in `localStorage` enabled by default which shadows jsdom's), not a jsdom URL config — verified by RESEARCH.md.
- **Spelled-out flag (`--no-experimental-webstorage`) over alias:** More discoverable for future maintainers reading the test script.
- **`vi.mocked(...)` over `as ReturnType<typeof vi.fn>`:** vitest 4's narrowed `Mock<Procedure | Constructable>` makes the cast non-callable (TS2348). `vi.mocked(fn)` returns `MockInstance<typeof fn>` which is callable.
- **`file as unknown as Blob` companion cast in blob-storage:** Smallest diff to satisfy real `PutBody` signature surfaced after switching to `vi.mocked(put)`. The mock ignores body type at runtime; the real upload route constructs a proper `File`.

## Deviations from Plan

### Out-of-scope sibling-agent overlap (Task 1)

**1. [Process - Concurrency] Task 1 changes inadvertently absorbed by sibling Plan 14-04 commit**
- **Found during:** Task 1 commit attempt
- **Issue:** When I ran `git status --short` after editing `src/app/(auth)/budgets/page.tsx` (2 Select onValueChange coalesce sites at lines 746, 775), git showed the working tree was clean. Investigation via `git show f26480e` revealed Plan 14-04's executor agent (running in parallel as Wave 1) had already authored the identical 2-site edit and bundled it into their `refactor(14-04): delete applyRules orphan + TransactionInput interface` commit (see commit body diff). The plan-04 changes also overwrote my freshly-edited file before I could stage it, but the post-overwrite content matched my intended edit byte-for-byte.
- **Fix:** Skipped the redundant Task 1 commit — the change is already in HEAD (commit `f26480e`). Updated the deferred-items.md RESOLVED note to credit `f26480e` for the change, with verification done in 14-05 via `tsc --noEmit | grep budgets/page.tsx` returning empty.
- **Files modified:** `src/app/(auth)/budgets/page.tsx` (already in `f26480e`)
- **Verification:** `npx tsc --noEmit 2>&1 | grep -E "budgets/page\.tsx"` returns ZERO matches; `git show f26480e -- "src/app/(auth)/budgets/page.tsx"` shows the exact 2-site coalesce diff
- **Committed in:** `f26480e` (sibling Plan 14-04 commit, not 14-05 — but functionally part of this plan's scope)

### Auto-fixed Issues

**2. [Rule 1 - Bug] New TS2345 surfaced after Task 5's vi.mocked switch — companion cast required**
- **Found during:** Task 5 (vitest 4 Mock generic fix in blob-storage.test.ts)
- **Issue:** The plan's prescribed fix `vi.mocked(put)(path, file, ...)` immediately surfaced a NEW TS2345 error: `Argument of type '{ name: string; type: string; size: number; }' is not assignable to parameter of type 'PutBody'`. This is because `vi.mocked(put)` returns `MockInstance<typeof put>`, which preserves the real `put` signature requiring `PutBody = string | Readable | Buffer | Blob | ArrayBuffer | ReadableStream | File`. The plain object the test passes (intentionally minimal — it's just for asserting the path/options pass-through) doesn't fit. Without the companion fix, the touched-file tsc verification would still fail (just with TS2345 instead of TS2348).
- **Fix:** Added `as unknown as Blob` cast on the `file` argument: `vi.mocked(put)(path, file as unknown as Blob, ...)`. The mock ignores body type at runtime (the test never inspects the file shape), and this preserves the test's "type-only fix" charter while clearing the new error.
- **Files modified:** `tests/attachments/blob-storage.test.ts` (line 35)
- **Verification:** `npx tsc --noEmit 2>&1 | grep -E "blob-storage\.test\.ts"` returns ZERO matches; both blob-storage tests still pass (2/2)
- **Committed in:** `b04fa60` (Task 5 commit — included in the same atomic edit)

---

**Total deviations:** 1 process (concurrency overlap) + 1 auto-fix (Rule 1, type-driven follow-up). Both expected.
**Impact on plan:** No scope creep. All 6 tasks closed. The Task 1 overlap is a parallel-execution artifact (Wave 1 was correctly marked parallel-eligible per plan frontmatter); the Task 5 follow-up cast is the minimal companion needed to make the prescribed fix actually achieve the done criterion (zero TS errors on touched file).

## Issues Encountered

None — all verifications passed on first attempt after each fix.

## User Setup Required

None — no external service configuration required.

## Phase-Level Verification Results

| # | Check | Result |
|---|-------|--------|
| 1 | `tsc --noEmit` zero matches on the 6 touched files (budgets/page.tsx, accounts/page.tsx, account-table.tsx, account-form.tsx, column-mapping-ui.tsx, blob-storage.test.ts) | PASS — empty output |
| 2 | `npm test -- src/__tests__/hooks/use-entity.test.ts` shows 7/7 passing, no `localStorage.clear is not a function` | PASS — 7 passed, 0 stderr |
| 3 | `grep -rn "^type SerializedAccount" src/` returns ZERO; `grep -rn "^export type SerializedAccount" src/` returns 1 (in src/types/account.ts) | PASS |
| 4 | `npm test` full suite green | PASS — 538 passed \| 75 todo (613 total) — meets baseline ≥537 |
| 5 | `grep -c "RESOLVED in Phase 14" deferred-items.md` ≥ 5; `grep -c "RESOLVED in 12-07"` ≥ 2 | PASS — 5 and 2 respectively |

## Next Phase Readiness

- Phase 14 success criterion #4 (tsc clean across touched files; full test suite green at ≥537 baseline) closed for the 14-05 surface
- Wave 1 of Phase 14 (plans 14-01, 14-02, 14-03, 14-04, 14-05) functionally complete — Wave 2 (any consolidation/sign-off plan) can begin
- No new entries added to `deferred-items.md` (no unrelated TS errors discovered in the transitive graph of touched files; the TS2345 surfaced in Task 5 was a direct consequence of my fix, so absorbed inline rather than deferred)

## Self-Check: PASSED

- **src/types/account.ts** — exists, exports SerializedAccount with cashFlowCategory + isContra
- **All 5 task commits exist in git log:** 3e43f49, 49b776d, 94d62d9, b04fa60, 37d92e4 (Task 1 lives in sibling f26480e per Deviation #1)
- **deferred-items.md** — 5 Phase 14 RESOLVED markers, 2 12-07 markers preserved
- **tsc clean** — all 6 touched files pass `tsc --noEmit | grep <file>` returning empty
- **Tests** — 538 passed | 75 todo, no localStorage errors

---
*Phase: 14-code-hygiene-wizard-fix*
*Completed: 2026-04-16*
