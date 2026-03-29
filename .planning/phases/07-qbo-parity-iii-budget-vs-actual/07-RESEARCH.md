# Phase 7: QBO Parity III -- Budget vs Actual - Research

**Researched:** 2026-03-29
**Domain:** Budget data entry (spreadsheet grid), budget storage, budget-vs-actual variance reporting
**Confidence:** HIGH

## Summary

Phase 7 adds budget management and variance reporting to Frontier GL. The feature has three distinct parts: (1) a dedicated Budgets page with a spreadsheet-style grid for entering monthly budget amounts per Income/Expense account, (2) CSV import for bulk budget loading, and (3) a Budget vs Actual report tab on the existing Reports page showing actuals, budget, variance $, and variance %.

The existing codebase provides strong patterns to follow. The P&L report query pattern (raw SQL aggregating posted JE lines by account) serves as the actuals-fetching template. The COA CSV import pattern (parseCsvText with header matching, row validation, upsert via transaction) maps directly to budget CSV import. The Reports page tab structure (custom button group with conditional rendering) extends trivially to a fourth tab. The main new ground is the spreadsheet-style grid UI for budget entry.

**Primary recommendation:** Use a simple HTML table with contentEditable cells or controlled input cells for the budget grid -- no need for a heavy spreadsheet library. Store budgets as one row per account-month with a Prisma Budget model using Decimal(19,4). Query actuals using the same raw SQL pattern as getIncomeStatement but additionally LEFT JOIN budget rows to compute variance in a single query.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Spreadsheet-style grid: rows = accounts, columns = Jan--Dec (aligned to entity fiscal year)
- Only Income and Expense accounts are budgetable (standard P&L accounts -- no balance sheet)
- Dedicated "Budgets" page in sidebar navigation (separate from Reports page)
- Fiscal year selector at top of budget page to switch between years
- "Copy from [prior year]" button pre-fills grid with last year's budget amounts for quick annual rollover
- Budgets are freely editable at any time -- no draft/approval workflow, just save
- Budget periods follow entity's fiscal year end (e.g., FYE March 31 -> budget year runs Apr--Mar)
- CSV format: account number, period (month/year), amount
- Upsert behavior: if budget exists for account+month, overwrite; if not, create
- Follows existing CSV import pattern (COA import and bank statement import) with validation and error reporting
- Budget vs Actual report appears as a new tab on the existing Reports page (alongside P&L, Balance Sheet, Cash Flow)
- Grouped by account type like P&L: Income section, Expense section, with subtotals per section and net income variance at bottom
- Period summary view: single set of columns for selected date range -- Account | Actual | Budget | Variance $ | Variance %
- Date range picker for report period (reuse existing report date picker pattern)
- Clicking an account row drills down to GL Ledger filtered to the report's date range (same pattern as existing P&L drill-down)
- Green/red color coding for favorable/unfavorable variances
- Favorable direction follows accounting convention: income over budget = favorable (green), expenses under budget = favorable (green)
- No threshold highlighting -- all variances shown equally
- Zero-budget accounts: show actual amount, budget as dash, variance $ = actual, variance % = "--" (undefined)
- Single budget per account per period -- no versioning or scenarios
- Budgets editable anytime (no lock mechanism)
- No approval workflow -- save and done

