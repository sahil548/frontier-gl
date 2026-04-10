---
phase: 08-family-office-i-multi-entity-consolidation
plan: 03
subsystem: api, ui
tags: [elimination-rules, crud, settings, prisma, next.js, zod, react-hook-form]

requires:
  - phase: 08-family-office-i-multi-entity-consolidation
    provides: EliminationRule Prisma model and consolidated TypeScript types
provides:
  - Elimination rules CRUD API (list, create, update, soft-delete)
  - Settings > Intercompany Eliminations page with rule table and form
  - canManageEliminationRule authorization helper
affects: [08-04, 08-05]

tech-stack:
  added: []
  patterns: [canManageEliminationRule dual-entity Owner check, entity-scoped account selector with cache]

key-files:
  created:
    - src/lib/validators/elimination-rule.ts
    - src/app/api/consolidated/elimination-rules/route.ts
    - src/app/api/consolidated/elimination-rules/[ruleId]/route.ts
    - src/app/(auth)/settings/eliminations/page.tsx
    - src/components/settings/elimination-rule-form.tsx
    - src/components/settings/elimination-rules-table.tsx
  modified:
    - src/lib/db/entity-access.ts
    - src/components/layout/sidebar.tsx

key-decisions:
  - "canManageEliminationRule checks OWNER role on both entities in a single findMany query"
  - "Module-level Map cache with 60s TTL for entity accounts in elimination rule form"

patterns-established:
  - "Dual-entity authorization: canManageEliminationRule requires OWNER on both entities for elimination rule CRUD"
  - "Entity-scoped account selectors: fetch accounts when entity changes, cached per entityId"

requirements-completed: [CONS-03, CONS-04]

duration: 4min
completed: 2026-04-10
---

# Phase 8 Plan 3: Elimination Rules CRUD Summary

**Elimination rules CRUD API with Owner-on-both-entities authorization and Settings > Intercompany Eliminations page with entity-scoped account selectors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-10T20:27:38Z
- **Completed:** 2026-04-10T20:31:35Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Full CRUD API for elimination rules with GET (list), POST (create), PATCH (update/toggle), DELETE (soft-deactivate)
- Owner-on-both-entities authorization via canManageEliminationRule helper with single query
- Settings page with rules table, exposure summary, toggle switch, and create/edit form in Sheet slide-over
- Entity-scoped account comboboxes that fetch accounts when entity is selected, with module-level cache

## Task Commits

Each task was committed atomically:

1. **Task 1: Create elimination rules API routes with authorization** - `32300ab` (feat)
2. **Task 2: Create Settings > Intercompany Eliminations page with rule management** - `0f4ad11` (feat)

## Files Created/Modified
- `src/lib/validators/elimination-rule.ts` - Zod schemas for create (with cross-entity refinement) and update
- `src/lib/db/entity-access.ts` - Added canManageEliminationRule helper requiring OWNER on both entities
- `src/app/api/consolidated/elimination-rules/route.ts` - GET (list user-accessible rules) and POST (create with account validation)
- `src/app/api/consolidated/elimination-rules/[ruleId]/route.ts` - PATCH (update with entity-change auth) and DELETE (soft-deactivate)
- `src/app/(auth)/settings/eliminations/page.tsx` - Settings page with rule list, create/edit form, toggle handlers
- `src/components/settings/elimination-rule-form.tsx` - Sheet form with entity-scoped account selectors and react-hook-form/zod
- `src/components/settings/elimination-rules-table.tsx` - Table with exposure summary, status badges, toggle switch, edit actions
- `src/components/layout/sidebar.tsx` - Added Eliminations link with ArrowLeftRight icon

## Decisions Made
- canManageEliminationRule uses single findMany with `entityId in [entityAId, entityBId]` and `role: OWNER` filter, then checks both IDs present in result set
- Module-level Map cache with 60s TTL for entity accounts (matching AccountCombobox pattern from Phase 06)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed base-ui Select onValueChange null handling**
- **Found during:** Task 2 (elimination rule form)
- **Issue:** base-ui Select onValueChange returns `string | null` but form setValue expected `string`
- **Fix:** Added `!val ||` null check before `__none__` comparison in all 4 Select handlers
- **Files modified:** src/components/settings/elimination-rule-form.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors in our files
- **Committed in:** 0f4ad11 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type safety fix required for base-ui Select API. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Elimination rules CRUD ready for use by consolidated report queries in plans 08-04/08-05
- Settings page accessible from sidebar for rule management
- canManageEliminationRule helper available for reuse in future authorization checks

---
*Phase: 08-family-office-i-multi-entity-consolidation*
*Completed: 2026-04-10*
