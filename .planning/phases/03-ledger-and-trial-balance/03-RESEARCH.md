# Phase 3: Ledger and Trial Balance - Research

**Researched:** 2026-03-26
**Domain:** Read-side financial reporting (GL Ledger, Trial Balance), TanStack Table data grids, CSV/PDF export, date/filter UX
**Confidence:** HIGH

## Summary

Phase 3 is a read-only reporting layer over the posted journal entry data from Phase 2. It introduces two core views: (1) the GL Ledger, showing all posted transactions for a single account with running balance, filtering, and pagination; and (2) the Trial Balance, showing all active accounts with debit/credit balances as of a point in time, grouped by account type with a verification check. Both views support CSV and PDF export.

The primary technical challenges are: computing running balances efficiently (requires PostgreSQL window functions via Prisma raw queries since Prisma ORM does not support window functions natively), building a reusable TanStack Table + shadcn/ui data table pattern that serves both views, implementing client-side PDF generation with professional formatting using jsPDF + jspdf-autotable, and building a consolidated multi-entity trial balance with tree-style grouping.

**Primary recommendation:** Build a reusable `<DataTable>` component using shadcn/ui's Table + TanStack Table v8 with client-side pagination/sorting/filtering (transaction volumes per account are well within client-side limits for an accounting app). Use `$queryRaw` for running balance computation via PostgreSQL `SUM() OVER()` window functions. Use jsPDF + jspdf-autotable for PDF export and Papa Parse `unparse()` for CSV export. Use shadcn/ui Combobox for account selection and the built-in Calendar/DatePicker for date filtering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Drill-down from Chart of Accounts: clicking an account row opens its ledger
- GL Ledger also has its own sidebar nav item for direct access
- Standalone ledger page uses a searchable combobox (type-ahead by account name/number) to pick an account
- Sidebar nav order: Dashboard, Chart of Accounts, GL Ledger, Trial Balance, Journal Entries
- Separate debit and credit columns (traditional accounting layout): Date | JE# | Description | Debit | Credit | Balance
- JE# is a clickable link that navigates to the journal entry detail
- Default sort: newest transactions first
- Beginning balance row at top showing balance as of filter start date
- Totals/summary footer row showing period total debits, total credits, and net change
- Paginated at 50 transactions per page (TanStack Table)
- Account summary card above the table showing: account number, name, type, current balance, and YTD activity
- Trial Balance grouped by account type with section headers (Assets, Liabilities, Equity, Income, Expense) and subtotals per group
- Total debits and total credits shown at bottom of trial balance
- Persistent balance verification banner: green/checkmark when in balance, red/X when out of balance with difference amount
- Consolidated multi-entity TB: merged view grouped by account, with entity breakdown within each account (tree-style: Account > Entity rows > Consolidated row)
- Single as-of date picker for trial balance: "Trial Balance as of [date]"
- Inline filter bar always visible above GL Ledger table (not collapsible)
- Filters: memo text search, date range picker, min/max amount inputs
- Filters apply instantly with 300ms debounce on text input
- Active filters shown as removable chips
- Amount range filters on debit OR credit falling within range
- Default date range: current month (1st of month through today)
- Single "Export" dropdown button with CSV and PDF options
- Exports include only currently filtered/visible data (WYSIWYG)
- PDF header includes: entity name, report title, date range/as-of date, generated timestamp, and "Frontier GL" branding
- CSV includes beginning balance row, all transactions, and totals/net change footer
- Same export pattern applies to both GL Ledger and Trial Balance