### Claude's Discretion
- Spreadsheet grid component implementation (inline editing approach, cell navigation)
- Loading skeleton design for budget grid and report
- Exact column widths, spacing, and responsive behavior of the grid
- Empty state design when no budgets exist for a fiscal year
- CSV import validation UX (error display, row-level feedback)
- PDF export layout for Budget vs Actual report (if added -- CSV export is required)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUDG-01 | User can enter budget amounts per account per month | Budget model + spreadsheet grid UI + CRUD API endpoints |
| BUDG-02 | User can import budget data from CSV (account number, period, amount) | CSV import route following COA import pattern with upsert logic |
| BUDG-03 | Budget vs Actual report shows actuals, budget, and variance ($ and %) by account for any date range | Report query joining actuals (from JE lines) with budget amounts, variance computation |
| BUDG-04 | Budget data is entity-scoped and period-specific | Budget model with entityId FK, year, month fields; entity access checks |
| BUDG-05 | Budget vs Actual report is exportable as CSV | exportToCsv() utility with report data formatting |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.5.0 | Budget model + CRUD operations | Already used for all data models |
| Next.js | 15.5.14 | API routes + page rendering | Project framework |
| Zod | 4.3.6 | Input validation on budget API endpoints | Already used on all API routes |
| React | 19.1.0 | Budget grid UI + report tab | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PapaParse | 5.5.3 | CSV import parsing for budget data | Budget CSV import (already in project) |
| date-fns | 4.1.0 | Fiscal year date math (month alignment) | Computing fiscal year month columns |
| decimal.js | 10.6.0 | Budget amount precision | All money operations |
| Lucide React | 1.7.0 | Icons for budget page (DollarSign, Upload) | Sidebar nav icon, action buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain HTML table grid | AG Grid / Handsontable | Overkill for 12 columns -- adds 200KB+ bundle for simple number entry |
| Controlled input cells | contentEditable divs | Inputs are simpler to validate, contentEditable has paste/XSS issues |
| Single save button | Auto-save on blur | Auto-save causes many API calls; single save is simpler and matches "freely editable" UX |

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  schema.prisma              # Add Budget model
src/
  app/(auth)/budgets/
    page.tsx                  # Budget grid page (new sidebar nav item)
  app/(auth)/reports/
    page.tsx                  # Add "Budget vs Actual" tab
  app/api/entities/[entityId]/
    budgets/
      route.ts                # GET (list budgets for year), PUT (bulk upsert)
      import/
        route.ts              # POST (CSV import with upsert)
    reports/
      budget-vs-actual/
        route.ts              # GET (budget vs actual report data)
  lib/queries/
    report-queries.ts         # Add getBudgetVsActual() query
```

### Pattern 1: Budget Data Model
**What:** Single Prisma model storing one budget amount per account per month
**When to use:** All budget storage and retrieval

```prisma
model Budget {
  id        String   @id @default(cuid())
  entityId  String
  accountId String
  year      Int      // Calendar year of the budget month
  month     Int      // 1-12 (calendar month)
  amount    Decimal  @default(0) @db.Decimal(19, 4)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  entity    Entity   @relation(fields: [entityId], references: [id])
  account   Account  @relation(fields: [accountId], references: [id])

  @@unique([entityId, accountId, year, month])
  @@index([entityId, year])
  @@map("budgets")
}
```

**Key design decisions:**
- `year` and `month` use calendar months (1-12), not fiscal year offsets -- simpler queries, fiscal alignment handled at UI/API layer
- `@@unique([entityId, accountId, year, month])` enforces one budget per account per period (supports upsert)
- `@@index([entityId, year])` optimizes the common "load all budgets for entity for fiscal year" query
- Entity relation added to Entity model (budgets field) for cascade and navigation

### Pattern 2: Fiscal Year Month Alignment
**What:** Converting entity's fiscal year end (stored as "MM-DD") into the correct 12-month column sequence
**When to use:** Budget grid columns, report date range computation, budget query filtering

```typescript
// Entity.fiscalYearEnd is "MM-DD" format, e.g., "12-31", "03-31", "06-30"
// Fiscal year "2025" with FYE "03-31" means Apr 2024 through Mar 2025

function getFiscalYearMonths(fiscalYearEnd: string, fiscalYear: number) {
  const [fyeMonth] = fiscalYearEnd.split("-").map(Number); // e.g., 3 for March
  const months: { year: number; month: number; label: string }[] = [];

  for (let i = 0; i < 12; i++) {
    // First month is fyeMonth + 1 of prior calendar year
    const month = ((fyeMonth) % 12) + 1 + i;
    const adjustedMonth = ((month - 1) % 12) + 1;
    const year = adjustedMonth <= fyeMonth ? fiscalYear : fiscalYear - 1;
    const label = new Date(year, adjustedMonth - 1).toLocaleString("en-US", { month: "short" });
    months.push({ year, month: adjustedMonth, label });
  }
  return months;
}
```

**For standard FYE 12-31:** Fiscal year 2025 = Jan 2025 through Dec 2025 (trivial case)
**For FYE 03-31:** Fiscal year 2025 = Apr 2024 through Mar 2025

### Pattern 3: Bulk Upsert API
**What:** Single PUT endpoint that saves all budget amounts for a fiscal year at once
**When to use:** Budget grid "Save" button

```typescript
// PUT /api/entities/:entityId/budgets
// Body: { fiscalYear: 2025, budgets: [{ accountId, year, month, amount }] }

