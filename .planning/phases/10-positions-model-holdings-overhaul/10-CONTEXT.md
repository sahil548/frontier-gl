# Phase 10: Positions Model & Holdings Overhaul - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Holdings contain positions (cash, securities, LP interests, etc.), and positions — not holdings — link to GL accounts. Holding types restructured for family office use cases. GL accounts auto-created at position level. Existing holdings auto-migrated on deploy. Holdings page updated to reflect the new hierarchy.

</domain>

<decisions>
## Implementation Decisions

### Holding type taxonomy
- Full restructure of holding types by asset class (not by liquidity or entity relationship)
- New enum: BANK_ACCOUNT, BROKERAGE_ACCOUNT, CREDIT_CARD, REAL_ESTATE, EQUIPMENT, LOAN, PRIVATE_FUND, MORTGAGE, LINE_OF_CREDIT, TRUST_ACCOUNT, OPERATING_BUSINESS, NOTES_RECEIVABLE, OTHER (13 types, replacing current 7)
- Holdings are account-level containers (e.g., "Schwab Brokerage"), positions are what's inside them (e.g., AAPL, Cash, VXUS)

### Position-to-GL wiring
- **3-level COA hierarchy:** GL type parent → holding summary account → position leaf accounts
- Both holdings AND positions get GL accounts — holding is the parent summary, positions are children
- `accountId` moves from SubledgerItem to Position as the primary GL anchor
- Holding retains a parent GL account for summary/aggregation purposes
- Bank transactions post against the **position's** GL account (not the holding's) — categorization UI needs to let user pick which position within the holding
- GL accounts auto-created when positions are created

### Position creation flow
- After creating a holding, immediately prompt "Add your first positions?" with a multi-row form
- User can add more positions later at any time
- Every holding should end up with at least one position to have a GL account

### Existing data migration
- **Auto on deploy** — migration runs as Prisma migration + data backfill script, no user action needed
- Holdings without positions: auto-create a default position (e.g., "Cash" for bank accounts, "General" for others)
- Existing GL account transfers to the auto-created default position (preserves transaction history)
- A new parent summary GL account is created for the holding
- Holdings that already have positions: each existing position gets a GL account auto-created, named after the position name (e.g., ticker for securities)

### Holdings page hierarchy
- Grouped by holding type — collapsible sections or tabs per type (Bank Accounts, Brokerage Accounts, Real Estate, etc.)
- Holding row shows aggregate totals (sum of all position balances, total cost basis, total market value)
- Expanded position rows show full detail inline: name, GL account, balance, quantity, unit cost, unit price, unrealized gain/loss, asset class
- All add/edit for positions handled inline via dialogs (no dedicated position pages)
- Matches current expandable-row pattern but with richer position data

### Claude's Discretion
- GL parent account number mapping for each new holding type (standard COA conventions: assets 1xxxx, liabilities 2xxxx)
- Position GL account naming convention (position name vs holding+position combined — pick what reads best in COA and trial balance)
- Default position names per holding type (e.g., "Cash" for bank accounts)
- Migration script implementation details and ordering
- Position type enum updates if needed for new holding types
- Loading states and empty states for the restructured holdings page

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SubledgerItem` + `Position` Prisma models: existing parent-child relationship, position has qty/unitCost/unitPrice
- `HOLDING_TYPE_TO_GL` mapping in subledger API route: auto-creates GL accounts on holding creation — needs expansion for new types
- `syncParentBalance()` function: aggregates position market values to parent SubledgerItem.currentBalance
- Holdings page (`src/app/(auth)/holdings/page.tsx`): existing expandable position rows, type filter tabs, inline add/edit dialogs
- `PositionsRow` component: expandable nested table for positions within a holding
- Auto-account-number generation: parent number + 100n per sibling — extend to position level

### Established Patterns
- Entity-scoped API routes under `/api/entities/[entityId]/subledger/`
- Zod schema validation for all inputs
- Decimal(19,4) for all financial fields
- Module-level Map cache with 60s TTL for form dropdowns
- Soft-delete throughout (isActive flag)
- Sheet slide-over for forms, Dialog for confirmations

### Integration Points
- Bank transactions (Phase 9): BankTransaction.subledgerItemId links to SubledgerItem — categorization needs to target position-level GL accounts
- Reconciliation: BankReconciliation links to SubledgerItem — GL balance computation needs to work with position-level accounts
- PlaidConnection: Links to SubledgerItem — remains at holding level
- COA hierarchy: Account.parentId for parent-child — used for the 3-level structure
- Trial balance / financial statements: Position GL accounts will appear in existing reports via standard COA aggregation
- Inline bank transactions component (`src/components/holdings/inline-bank-transactions.tsx`): needs position-aware posting

</code_context>

<specifics>
## Specific Ideas

- Holdings are containers (accounts), positions are what's inside — a brokerage account holds cash + stocks + bonds as separate positions
- The holding type taxonomy reflects the kinds of accounts a family office manages, not asset classes (asset classes live at position level)
- Position GL account naming should use the position name (tickers for securities, descriptive names for others) since the COA hierarchy provides context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-positions-model-holdings-overhaul*
*Context gathered: 2026-04-12*