### Claude's Discretion
- Loading skeleton design for ledger and TB tables
- Exact spacing, padding, and responsive behavior of summary cards and filter bar
- Empty state design when no transactions exist for an account
- Date picker component choice and styling
- PDF layout engine and exact formatting
- Trial Balance sort column defaults (account number likely)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LED-01 | User can view all posted transactions for any account with date, JE number, description, debit, credit, and running balance | TanStack Table column definitions + PostgreSQL `SUM() OVER()` window function for running balance via `$queryRaw` |
| LED-02 | User can filter ledger by date range, amount range, and memo text | TanStack Table column filtering with controlled state + 300ms debounced text input + shadcn DatePicker for range |
| LED-03 | Ledger is paginated at 50 transactions per page | TanStack Table `getPaginationRowModel()` with `pageSize: 50` |
| LED-04 | User can export ledger data as CSV | PapaParse `unparse()` to generate CSV string, Blob download |
| LED-05 | User can export ledger data as PDF | jsPDF + jspdf-autotable with branded header, table content, and footer |
| TB-01 | User can view all active accounts with debit/credit balances for a selected period | Aggregation query: `SUM(CASE WHEN ...)` grouped by account with as-of date filter |
| TB-02 | Trial balance displays verification check confirming total debits = total credits | Client-side sum of all debit and credit columns; compare equality; render green/red banner |
| TB-03 | User can sort trial balance by account number, name, type, or balance | TanStack Table `getSortedRowModel()` with sortable column headers |
| TB-04 | User can export trial balance as CSV | Same PapaParse pattern as LED-04 |
| TB-05 | User can export trial balance as PDF | Same jsPDF + jspdf-autotable pattern as LED-05, with group headers and verification status |
| TB-06 | User can view consolidated trial balance across multiple/all entities | Query without entity_id filter (or with multiple entity_ids), aggregate with entity breakdown, tree-style rendering with TanStack Table row expansion |
| UI-03 | Data tables use TanStack Table with sorting, filtering, and pagination | Reusable `<DataTable>` component built on shadcn/ui Table + @tanstack/react-table v8 |
</phase_requirements>

## Standard Stack

### Core (Phase 3 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21 | Headless table logic | Sorting, filtering, pagination, column visibility. shadcn/ui's official data table guide uses it. |
| jspdf | ^2.5 | PDF generation | Client-side PDF generation, no server dependency, small bundle (~150KB) |
| jspdf-autotable | ^5.0 | PDF table plugin | Professional table layouts with headers, footers, styling hooks. Ideal for accounting reports. |
| papaparse | ^5.4 | CSV generation | `Papa.unparse()` converts JSON to CSV string. Handles escaping, quoting, special characters. |

### Supporting (from Phase 1 stack, used here)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Table | latest (CLI) | Table UI shell | Styled `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>` components |
| shadcn/ui Calendar | latest (CLI) | Date picker foundation | Built on react-day-picker; used for date range and as-of date selection |
| shadcn/ui Popover | latest (CLI) | Date picker container | Wraps Calendar for date picker UX |
| shadcn/ui Command | latest (CLI) | Combobox search | Powers the searchable account selector (Combobox = Popover + Command) |
| shadcn/ui Badge | latest (CLI) | Filter chips | Removable active filter indicators |
| shadcn/ui DropdownMenu | latest (CLI) | Export button | "Export" dropdown with CSV/PDF options |
| react-day-picker | ^8.x | Calendar internals | Dependency of shadcn/ui Calendar; supports range mode |
| date-fns | ^3.x | Date formatting/math | Dependency of react-day-picker; use for date range defaults, formatting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF + autotable | @react-pdf/renderer | More React-native API but heavier bundle, more complex for simple table reports |
| jsPDF + autotable | pdfmake | JSON-declarative is nice but larger bundle (~1MB), custom font setup is painful with webpack |
| PapaParse | Manual CSV string building | PapaParse handles edge cases (commas in values, quoting, BOM for Excel) that manual code misses |
| Client-side pagination | Server-side pagination | For a family office GL (hundreds to low thousands of transactions per account), client-side is simpler and sufficient |

**Installation:**
```bash
npm install @tanstack/react-table jspdf jspdf-autotable papaparse
npm install -D @types/papaparse
npx shadcn@latest add table calendar popover command badge dropdown-menu
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
  (dashboard)/
    gl-ledger/
      page.tsx             # GL Ledger page (server component - fetches account list)
      [accountId]/
        page.tsx           # Account-specific ledger view
    trial-balance/
      page.tsx             # Trial Balance page
src/components/
  data-table/
    data-table.tsx         # Reusable DataTable component (TanStack + shadcn)
    data-table-pagination.tsx  # Pagination controls
    data-table-column-header.tsx  # Sortable column header
  gl-ledger/
    ledger-filters.tsx     # Inline filter bar (date range, amount, memo)
    ledger-columns.tsx     # TanStack column definitions
    account-summary-card.tsx  # Account header card
    ledger-export.tsx      # Export dropdown (CSV/PDF)
  trial-balance/
    tb-columns.tsx         # TanStack column definitions
    tb-verification-banner.tsx  # Green/red balance banner
    tb-export.tsx          # Export dropdown
    tb-entity-tree.tsx     # Consolidated multi-entity tree rows
  ui/
    account-combobox.tsx   # Searchable account picker
    date-range-picker.tsx  # Date range picker (Popover + Calendar range mode)
src/lib/
  export/
    csv-export.ts          # PapaParse unparse wrapper
    pdf-export.ts          # jsPDF + autotable wrapper with branding
  queries/
    ledger-queries.ts      # Prisma queries for GL ledger (including $queryRaw for running balance)
    trial-balance-queries.ts  # Prisma queries for trial balance aggregation
src/app/api/entities/[entityId]/
  ledger/
    [accountId]/
      route.ts             # GET /api/entities/:entityId/ledger/:accountId
  trial-balance/
    route.ts               # GET /api/entities/:entityId/trial-balance
```

