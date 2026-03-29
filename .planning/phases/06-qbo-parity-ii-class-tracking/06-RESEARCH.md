# Phase 6: QBO Parity II -- Multi-Dimensional Tagging - Research

**Researched:** 2026-03-29
**Domain:** Multi-dimensional tagging system for GL journal entry lines with report segmentation
**Confidence:** HIGH

## Summary

Phase 6 expands the original CLASS-01--05 requirements from a single "class" field into a full multi-dimensional tagging system. Users define dimension types (e.g., Fund, Property, Department) per entity, create tags within each dimension, tag JE line items with one tag per dimension, and slice the Income Statement by dimension (column-per-tag) and filter the Trial Balance by dimension tags.

The implementation is purely additive: three new Prisma models (Dimension, DimensionTag, JournalEntryLineDimensionTag), a new `/dimensions` page with accordion layout, dimension combobox columns injected into the JE line items table, and modifications to the existing Income Statement and Trial Balance queries and UIs. The codebase has strong established patterns for all these pieces -- Popover+Command combobox, Sheet slide-over, raw SQL report queries with Prisma.sql, and react-hook-form useFieldArray for JE lines.

**Primary recommendation:** Build in three layers: (1) schema + dimension CRUD API + management page, (2) JE form integration with dimension tag columns and split assistant, (3) report modifications for P&L column-per-tag and TB dimension filtering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dedicated sidebar page at /dimensions (own nav item) -- not buried in Settings
- Accordion layout: each dimension type is an expandable section showing its tags in a table
- "New Dimension" button at top creates a new dimension type
- "New Tag" button within each accordion section adds a tag to that dimension
- Slide-over panel for creating/editing dimensions and tags (consistent with COA pattern)
- User-defined dimension types -- users create whatever dimensions they need per entity
- No hard limit on number of dimension types per entity
- One level of grouping: Dimension Type -> Tags
- Dimension type fields: Name (required)
- Tag fields: Number/code (short alphanumeric), Name, Description (optional), Active/inactive toggle
- Active/inactive follows soft-delete pattern -- deactivated tags hidden from dropdowns but preserved on historical JE lines
- Each active dimension adds a combobox column to JE line item table, positioned after Account and before Debit
- Column order: Account | [Dim 1] | [Dim 2] | ... | Debit | Credit | Memo
- Combobox with search -- same pattern as Account selector
- "New [Dimension]" option at bottom of each combobox for inline quick-create
- One tag per dimension per JE line -- strict constraint
- Split assistant triggers when user needs two tags from same dimension on one line -- offers "Split this line? Enter allocation %" and creates two proportional lines
- Horizontal scroll when form gets wide (4+ dimension columns); Account column pinned/sticky on left
- All dimension columns always visible for active dimensions -- no per-JE toggle
- Existing JE lines (pre-dimensions) show empty cells -- no "Unclassified" marker
- Column-per-tag P&L: user picks one dimension, shows one column per tag + "Unclassified" + Total
- Dimension picker dropdown: "View by: [Fund / Property / Department / None]"
- Pick one dimension at a time -- no multi-dimensional pivot
- "Unclassified" column at end for entries without a tag for selected dimension
- Cash/accrual toggle works independently of dimension slicing
- TB dimension filtering: each active dimension adds a filter dropdown to filter bar
- Filter shows tags for that dimension -- select one to filter TB
- Multiple dimension filters apply simultaneously with AND logic
- Only accounts with activity for selected tag(s) shown -- zero-balance hidden
- Dimension filters combine with multi-entity consolidated view
- Filter only on TB -- no column-per-tag on TB
- TB verification check applies to filtered subset

### Claude's Discretion
- Dimension page exact layout, spacing, accordion component choice
- Combobox component reuse vs new component for dimension selectors
- Split assistant modal/popover design
- Column width management for dimension columns in JE form
- P&L column-per-tag responsive behavior when many tags exist
- How dimension filters integrate visually with existing TB filter bar
- Migration strategy for adding dimension infrastructure to existing schema

