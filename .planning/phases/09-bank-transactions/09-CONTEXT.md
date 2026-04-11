# Phase 9: Bank Transactions — Import & Plaid Integration - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

CFO can import bank transactions (CSV upload or automatic Plaid bank feed), review and categorize them in a queue, and post them as journal entries. Includes categorization rules that auto-assign accounts based on description patterns. This replaces the existing manual reconciliation flow as the primary way to handle bank data.

</domain>

<decisions>
## Implementation Decisions

### Transaction review workflow
- **Dual interface:** Inbox-style queue page for unreviewed transactions AND inline display on the bank account's subledger/reconciliation page (both views into the same data)
- **Bulk actions:** Checkboxes on each row. Select multiple transactions, assign the same account, post in one click
- **JE creation mode:** CFO can choose per-transaction (or per-batch) whether to post immediately or save as draft
- **Splits:** A single transaction can be split across multiple GL accounts (e.g., $500 Amazon = $300 Office Supplies + $200 Computer Equipment)

### Plaid setup & sync
- **Connect flow:** "Connect Bank Feed" button on the existing Holdings > Bank Account subledger page. Opens Plaid Link widget. Each subledger bank account can have a Plaid connection
- **Sync frequency:** Daily automatic sync via cron + manual "Sync Now" button anytime
- **Environment:** Production Plaid API from day one (no sandbox phase)
- **Scope:** Bank connections are org-wide (visible across entities), not entity-scoped
- **Plaid product:** Use Transactions API (not Transfer) for pulling bank transaction data

### Categorization rules
- **Rule creation:** Two paths — (1) prompt when CFO categorizes a transaction ("Always categorize AMAZON as Office Supplies?"), (2) dedicated rules management page for viewing/editing/deleting rules
- **Matching logic:** Description substring match (case-insensitive) AND optional amount range. E.g., "PAYROLL" between $5000-$10000 -> Payroll Expense
- **Rule scope:** Rules assign both GL account AND optional dimension tags. E.g., "PROPERTY MGMT" -> Property Expense + tag "123 Main St"

### Reconciliation relationship
- **Replaces existing flow:** New transaction import + categorization becomes the primary bank data workflow. Existing manual reconciliation page becomes secondary/deprecated
- **No auto-reconcile:** Even though a JE was created from a bank transaction, it still requires manual reconciliation in the recon flow. The transaction import and reconciliation remain distinct steps

### Claude's Discretion
- Duplicate detection algorithm (external ID from Plaid, or hash of amount+date+description for CSV)
- Transaction queue page layout and filter/sort options
- Plaid webhook vs polling for daily sync implementation
- Error handling for failed Plaid connections or expired tokens
- CSV parser column mapping (auto-detect vs user-specified)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BankReconciliation` + `BankReconciliationLine` Prisma models: existing bank statement storage with match status
- JE CSV import route (`/api/entities/[entityId]/journal-entries/import/route.ts`): CSV parsing, validation, draft JE creation pattern
- Budget CSV import route (`/api/entities/[entityId]/budgets/import/route.ts`): Zod schema validation, upsert pattern, {imported, skipped, errors} response
- Reconciliation auto-match logic in `/api/entities/[entityId]/subledger/[itemId]/reconcile/route.ts`: matches by amount within 0.005 tolerance
- `SubledgerItem` model with `itemType: BANK_ACCOUNT` — natural anchor for Plaid connections

### Established Patterns
- Entity-scoped API routes under `/api/entities/[entityId]/...`
- Zod schema validation for all inputs
- Decimal(19,4) for all financial fields
- Audit trail logging on JE creation with action type
- Module-level Map cache with 60s TTL for form dropdowns

### Integration Points
- Holdings page (`/holdings`) — bank account subledger items are listed here; "Connect Bank Feed" button goes here
- Sidebar nav — new "Transactions" or "Bank Feed" nav item between Reports and Budgets
- JE creation — categorized transactions create journal entries via existing JE creation logic
- Dimension tags — rules can reference existing dimension/tag system from Phase 6

</code_context>

<specifics>
## Specific Ideas

- Plaid Link opens from the bank account's subledger detail page, keeping the connection contextual to a specific bank account
- The CFO should be prompted "Always categorize transactions like this?" when manually categorizing, to build up rules organically over time
- Splits work like QBO's split feature — clicking "Split" on a transaction opens a multi-line editor that must sum to the original transaction amount

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-bank-transactions*
*Context gathered: 2026-04-11*
