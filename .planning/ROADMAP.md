# Roadmap: Frontier GL

## Overview

Frontier GL delivers a multi-entity general ledger that replaces QuickBooks Online for family office accounting. Phases 1–4 are complete and cover the full foundational GL. Phases 5–7 complete QBO Ledger parity. Phases 8–10 differentiate with family office features QBO cannot deliver.

## Phases

- [x] **Phase 1: Foundation** — Auth, entity management, data model, API patterns (complete 2026-03-27)
- [x] **Phase 2: Accounting Engine** — Chart of accounts, journal entries, double-entry enforcement (complete 2026-03-27)
- [x] **Phase 3: Ledger & Trial Balance** — GL ledger, trial balance, filtering, export (complete 2026-03-27)
- [x] **Phase 4: Platform** — Dashboard, financial statements, period close, holdings, reconciliation, templates, access control (complete 2026-03-29)
- [ ] **Phase 5: QBO Parity I** — Dashboard charts, mobile layout, audit trail UI, attachments, recurring JE UI
- [ ] **Phase 6: QBO Parity II** — Class/location tracking with segmented P&L
- [ ] **Phase 7: QBO Parity III** — Budget vs Actual
- [ ] **Phase 8: Family Office I** — Multi-entity consolidation with eliminations
- [ ] **Phase 9: Family Office II** — Capital account statements for LP/partnership entities
- [ ] **Phase 10: Family Office III** — Investment performance (IRR, MOIC, realized/unrealized gains)

---

## Phase Details

### Phase 1: Foundation ✓
**Goal:** Users can authenticate, create and switch between entities, and the data model is ready for accounting operations
**Status:** Complete (2026-03-27)
**Requirements:** AUTH-01–03, ENTM-01–05, DI-01–02, UI-01, API-01–03

---

### Phase 2: Accounting Engine ✓
**Goal:** Users can manage a chart of accounts and create, approve, and post journal entries with full double-entry integrity
**Status:** Complete (2026-03-27)
**Requirements:** COA-01–07, JE-01–08, DI-03–05

---

### Phase 3: Ledger & Trial Balance ✓
**Goal:** Users can view, filter, and export posted transaction data at account-level (GL ledger) and summary-level (trial balance)
**Status:** Complete (2026-03-27)
**Requirements:** LED-01–05, TB-01–06, UI-03

---

### Phase 4: Platform ✓
**Goal:** Users have financial dashboards, financial statements (P&L/BS/CF with cash/accrual toggle), period close governance, holdings/subledger tracking with bank reconciliation and CSV import, JE templates with recurring support, COA bulk import, and entity access control — everything needed to run books end-to-end
**Status:** Complete (2026-03-29)
**Requirements:** DASH-01–02, DASH-04–05, PC-01–04, RPT-01–05, HOLD-01–05, TMPL-01–05, ACC-01–02

**What was built:**
- Dashboard with summary cards (Total Assets, Liabilities, Equity, Net Income) and period selector
- Financial statements: P&L, Balance Sheet, Cash Flow (indirect method)
- Cash vs Accrual toggle on P&L and Balance Sheet
- Period close: lock months, reopen with audit log, year-end close with closing entries
- Holdings/subledger: bank accounts, investments, real estate, loans, PE, receivables with positions
- Bank reconciliation: manual statement entry, history, CSV import with auto-matching to GL transactions
- JE templates: create/use templates, recurring schedule (schema + API)
- COA bulk import with family office and hedge fund presets
- Entity access control: Owner / Editor / Viewer roles with team management page

**Deferred to Phase 5:**
- DASH-03: Dashboard mini charts
- UI-02: Mobile-responsive layout

---

### Phase 5: QBO Parity I
**Goal:** The app is complete on every screen a daily-use accountant touches — dashboard has charts, every page works on mobile, JE detail shows full audit history, receipts can be attached to entries, and recurring journal entries can be set up and managed from the UI
**Depends on:** Phase 4
**Requirements:** DASH-03, UI-02, AUDT-01–02, ATTCH-01–03, RECR-01–05
**Success Criteria:**
1. Dashboard displays asset breakdown pie, income vs expense bar, and equity trend area charts that update with the period selector
2. Every page is usable on a 375px mobile screen — no horizontal overflow, no clipped content, sidebar collapses to a hamburger menu
3. JE detail page shows a collapsible audit trail panel listing every status change (created, approved, posted) with user and timestamp
4. User can attach a PDF or image to a journal entry and view the attachment on the detail page
5. User can create a recurring template (set frequency + start date), view all recurring templates in a list, trigger "generate due entries", and stop recurrence — generated entries appear as drafts in the JE list

**Plans:** 4 plans

Plans:
- [ ] 05-01-PLAN.md — Dashboard charts with Recharts (asset pie, income/expense bar, equity trend area)
- [ ] 05-02-PLAN.md — File attachments on journal entries with Vercel Blob storage
- [ ] 05-03-PLAN.md — Audit trail field-level diffs and recurring JE management page
- [ ] 05-04-PLAN.md — Mobile responsiveness pass across all pages (375px minimum)

---

### Phase 6: QBO Parity II — Class Tracking
**Goal:** Accountants can tag journal entry lines with a class (fund, property, department) and slice the P&L by class — the last major structural feature separating Frontier GL from QBO Ledger
**Depends on:** Phase 5
**Requirements:** CLASS-01–05
**Success Criteria:**
1. User can define classes for an entity (e.g., "Fund I", "123 Main St", "Operations") from a settings or admin page
2. Each JE line item has an optional class dropdown; existing entries without a class continue to work
3. Income Statement has a "By Class" view showing one column per class
4. Trial balance can be filtered to show only transactions tagged with a specific class
5. Schema migration is additive — class field nullable, no data loss on existing entries