// Use Prisma upsert in a transaction for atomicity
await prisma.$transaction(
  budgets.map(b =>
    prisma.budget.upsert({
      where: {
        entityId_accountId_year_month: {
          entityId, accountId: b.accountId, year: b.year, month: b.month
        }
      },
      create: { entityId, accountId: b.accountId, year: b.year, month: b.month, amount: b.amount },
      update: { amount: b.amount },
    })
  )
);
```

### Pattern 4: Budget vs Actual Report Query
**What:** Raw SQL query joining actuals from JE lines with budget amounts
**When to use:** Budget vs Actual report endpoint

```sql
-- Actuals: reuse P&L query pattern (getIncomeStatement)
-- Then LEFT JOIN budget totals for the same accounts and date range
SELECT
  a.id AS account_id,
  a.number AS account_number,
  a.name AS account_name,
  a.type::text AS account_type,
  COALESCE(SUM(
    CASE WHEN a.type = 'EXPENSE' THEN jel.debit - jel.credit
         ELSE jel.credit - jel.debit END
  ), 0) AS actual,
  COALESCE(b.budget_total, 0) AS budget
FROM accounts a
LEFT JOIN (
  journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel."journalEntryId"
    AND je.status = 'POSTED'
    AND je.date >= $startDate AND je.date <= $endDate
) ON jel."accountId" = a.id
LEFT JOIN (
  SELECT "accountId", SUM(amount) AS budget_total
  FROM budgets
  WHERE "entityId" = $entityId
    AND (year * 100 + month) >= $startYM
    AND (year * 100 + month) <= $endYM
  GROUP BY "accountId"
) b ON b."accountId" = a.id
WHERE a."entityId" = $entityId
  AND a."isActive" = true
  AND a.type IN ('INCOME', 'EXPENSE')
GROUP BY a.id, a.number, a.name, a.type, b.budget_total
ORDER BY a.number
```

### Pattern 5: Report Tab Extension
**What:** Add "Budget vs Actual" as fourth tab on Reports page
**When to use:** Reports page modification

The existing reports page uses a custom tab bar pattern:
```tsx
type ActiveTab = "income-statement" | "balance-sheet" | "cash-flow" | "budget-vs-actual";

// Add to tab button group:
<button onClick={() => setActiveTab("budget-vs-actual")} className={cn(...)}>
  Budget vs Actual
