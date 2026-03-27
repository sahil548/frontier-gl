---
phase: 02-accounting-engine
plan: 02
subsystem: api, ui
tags: [accounts, coa, crud, slide-over, indented-table, search, filter, template, hierarchy, decimal]

# Dependency graph
requires:
  - phase: 02-accounting-engine
    plan: 01
    provides: "Prisma Account/AccountBalance models, createAccountSchema, updateAccountSchema, suggestNextAccountNumber, applyTemplate, FAMILY_OFFICE_TEMPLATE"
  - phase: 01-foundation
    provides: "Entity model, Clerk auth, shadcn/ui components, entity context provider, sidebar navigation"
provides:
  - "Account CRUD API: GET/POST /api/entities/:entityId/accounts, GET/PUT /api/entities/:entityId/accounts/:accountId"
  - "Template API: POST /api/entities/:entityId/accounts/template"
  - "Next-number API: GET /api/entities/:entityId/accounts/next-number"
  - "COA page with indented table, slide-over form, search, type filter chips, hover actions"
  - "Account hierarchy enforcement (2-level max) in API layer"
  - "Parent account aggregated balance computation"
affects: [02-03, 02-04, 02-05, 03-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Entity-scoped API routes under /api/entities/:entityId/ with auth + ownership verification"
    - "Decimal serialization pattern: convert Prisma Decimal to string via decimal.js for JSON transport"
    - "Slide-over panel pattern for account CRUD (Sheet component from shadcn)"
    - "Client-side search+filter pattern: search by name/number + type chip toggles"
    - "Tree-flattened table: sort parents by number, insert children after parent"
    - "Hover actions pattern: edit icon + kebab dropdown on table rows"

key-files:
  created:
    - src/app/api/entities/[entityId]/accounts/route.ts
    - src/app/api/entities/[entityId]/accounts/[accountId]/route.ts
    - src/app/api/entities/[entityId]/accounts/template/route.ts
    - src/app/api/entities/[entityId]/accounts/next-number/route.ts
    - src/components/accounts/account-table.tsx
    - src/components/accounts/account-form.tsx
    - src/components/accounts/account-type-chips.tsx
    - src/components/accounts/account-number-input.tsx
    - src/app/(auth)/accounts/page.tsx
  modified:
    - src/components/layout/sidebar.tsx
    - src/lib/journal-entries/auto-number.ts
    - src/lib/accounts/hierarchy.test.ts
    - src/lib/accounts/search.test.ts
    - src/lib/accounts/scoping.test.ts

key-decisions:
  - "Used createAccountSchema for both create and edit form validation (update schema's partial fields handled at API level)"
  - "Parent account balance computed at query time by aggregating children's AccountBalance records (no stored parent balance)"
  - "Empty AccountBalance row created alongside each new account for consistent balance display"

patterns-established:
  - "Entity-scoped API route pattern: findOwnedEntity helper verifies Clerk user -> internal User -> entity ownership"
  - "Account serialization: Prisma Decimal -> decimal.js -> string for JSON-safe transport"
  - "Indented table pattern: flat array sorted in tree order, child rows get pl-8 indent"
  - "Hover action pattern: opacity-0 group-hover:opacity-100 for edit icon + dropdown menu"

requirements-completed: [COA-01, COA-02, COA-03, COA-04, COA-05, COA-06]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 2 Plan 02: Chart of Accounts CRUD & UI Summary

**RESTful account CRUD API with 2-level hierarchy validation, template seeding, and COA page with QuickBooks-style indented table, slide-over create/edit form, search bar, type filter chips, hover actions, and aggregated parent balances**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T05:47:56Z
- **Completed:** 2026-03-27T05:56:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- 4 API endpoints for account CRUD, template application, and next-number suggestion, all entity-scoped with Clerk auth
- Full COA page with indented flat table (4 columns), search by name/number, type filter chips, and hover actions (Edit, View Ledger, Add Sub-Account, Deactivate)
- Slide-over panel for create/edit with auto-suggested account numbers, parent selection, and type inheritance
- Hierarchy enforcement: 2-level max depth, parent type matching, deactivation guard for parent with active children
- Empty state guides users to apply Family Office Standard template or create first account
- 38 account-related tests passing (hierarchy, search, scoping, validators)

## Task Commits

Each task was committed atomically:

1. **Task 1: Account CRUD API endpoints** - `a96750b` (feat)
2. **Task 2: COA page with UI components** - `789c705` (feat)

## Files Created/Modified

- `src/app/api/entities/[entityId]/accounts/route.ts` - GET (list) and POST (create) with hierarchy validation
- `src/app/api/entities/[entityId]/accounts/[accountId]/route.ts` - GET (single) and PUT (update/deactivate)
- `src/app/api/entities/[entityId]/accounts/template/route.ts` - POST applies Family Office Standard template
- `src/app/api/entities/[entityId]/accounts/next-number/route.ts` - GET suggests next account number
- `src/components/accounts/account-table.tsx` - Indented COA table with search, filters, hover actions
- `src/components/accounts/account-form.tsx` - Slide-over create/edit form with auto-suggest numbers
- `src/components/accounts/account-type-chips.tsx` - Multi-select type filter toggle chips
- `src/components/accounts/account-number-input.tsx` - Account number input with API-driven suggestion
- `src/app/(auth)/accounts/page.tsx` - Chart of Accounts page with entity context
- `src/components/layout/sidebar.tsx` - Added Accounts nav item with BookOpen icon
- `src/lib/accounts/hierarchy.test.ts` - Fleshed out hierarchy validation tests (6 tests)
- `src/lib/accounts/search.test.ts` - Fleshed out search/filter logic tests (8 tests)
- `src/lib/accounts/scoping.test.ts` - Fleshed out entity scoping tests (4 tests)

## Decisions Made
- Used createAccountSchema resolver for both create and edit form modes. The updateAccountSchema (partial) is used on the server side for PUT validation. This avoids type complexity with conditional resolvers.
- Parent account aggregated balance is computed at query time by summing children's AccountBalance records, per 02-RESEARCH.md Pitfall 4 guidance (avoids cascading trigger complexity).
- Created empty AccountBalance row (zeros) when creating each account so balance display is always consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing lint error in auto-number.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** `Function` type in auto-number.ts caused ESLint `@typescript-eslint/no-unsafe-function-type` error, blocking `npm run build`
- **Fix:** Replaced `Function` with typed signature using `any[]` args with eslint-disable comment
- **Files modified:** `src/lib/journal-entries/auto-number.ts`
- **Verification:** `npm run build` succeeds
- **Committed in:** `789c705` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- pre-existing lint error from Plan 01 needed one-line fix to unblock build.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Account CRUD API and COA page ready for use
- Journal entry form (Plan 03) can use account selector from the accounts list API
- "View Ledger" hover action is a placeholder href for Phase 3 ledger page
- All COA-01 through COA-06 requirements implemented and verified

---
*Phase: 02-accounting-engine*
*Completed: 2026-03-27*
