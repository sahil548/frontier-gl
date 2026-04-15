---
phase: 12-reporting-fixes-onboarding-wizard
plan: 07
subsystem: onboarding

tags: [wizard, onboarding, ux, banner, header, prisma-json, timezone, jedate, react]

# Dependency graph
requires:
  - phase: 12-05
    provides: wizardProgress JSON field on Entity, setup-banner component, generateOpeningBalanceJE helper
  - phase: 01-03
    provides: EntityProvider + useEntityContext hook
provides:
  - Centralized isWizardInProgress + hasSubstantiveData pure helpers
  - Persistent ReturnToWizardBanner affordance in authenticated header
  - Server-side backfill for pre-existing entities (no more noisy "0 of 4" banner)
  - Opening balance JE date fidelity (stored date == form date, no UTC shift)
affects: onboarding, dashboard, header, wizard-progress-api

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helpers for wizard-progress logic (pre-fetched counts, no Prisma dependency)"
    - "Backfill-on-demand server pattern: detect substantive data on first GET, one-time write-through"
    - "YYYY-MM-DD string passed through API unchanged (avoids Date-object UTC/local drift)"
    - "Prisma.InputJsonValue cast for JSON column writes"

key-files:
  created:
    - "src/lib/onboarding/wizard-progress.ts"
    - "src/components/onboarding/return-to-wizard-banner.tsx"
    - "src/__tests__/utils/wizard-progress.test.ts"
  modified:
    - "src/components/layout/header.tsx"
    - "src/components/onboarding/setup-banner.tsx"
    - "src/app/api/entities/[entityId]/wizard-progress/route.ts"
    - "src/lib/onboarding/opening-balance.ts"
    - "src/components/onboarding/wizard-balances-step.tsx"
    - "src/__tests__/utils/opening-balance.test.ts"

key-decisions:
  - "Pure helpers take pre-fetched counts as input — unit-testable without Prisma mocks"
  - "Backfill on first GET (write-through) rather than scheduled migration — self-healing"
  - "Switched generateOpeningBalanceJE signature from Date to string to eliminate UTC/local shift"
  - "Header-mounted ReturnToWizardBanner renders null during initial fetch to prevent flicker"
  - "setup-banner delegates visibility to isWizardInProgress helper (centralized truth)"

patterns-established:
  - "Wizard visibility logic centralized in src/lib/onboarding/wizard-progress.ts — both server GET and client banners call isWizardInProgress"
  - "Date fields on forms stay as YYYY-MM-DD strings end-to-end; never wrap in new Date() just before posting"

requirements-completed: [WIZ-01, WIZ-02, WIZ-03]

# Metrics
duration: 6min
completed: 2026-04-15
---

# Phase 12 Plan 07: Wizard UX Gap Closure Summary

**Persistent "Return to Setup" header banner, backfill-on-demand for pre-existing entities, and opening-balance JE date fidelity — three UAT gaps closed**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-15T04:15:21Z
- **Completed:** 2026-04-15T04:21:40Z
- **Tasks:** 2 (both with TDD RED/GREEN sub-commits)
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- **UAT gap Test 2a closed:** ReturnToWizardBanner mounted in the authenticated header renders on any non-`/onboarding/*` route for an incomplete wizard, giving the user a persistent way back into setup after they route to `/accounts` (Customize) or any other page.
- **UAT gap Test 12 closed:** GET /api/entities/:id/wizard-progress now detects substantive data (accountCount > 5 OR any posted JE OR any active holding) and writes all-complete progress to the DB on first read for pre-existing entities — eliminates the confusing "0 of 4 steps complete" banner on Three Pagodas, LLC and similar seeded entities.
- **UAT gap Test 11 closed:** generateOpeningBalanceJE now accepts a YYYY-MM-DD string and passes it straight through to the JE POST body. Removes the `new Date(yyyy-mm-dd).toISOString().split("T")[0]` round-trip that was interpreting the ISO date as UTC midnight and shifting to the prior day in negative-UTC offset timezones (Jan 1 form → Dec 31 stored).
- **Centralized wizard truth:** setup-banner.tsx now calls `isWizardInProgress` instead of duplicating the step-count / all-complete logic, so header banner + dashboard banner + server backfill all share one decision function.
- **Toast improvement:** opening-balance success toast now echoes the stored JE date back ("Opening balance JE created for 2026-01-01 (id)") so the user sees confirmation of exactly what was posted.

## Task Commits

Each task followed TDD with separate RED and GREEN commits:

1. **Task 1 RED: failing wizard-progress helper tests** — `8dbdcb7` (test)
2. **Task 1 GREEN: return-to-wizard banner + helpers + header wiring** — `3ebb8c5` (feat)
3. **Task 2 RED: failing opening-balance date fidelity tests** — `83057cd` (test)
4. **Task 2 GREEN: backfill + JE date fidelity + Prisma.InputJsonValue cast** — `33b9601` (feat)

**Plan metadata commit:** (to be added after this summary)

## Files Created/Modified

**Created:**
- `src/lib/onboarding/wizard-progress.ts` — Pure helpers: `isWizardInProgress`, `hasSubstantiveData`, `WIZARD_DEFAULT`, `backfillCompleteProgress`, types `WizardProgress` and `SubstantiveDataCounts`
- `src/components/onboarding/return-to-wizard-banner.tsx` — Header-mounted client banner; fetches progress, hides on `/onboarding/*`, hides when complete/dismissed, null during loading
- `src/__tests__/utils/wizard-progress.test.ts` — 17 unit tests covering all helper branches

