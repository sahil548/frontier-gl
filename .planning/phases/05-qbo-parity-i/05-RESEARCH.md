# Phase 5: QBO Parity I - Research

**Researched:** 2026-03-29
**Domain:** Dashboard charts, mobile responsiveness, audit trail UI, file attachments, recurring JE page
**Confidence:** HIGH

## Summary

Phase 5 polishes an already-functional GL application into a production-quality daily-driver by adding five feature areas: dashboard charts (Recharts), full mobile responsiveness (375px minimum), enhanced audit trail with field-level diffs, file attachments via Vercel Blob, and a dedicated recurring JE management page. The codebase is well-structured with clear patterns -- shadcn/ui components, Tailwind responsive classes, entity-scoped API routes, and React Hook Form + Zod validation. All five feature areas build on existing foundation code.

The primary technical additions are two new npm packages (recharts, @vercel/blob) and one new Prisma model (Attachment). The recurring JE page and audit trail enhancements are refactors/extensions of existing components rather than greenfield work. Mobile responsiveness is a systematic pass over all existing pages rather than new feature code.

**Primary recommendation:** Tackle this phase in waves -- (1) schema migration + new packages, (2) dashboard charts, (3) attachments, (4) audit trail enhancement, (5) recurring page elevation, (6) mobile responsiveness pass. Mobile goes last because all new UI from earlier waves needs to be mobile-ready from the start.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Recharts library for all chart components
- Charts render below existing 4 summary cards in a responsive row
- Three chart types: asset breakdown pie, income vs expense bar, equity trend area
- Charts update with existing period selector
- Tooltips on hover + click drill-down (pie slice/bar navigates to relevant report/ledger)
- Teal palette (#0D7377) with variations
- On mobile (375px): charts stack vertically, full width, tooltips via tap
- Storage: Vercel Blob for attachments
- New Prisma Attachment model linked to JournalEntry
- Accepted file types: PDF, PNG, JPG, HEIC
- Max file size: 10MB per file
- Attachments allowed on any JE status (draft, approved, posted)
- Display: inline previews (thumbnails for images, PDF icon for PDFs), click to view full-size in modal/lightbox
- Minimum supported screen width: 375px (iPhone SE)
- Data tables: horizontal scroll with first column pinned
- Forms: stack vertically on mobile; JE line items become vertical cards
- Existing je-audit-trail.tsx handles AUDT-01; extend for AUDT-02 field-level diffs
- Audit trail shows "field: old value -> new value" format
- Dedicated recurring page in sidebar navigation
- List view with template name, frequency, next run date, last run date, status
- "Generate Due Entries" button with toast feedback
- Generated drafts display "Recurring" badge linking to source template
- Full edit capability on active recurring templates
- Elevate existing recurring-manager.tsx from dialog-based to page-based UI

### Claude's Discretion
- Exact chart dimensions, aspect ratios, and animation
- Recharts component configuration and responsive container sizing
- Attachment upload progress indicator design
- Lightbox/modal component choice for attachment viewing
- Audit trail diff formatting details
- Loading skeleton patterns for new components
- Exact mobile breakpoint tweaks beyond the 375px minimum
- Recurring page table layout and sorting defaults

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-03 | Dashboard displays mini charts: asset breakdown pie, income vs expense bar, equity trend area | Recharts library with ResponsiveContainer; extend dashboard API for chart data endpoints |
| UI-02 | All pages responsive and usable on tablet and mobile screens | Tailwind responsive classes, pinned-column table pattern, vertical card pattern for forms |
| AUDT-01 | User can view full audit trail on JE detail -- who created, approved, posted with timestamps | Already implemented in je-audit-trail.tsx; verify completeness |
| AUDT-02 | Audit trail shows field-level diff for edits before posting | Extend existing formatChanges() in je-audit-trail.tsx; ensure API records field diffs in JournalEntryAudit.changes JSON |
| ATTCH-01 | User can attach files (PDF, image) to a journal entry | Vercel Blob put() for storage; new Attachment Prisma model; API route for upload |
| ATTCH-02 | Attachments listed and viewable inline on JE detail page | Thumbnail rendering for images, PDF icon pattern; Dialog/modal for full-size view |
| ATTCH-03 | Attachment upload uses Vercel Blob for storage | @vercel/blob SDK with client upload pattern for files up to 10MB |
| RECR-01 | User can mark JE template as recurring with frequency and start date from UI | Existing setup action in recurring API; new page-based UI for setup |
| RECR-02 | User can view all recurring templates in dedicated list | New /recurring page; fetch from existing templates API filtered by isRecurring |
| RECR-03 | User can manually trigger "generate due entries" | Existing generate action in recurring API; button on new recurring page |
| RECR-04 | User can edit or stop a recurring template | Stop exists; add edit capability (frequency, next run date, template lines) |
| RECR-05 | Generated entries appear in JE list as drafts linked to template | Existing generate creates drafts with "(recurring)" description; add badge + template link |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15 | Dashboard charts (Pie, Bar, Area) | Most popular React charting library; declarative API; composable with React components; 23k+ GitHub stars |
| @vercel/blob | ^0.27 | File attachment storage | Native Vercel integration; auto-CDN; minimal setup; pay-per-use pricing |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | ^4.1 | UI components (Dialog, Badge, Card, Table) | All new UI -- attachment modal, recurring page layout |
| lucide-react | ^1.7 | Icons | Paperclip (attachments), RefreshCw (recurring), etc. |
| sonner | ^2.0 | Toast notifications | Upload success/failure, generate entries feedback |
| @tanstack/react-table | ^8.21 | Data tables | Recurring templates list |
| date-fns | ^4.1 | Date formatting | Next run date, last run date display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo, Chart.js | Recharts is simpler for React; locked by user decision |
| Vercel Blob | S3/Cloudflare R2 | Vercel Blob has zero-config deployment; locked by user decision |
| Custom lightbox | react-medium-image-zoom | Claude's discretion; recommend shadcn Dialog with img/iframe -- no extra dependency |

**Installation:**
```bash
npm install recharts @vercel/blob
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(auth)/
    dashboard/page.tsx            # Add chart components below summary cards
    journal-entries/
      [journalEntryId]/page.tsx   # Add attachment section + enhanced audit trail
    recurring/page.tsx             # NEW: dedicated recurring management page
  components/
    dashboard/
      asset-pie-chart.tsx          # NEW
      income-expense-bar.tsx       # NEW
      equity-trend-area.tsx        # NEW
    journal-entries/
      je-audit-trail.tsx           # EXTEND: field-level diff display
      je-attachments.tsx           # NEW: attachment list + upload
      attachment-lightbox.tsx      # NEW: full-size viewer modal
    recurring/
      recurring-templates-table.tsx # NEW: TanStack Table for template list
      recurring-edit-dialog.tsx    # NEW: edit frequency/lines dialog
  app/api/entities/[entityId]/
    dashboard/route.ts             # EXTEND: add chart data endpoints
    journal-entries/[journalEntryId]/
      attachments/route.ts         # NEW: upload + list + delete
    templates/
      recurring/route.ts           # EXTEND: add edit action
prisma/
  schema.prisma                    # ADD: Attachment model
```

### Pattern 1: Recharts ResponsiveContainer
**What:** Wrap each chart in ResponsiveContainer for automatic resizing
**When to use:** All charts on the dashboard
**Example:**
```typescript
// Each chart component follows this pattern
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const TEAL_PALETTE = [
  "#0D7377", "#0A5C5F", "#10908F", "#14ADAB", "#18C9C4", "#1CE5DE"
];

export function AssetPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Asset Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((_, index) => (
                <Cell key={index} fill={TEAL_PALETTE[index % TEAL_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Pattern 2: Vercel Blob Client Upload
**What:** Upload files from client directly to Vercel Blob via a server-side token endpoint
**When to use:** Attachment uploads (supports files up to 5TB, avoids 4.5MB server limit)
**Example:**
```typescript
// API route: app/api/entities/[entityId]/journal-entries/[journalEntryId]/attachments/route.ts
import { put, del, list } from "@vercel/blob";

export async function POST(request: Request, { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }) {
  const { entityId, journalEntryId } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // Upload to Vercel Blob
  const blob = await put(`attachments/${entityId}/${journalEntryId}/${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  // Save metadata to Prisma
  const attachment = await prisma.attachment.create({
    data: {
      journalEntryId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      url: blob.url,
      uploadedBy: userId,
    },
  });

  return successResponse(attachment, 201);
}
```

### Pattern 3: Pinned First Column Table (Mobile)
**What:** Horizontal scroll on data tables with sticky first column
**When to use:** All data tables (COA, JE list, Trial Balance, GL Ledger) on mobile
**Example:**
```typescript
// Wrapper for scrollable tables with pinned first column
<div className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 z-10 bg-background min-w-[120px]">
          Account
        </TableHead>
        <TableHead>Debit</TableHead>
        <TableHead>Credit</TableHead>
      </TableRow>
    </TableHeader>
    {/* ... */}
  </Table>
</div>
```

### Pattern 4: JE Line Items as Mobile Cards
**What:** Convert spreadsheet-style line items into stacked vertical cards on mobile
**When to use:** JE creation/edit form on screens < 640px
**Example:**
```typescript
// Each line item becomes a card on mobile
<div className="hidden sm:block">
  {/* Desktop: traditional table row */}
</div>
<div className="sm:hidden space-y-3">
  {/* Mobile: card-style layout */}
  <Card className="p-3">
    <div className="space-y-2">
      <div><Label>Account</Label><AccountSelect /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Debit</Label><Input /></div>
        <div><Label>Credit</Label><Input /></div>
      </div>
      <div><Label>Memo</Label><Input /></div>
    </div>
  </Card>
</div>
```

### Anti-Patterns to Avoid
- **Fixed-width charts:** Never set pixel widths on charts -- always use ResponsiveContainer with percentage width
- **Server-side blob upload for large files:** Vercel has a 4.5MB body limit on serverless functions; use client upload pattern for 10MB limit
- **Hardcoded mobile breakpoints:** Use Tailwind's responsive prefixes (sm:, md:, lg:) consistently, not custom media queries
- **Storing files in the database:** Binary blobs in PostgreSQL destroy performance; use object storage (Vercel Blob)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG/Canvas charts | Recharts | Accessibility, tooltips, animations, responsive sizing all handled |
| File storage | Database BYTEA columns or filesystem | Vercel Blob | CDN, deduplication, cost-effective, auto-scaling |
| Responsive containers | Custom ResizeObserver wrappers | Recharts ResponsiveContainer | Battle-tested, handles edge cases (SSR, hidden containers) |
| Image lightbox | Custom modal with zoom/pan | shadcn Dialog + native img/object | Sufficient for preview; no zoom/pan needed for receipts |
| File type validation | Manual MIME parsing | Accept attribute + server-side content-type check | Browser handles UI; server validates |

**Key insight:** This phase is about polish and integration -- every feature area has existing foundation code or well-established library solutions. The risk is in CSS/layout details (mobile) and API integration (chart data, blob storage), not in algorithmic complexity.

## Common Pitfalls

### Pitfall 1: Recharts SSR Hydration Mismatch
**What goes wrong:** Recharts uses browser APIs (ResizeObserver, getBoundingClientRect) that don't exist during SSR, causing hydration mismatches in Next.js
**Why it happens:** Next.js pre-renders on server where DOM measurements are unavailable
**How to avoid:** Ensure chart components are in "use client" files (already the pattern in this project). Use dynamic import with `ssr: false` if hydration errors persist, or wrap in a client-only boundary.
**Warning signs:** Console hydration warnings, charts rendering at wrong size on initial load

### Pitfall 2: Vercel Blob Token Not Available Locally
**What goes wrong:** `BLOB_READ_WRITE_TOKEN` is auto-injected in Vercel deployment but missing in local development
**Why it happens:** Vercel Blob requires a token from the Vercel dashboard; it's not auto-generated locally
**How to avoid:** Run `vercel env pull .env.local` to sync environment variables. Add `BLOB_READ_WRITE_TOKEN` to `.env.local`. Never commit tokens to git.
**Warning signs:** "BLOB_READ_WRITE_TOKEN is not defined" error on upload

### Pitfall 3: Vercel Serverless Body Size Limit (4.5MB)
**What goes wrong:** File uploads fail silently or with 413 error when file exceeds 4.5MB
**Why it happens:** Vercel serverless functions have a 4.5MB request body limit
**How to avoid:** Use Vercel Blob client upload pattern (upload directly from browser to blob storage) or use FormData with streaming. Since max file is 10MB, server upload via standard POST will fail for larger files -- must use client upload.
**Warning signs:** Large PDF uploads fail; small images work fine

### Pitfall 4: Mobile Overflow from Fixed-Width Elements
**What goes wrong:** Horizontal scrollbar appears on mobile despite responsive containers
**Why it happens:** One element (table, form input, or card) has a min-width or fixed width that exceeds 375px
**How to avoid:** Test every page at 375px viewport. Use `overflow-x-hidden` on main content area only as last resort. Prefer `w-full max-w-full` on form elements. Use `truncate` on text that might overflow.
**Warning signs:** Any horizontal scroll on mobile that's not an intentional data table scroll

### Pitfall 5: Chart Data Endpoint Performance
**What goes wrong:** Dashboard loads slowly because chart data queries are expensive (full table scans)
**Why it happens:** Asset breakdown requires grouping all accounts by type with balances; equity trend requires monthly historical data
**How to avoid:** Reuse existing summary query patterns (already in dashboard API). For equity trend, use a simple monthly GROUP BY on posted JE dates. Keep queries scoped to entity IDs with existing indexes.
**Warning signs:** Dashboard taking >2s to load with chart data

### Pitfall 6: Missing Audit Diff Data
**What goes wrong:** Audit trail shows "Edited" but no field-level diffs because the edit API didn't capture old vs new values
**Why it happens:** The JournalEntryAudit.changes JSON column must be populated by the API when edits occur
**How to avoid:** Before updating a JE, snapshot the current values; after update, diff old vs new and store in the audit entry's `changes` field. The existing `formatChanges()` function already expects `{ field: { old, new } }` format.
**Warning signs:** Audit trail entries with action "EDITED" but null/empty changes

## Code Examples

### Dashboard Chart Data API Extension
```typescript
// Extend GET /api/entities/:entityId/dashboard to include chart data
// Asset breakdown: group account balances by sub-type within ASSET
const assetBreakdown = await prisma.$queryRaw<{ name: string; value: number }[]>(
  Prisma.sql`
    SELECT
      a.name,
      ABS(COALESCE(SUM(jel.debit - jel.credit), 0))::float AS value
    FROM accounts a
    JOIN journal_entry_lines jel ON jel."accountId" = a.id
    JOIN journal_entries je ON je.id = jel."journalEntryId" AND je.status = 'POSTED'
    WHERE a."entityId" IN (${Prisma.join(entityIds)})
      AND a.type = 'ASSET'
      AND a."parentId" IS NULL
      AND a."isActive" = true
    GROUP BY a.id, a.name
    HAVING ABS(SUM(jel.debit - jel.credit)) > 0
    ORDER BY ABS(SUM(jel.debit - jel.credit)) DESC
    LIMIT 8
  `
);

// Income vs Expense: total income and expense for selected period
// (Already have this pattern in the existing dashboard API -- reuse)

// Equity trend: monthly equity balances over last 12 months
const equityTrend = await prisma.$queryRaw<{ month: string; equity: number }[]>(
  Prisma.sql`
    SELECT
      TO_CHAR(je.date, 'YYYY-MM') AS month,
      COALESCE(SUM(jel.credit - jel.debit), 0)::float AS equity
    FROM accounts a
    JOIN journal_entry_lines jel ON jel."accountId" = a.id
    JOIN journal_entries je ON je.id = jel."journalEntryId" AND je.status = 'POSTED'
    WHERE a."entityId" IN (${Prisma.join(entityIds)})
      AND a.type = 'EQUITY'
      AND je.date >= ${twelveMonthsAgo}
    GROUP BY TO_CHAR(je.date, 'YYYY-MM')
    ORDER BY month
  `
);
```

### Prisma Attachment Model
```prisma
model Attachment {
  id             String       @id @default(cuid())
  journalEntryId String
  fileName       String
  fileType       String       // MIME type: "image/png", "application/pdf", etc.
  fileSize       Int          // bytes
  url            String       // Vercel Blob URL
  uploadedBy     String
  createdAt      DateTime     @default(now())
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  @@index([journalEntryId])
  @@map("attachments")
}
```
Also add to JournalEntry model: `attachments Attachment[]`

### Enhanced Audit Trail Diff Display
```typescript
// Extended formatChanges for field-level diff display (AUDT-02)
function formatFieldDiffs(changes: unknown): { field: string; old: string; new: string }[] | null {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, { old: string; new: string }>);
  if (entries.length === 0) return null;
  return entries.map(([key, val]) => ({
    field: key,
    old: String(val.old),
    new: String(val.new),
  }));
}

// Render as styled diff lines
{diffs?.map((diff, i) => (
  <div key={i} className="flex items-center gap-1 text-xs">
    <span className="font-medium text-muted-foreground">{diff.field}:</span>
    <span className="line-through text-red-500/70">{diff.old}</span>
    <span className="text-muted-foreground">-></span>
    <span className="text-green-600">{diff.new}</span>
  </div>
))}
```

### Recurring Page Sidebar Navigation
```typescript
// Add to navItems array in sidebar.tsx (after Journal Entries)
{ href: "/recurring", label: "Recurring", icon: RefreshCw },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ResponsiveContainer wrapper | `responsive` prop on chart | Recharts 2.14+ | Can skip wrapper component; but ResponsiveContainer still supported and more documented |
| Vercel Blob server upload only | Client upload pattern | 2024 | Required for files > 4.5MB on Vercel |
| Custom file upload handling | FormData + @vercel/blob put() | Current | Minimal boilerplate |

**Deprecated/outdated:**
- Recharts `<Legend>` inline prop: use `wrapperStyle` or CSS instead
- Vercel Blob `handleUpload`: renamed/restructured in latest SDK versions -- check current docs

## Open Questions

1. **HEIC support in Vercel Blob**
   - What we know: Vercel Blob stores any binary; HEIC is accepted
   - What's unclear: Whether inline preview of HEIC works in all browsers (Safari yes, Chrome partial)
   - Recommendation: Accept HEIC upload but convert to JPEG for preview display, or show generic image icon for HEIC with download link

2. **Equity trend chart data granularity**
   - What we know: Monthly grouping over 12 months is standard
   - What's unclear: Whether cumulative running total or per-period delta is more useful
   - Recommendation: Cumulative running total (running balance of equity accounts up to each month-end) matches accounting convention

3. **Recurring template link on generated JEs**
   - What we know: Generated JEs have "(recurring)" in description but no foreign key back to template
   - What's unclear: Whether to add a `templateId` FK to JournalEntry or use the audit trail entry
   - Recommendation: Add optional `templateId` to JournalEntry model for direct link; simpler querying and enables the "Recurring" badge with template link

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1 + jsdom |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-03 | Chart data API returns asset breakdown, income/expense, equity trend | unit | `npx vitest run tests/dashboard/chart-data.test.ts -t "chart data"` | No -- Wave 0 |
| UI-02 | Pages render without horizontal overflow at 375px | manual-only | N/A (visual inspection in browser devtools) | N/A |
| AUDT-01 | Audit trail displays all status changes | unit | `npx vitest run src/lib/journal-entries/audit.test.ts` | Yes |
| AUDT-02 | Field-level diffs captured and displayed | unit | `npx vitest run tests/audit/field-diff.test.ts -t "field diff"` | No -- Wave 0 |
| ATTCH-01 | Attachment upload stores file and creates DB record | unit | `npx vitest run tests/attachments/upload.test.ts -t "upload"` | No -- Wave 0 |
| ATTCH-02 | Attachments listed on JE detail | unit | `npx vitest run tests/attachments/list.test.ts -t "list"` | No -- Wave 0 |
| ATTCH-03 | Vercel Blob integration works | unit | `npx vitest run tests/attachments/blob-storage.test.ts` | No -- Wave 0 |
| RECR-01 | Setup recurring from UI | unit | `npx vitest run tests/recurring/setup.test.ts` | No -- Wave 0 |
| RECR-02 | List recurring templates | unit | `npx vitest run tests/recurring/list.test.ts` | No -- Wave 0 |
| RECR-03 | Generate due entries | unit | `npx vitest run tests/recurring/generate.test.ts` | No -- Wave 0 |
| RECR-04 | Edit/stop recurring template | unit | `npx vitest run tests/recurring/edit-stop.test.ts` | No -- Wave 0 |
| RECR-05 | Generated JEs linked to template | unit | `npx vitest run tests/recurring/generated-link.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/chart-data.test.ts` -- covers DASH-03 chart data API
- [ ] `tests/audit/field-diff.test.ts` -- covers AUDT-02 field-level diffs
- [ ] `tests/attachments/upload.test.ts` -- covers ATTCH-01 upload flow
- [ ] `tests/attachments/list.test.ts` -- covers ATTCH-02 listing
- [ ] `tests/attachments/blob-storage.test.ts` -- covers ATTCH-03 Vercel Blob integration (mock)
- [ ] `tests/recurring/setup.test.ts` -- covers RECR-01
- [ ] `tests/recurring/list.test.ts` -- covers RECR-02
- [ ] `tests/recurring/generate.test.ts` -- covers RECR-03
- [ ] `tests/recurring/edit-stop.test.ts` -- covers RECR-04
- [ ] `tests/recurring/generated-link.test.ts` -- covers RECR-05

## Sources

### Primary (HIGH confidence)
- Existing codebase: dashboard page, je-audit-trail.tsx, recurring-manager.tsx, schema.prisma, sidebar.tsx, dashboard API route, recurring API route
- [Recharts API docs](https://recharts.github.io/en-US/api/) -- PieChart, BarChart, AreaChart, ResponsiveContainer
- [Vercel Blob docs](https://vercel.com/docs/vercel-blob) -- put, list, client upload, server upload limits

### Secondary (MEDIUM confidence)
- [Vercel Blob server upload](https://vercel.com/docs/vercel-blob/server-upload) -- 4.5MB limit detail
- [Vercel Blob client upload](https://vercel.com/docs/vercel-blob/client-upload) -- for larger files
- [Recharts GitHub](https://github.com/recharts/recharts) -- responsive prop, latest patterns

### Tertiary (LOW confidence)
- HEIC browser support -- varies by browser; needs runtime validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts and Vercel Blob are well-documented, user-locked choices
- Architecture: HIGH -- Building on established project patterns; clear integration points
- Pitfalls: HIGH -- Well-known issues (SSR hydration, body size limits, mobile overflow)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable libraries, 30-day validity)
