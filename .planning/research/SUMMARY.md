# Research Summary: Frontier GL

**Domain:** Multi-entity general ledger / accounting software
**Researched:** 2026-03-26
**Overall confidence:** MEDIUM (library versions unverified due to tool access restrictions; architectural patterns and library selections are HIGH confidence)

## Executive Summary

Frontier GL is a multi-entity general ledger replacing QuickBooks Online for family office accounting. The core tech stack (Next.js 14, Prisma, PostgreSQL, Clerk, shadcn/ui) is pre-decided and well-suited for this domain. The research focused on identifying the accounting-specific libraries needed within this ecosystem.

The most critical technical decision is decimal arithmetic. PostgreSQL's NUMERIC type provides exact decimal storage, and Prisma bridges this to JavaScript via its bundled decimal.js library. Using decimal.js throughout the application (rather than alternatives like dinero.js) eliminates type conversion friction and ensures consistency from database to UI. This is a non-negotiable foundation for financial software.

The Next.js + shadcn/ui ecosystem has strong conventions around specific libraries: Recharts for charts, TanStack Table for data tables, Sonner for toasts, and react-hook-form + Zod for form validation. Following these conventions reduces decision fatigue and ensures components integrate cleanly. This is especially important for a solo AI-assisted development approach where fighting against library incompatibilities wastes significant time.

The export story (PDF and CSV) is straightforward for Phase 1: jspdf with autotable for tabular PDF reports, PapaParse for CSV. These are lightweight, client-side solutions appropriate for the data volumes expected (5-50 entities, thousands of transactions). Server-side PDF generation can be adopted later if performance demands it.

## Key Findings

**Stack:** Pre-decided core (Next.js 14 + Prisma + PostgreSQL + Clerk + shadcn/ui) supplemented with decimal.js for math, date-fns for dates, Zod + react-hook-form for validation, TanStack Table + Recharts for display, jspdf + PapaParse for export.

**Architecture:** Multi-entity via entity_id foreign key on all accounting tables, NOT schema-per-tenant. PostgreSQL NUMERIC(19,4) for all money fields. Double-entry enforced at both Zod validation and database constraint layers.

**Critical pitfall:** Using JavaScript native numbers (float64) anywhere in the financial calculation pipeline. A single `Number()` cast on a Decimal value can introduce rounding errors that cascade through trial balances.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation + Data Model** - Set up project, Prisma schema, PostgreSQL with NUMERIC fields, Clerk auth, entity CRUD
   - Addresses: Multi-entity selector, entity management, authentication
   - Avoids: Premature UI work before data model is solid

2. **Chart of Accounts** - Hierarchical account structure with CRUD
   - Addresses: Account numbering, parent/sub-account hierarchy, 5-type GL system
   - Avoids: Building journal entries before the account structure exists

3. **Journal Entries + Double-Entry Engine** - Core accounting logic
   - Addresses: JE creation, debit=credit validation, Draft/Approved/Posted workflow, audit trail
   - Avoids: This is the hardest phase; isolating it allows focused testing

4. **GL Ledger + Trial Balance** - Read-side views of posted data
   - Addresses: Ledger viewer, filtering, pagination, trial balance generation
   - Avoids: Building views before there is data to display

5. **Dashboard + Export** - Visual layer and data export
   - Addresses: Balance summary cards, charts, CSV/PDF export
   - Avoids: Dashboard is useless without underlying data

6. **Period Close + Polish** - Closing procedures and UX refinement
   - Addresses: Period close/reopen, year-end close, closing entries, mobile responsiveness
   - Avoids: Period close logic depends on all other features being stable

**Phase ordering rationale:**
- Data model must come first because every subsequent feature depends on entity and account tables
- Journal entries depend on chart of accounts (you post to accounts)
- GL ledger and trial balance are read views over posted journal entries
- Dashboard aggregates the same data at a higher level
- Period close is a governance feature that locks down already-working functionality

**Research flags for phases:**
- Phase 3 (Journal Entries): Likely needs deeper research on double-entry enforcement patterns, PostgreSQL trigger vs application-level validation tradeoffs
- Phase 6 (Period Close): Year-end closing entry generation has specific accounting rules worth researching
- Phase 5 (Dashboard): Standard patterns, unlikely to need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Library choices are HIGH confidence; exact latest versions unverified (could not access npm registry) |
| Features | HIGH | Well-understood domain; PROJECT.md has clear requirements |
| Architecture | HIGH | Multi-entity GL is a well-documented pattern; PostgreSQL NUMERIC is standard |
| Pitfalls | HIGH | Floating-point in finance is a classic, well-documented problem |

## Gaps to Address

- Exact latest versions of all npm packages should be verified at install time (`npm view <pkg> version`)
- Supabase vs Railway vs Neon PostgreSQL: needs cost comparison for the 20-50 entity scale target
- Clerk pricing at scale: free tier limits should be verified for the FOA client growth plan
- Server-side PDF generation may be needed for large GL exports; evaluate at Phase 5 if client-side jspdf is too slow
- Next.js 15 / React 19 migration path: when Clerk and shadcn ecosystem fully support them, migration would unlock React Server Actions improvements
