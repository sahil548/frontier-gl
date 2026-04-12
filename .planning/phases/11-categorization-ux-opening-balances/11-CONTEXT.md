# Phase 11: Categorization UX & Opening Balances - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Bank feed categorization uses holdings/positions as offset targets instead of raw GL accounts. Opening balance JEs auto-generated when holdings are created with balances. Reconciliation workflow fully integrated with bank feed as single source of truth. Existing categorization rules extended (not replaced) to support position-based targeting.

</domain>

<decisions>
## Implementation Decisions

### Categorization target picker
- **Holdings first, GL fallback:** Default picker shows holdings/positions; a "Use GL account" toggle reveals the raw account picker for expense/revenue accounts without holdings
- **Flat searchable list:** All holdings in one searchable dropdown (like existing account combobox) with holding name + type badge (Bank, Investment, Loan)
- **Position-level granularity:** User picks the specific position (e.g., "Schwab -> Cash Sweep"), not just the holding. JE hits the exact GL leaf account for that position
- **Rules work for both targets:** CategorizePrompt rule creation fires whether the user picked a position OR a raw GL account via fallback. Covers expense categorization and holding transfers

### Opening balance JE behavior
- **Offset to Opening Balance Equity:** Auto-create an "Opening Balance Equity" account (3xxx series) if it doesn't exist. Debit the holding's GL account, credit Opening Balance Equity
- **Auto-post immediately:** Opening balance JE is created and posted in one step. Holding's GL balance is live right away -- no draft step
- **User picks the date:** Date picker on the holding creation form for the opening balance JE date (no default to fiscal year start or today)
- **Adjusting JE on balance edit:** If the user later changes the holding's balance, system creates a new JE for the difference (e.g., $10K -> $12K = debit $2K / credit $2K). Preserves audit trail

### Reconciliation <-> bank feed unification
- **Auto-reconcile on post:** Posting a categorized bank transaction automatically marks it as reconciled. Bank feed IS the statement -- overrides Phase 9's "no auto-reconcile" since this phase explicitly integrates them
- **Merge old recon into bank feed:** The manual reconciliation page merges into the bank feed interface. One place for everything -- not a separate page
- **Bank feed IS the holdings detail:** Clicking a bank account holding lands on the bank feed view (transactions, categorization, recon status). Old holdings detail fields (institution, account number) become a header/sidebar section
- **Inline badge per transaction:** Each transaction row shows reconciliation status badge (Reconciled green, Pending yellow, Unmatched red). Running reconciled vs unreconciled totals at the top

### Existing rule migration
- **Keep accountId, add positionId:** Rules get a new optional positionId field. Existing rules continue working via accountId (expense/revenue GL accounts). New rules targeting holdings store positionId. Both paths coexist
- **Resolve GL at apply-time:** Rules with positionId look up the position's linked GL account when applying, not at creation time. Single source of truth -- if GL account changes, rules stay correct
- **Display: position name with GL detail:** Rules management page shows "Schwab -> Cash Sweep" as primary label with GL account number in smaller text. User sees what they picked, with accounting detail available
- **Dimension tags in CategorizePrompt:** Same as Phase 9 -- prompt includes dimension tag selection when creating position-targeted rules

### Claude's Discretion
- Exact layout of the merged bank feed / reconciliation page
- How the GL fallback toggle is styled (link, switch, dropdown mode)
- Opening Balance Equity account number assignment within 3xxx series
- Toast/notification design for auto-posted opening balance JEs
- Badge styling and color choices for reconciliation status

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CategorizePrompt` (`src/components/bank-feed/categorize-prompt.tsx`): Current inline prompt for rule creation -- needs position picker added alongside existing account picker
- Account combobox pattern with module-level Map cache + 60s TTL: Reuse for holdings/position picker
- `categorize.ts` (`src/lib/bank-transactions/categorize.ts`): matchRule() and applyRules() with priority-based matching -- extend for positionId resolution
- SubledgerItem creation API (`/api/entities/[entityId]/subledger/route.ts`): Currently creates GL leaf account + SubledgerItem -- add opening balance JE generation here
- BankReconciliation + BankReconciliationLine Prisma models: Need integration into bank feed transaction view

### Established Patterns
- Entity-scoped API routes under `/api/entities/[entityId]/...`
- Module-level Map cache with 60s TTL for form dropdowns (used in account combobox, dimension tags, elimination rules)
- Holdings auto-create GL leaf accounts under parent accounts by type (BANK_ACCOUNT->11000, INVESTMENT->12000)
- JE creation via existing journal entry creation logic with audit trail
- Dual interface pattern from Phase 9: inbox queue + inline on holdings page (now merging)

### Integration Points
- Holdings page (`/holdings`): Bank account detail page becomes the unified bank feed view
- Categorization rules API (`/api/entities/[entityId]/bank-transactions/rules/route.ts`): Add positionId field to schema and rule creation
- Reconciliation API (`/api/entities/[entityId]/subledger/[itemId]/reconcile/route.ts`): Auto-reconcile logic on transaction post
- CategorizationRule Prisma model: Add optional positionId field, keep accountId

</code_context>

<specifics>
## Specific Ideas

- The position picker should feel like the existing account combobox -- flat, searchable, familiar -- just with holdings/positions instead of GL accounts
- Opening balance JE should be invisible friction: create the holding, provide a balance and date, done. No extra steps
- Bank feed page should be the "home" for a bank account holding -- everything about that account (transactions, recon status, Plaid connection) in one place
- Rules management page shows position name prominently with GL detail as secondary info -- reinforcing the position-first mental model

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 11-categorization-ux-opening-balances*
*Context gathered: 2026-04-12*