### Pattern 1: Reusable DataTable Component
**What:** A single `<DataTable>` component wrapping TanStack Table + shadcn/ui Table that accepts column definitions and data as props.
**When to use:** Every data table in the app (GL Ledger, Trial Balance, and future tables).
**Example:**
```typescript
// Source: shadcn/ui Data Table docs
// https://ui.shadcn.com/docs/components/radix/data-table

"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, TableFooter,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
  footerRow?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns, data, pageSize = 50, footerRow,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  })
  // ... render Table with flexRender
}
```

### Pattern 2: Running Balance via PostgreSQL Window Function
**What:** Compute running balance server-side using `SUM() OVER()` window function via Prisma `$queryRaw`.
**When to use:** GL Ledger view for any account. Prisma ORM does not support window functions natively -- `$queryRaw` is required.
**Example:**
```typescript
// Source: PostgreSQL window functions documentation
// Running balance for a single account's posted transactions

async function getLedgerWithRunningBalance(
  entityId: string,
  accountId: string,
  filters: LedgerFilters
) {
  return prisma.$queryRaw`
    WITH beginning AS (
      SELECT COALESCE(SUM(
        CASE WHEN jeli.debit > 0 THEN jeli.debit ELSE -jeli.credit END
      ), 0) AS beginning_balance
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON je.id = jeli.journal_entry_id
      WHERE jeli.account_id = ${accountId}
        AND je.entity_id = ${entityId}
        AND je.status = 'POSTED'
        AND je.date < ${filters.startDate}
    )
    SELECT
      je.date,
      je.entry_number AS je_number,
      je.description,
      jeli.debit,
      jeli.credit,
      jeli.line_memo,
      (SELECT beginning_balance FROM beginning)
        + SUM(CASE WHEN jeli2.debit > 0 THEN jeli2.debit ELSE -jeli2.credit END)
          OVER (ORDER BY je.date, je.id ROWS UNBOUNDED PRECEDING)
        AS running_balance
    FROM journal_entry_line_items jeli
    JOIN journal_entries je ON je.id = jeli.journal_entry_id
    -- self-join alias for window function
    LEFT JOIN journal_entry_line_items jeli2 ON jeli2.id = jeli.id
    WHERE jeli.account_id = ${accountId}
      AND je.entity_id = ${entityId}
      AND je.status = 'POSTED'
      AND je.date >= ${filters.startDate}
      AND je.date <= ${filters.endDate}
    ORDER BY je.date DESC, je.id DESC
  `
}
```

**Important note on running balance direction:** For Asset and Expense accounts, debits increase the balance. For Liability, Equity, and Income accounts, credits increase the balance. The running balance computation must account for the account's normal balance side. This is a common accounting pitfall -- use the account type to determine the sign convention.