### Deferred Ideas (OUT OF SCOPE)
- Holding/asset linking on JE lines -- subledger integration feature for future phase
- Multi-dimensional pivot on P&L -- cross-tabulating by two dimensions simultaneously
- Balance Sheet by dimension -- column-per-tag for BS
- Cash Flow by dimension -- column-per-tag for CF
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLASS-01 | User can define classes (dimensions + tags) per entity | Dimension/DimensionTag Prisma models, CRUD API, /dimensions management page |
| CLASS-02 | User can tag individual JE line items with a class (dimension tag) | JournalEntryLineDimensionTag junction table, dimension combobox columns in JE form, validator extension |
| CLASS-03 | Income Statement can be filtered and segmented by class (column-per-tag view) | Modified getIncomeStatement query with GROUP BY dimension tag, new P&L UI with dynamic columns |
| CLASS-04 | Trial balance can be filtered by class (dimension tag) | Modified getTrialBalance query with JOIN + WHERE on dimension tags, filter dropdowns on TB page |
| CLASS-05 | Class field is optional -- unclassified entries continue to work normally | Nullable dimension tags, LEFT JOIN in queries, "Unclassified" column in P&L, empty cells in JE form |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | v7 | Schema models for Dimension, DimensionTag, junction table | Already used for all data models |
| Next.js 15 | 15.x | API routes + pages for /dimensions, modified reports | Already the app framework |
| react-hook-form | existing | JE form dimension fields via useFieldArray integration | Already used for JE form |
| Zod | existing | Validation schemas for dimension CRUD and JE line tag fields | Already used for all validators |
| Prisma.sql | existing | Raw SQL queries for dimension-aware reports | Already used for all report queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Accordion | latest | Dimension page accordion layout | Install via `npx shadcn@latest add accordion` -- not yet in project |
| shadcn/ui Sheet | existing | Slide-over panel for dimension/tag create/edit | Already in project, used by account-form |
| shadcn/ui Command+Popover | existing | Dimension tag combobox selectors in JE form | Already in project, used by AccountCombobox |
| shadcn/ui Dialog | existing | Split assistant modal for line splitting | Already in project |
| shadcn/ui Select | existing | Dimension picker on P&L, filter dropdowns on TB | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Accordion | Custom collapsible divs | Accordion has built-in a11y, keyboard nav; use it |
| Junction table | JSON array on JournalEntryLine | Junction table enforces referential integrity + efficient querying; JSON would be faster to implement but breaks reporting queries |
| Dynamic columns in JE | Fixed columns with overflow menu | Dynamic columns match the user's decision; responsive scrolling handles width |

**Installation:**
```bash
npx shadcn@latest add accordion
```

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  schema.prisma                      # Add Dimension, DimensionTag, JournalEntryLineDimensionTag models

src/
  app/(auth)/dimensions/
    page.tsx                         # Dimension management page with accordion layout
  app/api/entities/[entityId]/
    dimensions/
      route.ts                       # GET (list) + POST (create dimension)
      [dimensionId]/
        route.ts                     # GET + PUT + DELETE dimension
        tags/
          route.ts                   # GET (list) + POST (create tag)
          [tagId]/
            route.ts                 # PUT + DELETE (deactivate) tag

  components/
    dimensions/
      dimension-page.tsx             # Accordion layout with dimension sections
      dimension-form.tsx             # Sheet slide-over for create/edit dimension
      tag-form.tsx                   # Sheet slide-over for create/edit tag
      tag-table.tsx                  # Table within accordion section
    journal-entries/
      dimension-combobox.tsx         # Reusable dimension tag selector (based on AccountCombobox pattern)
      split-assistant.tsx            # Dialog for splitting a line by allocation %

  lib/
    validators/
      dimension.ts                   # Zod schemas for dimension and tag CRUD
    queries/
      report-queries.ts              # Modified getIncomeStatement with dimension parameter
      trial-balance-queries.ts       # Modified getTrialBalance with dimension filter params
```

### Pattern 1: Dimension Tag Combobox (reuse AccountCombobox pattern)
**What:** Each active dimension renders a Popover+Command combobox in the JE line items table, fetching tags for that dimension.
**When to use:** Every JE line item row, for each active dimension.
**Example:**
```typescript
// Based on existing AccountCombobox pattern in src/components/journal-entries/account-combobox.tsx
// Module-level cache keyed by dimensionId
const tagCache = new Map<string, { data: TagOption[]; fetchedAt: number }>();

