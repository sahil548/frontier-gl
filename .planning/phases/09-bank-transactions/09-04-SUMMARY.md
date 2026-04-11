---
phase: 09-bank-transactions
plan: 04
subsystem: api, ui
tags: [categorization-rules, crud, sheet-form, dual-interface, inline-transactions, holdings-page]

# Dependency graph
requires:
  - phase: 09-bank-transactions
    provides: BankTransaction/CategorizationRule Prisma models, categorize.ts matchRule/applyRules, TransactionTable with compact mode, CategorizePrompt initial version
provides:
  - GET/POST categorization rules API with match counts and retroactive matching
  - PATCH/DELETE individual rule API (update + soft-delete)
  - Rules management page at /bank-feed/rules with CRUD operations
  - RuleForm Sheet slide-over with account combobox and dimension tag selectors
  - Enhanced CategorizePrompt with pattern extraction, "Customize rule" option
  - InlineBankTransactions component for Holdings page dual-interface
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [retroactive-rule-matching, inline-dual-interface, customize-rule-sheet-prefill]

key-files:
  created:
    - src/app/api/entities/[entityId]/bank-transactions/rules/[ruleId]/route.ts
    - src/app/(auth)/bank-feed/rules/page.tsx
    - src/components/bank-feed/rule-form.tsx
    - src/components/holdings/inline-bank-transactions.tsx
  modified:
    - src/app/api/entities/[entityId]/bank-transactions/rules/route.ts
    - src/components/bank-feed/categorize-prompt.tsx
    - src/app/(auth)/bank-feed/page.tsx
    - src/app/(auth)/holdings/page.tsx

key-decisions:
  - "Retroactive rule matching queries PENDING transactions via subledgerItem.account.entityId relation path (BankTransaction has no direct entityId)"
  - "CategorizePrompt strips common prefixes (POS/ACH/WIRE/DEBIT/CREDIT) and uppercases pattern for consistent rule matching"
  - "InlineBankTransactions uses same module-level accounts cache pattern with 60s TTL"
  - "Rule soft-delete preserves existing categorizations -- already-categorized transactions keep their accountId"

patterns-established:
  - "Retroactive matching: new rules auto-categorize existing PENDING transactions on creation"
  - "Customize rule: CategorizePrompt opens pre-filled RuleForm Sheet for pattern/amount adjustment"
  - "Dual interface: same transaction data viewable in Bank Feed queue AND inline on Holdings page"

requirements-completed: [BANK-01, BANK-03, BANK-04]

# Metrics
duration: 5min
completed: 2026-04-11
---

# Phase 9 Plan 4: Categorization Rules CRUD & Inline Holdings Transactions Summary

**Rules CRUD with retroactive matching, management page with Sheet form, enhanced CategorizePrompt with "Customize rule" option, and inline bank transactions on Holdings page (dual interface)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T06:13:23Z
- **Completed:** 2026-04-11T06:18:52Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Full CRUD API for categorization rules: list with match counts, create with retroactive PENDING matching, partial update, soft-delete
- Rules management page at /bank-feed/rules with table listing, edit/delete actions, and delete confirmation dialog
- RuleForm Sheet slide-over with pattern input, optional amount range, GL account combobox, and dimension tag selectors
- Enhanced CategorizePrompt: strips common prefixes, offers "Customize rule..." to open pre-filled Sheet form
- InlineBankTransactions component on Holdings page shows recent transactions with status badges when expanding a BANK_ACCOUNT row
- Dual interface complete: Bank Feed inbox queue AND Holdings inline display for same transaction data

## Task Commits

Each task was committed atomically:

1. **Task 1: Categorization rules CRUD API** - `cb9d8e5` (feat)
2. **Task 2: Rules management page + enhanced categorize prompt** - `0cb0222` (feat)
3. **Task 3: Inline bank transactions on Holdings page** - `2bbc041` (feat)

## Files Created/Modified
- `src/app/api/entities/[entityId]/bank-transactions/rules/route.ts` - Enhanced GET with isActive filter and _count, POST with retroactive PENDING matching and dimension tag validation
- `src/app/api/entities/[entityId]/bank-transactions/rules/[ruleId]/route.ts` - PATCH partial update + DELETE soft-delete with entity ownership verification
- `src/app/(auth)/bank-feed/rules/page.tsx` - Rules management page with table, edit/delete, Sheet form integration
- `src/components/bank-feed/rule-form.tsx` - Sheet slide-over form with pattern, amount range, account combobox, dimension tags
- `src/components/bank-feed/categorize-prompt.tsx` - Enhanced with prefix stripping, "Customize rule" link, onRuleCreated callback
- `src/app/(auth)/bank-feed/page.tsx` - Added onRuleCreated={refreshAll} to CategorizePrompt for post-rule-creation refresh
- `src/components/holdings/inline-bank-transactions.tsx` - Compact TransactionTable with status badges, categorize/post actions, "View all" link
- `src/app/(auth)/holdings/page.tsx` - Added InlineBankTransactions below PositionsRow for BANK_ACCOUNT items

## Decisions Made
- Retroactive rule matching queries PENDING transactions via subledgerItem.account.entityId relation (BankTransaction has no direct entityId field)
- CategorizePrompt pattern extraction: strips common prefixes (POS, ACH, WIRE, DEBIT, CREDIT, CHECK, XFER, TRANSFER) and uppercases for consistent matching
- InlineBankTransactions reuses same module-level Map cache pattern with 60s TTL for accounts
- Soft-delete on rules preserves existing categorizations (already-categorized transactions keep their accountId and ruleId)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 9 (Bank Transactions) fully complete: CSV import, Plaid integration, transaction queue, categorization rules, and dual interface all functional
- Ready for Phase 10 (final phase) or user acceptance testing
- All categorization rules auto-apply during CSV import and Plaid sync via existing applyRules from Plan 01

## Self-Check: PASSED

All 8 files verified present. All 3 commits verified in git log.

---
*Phase: 09-bank-transactions*
*Completed: 2026-04-11*