### Pattern 3: Trial Balance Aggregation Query
**What:** Aggregate all account balances as of a point in time using `SUM(CASE WHEN ...)`.
**When to use:** Trial Balance view.
**Example:**
```typescript
async function getTrialBalance(entityId: string, asOfDate: Date) {
  return prisma.$queryRaw`
    SELECT
      a.id AS account_id,
      a.account_number,
      a.name AS account_name,
      a.type AS account_type,
      COALESCE(SUM(jeli.debit), 0) AS total_debits,
      COALESCE(SUM(jeli.credit), 0) AS total_credits,
      COALESCE(SUM(jeli.debit), 0) - COALESCE(SUM(jeli.credit), 0) AS net_balance
    FROM accounts a
    LEFT JOIN journal_entry_line_items jeli ON a.id = jeli.account_id
    LEFT JOIN journal_entries je ON je.id = jeli.journal_entry_id
      AND je.status = 'POSTED'
      AND je.entity_id = ${entityId}
      AND je.date <= ${asOfDate}
    WHERE a.entity_id = ${entityId}
      AND a.is_active = true
    GROUP BY a.id, a.account_number, a.name, a.type
    HAVING COALESCE(SUM(jeli.debit), 0) != 0
       OR COALESCE(SUM(jeli.credit), 0) != 0
    ORDER BY a.account_number
  `
}
```

### Pattern 4: CSV Export
**What:** Generate CSV from the currently visible/filtered table data.
**When to use:** Both GL Ledger and Trial Balance export.
**Example:**
```typescript
import Papa from "papaparse"

function exportToCsv(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data, {
    header: true,
    quotes: true, // Always quote fields for safety
  })
  // Add BOM for Excel UTF-8 compatibility
  const bom = "\ufeff"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 5: PDF Export with Branding
**What:** Generate professional PDF with header (entity name, report title, date, branding) and table content.
**When to use:** Both GL Ledger and Trial Balance export.
**Example:**
```typescript
// Source: jsPDF + jspdf-autotable docs
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

