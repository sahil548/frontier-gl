---
phase: 11-categorization-ux-opening-balances
plan: 02
subsystem: ui, api
tags: [position-picker, categorization, bank-feed, rules, gl-resolution, popover-command]

requires:
  - phase: 11-categorization-ux-opening-balances
    provides: positionId on CategorizationRule and BankTransaction, positions API endpoint
  - phase: 09-bank-feed-categorization
    provides: CategorizePrompt, RuleForm, AccountCombobox, categorize engine
  - phase: 10-positions-model-holdings-overhaul
    provides: Position model with GL anchoring, SubledgerItem relations
provides:
  - PositionPicker component with Popover+Command pattern and module-level cache
  - CategorizePrompt with position-first default and GL fallback toggle
  - RuleForm with position/account target mode toggle and dimension tags in both modes
  - Rules page showing position name as primary label with GL detail for position-targeted rules
  - Rules API GL resolution at apply-time for retroactive matching
  - Transaction PATCH accepts positionId with GL resolution
  - Transaction POST resolves positionId -> accountId before JE creation
affects: [11-03, 11-04]

tech-stack:
  added: []
  patterns: [position-first target mode toggle, GL resolution at apply-time for position-targeted rules]

key-files:
  created:
    - src/components/bank-feed/position-picker.tsx
  modified:
    - src/components/bank-feed/categorize-prompt.tsx
    - src/components/bank-feed/rule-form.tsx
    - src/app/(auth)/bank-feed/page.tsx
    - src/app/(auth)/bank-feed/rules/page.tsx
    - src/app/api/entities/[entityId]/bank-transactions/rules/route.ts
    - src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts
    - src/lib/plaid/sync.ts

key-decisions:
  - "Position-first target mode: both CategorizePrompt and RuleForm default to position picker with 'Use GL account' text link toggle"
  - "GL resolution at apply-time: retroactive matching and JE creation resolve positionId -> accountId via position.accountId ?? subledgerItem.accountId"
  - "Dimension tags preserved in position mode: selector remains visible in both target modes per user decision"

patterns-established:
  - "Target mode toggle: 'position' | 'account' state with text link toggle for switching between PositionPicker and AccountCombobox"
  - "Position display format: 'HoldingName -> PositionName' with holdingType badge in picker, GL detail as secondary text in rules table"
  - "GL resolution chain: position.accountId ?? position.subledgerItem.accountId for position -> GL account resolution"

requirements-completed: [CAT-01, CAT-03]

duration: 9min
completed: 2026-04-12
---

# Phase 11 Plan 02: Position Picker + Categorization Target Refactor Summary

**PositionPicker component with Popover+Command pattern, position-first categorization UX in CategorizePrompt and RuleForm, and GL resolution at apply-time for position-targeted rules**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-12T19:55:08Z
- **Completed:** 2026-04-12T20:04:09Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- PositionPicker component: searchable dropdown with holding name, position name, and holdingType badge using Popover+Command pattern with module-level Map cache (60s TTL)
- CategorizePrompt and RuleForm both default to position picker with "Use GL account" text link toggle; dimension tags remain visible and functional in both target modes
- Rules page displays position-targeted rules with "HoldingName -> PositionName" as primary label and GL account number in smaller muted text
- Rules API POST resolves GL account at apply-time when retroactively matching PENDING transactions with position-targeted rules
- Transaction PATCH accepts positionId alongside accountId, resolving GL from position
- Transaction POST resolves positionId -> accountId before creating JE offset line items

## Task Commits

Each task was committed atomically:

1. **Task 1: PositionPicker component + CategorizePrompt integration with GL fallback** - `c6aa9f9` (feat)
2. **Task 2: Rule form position support + rules API positionId handling + GL resolution at apply-time** - `1cd0f9c` (feat)

## Files Created/Modified
- `src/components/bank-feed/position-picker.tsx` - New PositionPicker component with Popover+Command pattern, entity-scoped position fetch, holdingType badge
- `src/components/bank-feed/categorize-prompt.tsx` - Updated with positionId/positionLabel props, position-targeted rule creation
- `src/components/bank-feed/rule-form.tsx` - Target mode toggle (position/account), PositionPicker integration, dimension tags in both modes
- `src/app/(auth)/bank-feed/page.tsx` - Categorize prompt state extended with positionId/positionLabel
- `src/app/(auth)/bank-feed/rules/page.tsx` - SerializedRule type with position fields, renderTarget helper for position/account display
- `src/app/api/entities/[entityId]/bank-transactions/rules/route.ts` - GET includes position relation, POST resolves GL at apply-time
- `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` - PATCH accepts positionId with refine, POST resolves positionId for JE
- `src/lib/plaid/sync.ts` - Inline rules type updated for nullable accountId + optional positionId

## Decisions Made
- Position-first target mode: both CategorizePrompt and RuleForm default to position picker with "Use GL account" text link toggle -- minimal footprint per CONTEXT.md "link, switch, or dropdown" discretion
- GL resolution at apply-time: retroactive matching and JE creation both resolve positionId -> accountId via `position.accountId ?? position.subledgerItem.accountId` chain, so if GL mapping changes later only future applications pick up the new mapping
- Dimension tags preserved in position mode: selector remains visible and functional in both modes per user decision from CONTEXT.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plaid sync inline rules type incompatible with nullable accountId**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `src/lib/plaid/sync.ts` had inline type with `accountId: string` (non-nullable) which no longer matched the CategorizationRule model after Plan 01 made accountId optional
- **Fix:** Updated inline type to `accountId: string | null` and added `positionId?: string | null`
- **Files modified:** src/lib/plaid/sync.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** c6aa9f9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pre-existing type mismatch from Plan 01's accountId nullability change. Necessary for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Position picker and categorization UX complete for bank feed workflow
- GL resolution at apply-time foundation ready for opening balance JE generation (Plan 03)
- Rules management page ready for position-targeted rule display
- CategorizePrompt supports both position and GL account rule creation paths

## Self-Check: PASSED

All files verified on disk. Both task commits (c6aa9f9, 1cd0f9c) verified in git log.

---
*Phase: 11-categorization-ux-opening-balances*
*Completed: 2026-04-12*