**Plans:** 3 plans

Plans:
- [ ] 06-01-PLAN.md — Schema, dimension/tag CRUD API, and /dimensions management page with accordion layout
- [ ] 06-02-PLAN.md — JE form integration with dimension tag combobox columns and split assistant
- [ ] 06-03-PLAN.md — Income Statement column-per-tag view and Trial Balance dimension filtering

---

### Phase 7: QBO Parity III — Budget vs Actual
**Goal:** Accountants can set annual budgets per account and compare actuals vs budget with variance — completing the QBO Ledger feature set
**Depends on:** Phase 6
**Requirements:** BUDG-01–05
**Success Criteria:**
1. User can enter or import (CSV) budget amounts per account per month for any fiscal year
2. Budget vs Actual report shows: Account | Actual | Budget | Variance $ | Variance % for any selected date range
3. Report appears on the Reports page alongside P&L, Balance Sheet, and Cash Flow
4. Budget data is entity-scoped; switching entities shows that entity's budgets
5. Report is exportable as CSV

**Plans:** 4 plans

Plans:
- [ ] 07-00-PLAN.md — Wave 0 test stubs for all BUDG requirements (Nyquist compliance)
- [ ] 07-01-PLAN.md — Budget model, fiscal year utility, validators, CRUD + CSV import API
- [ ] 07-02-PLAN.md — Budget grid page UI with spreadsheet entry, copy-from-prior-year, sidebar nav
- [ ] 07-03-PLAN.md — Budget vs Actual report tab on Reports page with variance display and CSV export

---

### Phase 8: Family Office I — Multi-Entity Consolidation
**Goal:** Accountants can generate consolidated P&L, Balance Sheet, and Cash Flow across multiple entities with intercompany eliminations -- the core family office reporting capability QBO cannot deliver
**Depends on:** Phase 7
**Requirements:** CONS-01–05
**Success Criteria:**
1. Reports page has a "Consolidated" mode that aggregates P&L and Balance Sheet across all selected entities
2. User can define intercompany elimination rules (select two accounts across two entities to net to zero)
3. Consolidated report shows subtotals by entity and a combined total, with elimination rows clearly labeled
4. Consolidated reports are exportable as CSV
5. Consolidation respects each entity's fiscal year end when filtering periods

**Plans:** 4 plans

Plans:
- [ ] 08-01-PLAN.md — EliminationRule schema, consolidated TypeScript types, Wave 0 test stubs
- [ ] 08-02-PLAN.md — Consolidated report query functions (P&L, BS, CF) with elimination logic and API routes
- [ ] 08-03-PLAN.md — Elimination rules CRUD API and Settings > Intercompany Eliminations page
- [ ] 08-04-PLAN.md — Reports page consolidated mode: entity chips, expandable rows, elimination section, CSV export

---

### Phase 9: Family Office II — Capital Accounts
**Goal:** LP and partnership entities can track each partner's capital account balance with contributions, distributions, and allocated income — a core deliverable for fund accounting that QBO has no equivalent for
**Depends on:** Phase 8
**Requirements:** CAP-01–05
**Success Criteria:**
1. User can define partners with name and ownership % for any LP/Partnership entity
2. Capital account statement shows: Opening Balance | Contributions | Distributions | Allocated Income | Closing Balance per partner for any period
3. Income allocation defaults to pro-rata by ownership %; user can override with a custom waterfall
4. Capital account balances tie back to equity accounts in the GL — no reconciliation gap
5. Statements are exportable as CSV and PDF

**Plans:** TBD

---

### Phase 10: Family Office III — Investment Performance
**Goal:** Investment holdings show IRR, MOIC, and realized/unrealized gains — giving the family office a single view of financial performance that previously required a separate portfolio management system
**Depends on:** Phase 9
**Requirements:** PERF-01–05
**Success Criteria:**
1. Each investment holding shows calculated IRR and MOIC based on recorded cash flows
2. Each position shows cost basis, current market value, unrealized gain/loss, and % return
3. User can record cash flow events (capital calls, distributions) against a holding for IRR calculation
4. Portfolio summary page shows total cost basis, total market value, total unrealized gain/loss across all holdings
5. Performance data is exportable as CSV

**Plans:** TBD

---

## Progress

| Phase | Requirements | Status | Completed |
|-------|-------------|--------|-----------|
| 1. Foundation | AUTH, ENTM, DI-01–02, UI-01, API | ✓ Complete | 2026-03-27 |
| 2. Accounting Engine | COA, JE, DI-03–05 | ✓ Complete | 2026-03-27 |
| 3. Ledger & Trial Balance | LED, TB, UI-03 | ✓ Complete | 2026-03-27 |
| 4. Platform | DASH (partial), PC, RPT, HOLD, TMPL, ACC | ✓ Complete | 2026-03-29 |
| 5. QBO Parity I | DASH-03, UI-02, AUDT, ATTCH, RECR | ○ Not started | — |
| 6. QBO Parity II | CLASS | ○ Not started | — |
| 7. QBO Parity III | BUDG | ○ Not started | — |
| 8. Family Office I | CONS | ○ Not started | — |
| 9. Family Office II | CAP | ○ Not started | — |
| 10. Family Office III | PERF | ○ Not started | — |