function exportLedgerToPdf(
  data: LedgerRow[],
  meta: { entityName: string; accountName: string; dateRange: string }
) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(16)
  doc.text("General Ledger", 14, 20)
  doc.setFontSize(10)
  doc.text(meta.entityName, 14, 28)
  doc.text(`Account: ${meta.accountName}`, 14, 34)
  doc.text(`Period: ${meta.dateRange}`, 14, 40)
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 46)
  doc.text("Frontier GL", doc.internal.pageSize.width - 14, 46, { align: "right" })

  autoTable(doc, {
    startY: 52,
    head: [["Date", "JE#", "Description", "Debit", "Credit", "Balance"]],
    body: data.map(row => [
      row.date, row.jeNumber, row.description,
      row.debit ? formatCurrency(row.debit) : "",
      row.credit ? formatCurrency(row.credit) : "",
      formatCurrency(row.balance),
    ]),
    theme: "grid",
    headStyles: { fillColor: [13, 115, 119] }, // Teal #0D7377
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      3: { halign: "right" }, // Debit
      4: { halign: "right" }, // Credit
      5: { halign: "right" }, // Balance
    },
    // Page footer with page numbers
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10,
        { align: "center" }
      )
    },
  })

  doc.save(`gl-ledger-${meta.accountName}.pdf`)
}
```

### Anti-Patterns to Avoid
- **Server-side rendering of PDF:** Do not generate PDFs in Next.js API routes or server components. jsPDF runs in the browser; the data is already on the client. Generating PDFs server-side requires headless browser (Puppeteer) which is heavy and slow on Vercel.
- **Computing running balance in JavaScript:** Do not fetch all transactions and compute running balance in a loop client-side. Use PostgreSQL window functions -- they are faster, handle edge cases (ties in date), and the database is the source of truth.
- **Mixing server-side and client-side pagination:** If using client-side sorting/filtering, ALL data must be client-side. Do not paginate server-side while sorting client-side -- you will sort only the visible page.
- **Floating-point arithmetic in balance checks:** The trial balance verification (debits = credits) must use Decimal comparison, not JavaScript floating-point. Prisma returns Decimal objects; compare using `.equals()` or convert to string first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table pagination/sorting/filtering | Custom table state management | TanStack Table v8 | Handles edge cases: stable sort, multi-column sort, filter debounce, page boundary math |
| CSV generation | Manual string concatenation | PapaParse `unparse()` | Handles commas in values, quoting, newlines in fields, BOM for Excel |
| PDF tables | Manual coordinate math with jsPDF | jspdf-autotable | Handles page breaks, column widths, cell wrapping, headers on every page |
| Date range logic | Custom date math | date-fns | `startOfMonth()`, `endOfDay()`, `format()`, `isWithinInterval()` -- all timezone-safe |
| Searchable dropdown | Custom input + filtered list | shadcn/ui Combobox (Popover + Command) | Keyboard navigation, accessibility, search highlighting, empty state |
| Debounced input | Custom setTimeout/clearTimeout | `useDebouncedCallback` from `use-debounce` or inline with useEffect | Handles cleanup, stale closures, rapid typing |

**Key insight:** This phase is entirely read-side UI. The hard problems (double-entry enforcement, balance materialization) are solved in Phase 2. Here, the risk is in UX polish and data presentation -- areas where existing libraries handle 90% of the work.

## Common Pitfalls

### Pitfall 1: Running Balance Sign Convention
**What goes wrong:** Running balance shows wrong sign for liability/equity/income accounts.
**Why it happens:** Debits increase asset/expense accounts but decrease liability/equity/income accounts. A naive `debit - credit` gives the wrong balance direction.
**How to avoid:** Store the account's "normal balance side" (debit-normal vs credit-normal) and use it to determine whether `debit - credit` or `credit - debit` gives the correct balance. Or always show raw debit/credit totals and let the running balance column reflect the accounting convention (debit balance = positive for debit-normal accounts).
**Warning signs:** Liability accounts showing negative balances when they should be positive.

### Pitfall 2: Prisma Decimal Serialization
**What goes wrong:** Decimal values from Prisma become strings when serialized to JSON for client components.
**Why it happens:** JavaScript cannot natively represent Decimal; Prisma returns `Prisma.Decimal` objects. When passed from server to client components via props or API responses, they serialize as strings.
**How to avoid:** Explicitly convert Decimal to number or formatted string in the API layer before sending to client. For display, format with `toFixed(2)`. For comparison (TB verification), compare string representations or use a small epsilon.
**Warning signs:** Table cells showing "[object Object]" or "NaN".

### Pitfall 3: Empty State When No Transactions Exist
**What goes wrong:** Table renders with no rows and no explanation, confusing the user.
**Why it happens:** New accounts or accounts with no posted transactions in the filtered date range return empty results.
**How to avoid:** Show a clear empty state: "No posted transactions for this account" or "No transactions match your filters." Include a suggestion to adjust filters or check that journal entries are posted (not still in Draft).
**Warning signs:** Blank table body with pagination showing "0 of 0".

### Pitfall 4: Consolidated TB Query Performance
**What goes wrong:** "All Entities" trial balance is slow when many entities have many accounts.
**Why it happens:** Cross-entity aggregation without proper indexing or with N+1 query patterns.
**How to avoid:** Use a single SQL query that aggregates across all entities with `GROUP BY account_number, entity_id`. Ensure composite index on `(entity_id, account_id, status)` on journal_entry_line_items. Consider using the materialized balance table (DI-03) rather than re-aggregating from line items.
**Warning signs:** TB load time >2 seconds for "All Entities".

### Pitfall 5: Date Range Default Off-by-One
**What goes wrong:** Default "current month" filter misses transactions on the first or last day.
**Why it happens:** Using `new Date()` without normalizing to start/end of day. Comparing date-only fields against datetime values.
**How to avoid:** Use `date-fns` `startOfMonth(new Date())` for start and `endOfDay(new Date())` for end. Ensure the SQL query uses `>=` and `<=` (inclusive on both ends).
**Warning signs:** Transactions posted today not appearing in the ledger.

### Pitfall 6: PDF Page Breaks in Middle of Account Group
**What goes wrong:** Trial Balance PDF breaks a page in the middle of an account type group, separating the section header from its rows.
**Why it happens:** jspdf-autotable does not know about logical groupings.
**How to avoid:** Use the `rowPageBreak: 'avoid'` option for group header rows, or manually insert section breaks using multiple `autoTable` calls (one per account type group) with `startY: doc.lastAutoTable.finalY`.
**Warning signs:** PDF printout with orphaned section headers at bottom of pages.

## Code Examples

### Debounced Filter Input
```typescript
// Use the use-debounce package or a simple custom hook
import { useCallback, useRef } from "react"

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay])
}

