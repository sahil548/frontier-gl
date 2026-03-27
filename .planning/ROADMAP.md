# Roadmap: Frontier GL

## Overview

Frontier GL delivers a multi-entity general ledger that replaces QuickBooks Online for family office accounting. The roadmap moves from foundational infrastructure (auth, entities, schema) through the core double-entry accounting engine, into read-side views (ledger, trial balance), and finishes with dashboards, period close governance, and polish. Each phase delivers a complete, verifiable capability that the next phase builds on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffolding, authentication, entity management, data model, and API patterns (completed 2026-03-27)
- [ ] **Phase 2: Accounting Engine** - Chart of accounts and journal entry system with double-entry enforcement
- [ ] **Phase 3: Ledger and Trial Balance** - Read-side views of posted data with filtering, pagination, and export
- [ ] **Phase 4: Dashboard, Period Close, and Polish** - Financial dashboards, period governance, responsive layout, and final integration

## Phase Details

### Phase 1: Foundation
**Goal**: Users can authenticate, create and switch between entities, and the data model is ready for accounting operations
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, ENTM-01, ENTM-02, ENTM-03, ENTM-04, ENTM-05, DI-01, DI-02, UI-01, API-01, API-02, API-03
**Success Criteria** (what must be TRUE):
  1. User can sign up, log in, and remain authenticated across page refreshes -- unauthenticated users cannot access any application route
  2. User can create an entity (with name, type, fiscal year end), edit it, and deactivate it
  3. User can switch between entities via header dropdown without page reload, and "All Entities" consolidated view is available
  4. Entity selection persists across browser sessions (survives close and reopen)
  5. All database tables use NUMERIC(19,4) for money fields and include entity_id foreign key scoping -- API endpoints follow RESTful /api/entities/:entityId/ pattern with Zod validation and consistent JSON responses
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js project, Clerk auth, Prisma schema, shadcn/ui theming, dark mode, Vitest setup
- [ ] 01-02-PLAN.md — Zod validation schemas, API response helpers, entity CRUD API endpoints
- [ ] 01-03-PLAN.md — Layout shell (sidebar, header), entity switcher, entity management pages, onboarding

### Phase 2: Accounting Engine
**Goal**: Users can manage a chart of accounts and create, approve, and post journal entries with full double-entry integrity
**Depends on**: Phase 1
**Requirements**: COA-01, COA-02, COA-03, COA-04, COA-05, COA-06, COA-07, JE-01, JE-02, JE-03, JE-04, JE-05, JE-06, JE-07, JE-08, DI-03, DI-04, DI-05
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and deactivate accounts organized in a hierarchical parent/sub-account structure with customizable numbering, searchable by name, number, or type -- each entity has its own scoped chart of accounts
  2. User can see the current balance (sum of posted transactions) displayed inline for each account
  3. User can create journal entries with date, description, and line items (account + debit/credit + memo) -- system rejects entries where total debits do not equal total credits at both client and server layers
  4. Journal entries move through Draft, Approved, and Posted states -- drafts are editable/deletable, posted entries are immutable, and a complete audit trail records who created, approved, and when posted
  5. User can create one-click reversing entries and bulk-post multiple drafts -- system prevents posting to closed periods at the database layer
**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md — Prisma schema (accounts, JEs, balances), DB triggers (immutability, balance validation, closed period), Zod validators, business logic (post, reverse, bulk-post, template)
- [ ] 02-02-PLAN.md — Account CRUD API, COA page with indented table, slide-over form, search/filter, template seeding
- [ ] 02-03-PLAN.md — Journal entry CRUD API, approve/post/reverse/bulk endpoints
- [ ] 02-04-PLAN.md — JE form with spreadsheet line items and account combobox, JE list with tabs and bulk action bar
- [ ] 02-05-PLAN.md — End-to-end human verification of COA and JE features

### Phase 3: Ledger and Trial Balance
**Goal**: Users can view, filter, and export posted transaction data at both account-level (GL ledger) and summary-level (trial balance)
**Depends on**: Phase 2
**Requirements**: LED-01, LED-02, LED-03, LED-04, LED-05, TB-01, TB-02, TB-03, TB-04, TB-05, TB-06, UI-03
**Success Criteria** (what must be TRUE):
  1. User can view all posted transactions for any account showing date, JE number, description, debit, credit, and running balance -- paginated at 50 per page with TanStack Table sorting
  2. User can filter the GL ledger by date range, amount range, and memo text
  3. User can view a trial balance for any selected period showing all active accounts with debit/credit balances, with verification that total debits equal total credits -- sortable by account number, name, type, or balance
  4. User can view a consolidated trial balance across multiple or all entities
  5. User can export both GL ledger and trial balance data as CSV and PDF
**Plans**: 5 plans

Plans:
- [ ] 03-00-PLAN.md — Wave 0 test stubs for all Phase 3 requirements (Vitest)
- [ ] 03-01-PLAN.md — Install dependencies, reusable DataTable component, AccountCombobox, DateRangePicker
- [ ] 03-02-PLAN.md — Accounting utilities, Prisma query modules (ledger + TB), CSV and PDF export utilities
- [ ] 03-03-PLAN.md — GL Ledger API endpoint, filter bar, summary card, export dropdown, ledger pages, and COA drill-down wiring
- [ ] 03-04-PLAN.md — Trial Balance API endpoint, verification banner, consolidated entity tree, export, and TB page

### Phase 4: Dashboard, Period Close, and Polish
**Goal**: Users have financial dashboards for at-a-glance status, period close governance to lock down books, and a polished responsive experience
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, PC-01, PC-02, PC-03, PC-04, UI-02
**Success Criteria** (what must be TRUE):
  1. User sees summary cards (Total Assets, Liabilities, Equity, Net Income YTD) with selectable period (This Month, YTD, Last 12 Months, custom range) -- works in both single-entity and consolidated mode
  2. Dashboard displays mini charts (asset breakdown pie, income vs expense bar/line, equity trend area) and provides quick navigation to COA, GL Ledger, and Trial Balance
  3. User can close an accounting period (month) to prevent posting, and closed periods are visually indicated -- admin can reopen a closed period with audit log entry
  4. User can perform year-end close that auto-generates closing entries zeroing out income/expense accounts into retained earnings
  5. Application layout is responsive and usable on tablet and mobile screens
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete    | 2026-03-27 |
| 2. Accounting Engine | 2/5 | In Progress|  |
| 3. Ledger and Trial Balance | 0/5 | Not started | - |
| 4. Dashboard, Period Close, and Polish | 0/2 | Not started | - |
