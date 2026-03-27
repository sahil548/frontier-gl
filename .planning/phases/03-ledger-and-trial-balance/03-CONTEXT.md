# Phase 3: Ledger and Trial Balance - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Read-side views of posted transaction data at account-level (GL Ledger) and summary-level (Trial Balance) with filtering, pagination, sorting, and CSV/PDF export. Users can view, filter, and export their posted accounting data. Creating or modifying transactions is Phase 2; dashboards and period close are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### GL Ledger Navigation
- Drill-down from Chart of Accounts: clicking an account row opens its ledger
- GL Ledger also has its own sidebar nav item for direct access
- Standalone ledger page uses a searchable combobox (type-ahead by account name/number) to pick an account
- Sidebar nav order: Dashboard, Chart of Accounts, GL Ledger, Trial Balance, Journal Entries

### GL Ledger Table Layout
- Separate debit and credit columns (traditional accounting layout): Date | JE# | Description | Debit | Credit | Balance
- JE# is a clickable link that navigates to the journal entry detail
- Default sort: newest transactions first
- Beginning balance row at top showing balance as of filter start date
- Totals/summary footer row showing period total debits, total credits, and net change
- Paginated at 50 transactions per page (TanStack Table)

### GL Ledger Page Header
- Account summary card above the table showing: account number, name, type, current balance, and YTD activity (total debits and credits)

### Trial Balance Organization
- Grouped by account type with section headers (Assets, Liabilities, Equity, Income, Expense) and subtotals per group
- Total debits and total credits shown at bottom

### Trial Balance Verification Check
- Persistent banner (top or bottom) showing balance status
- Green background with checkmark when in balance: "In Balance" with total debits and credits
- Red background with X when out of balance: "Out of Balance by $X" with total debits and credits

### Trial Balance Multi-Entity (Consolidated)
- When "All Entities" selected: merged view grouped by account, with entity breakdown within each account
- Shows per-entity balances indented under each account, with consolidated subtotal
- Tree-style layout: Account > Entity rows > Consolidated row

### Trial Balance Period Selector
- Single as-of date picker: "Trial Balance as of [date]"
- Shows all account balances from inception through the selected date (point-in-time snapshot)

### Filtering (GL Ledger)
- Inline filter bar always visible above the table (not collapsible)
- Filters: memo text search, date range picker, min/max amount inputs
- Filters apply instantly with 300ms debounce on text input
- Active filters shown as removable chips
- Amount range filters on debit OR credit falling within range
- Default date range: current month (1st of month through today)

### Export Experience
- Single "Export" dropdown button with CSV and PDF options
- Exports include only currently filtered/visible data (WYSIWYG)
- PDF header includes: entity name, report title, date range/as-of date, generated timestamp, and "Frontier GL" branding
- CSV includes beginning balance row, all transactions, and totals/net change footer (matches on-screen view)
- Same export pattern applies to both GL Ledger and Trial Balance

### Claude's Discretion
- Loading skeleton design for ledger and TB tables
- Exact spacing, padding, and responsive behavior of summary cards and filter bar
- Empty state design when no transactions exist for an account
- Date picker component choice and styling
- PDF layout engine and exact formatting
- Trial Balance sort column defaults (account number likely)

</decisions>

<specifics>
## Specific Ideas

- GL Ledger should feel like a standard accounting GL printout: beginning balance, transactions, totals footer -- familiar to Kathryn from QBO
- Trial Balance verification banner gives immediate visual confidence that books are balanced -- the first thing an accountant looks for
- Consolidated multi-entity TB uses tree-style indentation (Account > Entity > Consolidated) rather than side-by-side columns
- PDF exports should be professional enough to share with clients or file for audit -- full header with entity name and branding

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None -- greenfield project, no existing codebase (Phase 1 and 2 not yet built)

### Established Patterns
- Phase 1 establishes: shadcn/ui + Tailwind CSS, collapsible sidebar, entity switcher in header, dark mode with CSS variables, teal accent (#0D7377), Plus Jakarta Sans font
- Phase 1 establishes: API pattern under /api/entities/:entityId/ with Zod validation
- Phase 2 establishes: TanStack Table will be introduced in this phase (UI-03 requirement)
- Phase 2 establishes: account balance computation (DI-03), journal entry model, chart of accounts hierarchy

### Integration Points
- GL Ledger reads posted journal entry line items (from Phase 2 JE engine)
- GL Ledger links back to journal entry detail pages (Phase 2)
- Account summary card uses balance data from Phase 2's materialized/cached balance table (DI-03)
- Trial Balance aggregates from same balance data
- Entity scoping via entity_id FK (Phase 1) and entity switcher context
- Sidebar navigation (Phase 1) gets new items: GL Ledger, Trial Balance

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 03-ledger-and-trial-balance*
*Context gathered: 2026-03-26*