// In filter bar:
const debouncedSetMemoFilter = useDebouncedCallback(
  (value: string) => table.getColumn("description")?.setFilterValue(value),
  300
)
```

### Account Combobox (shadcn Popover + Command)
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/combobox
"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"

interface Account { id: string; accountNumber: string; name: string }

function AccountCombobox({
  accounts, value, onSelect,
}: {
  accounts: Account[]
  value: string | null
  onSelect: (accountId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = accounts.find((a) => a.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          {selected ? `${selected.accountNumber} - ${selected.name}` : "Select account..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search by name or number..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.accountNumber} ${account.name}`}
                  onSelect={() => { onSelect(account.id); setOpen(false) }}
                >
                  {account.accountNumber} - {account.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### Trial Balance Verification Banner
```typescript
function VerificationBanner({ totalDebits, totalCredits }: {
  totalDebits: number
  totalCredits: number
}) {
  const difference = Math.abs(totalDebits - totalCredits)
  const inBalance = difference < 0.005 // Epsilon for rounding

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium",
      inBalance
        ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
        : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
    )}>
      {inBalance ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          In Balance -- Total Debits: {formatCurrency(totalDebits)} | Total Credits: {formatCurrency(totalCredits)}
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4" />
          Out of Balance by {formatCurrency(difference)} -- Total Debits: {formatCurrency(totalDebits)} | Total Credits: {formatCurrency(totalCredits)}
        </>
      )}
    </div>
  )
}
```

### Date Range Picker (shadcn Calendar in range mode)
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/date-picker
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth } from "date-fns"
import { DateRange } from "react-day-picker"

function DateRangePicker({ dateRange, onDateRangeChange }: {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
            ) : format(dateRange.from, "MMM d, yyyy")
          ) : "Pick a date range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          defaultMonth={startOfMonth(new Date())}
        />
      </PopoverContent>
    </Popover>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-table v7 (hooks-only) | TanStack Table v8 (headless, framework-agnostic) | 2022 | New API: `useReactTable` replaces `useTable`. Column defs are objects, not hooks. |
| jspdf-autotable v3 (auto-plugin) | jspdf-autotable v5 (explicit import) | 2024 | Import `autoTable` function directly instead of relying on auto-registration on `doc` |
| Server-side PDF rendering (Puppeteer) | Client-side PDF (jsPDF) | Ongoing | For simple table reports, client-side is faster and avoids Vercel serverless limits |

**Deprecated/outdated:**
- `react-table` (v7 package name): Use `@tanstack/react-table` instead
- `jspdf-autotable` auto-plugin pattern (`doc.autoTable()`): Use `autoTable(doc, {...})` in v5+
- `react-csv` package: Unmaintained; use PapaParse which is actively maintained and more capable

## Open Questions

1. **Client-side vs. server-side filtering for GL Ledger**
   - What we know: Client-side is simpler and works for small datasets. Family office GL accounts will typically have hundreds to low thousands of transactions per account.
   - What's unclear: If any account could have 10,000+ transactions (e.g., a cash account with daily entries across years), client-side may lag.
   - Recommendation: Start with client-side (fetch all transactions for the filtered date range from the API, let TanStack Table handle sorting/filtering/pagination). If performance issues arise, move to server-side pagination with controlled state. The architecture (API route + query) supports either approach.

2. **Materialized balance table vs. live aggregation for Trial Balance**
   - What we know: Phase 2 establishes a materialized/cached balance table (DI-03) updated atomically during posting.
   - What's unclear: Whether the materialized balance table stores point-in-time snapshots or just current balances. If only current balances, the "as-of date" trial balance requires live aggregation from line items.
   - Recommendation: Use the materialized balance table for the default (current) trial balance. For historical as-of dates, fall back to live aggregation query. This gives fast default loads and correct historical views.

3. **Normal balance side handling**
   - What we know: Assets/Expenses are debit-normal; Liabilities/Equity/Income are credit-normal.
   - What's unclear: Whether the Phase 2 schema stores `normal_balance_side` on the account model.
   - Recommendation: If not stored, derive it from `account_type` at query time. Add a utility function `getNormalBalanceSide(accountType)` that returns 'DEBIT' or 'CREDIT'.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (likely established in Phase 1) or Jest |
