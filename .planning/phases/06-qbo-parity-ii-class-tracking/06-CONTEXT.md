# Phase 6: QBO Parity II — Multi-Dimensional Tagging - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Accountants can define custom dimension types (e.g., Fund, Property, Department) per entity, create tags within each dimension, tag individual JE line items with one tag per dimension, and slice the Income Statement by dimension (column-per-tag view) and filter the Trial Balance by dimension tags. This expands the original CLASS-01–05 scope from a single "class" field into a full multi-dimensional tagging system — the schema and UI support N user-defined dimensions, not just one.

**Scope expansion note:** Original requirements (CLASS-01–05) defined single-field class tracking. User decision expanded to multi-dimensional tagging with user-defined dimension types. Requirements should be updated to reflect this.

</domain>

<decisions>
## Implementation Decisions

### Dimension Management UX
- Dedicated sidebar page at /dimensions (own nav item) — not buried in Settings
- Accordion layout: each dimension type is an expandable section showing its tags in a table
- "New Dimension" button at top creates a new dimension type
- "New Tag" button within each accordion section adds a tag to that dimension
- Slide-over panel for creating/editing dimensions and tags (consistent with COA pattern)
- User-defined dimension types — users create whatever dimensions they need per entity (Fund, Property, Department, Project, etc.)
- No hard limit on number of dimension types per entity
- One level of grouping: Dimension Type → Tags (e.g., "Fund" → "Fund I", "Fund II", "Fund III")

### Dimension/Tag Fields
- **Dimension type:** Name (required)
- **Tag:** Number/code (short alphanumeric, e.g., "FND1"), Name, Description (optional), Active/inactive toggle
- Active/inactive follows the soft-delete pattern — deactivated tags hidden from dropdowns but preserved on historical JE lines

### JE Line Tagging
- Each active dimension adds a combobox column to the JE line item table, positioned after Account and before Debit
- Column order: Account | [Dim 1] | [Dim 2] | ... | Debit | Credit | Memo
- Combobox with search — same pattern as Account selector (type to filter, keyboard navigable)
- "New [Dimension]" option at bottom of each combobox for inline quick-create without leaving JE form
- One tag per dimension per JE line — strict constraint
- When user needs two tags from same dimension on one line: split assistant triggers — offers "Split this line? Enter allocation %" and creates two proportional lines
- Horizontal scroll when form gets wide (4+ dimension columns); Account column pinned/sticky on left
- All dimension columns always visible for active dimensions — no per-JE toggle
- Existing JE lines (pre-dimensions) show empty cells — no "Unclassified" marker

### Income Statement By-Dimension View
- Column-per-tag layout: user picks one dimension (e.g., Fund), P&L shows one column per tag + "Unclassified" column + Total column
- Dimension picker dropdown: "View by: [Fund / Property / Department / None]"
- Pick one dimension at a time — no multi-dimensional pivot/cross-tab
- "Unclassified" column at the end for entries without a tag for the selected dimension — totals reconcile
- Cash/accrual toggle works independently of dimension slicing — user can view by Fund on cash or accrual basis
- Existing date range, period selector, and entity context all still apply

### Trial Balance Dimension Filtering
- Each active dimension adds a filter dropdown to the existing filter bar
- Filter shows tags for that dimension — select one to filter TB to only transactions tagged with it
- Multiple dimension filters apply simultaneously with AND logic (e.g., Fund I AND Property A)
- Only accounts with activity for the selected tag(s) are shown — zero-balance accounts hidden
- Dimension filters combine with multi-entity consolidated view (e.g., "All entities, Fund I only")
- Filter only — no column-per-tag view on TB (that's a P&L feature)
- TB verification check (debits = credits) applies to the filtered subset

### Claude's Discretion
- Dimension page exact layout, spacing, accordion component choice
- Combobox component reuse vs new component for dimension selectors
- Split assistant modal/popover design
- Column width management for dimension columns in JE form
- P&L column-per-tag responsive behavior when many tags exist
- How dimension filters integrate visually with existing TB filter bar
- Migration strategy for adding dimension infrastructure to existing schema

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants this to be a "metadata/tagging" system, not just QBO's single "class" field — thinking in terms of dimensions that can represent funds, properties, departments, projects, or anything else
- The split assistant for allocations is important — when a user needs to tag one amount across two tags (e.g., 50% Fund I / 50% Fund II), the system should offer to split the line with percentage allocation rather than making the user do it manually
- Holding/asset linking (connecting JE lines to specific holdings like bank accounts or investments) was discussed as "just another dimension" — deferred to a future phase as it's a subledger integration feature

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Account combobox** (`src/components/journal-entries/je-line-items.tsx`): Searchable combobox pattern with keyboard navigation — reuse for dimension tag selectors
- **Slide-over panel pattern** (used for COA create/edit): Reuse for dimension and tag creation
- **Filter bar** (GL Ledger and Trial Balance): Existing inline filter pattern to extend with dimension dropdowns
- **TanStack Table** (used in TB, GL Ledger, JE list): Table infrastructure for the Dimensions page tag lists

### Established Patterns
- JE line items use `useFieldArray` with react-hook-form — dimension fields need to integrate with this
- JE form uses spreadsheet-style layout with Account combobox per line (`je-line-items.tsx`)
- Report queries use raw SQL with `Prisma.sql` tagged templates (`src/lib/queries/report-queries.ts`) — dimension filtering adds JOINs and WHERE clauses
- Income Statement query (`report-queries.ts:getIncomeStatement()`) accepts basis parameter — dimension parameter follows same pattern
- Trial Balance supports consolidated multi-entity view with tree-style grouping — dimension filter is additive

### Integration Points
- **Prisma schema**: New `Dimension` and `DimensionTag` models, plus `JournalEntryLineDimensionTag` junction table (many-to-many but constrained to one tag per dimension per line)
- **JE form** (`je-form.tsx`, `je-line-items.tsx`): Add dimension columns to line item table
- **JE API routes** (`/api/entities/[entityId]/journal-entries/`): Accept and persist dimension tags on create/update
- **Report API routes** (`/api/entities/[entityId]/reports/income-statement/`): Add dimension parameter for column-per-tag view
- **Trial Balance API** (`/api/entities/[entityId]/reports/trial-balance/`): Add dimension filter parameters
- **Sidebar navigation**: Add "Dimensions" nav item
- **JE validators** (`src/lib/validators/journal-entry.ts`): Extend line item schema with optional dimension tag fields

</code_context>

<deferred>
## Deferred Ideas

- **Holding/asset linking on JE lines** — User suggested JE lines could reference specific holdings (bank accounts, investments, etc.) as "just another tag/dimension." This is a subledger integration feature that connects the transaction layer to the holdings layer. Worth its own phase or inclusion in a future holdings enhancement phase.
- **Multi-dimensional pivot on P&L** — Cross-tabulating P&L by two dimensions simultaneously (e.g., Fund x Property). Powerful but complex. Could be added as an enhancement after the base dimension system is proven.
- **Balance Sheet by dimension** — Same column-per-tag view but for the Balance Sheet. Not in current requirements but natural extension.
- **Cash Flow by dimension** — Same for Cash Flow statement.

</deferred>

---

*Phase: 06-qbo-parity-ii-class-tracking*
*Context gathered: 2026-03-29*