export function DimensionCombobox({
  dimensionId,
  dimensionName,
  value,
  onChange,
  entityId,
  disabled,
}: DimensionComboboxProps) {
  // Same Popover+Command pattern as AccountCombobox
  // Fetch from /api/entities/{entityId}/dimensions/{dimensionId}/tags
  // Include "New {dimensionName}" option at bottom of list
}
```

### Pattern 2: Junction Table for Line-Dimension Tags
**What:** Many-to-many relationship between JournalEntryLine and DimensionTag, constrained to one tag per dimension per line via unique constraint.
**When to use:** Storing dimension tags on JE line items.
**Example:**
```prisma
model JournalEntryLineDimensionTag {
  id                 String           @id @default(cuid())
  journalEntryLineId String
  dimensionTagId     String
  journalEntryLine   JournalEntryLine @relation(fields: [journalEntryLineId], references: [id], onDelete: Cascade)
  dimensionTag       DimensionTag     @relation(fields: [dimensionTagId], references: [id])

  @@unique([journalEntryLineId, dimensionTagId])
  @@index([journalEntryLineId])
  @@index([dimensionTagId])
  @@map("journal_entry_line_dimension_tags")
}
```

**One-tag-per-dimension enforcement:** The unique constraint on `[journalEntryLineId, dimensionTagId]` prevents duplicate tags. The one-tag-per-dimension rule (can't have two tags from the same dimension on one line) must be enforced at the application level in the API route, since the DB only sees tag IDs, not dimension IDs. Validate before insert: for each line, group submitted tags by their dimension ID and reject if any dimension has more than one tag.

### Pattern 3: Income Statement with Dimension Columns
**What:** Modified SQL query that adds GROUP BY on dimension tag, returning one row per account per tag.
**When to use:** P&L "View by" dimension mode.
**Example:**
```sql
-- When dimensionId is provided, pivot P&L by tag
SELECT
  a.id AS account_id,
  a.number AS account_number,
  a.name AS account_name,
  a.type::text AS account_type,
  dt.id AS tag_id,
  dt.name AS tag_name,
  COALESCE(SUM(
    CASE WHEN a.type = 'EXPENSE' THEN jel.debit - jel.credit
    ELSE jel.credit - jel.debit END
  ), 0) AS net_balance
FROM accounts a
LEFT JOIN (
  journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel."journalEntryId"
    AND je.status = 'POSTED'
    AND je.date >= $startDate AND je.date <= $endDate
    {cashFilter}
  LEFT JOIN journal_entry_line_dimension_tags jeldt
    ON jeldt."journalEntryLineId" = jel.id
  LEFT JOIN dimension_tags dt ON dt.id = jeldt."dimensionTagId"
    AND dt."dimensionId" = $dimensionId
) ON jel."accountId" = a.id
WHERE a."entityId" = $entityId
  AND a."isActive" = true
  AND a.type IN ('INCOME', 'EXPENSE')
GROUP BY a.id, a.number, a.name, a.type, dt.id, dt.name
ORDER BY a.number, dt.name
```

The API returns data grouped by account, with an array of `{ tagId, tagName, netBalance }` per account. The UI pivots this into columns. Lines without a tag for the selected dimension show up in the "Unclassified" column (where `dt.id IS NULL`).

### Pattern 4: Trial Balance Dimension Filtering
**What:** Add optional dimension filter parameters to the TB query. Each active dimension filter adds a JOIN + WHERE clause.
**When to use:** TB page when user selects dimension tag filters.
**Example:**
```sql
-- Add to existing TB query when dimension filters are active
-- For each dimension filter (e.g., dimensionId1=tagId1, dimensionId2=tagId2):
JOIN journal_entry_line_dimension_tags jeldt1
  ON jeldt1."journalEntryLineId" = jel.id
  AND jeldt1."dimensionTagId" = $tagId1
JOIN journal_entry_line_dimension_tags jeldt2
  ON jeldt2."journalEntryLineId" = jel.id
  AND jeldt2."dimensionTagId" = $tagId2
