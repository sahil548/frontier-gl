# Phase 8: Family Office I — Multi-Entity Consolidation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate consolidated P&L, Balance Sheet, and Cash Flow across multiple entities with intercompany eliminations. Users can define elimination rules, select which entities to consolidate, and export detailed consolidated reports. This is the core family office reporting capability QBO cannot deliver. Creating new transaction types or modifying single-entity reporting is out of scope.

Note: Cash Flow consolidation was added beyond the original CONS-01/02 scope at the user's request.

</domain>

<decisions>
## Implementation Decisions

### Entity Selection for Consolidation
- When "All Entities" is selected in the header switcher, reports automatically show consolidated data — no explicit toggle needed
- Entity filter chips displayed above the report allow deselecting specific entities from consolidation
- All entity chips are selected by default; click to toggle off
- All three financial statements (P&L, Balance Sheet, Cash Flow) support consolidation
- Consistent with existing consolidated trial balance pattern

### Elimination Rule Definition
- Dedicated settings page: Settings > Intercompany Eliminations
- Rules defined as account pairs across entities: Entity A + Account paired with Entity B + Account
- Multiple rules per entity relationship supported (e.g., a loan AND a management fee between same two entities)
- Each rule has a user-defined descriptive label (e.g., "Intercompany Loan: Holding Co → Fund I")
- Rules are active/inactive toggleable — can disable without deleting (consistent with soft-delete pattern)
- Only users with Owner role on BOTH entities in the rule can create/edit rules; Editors and Viewers see rules applied in reports
- Settings page shows an exposure summary at top: total intercompany balances, total eliminated, and any mismatches

### Intercompany Mismatch Handling
- When rule balances don't match (e.g., Entity A shows $50K receivable, Entity B shows $48K payable): eliminate the smaller amount
- Flag the difference as a warning row in the Eliminations section: "Intercompany difference: $2K"
- Warning banner at top of consolidated report: "2 intercompany mismatches detected — review eliminations"
- Mismatch rows highlighted in the eliminations section with the difference amount

### Consolidated Report Presentation
- Expandable rows: each account row shows consolidated total; click to expand for per-entity breakdown underneath
- Extends the TB tree pattern (Account > Entity rows > Consolidated row) to P&L and BS
- Dedicated "Intercompany Eliminations" section after entity subtotals, before final consolidated total
- Each elimination row shows its rule label and elimination amount
- Report structure: Entity subtotals → Eliminations section → Final consolidated total

### Fiscal Year Alignment
- Consolidated reports always use the selected calendar date range regardless of entity fiscal years
- Consolidated "YTD" means January 1 through selected date (calendar year, always)
- Report header lists included entities with their fiscal year ends for transparency: "Holding Co (Dec 31), Fund I (Mar 31), Fund II (Dec 31)"
- Cash/accrual basis toggle carries through to consolidated reports — each entity's data pulled on the selected basis

### Export
- CSV export includes full detail: consolidated rows, per-entity detail rows (indented), and elimination rows
- Mirrors the expanded on-screen view — useful for audit
- Same export pattern (Export dropdown with CSV option) as existing reports

### Claude's Discretion
- API route design for consolidated endpoints (new routes vs extending existing)
- Schema design for elimination rules (new Prisma model)
- Elimination calculation logic and query approach
- Loading states and skeleton design for consolidated reports
- Exact styling of entity filter chips, expandable rows, and elimination section
- Warning banner design and mismatch highlight styling

</decisions>

<specifics>
## Specific Ideas

- Consolidated report layout should feel like the existing trial balance consolidated view — expandable tree rows, familiar to Kathryn
- Elimination rules settings page should show a real-time health dashboard (exposure summary) — accountants want to see at a glance if intercompany balances are clean
- Mismatch handling eliminates the smaller amount and flags the difference — never blocks report generation, always transparent about discrepancies
- Entity filter chips above the report give quick visual indication of which entities are included — inspired by the "All Entities" TB pattern but with opt-out flexibility

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getConsolidatedTrialBalance` in `src/lib/queries/trial-balance-queries.ts` — existing consolidation logic for TB (simple aggregation, no eliminations)
- `EntityTreeRows` component in `src/components/trial-balance/tb-entity-tree.tsx` — expandable entity tree rows in consolidated TB
- Entity provider/hook (`src/providers/entity-provider.tsx`, `src/hooks/use-entity.ts`) — entity selection state management
- `getAccessibleEntityIds` in `src/lib/db/entity-access.ts` — gets all entity IDs the user has access to
- `getIncomeStatement`, `getBalanceSheet`, `getCashFlowStatement` in `src/lib/queries/report-queries.ts` — existing single-entity report queries
- `SectionRows` pattern in reports page for financial statement display
- CSV export utilities (`src/lib/export/csv-export.ts`)
- `formatCurrency` utility (`src/lib/utils/accounting.ts`)

### Established Patterns
- Financial statement API routes under `/api/entities/[entityId]/reports/` with Zod validation
- TB consolidated mode via `consolidated=true` query param
- Reports page uses tabs (Income Statement, Balance Sheet, Cash Flow) with shared date controls
- `counterparty` field on SubledgerItem is a plain string — NOT an entity FK. New intercompany schema needed.
- Soft-delete pattern throughout (active/inactive rather than hard delete)
- Owner/Editor/Viewer role-based access via EntityAccess model

### Integration Points
- Reports page (`src/app/(auth)/reports/page.tsx`) — needs consolidated mode when "All Entities" selected
- Entity provider context — determines single vs consolidated view
- Existing report query functions need consolidated variants (aggregate across entities + apply eliminations)
- Settings page — new "Intercompany Eliminations" section
- Sidebar navigation — may need a link to elimination settings
- New Prisma model needed for elimination rules (entity pair, account pair, label, active flag)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-family-office-i-multi-entity-consolidation*
*Context gathered: 2026-03-29*
