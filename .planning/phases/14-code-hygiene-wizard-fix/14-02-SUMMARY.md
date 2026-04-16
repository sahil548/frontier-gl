---
phase: 14-code-hygiene-wizard-fix
plan: 02
subsystem: accounting-engine
tags: [api, validation, journal-entries, wizard, regression-tests, zod, prisma]

# Dependency graph
requires:
  - phase: 14-code-hygiene-wizard-fix
    provides: postJournalEntryInTx tx-aware helper (Plan 14-01)
  - phase: 12-reporting-fixes-onboarding-wizard
    provides: onboarding wizard opening-balance helper + balance-sheet contract
provides:
  - JE POST API auto-post-when-balanced default (omitted status → POSTED)
  - explicit status: "DRAFT" opt-out for callers preserving draft → approve → post UX
  - closed-period error mapping on JE POST (parity with /post route)
  - Wave 0 regression test for WIZ-03 (wizard helper omits status)
  - Wave 0 regression test for manual JE form DRAFT-on-Save audit-switch
affects: [14-04, 14-05, future onboarding/wizard work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional status enum on POST schema with handler-side default (shouldPost = status !== 'DRAFT') — opt-out semantics live in the handler, not the schema, so .optional() stays clean"
    - "postJournalEntryInTx invoked inside the existing $transaction (no nested transactions); CREATED audit BEFORE post call so audit ordering matches standalone /post route (CREATED → POSTED)"
    - "Closed-period / already-posted error mapping in the outer try/catch mirrors the /post route 1:1 (single source of friendly-copy contract)"
    - "Component test scaffold: vi.mock children that fetch their own data (JELineItems, useIsBalanced) + window.location.href stub + initialLines prop to seed balanced form state"

key-files:
  created:
    - src/__tests__/utils/opening-balance-autopost.test.ts
    - src/__tests__/components/je-form-draft-opt-out.test.tsx
  modified:
    - src/lib/validators/journal-entry.ts
    - src/app/api/entities/[entityId]/journal-entries/route.ts
    - src/components/journal-entries/je-form.tsx
    - src/components/onboarding/wizard-balances-step.tsx

key-decisions:
  - "Schema field stays .optional() (no .default('POSTED')) — handler computes shouldPost from undefined-vs-'DRAFT', avoiding a Zod default that would conflict with the API-handler default semantics"
  - "JE create still hardcoded status: 'DRAFT' inside the transaction; postJournalEntryInTx flips to POSTED when shouldPost is true. Single source of truth for the POSTED transition stays in postJournalEntryInTx."
  - "Audit-switch on the manual JE form spreads ...data and adds status: 'DRAFT' (not a separate parameter) — keeps the fetch body shape minimal and explicit; applied to BOTH POST (create) and PUT (edit) paths"
  - "Component test stubs JELineItems/useIsBalanced via vi.mock and seeds defaultLineItems via the initialLines prop — bypasses the in-form combobox/data-fetch dependencies while exercising the real fetch + form-submit pipeline"

patterns-established:
  - "Opt-out-by-explicit-string: API contracts can flip default behavior by adding an optional enum field; existing callers continue working, new callers opt out by sending the explicit value"
  - "Tx-aware helper invocation inside an outer $transaction (no nesting): import the helper, call it on the same `tx` the handler already opened, errors propagate through to the handler's outer catch for friendly-error mapping"

requirements-completed: [WIZ-03]

# Metrics
duration: 6 min
completed: 2026-04-16
---

# Phase 14 Plan 02: JE POST API Auto-Post Default + WIZ-03 Closure Summary

**Added optional `status: 'DRAFT' | 'POSTED'` field to the JE POST API: omitted = auto-post-when-balanced (calls `postJournalEntryInTx` inside the existing `$transaction`), `'DRAFT'` = explicit opt-out for the manual JE form's draft → approve → post UX. Closes WIZ-03 — the wizard's opening-balance JE now auto-posts so the Balance Sheet shows entered values immediately.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-16T13:42:00Z
- **Completed:** 2026-04-16T13:48:09Z
- **Tasks:** 3 (TDD: RED for both Wave 0 tests, GREEN-1 for schema/route, GREEN-2 for form/toast)
- **Files modified:** 4
- **Files created:** 2

## Accomplishments

- `journalEntrySchema` extended with `status: z.enum(["DRAFT", "POSTED"]).optional()` — backward-compatible
- JE POST handler at `src/app/api/entities/[entityId]/journal-entries/route.ts` now computes `shouldPost = status !== "DRAFT"` and conditionally calls `postJournalEntryInTx(tx, je.id, userId)` inside the existing `$transaction` (Step 4, after the CREATED audit, before the re-fetch)
- Closed-period and already-posted errors thrown by `postJournalEntryInTx` from the auto-post path are mapped to user-friendly 400 responses in the outer catch (mirrors standalone `/post` route)
- Manual JE form (`je-form.tsx`) audit-switched: fetch body now spreads `...data` and adds explicit `status: "DRAFT"` so Save Draft (and Edit Save) never auto-posts. The Approve and Post action paths are unchanged — they call separate `/approve` and `/post` endpoints AFTER save.
- Wizard helper (`src/lib/onboarding/opening-balance.ts`) intentionally NOT modified — it already omits `status`, so the new POSTED-when-balanced default takes over automatically. This is the WIZ-03 closure mechanism.
- Wizard toast copy refined: "Opening balance JE posted for {date} — your Balance Sheet is ready ({jeId})" (changed from "created"), conveying the auto-post outcome while retaining the JE id for support/debugging.
- 2 new Wave 0 regression test files added (3 tests total): one asserts wizard helper omits `status`, one asserts manual JE form sends explicit `status: "DRAFT"`. Both green.
- Full test suite: 543 passed (up from 538 baseline pre-Phase-14-Wave-2; net +5 across this plan's 3 + Plan 14-03's 2). Zero TypeScript errors anywhere (`npx tsc --noEmit` clean).

## Task Commits

Each task was committed atomically following the TDD cycle:

1. **Task 1: Wave 0 — write 2 new regression test files (RED)** — `06938ce` (test)
2. **Task 2: Extend journalEntrySchema and refactor JE POST handler to auto-post-when-balanced** — `9a9cf37` (feat)
3. **Task 3: Audit-switch manual JE form to send explicit status: 'DRAFT' (GREEN for je-form test)** — `18a4f32` (feat)

REFACTOR phase: not needed — each GREEN was a minimal, clean change. No separate refactor commit.

**Plan metadata:** committed via `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs commit` after this SUMMARY is written.

## Files Created/Modified

- `src/lib/validators/journal-entry.ts` — Added `status: z.enum(["DRAFT", "POSTED"]).optional()` to `journalEntrySchema`. Balance-refinement and line-item refinements unchanged.
- `src/app/api/entities/[entityId]/journal-entries/route.ts` — Added `postJournalEntryInTx` import; extracted `status` and `shouldPost` from validated body; kept JE create with hardcoded `status: "DRAFT"`; added Step 4 conditional `postJournalEntryInTx(tx, je.id, userId)` call inside the existing `$transaction`; updated outer catch to map "already posted" / "closed period" errors to 400 with friendly copy.
- `src/components/journal-entries/je-form.tsx` — Save fetch body spreads `...data` and adds explicit `status: "DRAFT"`. Applies to both POST (create) and PUT (edit) paths.
- `src/components/onboarding/wizard-balances-step.tsx` — Toast copy refined: "posted for {date} — your Balance Sheet is ready" + JE id.
- `src/__tests__/utils/opening-balance-autopost.test.ts` — NEW. Two tests: (1) wizard helper POST body has no `status` field, (2) line items don't carry stray `status` field either.
- `src/__tests__/components/je-form-draft-opt-out.test.tsx` — NEW. One test: rendering `<JEForm mode="create" entityId="e1" initialLines=[balanced]>` and clicking "Save Draft" sends a fetch body with `status: "DRAFT"`. Mocks `next/navigation`, `JELineItems`, `useIsBalanced`, `JEStatusBadge`. Stubs `window.location.href` to absorb the form's hard-navigate-after-save side effect.

## Decisions Made

- **Schema field stays `.optional()`, no `.default("POSTED")`** — the handler computes `shouldPost = status !== "DRAFT"` so undefined behaves as POSTED-when-balanced without injecting a Zod default that would obscure the opt-in/opt-out semantics in the schema. Reading the schema makes the contract crystal clear: it's an optional opt-out signal.
- **JE create still hardcodes `status: "DRAFT"` inside the transaction** — `postJournalEntryInTx` is the single source of truth for the POSTED transition (lock, status update, balance upserts, POSTED audit). Hardcoding DRAFT on create + conditionally calling postJournalEntryInTx keeps that invariant intact. Without this, an explicit `"POSTED"` payload would bypass the helper's lock/audit steps.
- **Audit-switch on the manual JE form spreads `...data` rather than introducing a separate parameter** — keeps the fetch body shape minimal, declarative, and explicit. Both POST (create) and PUT (edit) fetch bodies now include `status: "DRAFT"`. Editing a draft must NOT silently flip it to POSTED; the form's separate Approve and Post buttons handle those transitions.
- **Component test stubs JELineItems/useIsBalanced via vi.mock and seeds the form via `initialLines`** — bypasses the JELineItems data-fetch dependencies (accounts API + dimensions API) while exercising the real `useForm` + `handleSubmit` + `fetch` pipeline. The `useIsBalanced` mock returns `true` so the Save Draft button isn't disabled by the balance check (which Server-side validation also enforces). The `window.location.href` stub absorbs the form's hard-navigate side effect after a successful save.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Component test file extension changed from .test.ts to .test.tsx**
- **Found during:** Task 1 (file creation)
- **Issue:** The plan specified `src/__tests__/components/je-form-draft-opt-out.test.ts` but the file uses JSX (`<JEForm ... />` and `<div data-testid="line-items-stub" />` in vi.mock'd factory functions). Vitest's TypeScript config requires `.tsx` for files that contain JSX expressions.
- **Fix:** Created the file as `je-form-draft-opt-out.test.tsx` instead. The vitest `include` pattern (`src/**/*.test.{ts,tsx}`) picks both extensions up.
- **Files modified:** `src/__tests__/components/je-form-draft-opt-out.test.tsx`
- **Verification:** `npx vitest run src/__tests__/components/je-form-draft-opt-out.test.tsx` runs cleanly; test passes after Task 3 audit-switch.
- **Committed in:** `06938ce` (Task 1 commit)

**2. [Rule 3 - Blocking] JEForm props signature differed from plan scaffold**
- **Found during:** Task 1 (test scaffold construction)
- **Issue:** The plan's illustrative test scaffold called `<JEForm entityId="e1" mode="create" accounts={[...]} />` but the actual `JEFormProps` does not include an `accounts` prop. JELineItems fetches accounts internally via `/api/entities/{entityId}/accounts`. The plan acknowledged the scaffold was illustrative ("adjust to the real component contract").
- **Fix:** Mocked `@/components/journal-entries/je-line-items` (returning a stub component plus `useIsBalanced: () => true`) and `@/components/journal-entries/je-status-badge`. Seeded balanced line items via the real `initialLines` prop. Pre-filled description (required by schema) via `fireEvent.change` on the rendered input.
- **Files modified:** `src/__tests__/components/je-form-draft-opt-out.test.tsx`
- **Verification:** Test renders without crashing, fetch fires on Save Draft click, body has `status: "DRAFT"` after Task 3.
- **Committed in:** `06938ce` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking, file-extension and component-API drift between plan scaffold and real source).
**Impact on plan:** Minimal. The deviations were anticipated by the plan ("the test scaffold above is illustrative — adjust to the real component contract") and are typical adjustments for any TDD plan whose scaffolds were drafted without re-reading every line of the real source. No scope creep.

## Issues Encountered

None. Three tasks executed cleanly. No checkpoints, no auth gates, no architectural decisions needed.

Pre-existing test failures or warnings in unrelated files (none observed during this plan; full suite reports 543 passed / 75 todo / 0 failed / 0 errors). No new TypeScript errors anywhere (`npx tsc --noEmit` returns empty output).

The Plan-output spec mentions updating `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` to flag any newly-surfaced unrelated TS errors. None were discovered during this plan — the deferred-items.md file is already current (Phase 14 Plan 05 closed all 5 remaining Phase-12 deferred items). No update needed.

## Manual Chrome Verification

Per MEMORY.md ("Test in Chrome — Verify UI features in Chrome browser, not just automated tests") and 14-VALIDATION.md Manual-Only table:

**Status:** Not executed in this autonomous run (no dev server started, no human verifier present). Recommended manual verification (post-merge) per the plan's `<verification>` block:

1. Create a new entity, complete COA step (family-office template), enter balanced opening balances ($10,000 Cash / $10,000 OBE), click Generate, navigate to Balance Sheet, confirm $10,000 cash visible (not waiting on a draft).
2. Open JE form, enter a balanced entry, click Save Draft, confirm new entry appears in JE list as DRAFT.

Both flows should pass: (1) verifies the auto-post default closes WIZ-03; (2) verifies the audit-switch preserves the manual form's UX. Document any deviations as new deferred items.

## User Setup Required

None — no external service configuration required. Pure code/contract change.

## Next Phase Readiness

- **WIZ-03 closed.** The wizard opening-balance JE now auto-posts (POSTED-when-balanced API default). The Balance Sheet shows entered values immediately, no manual post step required. Closes the behavioral gap with the Holdings OBE inline-POSTED pattern.
- **Manual JE form UX preserved.** The audit-switch ensures Save Draft → DRAFT JE → user explicitly approves and posts via separate buttons. No silent auto-post regression.
- **Plan 14-04 / 14-05 already complete** (per STATE.md and recent commit history). Phase 14 remaining work: Plan 14-03 also completed (`c4279b2`), and pending phase-level rollup once all Wave 2 plans are in.
- **Public API of JE POST unchanged for existing callers.** Existing tests continue to pass (538 → 543, +5 net new across 14-02 and 14-03). Zero TS errors anywhere.

## Self-Check: PASSED

- [x] FOUND: `src/__tests__/utils/opening-balance-autopost.test.ts` (created)
- [x] FOUND: `src/__tests__/components/je-form-draft-opt-out.test.tsx` (created)
- [x] FOUND: `src/lib/validators/journal-entry.ts` (modified — `status` field added at line ~58)
- [x] FOUND: `src/app/api/entities/[entityId]/journal-entries/route.ts` (modified — `postJournalEntryInTx` import, `shouldPost` extraction, conditional auto-post call inside `$transaction`, error-mapping catch)
- [x] FOUND: `src/components/journal-entries/je-form.tsx` (modified — fetch body spreads `...data` + `status: "DRAFT"`)
- [x] FOUND: `src/components/onboarding/wizard-balances-step.tsx` (modified — toast copy refined)
- [x] FOUND: `.planning/phases/14-code-hygiene-wizard-fix/14-02-SUMMARY.md` (this file)
- [x] FOUND commit `06938ce` (test: Wave 0 RED)
- [x] FOUND commit `9a9cf37` (feat: schema + route GREEN)
- [x] FOUND commit `18a4f32` (feat: form + toast GREEN)
- [x] All 3 Wave 0 tests pass (`npx vitest run src/__tests__/utils/opening-balance-autopost.test.ts src/__tests__/components/je-form-draft-opt-out.test.tsx` — 3/3 green)
- [x] No journal-entries regressions (`npx vitest run src/lib/journal-entries/` — 36/36 pass)
- [x] Full suite green (`npm test` — 543 passed / 75 todo / 0 failed)
- [x] tsc clean for touched files (no errors emitted)

---
*Phase: 14-code-hygiene-wizard-fix*
*Completed: 2026-04-16*
