---
phase: 12-reporting-fixes-onboarding-wizard
plan: 05
subsystem: ui, api, onboarding
tags: [wizard, onboarding, opening-balance, journal-entry, react, prisma]

# Dependency graph
requires:
  - phase: 12-01
    provides: "Entity.wizardProgress JSON field"
  - phase: 12-04
    provides: "ColumnMappingUI component for CSV import"
provides:
  - "OnboardingWizard multi-step container with state management and progress persistence"
  - "Four wizard step components: COA, Holdings, Opening Balances, First Transactions"
  - "opening-balance utility (getBalanceCheck + generateOpeningBalanceJE)"
  - "wizard-progress API endpoint (GET/PATCH for Entity.wizardProgress)"
  - "SetupBanner on dashboard for incomplete wizard state"
  - "Entity form redirect to wizard after entity creation"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wizard step state via client-side useState + server-side wizardProgress JSON snapshot"
    - "Spreadsheet-style grid (reused from Phase 7 budget pattern) for opening balance entry"
    - "Leaf-account filter pattern: exclude any account referenced as parentId before posting"
    - "Zod schema expects decimal strings for money fields — serialize numbers via .toString()"

key-files:
  created:
    - "src/components/onboarding/onboarding-wizard.tsx"
    - "src/components/onboarding/wizard-coa-step.tsx"
    - "src/components/onboarding/wizard-holdings-step.tsx"
    - "src/components/onboarding/wizard-balances-step.tsx"
    - "src/components/onboarding/wizard-transactions-step.tsx"
    - "src/components/onboarding/wizard-progress.tsx"
    - "src/components/onboarding/setup-banner.tsx"
    - "src/lib/onboarding/opening-balance.ts"
    - "src/app/(auth)/onboarding/[entityId]/page.tsx"
    - "src/app/api/entities/[entityId]/wizard-progress/route.ts"
  modified:
    - "src/components/entities/entity-form.tsx"
    - "src/app/(auth)/dashboard/page.tsx"
    - "src/app/api/entities/[entityId]/accounts/template/route.ts"
    - "src/__tests__/utils/opening-balance.test.ts"

key-decisions:
  - "Fiscal-year-aware default JE date (fiscal-year-start for non-calendar entities)"
  - "All wizard steps individually skippable; progress visible via top progress bar"
  - "Opening balance grid groups accounts by type (Assets/Liabilities/Equity) for readability"
  - "Only leaf balance-sheet accounts are postable — parents are filtered out"
  - "Zod requires debit/credit as decimal strings, not numbers — serialized explicitly"

patterns-established:
  - "Wizard progress as JSON blob on Entity: { currentStep, completedSteps[], skippedSteps[] }"
  - "Skip action marks step as skipped and advances; Complete marks as completed"
  - "Setup banner auto-hides once wizardProgress shows all steps complete or skipped"
  - "Leaf-account filter: build set of parentIds from all accounts, exclude those from postable list"

requirements-completed: [WIZ-01, WIZ-02, WIZ-03]

# Metrics
duration: ~45min (including human verification loop)
completed: 2026-04-14
---

# Phase 12 Plan 05: Onboarding Wizard Summary

**Multi-step wizard triggered after entity creation — COA template, Holdings, Opening Balances, First Transactions — with skippable steps, progress persistence, and balanced JE generation**

## Performance

- **Duration:** ~45 min (including manual Chrome verification loop that surfaced two deviations)
- **Started:** 2026-04-12
- **Completed:** 2026-04-14
- **Tasks:** 2 planned + 1 fix commit
- **Files modified:** 14

## Accomplishments
- OnboardingWizard container with four step components and top progress indicator
- Wizard progress persisted server-side via `Entity.wizardProgress` JSON through GET/PATCH endpoint
- COA step reuses existing template import (Family Office / Hedge Fund / Blank)
- Holdings step provides a quick-setup guide with optional navigation to full Holdings page
- Opening Balances step renders a spreadsheet-style grid grouped by account type with real-time balance check and JE generation
- First Transactions step guides users to bank feed, JE entry, or recurring
- Dashboard SetupBanner surfaces incomplete wizards with a "Continue Setup" CTA; hides once complete
- Entity form redirects to `/onboarding/[entityId]` after successful creation
- Manual end-to-end verification in Chrome — wizard triggered, all 4 steps navigated, opening balance JE posted

## Task Commits

Each task was committed atomically:

1. **Task 1: Opening balance utility, wizard progress API, entity form redirect, dashboard setup banner** — `a45cdd3` (feat)
2. **Task 2: Wizard container, 4 step components, and wizard page route** — `f037fcd` (feat)
3. **Deviation fix: Opening balance validation + leaf-account filter** — `39e0450` (fix)