| Config file | vitest.config.ts or jest.config.ts (see Wave 0) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LED-01 | Ledger shows posted transactions with running balance | integration | `npx vitest run tests/ledger/ledger-query.test.ts -t "running balance"` | No -- Wave 0 |
| LED-02 | Ledger filters by date range, amount, memo | unit | `npx vitest run tests/ledger/ledger-filters.test.ts` | No -- Wave 0 |
| LED-03 | Ledger paginates at 50 per page | unit | `npx vitest run tests/ledger/ledger-pagination.test.ts` | No -- Wave 0 |
| LED-04 | CSV export generates valid CSV | unit | `npx vitest run tests/export/csv-export.test.ts` | No -- Wave 0 |
| LED-05 | PDF export generates valid PDF | unit | `npx vitest run tests/export/pdf-export.test.ts` | No -- Wave 0 |
| TB-01 | Trial balance shows all active accounts with balances | integration | `npx vitest run tests/trial-balance/tb-query.test.ts` | No -- Wave 0 |
| TB-02 | Verification check detects balance/imbalance | unit | `npx vitest run tests/trial-balance/tb-verification.test.ts` | No -- Wave 0 |
| TB-03 | Trial balance sorts by number, name, type, balance | unit | `npx vitest run tests/trial-balance/tb-sorting.test.ts` | No -- Wave 0 |
| TB-04 | TB CSV export | unit | Covered by csv-export.test.ts | No -- Wave 0 |
| TB-05 | TB PDF export | unit | Covered by pdf-export.test.ts | No -- Wave 0 |
| TB-06 | Consolidated TB across entities | integration | `npx vitest run tests/trial-balance/tb-consolidated.test.ts` | No -- Wave 0 |
| UI-03 | DataTable supports sort, filter, paginate | unit | `npx vitest run tests/components/data-table.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ledger/ledger-query.test.ts` -- covers LED-01 (running balance query logic)
- [ ] `tests/ledger/ledger-filters.test.ts` -- covers LED-02
- [ ] `tests/export/csv-export.test.ts` -- covers LED-04, TB-04
- [ ] `tests/export/pdf-export.test.ts` -- covers LED-05, TB-05
- [ ] `tests/trial-balance/tb-query.test.ts` -- covers TB-01
- [ ] `tests/trial-balance/tb-verification.test.ts` -- covers TB-02
- [ ] `tests/trial-balance/tb-consolidated.test.ts` -- covers TB-06
- [ ] Test framework setup if not established by Phase 1/2

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Data Table docs](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table integration pattern
- [shadcn/ui Combobox docs](https://ui.shadcn.com/docs/components/radix/combobox) - Searchable select pattern
- [shadcn/ui Date Picker docs](https://ui.shadcn.com/docs/components/radix/date-picker) - Date range picker pattern
- [TanStack Table v8 Pagination Guide](https://tanstack.com/table/v8/docs/guide/pagination) - Client vs server-side pagination
- [TanStack Table v8 Sorting Guide](https://tanstack.com/table/latest/docs/guide/sorting) - Sort configuration
- [TanStack Table v8 Filtering Guide](https://tanstack.com/table/v8/docs/guide/column-filtering) - Filter setup
- [jspdf-autotable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) - v5.0.7 API, hooks, styling
- [jspdf-autotable npm](https://www.npmjs.com/package/jspdf-autotable) - v5.0.7 latest
- [@tanstack/react-table npm](https://www.npmjs.com/package/@tanstack/react-table) - v8.21.3 latest
- [Prisma Pagination docs](https://www.prisma.io/docs/v6/orm/prisma-client/queries/pagination) - Cursor vs offset pagination
- [PapaParse](https://www.papaparse.com/) - CSV parsing/generation

### Secondary (MEDIUM confidence)
- [Date Range Picker for shadcn](https://github.com/johnpolacek/date-range-picker-for-shadcn) - Community date range picker with presets
- [Dev Palma - Building Dynamic Tables in Next.js with Shadcn and TanStack](https://devpalma.com/en/posts/shadcn-tables) - Integration tutorial
- PostgreSQL `SUM() OVER()` window function pattern for running balances - standard SQL, well-documented

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are well-established, documented, and widely used
- Architecture: HIGH - patterns follow official shadcn/ui and TanStack Table documentation
- Pitfalls: HIGH - common accounting software issues, verified with multiple sources
- Export (PDF/CSV): HIGH - jsPDF + autotable and PapaParse are mature, well-documented libraries
- Running balance query: MEDIUM - Prisma `$queryRaw` with window functions is standard but exact query depends on Phase 2 schema

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable ecosystem, 30-day validity)
