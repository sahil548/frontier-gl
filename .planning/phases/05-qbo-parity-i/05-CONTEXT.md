# Phase 5: QBO Parity I - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

The app is complete on every screen a daily-use accountant touches — dashboard has charts, every page works on mobile, JE detail shows full audit history with field-level diffs, receipts can be attached to entries, and recurring journal entries can be set up and managed from a dedicated UI. This phase polishes the existing foundation into a production-quality daily-driver.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Charts
- Recharts library for all chart components
- Charts render below the existing 4 summary cards in a responsive row
- Three chart types per requirements: asset breakdown pie, income vs expense bar, equity trend area
- Charts update with the existing period selector
- Tooltips on hover showing exact values + click drill-down (clicking a pie slice or bar navigates to the relevant report/ledger)
- Teal palette (#0D7377) with variations from light to dark for data distinction
- On mobile (375px): charts stack vertically, each taking full width; tooltips activate via tap

### Attachments
- Storage: Vercel Blob (simple API, built into Vercel, ~$0.15/GB/mo)
- New Prisma `Attachment` model linked to JournalEntry
- Accepted file types: PDF, PNG, JPG, HEIC
- Max file size: 10MB per file
- Attachments can be added anytime — draft, approved, or posted entries (attachments are metadata, not financial data, so this doesn't violate JE immutability)
- Display: inline previews on JE detail page — thumbnails for images, PDF icon with filename for PDFs
- Click to view full-size in a modal/lightbox

### Mobile Layout
- Minimum supported screen width: 375px (iPhone SE) — matches success criteria
- Data tables (COA, JE list, Trial Balance, GL Ledger): horizontal scroll with first column pinned (account name / JE#)
- Forms (JE creation, account creation): stack vertically on mobile; JE line items become vertical cards instead of spreadsheet rows
- Dashboard charts: visible on mobile, stacked vertically at full width
- Sidebar: already uses Sheet overlay on mobile (hamburger menu) — no changes needed
- No horizontal overflow, no clipped content on any page

### Audit Trail UI
- Existing `je-audit-trail.tsx` component handles AUDT-01 (status change timeline)
- AUDT-02: Add field-level diff display for edits made before posting — show "field: old value → new value" format
- Collapsible audit trail panel on JE detail page (existing pattern)

### Recurring JE UI
- Dedicated page in sidebar navigation (under Journal Entries or as its own nav item "Recurring")
- Shows all recurring templates in a list with: template name, frequency, next run date, last run date, status (active/stopped)
- "Generate Due Entries" button triggers generation; feedback via toast notification: "Generated N draft entries"
- Generated draft JEs display a "Recurring" badge linking back to the source template
- Full edit capability on active recurring templates: frequency, next run date, template lines, name — changes apply to future generations only
- Stop recurrence available (already exists in recurring-manager.tsx)
- Existing `recurring-manager.tsx` provides the foundation; needs to be elevated from dialog-based to page-based UI

### Claude's Discretion
- Exact chart dimensions, aspect ratios, and animation
- Recharts component configuration and responsive container sizing
- Attachment upload progress indicator design
- Lightbox/modal component choice for attachment viewing
- Audit trail diff formatting details
- Loading skeleton patterns for new components
- Exact mobile breakpoint tweaks beyond the 375px minimum
- Recurring page table layout and sorting defaults

</decisions>

<specifics>
## Specific Ideas

- Dashboard charts should feel integrated with the existing summary cards — same card styling, same period selector driving the data
- Click drill-down from charts adds real utility: pie slice for "Cash" navigates to the Cash account ledger, income bar navigates to P&L
- Attachments on posted entries is important — accountants often receive receipts days after posting
- Teal palette variations for charts maintain brand consistency across the app
- Recurring page should show at-a-glance status: what's due, what was last generated, what's stopped

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `je-audit-trail.tsx`: Timeline-style audit display with action labels and changes formatting — extend for AUDT-02 field-level diffs
- `recurring-manager.tsx`: Setup/generate/stop recurring templates with dialog UI — elevate to dedicated page
- Dashboard page (`/src/app/(auth)/dashboard/page.tsx`): Summary cards with period selector — add charts below
- Mobile sidebar with Sheet overlay already working
- shadcn/ui Card, Dialog, Sheet, Badge, Table components available

### Established Patterns
- Tailwind responsive breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Grid pattern: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4` for summary cards
- Entity-scoped API routes: `/api/entities/{entityId}/...`
- React Hook Form + Zod for form validation
- Sonner for toast notifications
- TanStack Table for data tables

### Integration Points
- Dashboard API (`/api/entities/{entityId}/dashboard`) needs chart data endpoints (or extend existing)
- New Attachment model needs migration + API routes under `/api/entities/{entityId}/journal-entries/{jeId}/attachments`
- Recurring page needs API route for listing recurring templates (may exist partially)
- JournalEntry model needs relation to Attachment model
- Vercel Blob SDK needs to be added to dependencies

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-qbo-parity-i*
*Context gathered: 2026-03-29*