**Modified:**
- `src/components/layout/header.tsx` — Added `useEntityContext` import and ReturnToWizardBanner mount (guarded by `currentEntityId !== "all"`)
- `src/components/onboarding/setup-banner.tsx` — Swapped inline step-count logic for `isWizardInProgress(progress)` helper
- `src/app/api/entities/[entityId]/wizard-progress/route.ts` — GET handler backfills complete progress when stored is null/default AND entity has substantive data; PATCH write cast to `Prisma.InputJsonValue`
- `src/lib/onboarding/opening-balance.ts` — `generateOpeningBalanceJE` signature `jeDate: Date` → `jeDate: string`, body sends the string directly, JSDoc updated
- `src/components/onboarding/wizard-balances-step.tsx` — Call site passes `jeDate` directly; toast echoes the stored date
- `src/__tests__/utils/opening-balance.test.ts` — Added 3 tests for JE date fidelity (fetch mock asserts body.date equals form date)

## Decisions Made

- **Pure helpers with pre-fetched counts input:** `hasSubstantiveData({ accountCount, postedJECount, holdingCount })` takes numbers, not a Prisma client. This keeps the helper pure and unit-testable without DB mocks. The GET handler fetches the three counts in parallel via `Promise.all` and passes them in.
- **Backfill on first GET (write-through) rather than migration script:** Pre-existing entities self-heal the first time their wizard-progress is read. No one-shot migration needed; no risk of running twice.
- **Deep-equals DEFAULT_PROGRESS for backfill trigger:** The existing PATCH handler stored the default shape `{coaComplete:false,...}` on some entities; `isDefaultProgress` treats that as equivalent to null so those entities get backfilled too.
- **Header banner renders null during loading:** Avoids a flash where the banner briefly shows while the progress fetch is in flight on fresh page load.
- **`jeDate: string` end-to-end:** The form input is already a YYYY-MM-DD string from `<Input type="date">`. Wrapping it in `new Date()` only to call `.toISOString().split("T")[0]` introduces a UTC vs local shift. Keeping the string eliminates the round-trip entirely.
- **Prisma.InputJsonValue cast:** `Record<string, unknown>` is not assignable to Prisma's `InputJsonValue` type. The codebase pattern is `as unknown as Prisma.InputJsonValue` for stored JSON blobs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Fixed pre-existing Prisma JSON type cast in wizard-progress route**
- **Found during:** Task 2 (modifying the GET handler)
- **Issue:** The existing PATCH write and my new GET backfill write both used `as Record<string, unknown>` for `wizardProgress`. Prisma's `InputJsonValue` union is stricter — two TS errors blocked clean `tsc --noEmit`.
- **Fix:** Imported `Prisma` from `@/generated/prisma/client` and cast writes as `as unknown as Prisma.InputJsonValue` in both the GET backfill and PATCH merge.
- **Files modified:** `src/app/api/entities/[entityId]/wizard-progress/route.ts`
- **Verification:** `npx tsc --noEmit` for touched files now clean. Deferred item #4 in `deferred-items.md` updated to RESOLVED.
- **Committed in:** `33b9601`

**2. [Rule 1 — Bug] Removed inline "N of 4 steps complete" logic duplication in setup-banner**
- **Found during:** Task 2 (per plan step 2)
- **Issue:** setup-banner.tsx had its own step-count comparison to hide itself when all 4 steps complete, which would drift from the new helper truth.
- **Fix:** Replaced with `if (!isWizardInProgress(progress)) return null;`. Kept the completed-count calc purely for display ("N of 4 steps complete" line).
- **Files modified:** `src/components/onboarding/setup-banner.tsx`
- **Verification:** Manual read-through; setup-banner now delegates to the same helper the server GET and header banner use.
- **Committed in:** `33b9601`

---

**Total deviations:** 2 auto-fixed (1 blocking TS fix, 1 logic centralization already called out in plan)
**Impact on plan:** Both fixes are in scope of Task 2 per plan text. The `Prisma.InputJsonValue` cast was a plan-adjacent TS strictness fix that resolved a pre-existing deferred item. No scope creep.

## Issues Encountered

- **Linter/formatter reverted an in-flight edit once during Task 2:** The file state messages implied edits had been reverted, but `git diff` confirmed all changes were actually present. Cleared the issue by re-reading actual file content and continuing.
- **Cross-plan artifact mingling in `git status`:** While executing this plan, commits for 12-06 and 12-08 (by other executors) had left `.planning/ROADMAP.md`, `.planning/STATE.md`, and their SUMMARY files uncommitted or modified. Staged only my task-related files by name to avoid mixing concerns.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 12 wizard-related UAT gaps (Tests 2a, 11, 12) fully closed.
- `src/lib/onboarding/wizard-progress.ts` is now the single source of truth for wizard visibility; future phases that add banners (e.g., reporting wizard) can reuse the same helper.
- `generateOpeningBalanceJE` string-date pattern should be applied anywhere else the codebase posts `<Input type="date">` values to the JE API (not in scope for this plan).
- Pre-existing entity seed data is safe — backfill is idempotent (null/default check prevents re-writes).

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/lib/onboarding/wizard-progress.ts`
- FOUND: `src/components/onboarding/return-to-wizard-banner.tsx`
- FOUND: `src/__tests__/utils/wizard-progress.test.ts`
- FOUND: `.planning/phases/12-reporting-fixes-onboarding-wizard/12-07-SUMMARY.md`
- FOUND: `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md`

**Commits verified:**
- FOUND: `8dbdcb7` (Task 1 RED)
- FOUND: `3ebb8c5` (Task 1 GREEN)
- FOUND: `83057cd` (Task 2 RED)
- FOUND: `33b9601` (Task 2 GREEN)

**Tests verified:** 28 passed (17 wizard-progress + 11 opening-balance) in `npx vitest run src/__tests__/utils/opening-balance.test.ts src/__tests__/utils/wizard-progress.test.ts`

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-15*
