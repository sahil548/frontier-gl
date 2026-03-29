# Phase 7: QBO Parity III — Budget vs Actual - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Accountants can set annual budgets per account and compare actuals vs budget with variance — completing the QBO Ledger feature set. This phase delivers: budget entry (spreadsheet grid + CSV import), budget data storage (entity-scoped, fiscal-year-aligned), and a Budget vs Actual report with variance on the Reports page. Budget approval workflows, multi-scenario planning, and revision history are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Budget Entry Experience
- Spreadsheet-style grid: rows = accounts, columns = Jan–Dec (aligned to entity fiscal year)
- Only Income and Expense accounts are budgetable (standard P&L accounts — no balance sheet)
- Dedicated "Budgets" page in sidebar navigation (separate from Reports page)
- Fiscal year selector at top of budget page to switch between years
- "Copy from [prior year]" button pre-fills grid with last year's budget amounts for quick annual rollover
- Budgets are freely editable at any time — no draft/approval workflow, just save
- Budget periods follow entity's fiscal year end (e.g., FYE March 31 → budget year runs Apr–Mar)

### Budget CSV Import
- CSV format: account number, period (month/year), amount
- Upsert behavior: if budget exists for account+month, overwrite; if not, create
- Follows existing CSV import pattern (COA import and bank statement import) with validation and error reporting

### Report Layout & Drill-down
- Budget vs Actual report appears as a new tab on the existing Reports page (alongside P&L, Balance Sheet, Cash Flow)
- Grouped by account type like P&L: Income section, Expense section, with subtotals per section and net income variance at bottom
- Period summary view: single set of columns for selected date range — Account | Actual | Budget | Variance $ | Variance %
- Date range picker for report period (reuse existing report date picker pattern)
- Clicking an account row drills down to GL Ledger filtered to the report's date range (same pattern as existing P&L drill-down)

### Variance Presentation
- Green/red color coding for favorable/unfavorable variances
- Favorable direction follows accounting convention: income over budget = favorable (green), expenses under budget = favorable (green)
- No threshold highlighting — all variances shown equally, accountant scans % column to spot material items
- Zero-budget accounts: show actual amount, budget as dash, variance $ = actual, variance % = "—" (undefined). Account still appears if it has actuals.

### Budget Versioning & Lifecycle
- Single budget per account per period — no versioning or scenarios
- Budgets editable anytime (no lock mechanism)
- No approval workflow — save and done

### Claude's Discretion
- Spreadsheet grid component implementation (inline editing approach, cell navigation)
- Loading skeleton design for budget grid and report
- Exact column widths, spacing, and responsive behavior of the grid
- Empty state design when no budgets exist for a fiscal year
- CSV import validation UX (error display, row-level feedback)
- PDF export layout for Budget vs Actual report (if added — CSV export is required)

</decisions>

<specifics>
## Specific Ideas

- Budget grid should feel like a lightweight Excel — type amounts directly into cells, tab between months
- Report structure mirrors existing P&L with section grouping — Kathryn sees the same familiar layout with budget columns added
- Copy-from-prior-year is a key time saver — annual budget cycle shouldn't require re-entering 50+ line items
- Keep it simple: one budget, freely editable, no ceremony. This is a small team, not a corporate budget committee.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SectionRows` component in reports page: renders grouped account rows with section headers and subtotals — extend for budget columns
- `exportToCsv()` utility (`/src/lib/export/csv-export.ts`): PapaParse-based CSV export with UTF-8 BOM
- `exportLedgerToPdf()` pattern (`/src/lib/export/pdf-export.ts`): jsPDF + autoTable with branded headers
- `parseCsvText()` pattern from COA import route: flexible header matching, row-by-row validation
- `Calendar` + `Popover` date picker pattern on existing Reports page
- `DataTable` component with TanStack Table: sorting, pagination, footer row support
- `formatCurrency()` from `/src/lib/utils/accounting.ts`
- `getNormalBalanceSide()` / `isDebitNormal()` from accounting utils — needed for variance direction logic

### Established Patterns
- Entity-scoped API routes: `/api/entities/[entityId]/...` with `findAccessibleEntity()` auth check
- All money fields: `@db.Decimal(19, 4)` with `serializeDecimal()` for JSON responses
- Zod schema validation on all API inputs
- Reports page uses tab navigation (P&L, Balance Sheet, Cash Flow) — Budget vs Actual adds a fourth tab
- P&L report groups by account type (Income, Expenses) with subtotals — same structure for Budget vs Actual
- P&L drill-down: clicking account row navigates to GL Ledger with date range filter

### Integration Points
- Reports page (`/src/app/(auth)/reports/page.tsx`): add Budget vs Actual tab
- Sidebar navigation: add "Budgets" nav item
- Prisma schema: new Budget model with entityId, accountId, year, month, amount
- Entity model already has fiscal year end field — budget periods derive from this
- Account model: filter to Income/Expense types for budget grid
- GL Ledger: drill-down target from report (existing pattern)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-qbo-parity-iii-budget-vs-actual*
*Context gathered: 2026-03-29*