```

Using INNER JOIN ensures AND logic -- only lines tagged with ALL specified tags are included.

### Anti-Patterns to Avoid
- **Storing dimension tags as JSON on JournalEntryLine:** Breaks SQL-level filtering and grouping for reports. Use a proper junction table.
- **Hard-coding dimension types:** The system must be fully user-defined. No "Fund" or "Department" enums.
- **Fetching all tags on every combobox render:** Use module-level cache with TTL (same pattern as AccountCombobox).
- **Modifying existing JournalEntryLine table schema:** Dimension tags go in a junction table, not as new columns on the line item table. This keeps the schema clean and supports N dimensions without schema changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion UI | Custom collapsible sections | shadcn/ui Accordion | A11y, keyboard nav, animation built in |
| Searchable dropdown | Custom input+list | Popover+Command (cmdk) pattern | Already proven in AccountCombobox, handles keyboard, search, scroll |
| Slide-over forms | Custom modal positioning | Sheet component | Already used for account create/edit, handles animation + overlay |
| Percentage allocation split | Manual math in split assistant | decimal.js for proportional calculation | Avoid floating-point errors in financial amounts |
| Dynamic SQL query building | String concatenation | Prisma.sql tagged templates with conditional fragments | Already established pattern, prevents SQL injection |

**Key insight:** Every UI pattern needed for this phase already exists in the codebase. The dimension combobox is a simplified AccountCombobox. The slide-over form is the same Sheet pattern from account-form.tsx. The SQL modifications follow the same Prisma.sql conditional fragment pattern used for cash/accrual filtering.

## Common Pitfalls

### Pitfall 1: One-Tag-Per-Dimension Enforcement
**What goes wrong:** The DB unique constraint only prevents duplicate tag assignments, not multiple tags from the same dimension on one line.
**Why it happens:** The junction table only knows tag IDs, not which dimension they belong to.
**How to avoid:** Validate at the API level before insert: for each line's tags, look up which dimension each tag belongs to, and reject if any dimension appears more than once.
**Warning signs:** Test with two tags from the same dimension on one line -- should return 400.

### Pitfall 2: N+1 Queries in JE List/Detail
**What goes wrong:** Loading dimension tags for each JE line item causes N+1 query patterns.
**Why it happens:** Prisma include for junction table -> dimensionTag -> dimension creates deep nesting.
**How to avoid:** Use Prisma include with proper nesting: `lineItems: { include: { dimensionTags: { include: { dimensionTag: { include: { dimension: true } } } } } }`. This is a single query with JOINs.
**Warning signs:** Slow JE list page load with many entries.

### Pitfall 3: Dynamic Column Rendering in JE Form
**What goes wrong:** Dimension columns don't update when dimensions are created/deactivated.
**Why it happens:** The JE form fetches active dimensions once on mount but doesn't react to changes.
**How to avoid:** Fetch active dimensions for the entity on form mount. If a dimension is created via inline quick-create, refetch the dimension list. Use a simple state refetch, not a full cache invalidation.
**Warning signs:** New dimension not appearing in JE form until page reload.

### Pitfall 4: Report Query Performance with Many Dimensions
**What goes wrong:** TB filtering with multiple dimension JOINs gets slow.
**Why it happens:** Each dimension filter adds a JOIN to the query, and without proper indexing the query plan degrades.
**How to avoid:** Index `journal_entry_line_dimension_tags` on both `journalEntryLineId` and `dimensionTagId` (already in the schema design above). For TB, the filter is typically 1-3 dimensions, so JOIN count stays manageable.
**Warning signs:** TB page taking >2s with dimension filters active.

### Pitfall 5: Form State Complexity with Dynamic Columns
**What goes wrong:** react-hook-form field names for dimension tags are complex and error-prone.
**Why it happens:** Each line item needs `dimensionTags: { [dimensionId]: tagId }` but useFieldArray expects flat structures.
**How to avoid:** Store dimension tags as a flat object on each line item: `lineItems[i].dimensionTags` as a Record<string, string> (dimensionId -> tagId). The Zod validator accepts an optional record. On submit, transform to junction table entries in the API route.
**Warning signs:** Dimension tag values not persisting across form interactions, "controlled/uncontrolled" React warnings.

### Pitfall 6: Unclassified Column Math Must Reconcile
**What goes wrong:** P&L "Unclassified" column doesn't add up correctly -- total across tag columns + unclassified != overall total.
**Why it happens:** Lines with no tag for the selected dimension should appear in "Unclassified", but the SQL LEFT JOIN logic can be tricky.
**How to avoid:** The SQL query already handles this with LEFT JOIN on dimension tags. Rows where `dt.id IS NULL` represent unclassified. Post-query, verify: sum of all tag columns + unclassified column = total for each account.
**Warning signs:** Column totals don't sum to the row total.

## Code Examples

### Prisma Schema Addition
```prisma
// Add to schema.prisma