</button>
```

### Anti-Patterns to Avoid
- **Storing budget as a single JSON blob per year:** Prevents per-month querying, makes upsert complex, loses Decimal precision
- **Computing variance in the frontend:** Do it in the SQL query or at minimum in the API layer -- keeps the report data clean and consistent
- **Using a full spreadsheet library (AG Grid, Handsontable):** Massive bundle for what is fundamentally a 12-column number input form
- **Separate actuals and budget queries for the report:** One query with LEFT JOIN is cleaner and avoids N+1 matching in JS

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual split/regex | PapaParse (already in project) | Handles quoting, encoding, edge cases |
| Decimal arithmetic | JavaScript floating point | decimal.js / Prisma Decimal | Money precision requirements (DI-01) |
| CSV export | Manual string building | exportToCsv() (existing utility) | UTF-8 BOM, proper quoting |
| Date manipulation | Manual month math | date-fns (already in project) | Fiscal year boundary math is error-prone |
| Entity access checks | Manual query | findAccessibleEntity() (existing) | Consistent auth pattern across all routes |

## Common Pitfalls

### Pitfall 1: Fiscal Year Boundary Math Errors
**What goes wrong:** Budget columns show wrong months when entity has non-December fiscal year end
**Why it happens:** Conflating fiscal year number with calendar year, off-by-one in month wrapping
**How to avoid:** Write a single utility function `getFiscalYearMonths(fiscalYearEnd, fiscalYear)` that returns the ordered array of 12 {year, month} pairs. Unit test it with FYE 12-31, 03-31, 06-30, and 09-30.
**Warning signs:** Budget grid columns don't match entity's fiscal calendar; budget query returns wrong months

### Pitfall 2: Variance Direction (Favorable/Unfavorable) Confusion
**What goes wrong:** Income under budget shown as green (favorable), or expenses over budget shown as green
**Why it happens:** Applying the same variance sign logic to both income and expense accounts
**How to avoid:** Income variance = actual - budget (positive = favorable). Expense variance = budget - actual (positive = favorable). Use the account type to switch direction.
**Warning signs:** Variance colors are inverted for one section

### Pitfall 3: Zero Budget Division by Zero
**What goes wrong:** Variance % calculation crashes or shows Infinity/NaN for accounts with no budget
**Why it happens:** Dividing variance by zero budget amount
**How to avoid:** Context decision: zero-budget accounts show "--" for variance %. Check `budget === 0` before computing percentage.
**Warning signs:** NaN or Infinity values in report

### Pitfall 4: Decimal Precision Loss in Grid
**What goes wrong:** Budget amounts get rounded or gain floating point artifacts (e.g., 1234.50 becomes 1234.4999...)
**Why it happens:** Converting between string inputs, JavaScript numbers, and Decimal types
**How to avoid:** Keep amounts as strings in the grid state, convert to Decimal only at the API boundary. Use `@db.Decimal(19,4)` in Prisma. Use `serializeDecimal()` pattern from existing code when returning data.
**Warning signs:** Amounts in grid don't round-trip cleanly after save

### Pitfall 5: Large Upsert Transaction Timeout
**What goes wrong:** Saving budgets for an entity with 50+ accounts (50 accounts x 12 months = 600 upserts) times out
**Why it happens:** Individual Prisma upserts in a loop are slow
**How to avoid:** Use `prisma.$transaction()` with the array form (parallel upserts). Alternatively, use a raw SQL `INSERT ... ON CONFLICT ... DO UPDATE` for true bulk upsert in one statement. For typical family office entities (< 100 accounts), 1200 upserts in a transaction should complete in < 2 seconds.
**Warning signs:** Save button hangs or times out

### Pitfall 6: Budget Report Date Range vs Budget Month Matching
**What goes wrong:** Report shows budget total that doesn't match the selected date range
**Why it happens:** Date range might span partial months (e.g., Jan 15 - Mar 15), but budgets are stored per full month
**How to avoid:** Pro-rate partial months or use full-month matching. Simplest approach: include a month's budget if any day of that month falls within the date range. Document this behavior.
**Warning signs:** Budget totals on report don't match budget grid totals for the same period

## Code Examples

### Budget Grid Cell Input Component
```tsx
// Controlled input cell for budget amounts
function BudgetCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      className="w-full h-full px-2 py-1 text-right font-mono text-sm border-0 bg-transparent focus:bg-accent focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => {
        // Format on blur
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) onChange(num.toFixed(2));
      }}
    />
  );
}
```

### Variance Color Helper
```typescript
function getVarianceColor(
  variance: number,
  accountType: "INCOME" | "EXPENSE"
): string {
  if (variance === 0) return "";
  // Income: positive variance (actual > budget) is favorable
  // Expense: negative variance (actual < budget) is favorable
  const isFavorable =
    accountType === "INCOME" ? variance > 0 : variance < 0;
  return isFavorable
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}
```

### Budget CSV Import Validation
```typescript
// Following existing COA import pattern
const budgetCsvSchema = z.object({
  accountNumber: z.string().min(1, "Account number required"),
  period: z.string().regex(/^\d{1,2}\/\d{4}$/, "Period must be MM/YYYY format"),
  amount: z.string().refine(
    (s) => !isNaN(parseFloat(s)),
    "Amount must be a number"
  ),
});
```

### Copy From Prior Year
```typescript
// API: GET /api/entities/:entityId/budgets?fiscalYear=2024
// Returns array of { accountId, year, month, amount }
// UI: on click "Copy from 2024", fetch prior year budgets, populate grid
async function handleCopyFromPriorYear(priorYear: number) {
  const res = await fetch(
    `/api/entities/${entityId}/budgets?fiscalYear=${priorYear}`
  );
  const { data } = await res.json();
  // Map into grid state keyed by accountId-month
  const gridState = { ...currentGrid };
  for (const b of data) {
    const key = `${b.accountId}-${b.year}-${b.month}`;
    gridState[key] = b.amount;
  }
  setGridState(gridState);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma interactive transactions only | `prisma.$transaction([...])` array form for parallel operations | Prisma 5+ | Budget bulk upsert can run 600 operations efficiently |
| Individual API calls per cell | Batch save on button click | Standard UX | Single round-trip for all budget changes |
| Separate actuals + budget queries | Single JOIN query | N/A | Eliminates client-side matching, ensures consistent data |

## Open Questions

1. **Partial Month Budget Proration**
   - What we know: Budgets are stored per full month; report allows arbitrary date ranges
   - What's unclear: Should a date range of Jan 15 - Mar 15 include full Jan/Feb/Mar budgets or prorate?
   - Recommendation: Include full month's budget if any day falls in range. This matches QBO behavior and avoids complexity. Document in report footer.

2. **Grid Performance with Many Accounts**
   - What we know: Typical family office has 30-80 P&L accounts
   - What's unclear: Performance of rendering 80+ rows x 12 columns of input cells
   - Recommendation: 80 x 12 = 960 cells is well within React's capability. No virtualization needed. If performance is an issue, add it later.

3. **Budget Row Totals**
   - What we know: Grid shows Jan--Dec columns
   - What's unclear: Should there be a 13th "Total" column showing annual budget per account?
   - Recommendation: Yes, add a read-only Total column -- it's expected in budget spreadsheets and trivial to compute client-side.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + Testing Library |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUDG-01 | Budget CRUD API (create, read, update via upsert) | unit | `npx vitest run src/__tests__/api/budgets.test.ts -t "budget" --reporter=verbose` | No -- Wave 0 |
| BUDG-02 | CSV import parsing + upsert | unit | `npx vitest run src/__tests__/api/budget-import.test.ts --reporter=verbose` | No -- Wave 0 |
| BUDG-03 | Budget vs actual report query (actuals + budget + variance) | unit | `npx vitest run src/__tests__/api/budget-report.test.ts --reporter=verbose` | No -- Wave 0 |
| BUDG-04 | Entity scoping (budgets isolated per entity) | unit | `npx vitest run src/__tests__/api/budgets.test.ts -t "entity-scoped" --reporter=verbose` | No -- Wave 0 |
| BUDG-05 | CSV export of report data | unit | `npx vitest run src/__tests__/api/budget-report.test.ts -t "export" --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/api/budgets.test.ts` -- covers BUDG-01, BUDG-04
- [ ] `src/__tests__/api/budget-import.test.ts` -- covers BUDG-02
- [ ] `src/__tests__/api/budget-report.test.ts` -- covers BUDG-03, BUDG-05
- [ ] `src/__tests__/validators/budget.test.ts` -- Zod schema validation for budget inputs
- [ ] Fiscal year month utility unit tests -- covers fiscal year boundary math

## Sources

### Primary (HIGH confidence)
- Project codebase: `prisma/schema.prisma` -- existing data model patterns, Decimal(19,4) convention
- Project codebase: `src/lib/queries/report-queries.ts` -- P&L query pattern (actuals aggregation)
- Project codebase: `src/app/api/entities/[entityId]/accounts/import/route.ts` -- CSV import pattern
- Project codebase: `src/app/(auth)/reports/page.tsx` -- Report tab UI pattern, SectionRows component, export pattern
- Project codebase: `src/components/layout/sidebar.tsx` -- Navigation items array pattern
- Project codebase: `src/lib/export/csv-export.ts` -- CSV export utility (PapaParse + BOM)
- Project codebase: `src/lib/utils/accounting.ts` -- formatCurrency, getNormalBalanceSide
- Project codebase: `src/lib/db/entity-access.ts` -- findAccessibleEntity auth pattern

### Secondary (MEDIUM confidence)
- Prisma docs: `$transaction` array form for parallel operations -- verified by project's existing usage in COA import

### Tertiary (LOW confidence)
- None -- all findings verified against project codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies needed
- Architecture: HIGH -- all patterns directly extend existing codebase patterns (P&L report, CSV import, tab navigation)
- Pitfalls: HIGH -- fiscal year math and variance direction are well-understood accounting domain issues; decimal precision is addressed by existing project conventions

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- no dependency changes expected)
