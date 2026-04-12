---
phase: 11-categorization-ux-opening-balances
plan: 05
subsystem: ui
tags: [react, position-picker, bank-feed, categorization, inline-editing]

# Dependency graph
requires:
  - phase: 11-02
    provides: PositionPicker component, position-first RuleForm, categorization rules with positionId
  - phase: 11-04
    provides: Reconciliation badges, auto-reconcile on post, bank feed navigation
provides:
  - Inline position-first categorization cell in TransactionTable for PENDING rows
  - positionId flow through handleCategorize to PATCH API and CategorizePrompt state
affects: [bank-feed, categorization, holdings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-row target mode toggle via Record<string, 'position' | 'account'> state
    - Position label resolution via cached positions API fetch in handleCategorize

key-files:
  created: []
  modified:
    - src/components/bank-feed/transaction-table.tsx
    - src/app/(auth)/bank-feed/page.tsx

key-decisions:
  - "Position label resolved in handleCategorize via positions API fetch (cached by PositionPicker) rather than passing label through onCategorize callback"
  - "Per-row target mode state as Record<string, mode> at component level rather than per-cell useState"

patterns-established:
  - "Inline position-first target: PositionPicker default with text link toggle to AccountCombobox fallback"
  - "Backward-compatible onCategorize: optional positionId third parameter preserves compact mode callers"

requirements-completed: [CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 11 Plan 05: Gap Closure Summary

**Position-first inline categorization wired into TransactionTable with positionId flowing through handleCategorize to CategorizePrompt for position-targeted rule creation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T21:02:46Z
- **Completed:** 2026-04-12T21:06:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- TransactionTable PENDING rows now render PositionPicker as the default inline categorization target (non-compact mode) with a "Use GL account" toggle to reveal AccountCombobox
- handleCategorize accepts and forwards positionId to the PATCH API, resolves position label from cached positions API, and populates both positionId and positionLabel in CategorizePrompt state
- Both verification gaps from 11-VERIFICATION.md are now closed

## Task Commits

Each task was committed atomically:

1. **Task 1: Inline position-first categorization cell in TransactionTable** - `6dea1b5` (feat)
2. **Task 2: Wire positionId through handleCategorize into CategorizePrompt state** - `4d32135` (feat)

## Files Created/Modified
- `src/components/bank-feed/transaction-table.tsx` - Added PositionPicker import, entityId prop, per-row target mode state, position-first inline cell with GL fallback toggle
- `src/app/(auth)/bank-feed/page.tsx` - Updated handleCategorize with positionId parameter, PATCH body with positionId, position label resolution, entityId prop on TransactionTable

## Decisions Made
- Position label resolved in handleCategorize via positions API fetch (already cached by PositionPicker within 60s TTL) rather than adding label to onCategorize callback -- keeps the callback signature simpler
- Per-row target mode tracked as `Record<string, 'position' | 'account'>` at component level -- avoids per-cell useState and naturally resets when transactions refresh

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 categorization UX and opening balances fully complete -- all 8 verification truths now pass
- All requirements (CAT-01, CAT-03, OBE-01/02/03, REC-01/03/04) covered
- Ready for Phase 12 or next milestone work

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 11-categorization-ux-opening-balances*
*Completed: 2026-04-12*