model Dimension {
  id        String         @id @default(cuid())
  entityId  String
  name      String
  sortOrder Int            @default(0)
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  entity    Entity         @relation(fields: [entityId], references: [id])
  tags      DimensionTag[]

  @@unique([entityId, name])
  @@index([entityId, isActive])
  @@map("dimensions")
}

model DimensionTag {
  id          String    @id @default(cuid())
  dimensionId String
  code        String    // Short alphanumeric code, e.g., "FND1"
  name        String
  description String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  dimension   Dimension @relation(fields: [dimensionId], references: [id], onDelete: Cascade)
  lineAssignments JournalEntryLineDimensionTag[]

  @@unique([dimensionId, code])
  @@unique([dimensionId, name])
  @@index([dimensionId, isActive])
  @@map("dimension_tags")
}

model JournalEntryLineDimensionTag {
  id                 String           @id @default(cuid())
  journalEntryLineId String
  dimensionTagId     String
  journalEntryLine   JournalEntryLine @relation(fields: [journalEntryLineId], references: [id], onDelete: Cascade)
  dimensionTag       DimensionTag     @relation(fields: [dimensionTagId], references: [id])

  @@unique([journalEntryLineId, dimensionTagId])
  @@index([journalEntryLineId])
  @@index([dimensionTagId])
  @@map("journal_entry_line_dimension_tags")
}

// Add to Entity model:
//   dimensions Dimension[]

// Add to JournalEntryLine model:
//   dimensionTags JournalEntryLineDimensionTag[]
```

### Zod Validator Extension for JE Line Items
```typescript
// Extend lineItemSchema in src/lib/validators/journal-entry.ts
export const lineItemSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.string().default("0"),
    credit: z.string().default("0"),
    memo: z.string().optional(),
    // Dimension tags: { dimensionId: tagId }
    dimensionTags: z.record(z.string(), z.string()).optional().default({}),
  });
```

### Dimension Combobox (follows AccountCombobox pattern)
```typescript
// src/components/journal-entries/dimension-combobox.tsx
// Simplified version of AccountCombobox with:
// - Module-level cache keyed by dimensionId
// - Fetch from /api/entities/{entityId}/dimensions/{dimensionId}/tags
// - "New {dimensionName}" CommandItem at bottom that opens tag-form Sheet
// - Same Popover+Command+CommandItem structure
```

### Split Assistant Dialog
```typescript
// src/components/journal-entries/split-assistant.tsx
// Dialog triggered when user tries to assign second tag from same dimension
// Props: currentLine (with amount), dimensionName
// UI: "Split this line into two? Enter allocation %"
//   Input: percentage (e.g., 60%)
//   Preview: Line 1: $600 (60%) | Line 2: $400 (40%)
//   Confirm: splits the line via useFieldArray append + modify
```

### Modified Income Statement Query Signature
```typescript
export async function getIncomeStatement(
  entityId: string,
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash' = 'accrual',
  dimensionId?: string  // NEW: optional dimension for column-per-tag view
): Promise<IncomeStatementData | DimensionedIncomeStatementData>

// New return type for dimensioned view:
export interface DimensionedReportRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  tagBreakdown: Array<{
    tagId: string | null;  // null = unclassified
    tagName: string | null;
    netBalance: number;
  }>;
  totalBalance: number;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "class" field on JE | Multi-dimensional tagging system | Phase 6 scope expansion | N dimensions instead of 1, more flexible |
| Class as enum/string column | Junction table with user-defined dimensions | Phase 6 design decision | Schema supports unlimited dimensions without migration |

**Deprecated/outdated:**
- The original CLASS-01-05 requirements described a single "class" field. User expanded this to multi-dimensional tagging during the discuss phase. The implementation should build the full multi-dimensional system.

## Open Questions