## Files Created/Modified
- `src/components/onboarding/onboarding-wizard.tsx` — Multi-step container (265 lines)
- `src/components/onboarding/wizard-coa-step.tsx` — COA template picker (139 lines)
- `src/components/onboarding/wizard-holdings-step.tsx` — Holdings quick-setup (80 lines)
- `src/components/onboarding/wizard-balances-step.tsx` — Opening balance grid + CSV import (477 lines)
- `src/components/onboarding/wizard-transactions-step.tsx` — First transaction guide (92 lines)
- `src/components/onboarding/wizard-progress.tsx` — Top progress indicator (69 lines)
- `src/components/onboarding/setup-banner.tsx` — Dashboard incomplete-setup banner (119 lines)
- `src/lib/onboarding/opening-balance.ts` — getBalanceCheck + generateOpeningBalanceJE utilities
- `src/app/(auth)/onboarding/[entityId]/page.tsx` — Wizard page route (38 lines)
- `src/app/api/entities/[entityId]/wizard-progress/route.ts` — GET/PATCH endpoint for wizardProgress
- `src/components/entities/entity-form.tsx` — Redirect to wizard after creation
- `src/app/(auth)/dashboard/page.tsx` — Integrate SetupBanner
- `src/app/api/entities/[entityId]/accounts/template/route.ts` — Minor adjustment for wizard usage
- `src/__tests__/utils/opening-balance.test.ts` — 8 tests for getBalanceCheck

## Decisions Made
- Wizard progress stored as a JSON blob on Entity (`{ currentStep, completedSteps[], skippedSteps[] }`) — simpler than normalizing into a separate table
- Each step dispatches Skip or Complete, which PATCHes wizardProgress and advances
- Opening balance JE date defaults to fiscal-year-start (non-calendar entities handled via `entityFiscalYearEnd`)
- Grid groups balance-sheet accounts by type (ASSET / LIABILITY / EQUITY); only leaf (non-parent) accounts are rendered
- Balance check uses 0.005 tolerance for floating-point comparison
- Dashboard banner reads wizardProgress and auto-hides once the wizard is complete

## Deviations from Plan

Two deviations surfaced during manual Chrome verification (committed as `39e0450`):

1. **Validation 400 on opening balance JE generation.** The zod schema (`lineItemSchema` in `src/lib/validators/journal-entry.ts`) expects `debit` and `credit` as decimal-format strings (e.g. `"1000"` or `"0"`), not numbers. Plan originally serialized them as numbers. Fixed by converting with `.toString()` and using `"0"` for the zero-amount side.
2. **"Cannot post to parent accounts" error.** Initial grid showed all balance-sheet accounts including parent accounts (`10000 Assets`, `20000 Liabilities`, `30000 Equity`). Journal entry API correctly rejects posting to parents. Fixed by building a set of parent IDs from all accounts and filtering them out of the postable grid — only leaf accounts remain.

Both fixes are non-breaking, preserve all existing tests, and align with existing patterns elsewhere in the codebase.

## Issues Encountered

- **Prisma client stale after schema change.** After `prisma db push` on Phase 12-01, the dev server kept a cached client that didn't know about `cashFlowCategory` / `wizardProgress`. Resolution: `npx prisma generate` + kill/restart dev server + clear `.next`.
- **Chrome MCP "find" transient timeout.** Single occurrence during manual verification; resolved by retrying.

## User Setup Required

None additional. Phase 12-04 already noted `ANTHROPIC_API_KEY` for the CSV flow (which the wizard's optional CSV import route uses). Without it, the wizard's CSV import still works via heuristic fallback.

## Next Phase Readiness
- All WIZ requirements verified end-to-end in Chrome
- Dashboard correctly distinguishes complete vs incomplete entities via SetupBanner
- Opening balance JE generation proven working with real data
- Phase 12 all plans complete — ready for phase-level verification

## Self-Check: PASSED
- All 10 created files exist
- All three commit hashes (`a45cdd3`, `f037fcd`, `39e0450`) found in git log
- `getBalanceCheck` and `generateOpeningBalanceJE` exported from `src/lib/onboarding/opening-balance.ts`
- Wizard auto-triggers after entity creation (manually verified in Chrome)
- Setup banner renders for incomplete wizards, absent for complete entities (manually verified)
- Opening balance JE successfully posted (manually verified in Chrome)
- 8/8 tests in `src/__tests__/utils/opening-balance.test.ts` pass after deviation fixes

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-14*
