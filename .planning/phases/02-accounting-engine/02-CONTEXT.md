# Phase 2: Accounting Engine - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Chart of accounts CRUD with hierarchical parent/sub-account structure, journal entry creation with double-entry enforcement, Draft/Approved/Posted workflow, reversing entries, bulk-post, closed period enforcement, audit trail, and database-layer integrity (triggers for immutability and balance validation). COA template seeding for new and existing entities.

</domain>

<decisions>
## Implementation Decisions

### Chart of Accounts Layout
- Indented table display (flat table with visual indentation for sub-accounts, not a tree view)
- Lean 4-column layout: Account Number, Account Name, Type, Balance
- Description and other details available on click/expand in slide-over panel
- Top search bar that searches both name and number simultaneously
- Type filter chips below search (Asset, Liability, Equity, Income, Expense) that toggle on/off
- Hover actions on rows: Edit icon and kebab menu (View Ledger, Add Sub-Account, Deactivate)
- Parent accounts show computed aggregated balance (sum of all children) — no direct posting to parent accounts
- 2 levels of nesting only: Parent -> Sub-Account (no deeper hierarchy)

### Account Creation & Editing
- Slide-over panel from right side (same pattern for create and edit)
- Form fields: Name, Number, Type, Parent Account, Description
- Account number auto-suggests next available number based on parent and siblings (e.g., parent 10000, children 10100, 10200 -> suggest 10300) — user can override
- 5-digit numbering scheme: 10000s = Assets, 20000s = Liabilities, 30000s = Equity, 40000s = Income, 50000s+ = Expenses, sub-accounts in increments of 100

### Journal Entry Form
- Full dedicated page at /journal-entries/new (not modal or slide-over)
- Header fields: Date, Description/Memo
- Spreadsheet-style line item table: Account (searchable combobox), Debit, Credit, Memo columns
- "Add Line" button at bottom to add rows
- Searchable combobox for account selection: type to search by name or number, dropdown shows account number + name + type, keyboard navigable
- Running totals row that updates live as user types
- Green checkmark when balanced, red with difference amount when unbalanced
- Save Draft and Post buttons disabled until entry is balanced

### JE Workflow & Approvals
- Journal Entries list page with three tabs: Draft (default), Approved, Posted — count badge on each tab
- Approval is optional: user can go Draft -> Posted directly (quick path) or Draft -> Approved -> Posted (review path)
- Three action buttons on JE form: Save Draft, Approve, Post
- Checkbox selection on rows in Draft/Approved tabs
- Floating bulk action bar at bottom when entries selected: "Approve Selected" and "Post Selected" with count
- Posted entries are immutable (communicated clearly in UI)

### Reversing Entries
- "Reverse" button available on posted entry detail view
- Creates a new draft JE with all line items flipped (debits become credits, vice versa)
- New entry auto-linked back to original with reference (e.g., "Reversal of JE-12")
- User reviews and can edit the reversal draft before posting

### COA Templates
- One curated "Family Office Standard" template (~40 accounts) + Blank option
- Template includes family-office-specific accounts: Partner Capital (LP/GP), Management Fees, Realized/Unrealized Gains, Distributions, K-1 Allocations, Fund Administration, etc.
- 5-digit numbering: 10000-series Assets through 50000-series Expenses, sub-accounts in 100 increments
- Template accounts are fully editable after creation — no distinction between template and custom accounts
- Template can be applied at entity creation OR to existing entities with merge logic (skip duplicates by account number)

### Claude's Discretion
- Audit trail display format and location (inline, separate tab, or modal)
- Loading skeleton patterns for COA and JE pages
- Exact spacing, padding, typography sizing within the brand system
- Error state handling and toast notification design
- JE auto-numbering format (JE-001, JE-002, etc.)
- Closed period enforcement UX (how the error surfaces when trying to post to a closed period)
- Template merge conflict resolution details (exact matching logic for duplicates)

</decisions>

<specifics>
## Specific Ideas

- COA table should feel like QuickBooks chart of accounts — familiar indented table that any accountant recognizes
- JE form should feel like a real journal entry worksheet — spreadsheet-style lines with running totals
- Account selector in JE should feel like a command palette: fast, keyboard-driven, search by number or name
- Bulk post bar should feel like Linear's bulk action bar — appears at bottom when items selected
- Reversal flow: one-click creates a pre-filled draft, user reviews before posting (no auto-post reversals)
- "Family Office Standard" template is a product differentiator — curated for FOA operations, not generic accounting

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, Phase 1 establishes the codebase

### Established Patterns (from Phase 1 decisions)
- shadcn/ui + Tailwind CSS for all components
- Slide-over panel pattern (established here for COA, reuse for other CRUD)
- Collapsible left sidebar with entity switcher in header
- Teal #0D7377 accent, Plus Jakarta Sans font, dark mode via CSS variables
- Neon PostgreSQL + Prisma ORM, RESTful API with Zod validation

### Integration Points
- Entity switcher context determines which entity's COA and JEs are shown
- COA scoped by entity_id (from Phase 1 schema)
- "All Entities" consolidated view applies to COA and JE lists
- Sidebar navigation adds: Accounts, Journal Entries (with sub-items)
- JE posting interacts with period close status (Phase 4 delivers period close, but JE-06 requires DB-layer enforcement now)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-accounting-engine*
*Context gathered: 2026-03-26*
