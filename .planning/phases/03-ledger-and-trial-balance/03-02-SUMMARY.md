---
phase: 03-ledger-and-trial-balance
plan: 02
subsystem: api, database
tags: [prisma, postgresql, jspdf, papaparse, csv, pdf, window-functions, raw-queries]

requires:
  - phase: 02-accounting-engine
    provides: Journal entry model, account balance model, Prisma schema

provides:
  - Ledger query functions with running balance via PostgreSQL window functions
  - Trial balance aggregation queries with SUM CASE pattern
  - CSV export utility with PapaParse and UTF-8 BOM
  - PDF export utilities for ledger and trial balance with Frontier GL branding
  - Accounting utility functions (getNormalBalanceSide, formatCurrency)

affects: [03-ledger-and-trial-balance]

tech-stack:
  added: [papaparse, jspdf, jspdf-autotable]
  patterns: [Prisma $queryRaw for complex SQL, PostgreSQL window functions, browser file download via Blob]

key-files:
  created:
    - src/lib/utils/accounting.ts
    - src/lib/queries/ledger-queries.ts
    - src/lib/queries/trial-balance-queries.ts
    - src/lib/export/csv-export.ts
    - src/lib/export/pdf-export.ts
  modified: []

key-decisions:
  - "Used Prisma.sql tagged template with Prisma.join for dynamic WHERE clauses in raw queries"
  - "Running balance uses SUM() OVER(ORDER BY date, id ROWS UNBOUNDED PRECEDING) for deterministic ordering"
  - "Trial balance net_balance computed in SQL with CASE on account type for sign convention"
  - "PDF autoTable v5 function import pattern (not deprecated doc.autoTable)"

patterns-established:
  - "Raw SQL query modules: typed result interfaces, toNum() helper for Decimal conversion"
  - "Export utilities: browser-side file generation with cleanup (revokeObjectURL)"
  - "Accounting sign convention: centralized in getNormalBalanceSide, consumed by queries and exports"

requirements-completed: [LED-04, LED-05, TB-04, TB-05]

duration: 5min
completed: 2026-03-27
---

# Phase 3 Plan 02: Data Queries and Export Utilities Summary

**Prisma raw queries for GL ledger (running balance via window functions) and trial balance (SUM CASE aggregation), plus CSV/PDF export utilities with PapaParse and jsPDF**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T09:20:57Z
- **Completed:** 2026-03-27T09:26:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Accounting utility module with normal balance side logic, currency formatting, and type re-exports
- Ledger queries with beginning balance, filtered transactions with running balance via PostgreSQL window function, and account summary
- Trial balance queries for single-entity and consolidated multi-entity aggregation
- CSV export with PapaParse unparse and UTF-8 BOM for Excel compatibility
- PDF export for both ledger (landscape) and trial balance (portrait) with teal branding, account type grouping, and page numbering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create accounting utilities and Prisma query modules** - `47e3432` (feat)
2. **Task 2: Create CSV and PDF export utilities** - `f3563ea` (feat)

## Files Created/Modified
- `src/lib/utils/accounting.ts` - AccountType re-export, getNormalBalanceSide, isDebitNormal, formatCurrency
- `src/lib/queries/ledger-queries.ts` - getBeginningBalance, getLedgerTransactions, getAccountSummary with $queryRaw
- `src/lib/queries/trial-balance-queries.ts` - getTrialBalance, getConsolidatedTrialBalance with $queryRaw
- `src/lib/export/csv-export.ts` - exportToCsv with PapaParse and BOM
- `src/lib/export/pdf-export.ts` - exportLedgerToPdf, exportTrialBalanceToPdf with jsPDF + autoTable v5

## Decisions Made
- Used Prisma.sql tagged template with Prisma.join for composing dynamic WHERE clauses safely (parameterized)
- Running balance window function orders by (je.date, je.id, jel.sortOrder) for deterministic results
- Trial balance net_balance computed in SQL using CASE WHEN on account type to apply correct sign convention
- PDF uses autoTable v5 function import, not deprecated doc.autoTable() method
- Entity table referenced as "Entity" (PascalCase, no @@map in schema) in consolidated TB query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Query and export modules ready for consumption by Plans 03-03 (GL Ledger page) and 03-04 (Trial Balance page)
- All types exported for use in page components
- Running balance respects normal balance side convention

---
*Phase: 03-ledger-and-trial-balance*
*Completed: 2026-03-27*