1. **Dimension ordering in JE table**
   - What we know: Dimensions add columns after Account and before Debit
   - What's unclear: Should dimensions be ordered alphabetically, by creation date, or by a user-defined sortOrder?
   - Recommendation: Use the `sortOrder` field on the Dimension model. Default to creation order. Allow reordering in the dimension management page if time permits, otherwise defer.

2. **Split assistant trigger mechanism**
   - What we know: User wants the split assistant to trigger when assigning a second tag from the same dimension
   - What's unclear: Exact UX -- does it trigger automatically, or does the user get a validation error with a "Split?" button?
   - Recommendation: Show a validation toast/popover when the user tries to select a tag and there's already a different tag from the same dimension assigned. Include a "Split Line" action button in the message. This avoids modal fatigue.

3. **Dimension tags on template lines**
   - What we know: Templates (JournalEntryTemplateLine) exist for recurring JEs
   - What's unclear: Should template lines also support dimension tags?
   - Recommendation: Defer to a later enhancement. Templates are a Phase 5 feature. Adding dimension support to templates adds complexity without blocking CLASS-01-05.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + @vitejs/plugin-react |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLASS-01 | Dimension and tag CRUD (create, list, update, deactivate) | unit | `npx vitest run src/lib/validators/dimension.test.ts -x` | No -- Wave 0 |
| CLASS-02 | JE line items accept and persist dimension tags | unit | `npx vitest run tests/dimensions/je-dimension-tags.test.ts -x` | No -- Wave 0 |
| CLASS-03 | Income statement groups by dimension tag (column-per-tag) | unit | `npx vitest run tests/dimensions/income-statement-by-dimension.test.ts -x` | No -- Wave 0 |
| CLASS-04 | Trial balance filters by dimension tag(s) | unit | `npx vitest run tests/dimensions/tb-dimension-filter.test.ts -x` | No -- Wave 0 |
| CLASS-05 | Unclassified entries work normally (null tags, empty cells) | unit | `npx vitest run tests/dimensions/unclassified-entries.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/validators/dimension.test.ts` -- validates dimension/tag Zod schemas
- [ ] `tests/dimensions/je-dimension-tags.test.ts` -- covers CLASS-02 JE tagging
- [ ] `tests/dimensions/income-statement-by-dimension.test.ts` -- covers CLASS-03 P&L segmentation
- [ ] `tests/dimensions/tb-dimension-filter.test.ts` -- covers CLASS-04 TB filtering
- [ ] `tests/dimensions/unclassified-entries.test.ts` -- covers CLASS-05 optional/null behavior
- [ ] Install shadcn accordion: `npx shadcn@latest add accordion`

## Sources

### Primary (HIGH confidence)
- Existing codebase: `prisma/schema.prisma` -- full current schema reviewed
- Existing codebase: `src/components/journal-entries/account-combobox.tsx` -- Popover+Command combobox pattern
- Existing codebase: `src/components/journal-entries/je-line-items.tsx` -- useFieldArray JE line item pattern
- Existing codebase: `src/components/journal-entries/je-form.tsx` -- FormProvider/useFormContext split
- Existing codebase: `src/lib/queries/report-queries.ts` -- Income Statement raw SQL with Prisma.sql
- Existing codebase: `src/lib/queries/trial-balance-queries.ts` -- Trial Balance raw SQL
- Existing codebase: `src/lib/validators/journal-entry.ts` -- Zod schema for JE validation
- Existing codebase: `src/components/accounts/account-form.tsx` -- Sheet slide-over pattern
- Existing codebase: `src/app/api/entities/[entityId]/journal-entries/route.ts` -- JE create with line items
- Existing codebase: `src/app/api/entities/[entityId]/trial-balance/route.ts` -- TB API with consolidated support
- Existing codebase: `src/components/layout/sidebar.tsx` -- Nav item array for adding Dimensions

### Secondary (MEDIUM confidence)
- PostgreSQL junction table patterns for many-to-many with constraints -- standard relational DB pattern

### Tertiary (LOW confidence)
- None -- all patterns are established in the codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, only adding shadcn accordion
- Architecture: HIGH -- all patterns directly observed in codebase (combobox, sheet, raw SQL, useFieldArray)
- Pitfalls: HIGH -- identified from direct codebase analysis (N+1 queries, form state complexity, SQL JOIN logic)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- no external dependency changes expected)
