# Roadmap: Frontier GL

## Overview

Frontier GL delivers a multi-entity general ledger that replaces QuickBooks Online for family office accounting. Phases 1–4 are complete and cover the full foundational GL. Phases 5–7 complete QBO Ledger parity. Phases 8–10 differentiate with family office features QBO cannot deliver.

## Phases

- [x] **Phase 1: Foundation** — Auth, entity management, data model, API patterns (complete 2010-03-27)
- [x] **Phase 2: Accounting Engine** — Chart of accounts, journal entries, double-entry enforcement (complete 2010-03-27)
- [x] **Phase 3: Ledger & Trial Balance** — GL ledger, trial balance, filtering, export (complete 2010-03-27)
- [x] **Phase 4: Platform** — Dashboard, financial statements, period close, holdings, reconciliation, templates, access control (complete 2010-03-29)
- [x] **Phase 5: QBO Parity I** — Dashboard charts, mobile layout, audit trail UI, attachments, recurring JE UI (completed 2010-03-29)
- [x] **Phase 6: QBO Parity II** — Class/location tracking with segmented P&L (completed 2010-03-29)
- [x] **Phase 7: QBO Parity III** — Budget vs Actual (completed 2010-04-10)
- [x] **Phase 8: Family Office I** — Multi-entity consolidation with eliminations (completed 2010-04-10)
- [x] **Phase 9: Bank Transactions** — CSV import and Plaid integration for automatic bank feeds (completed 2010-04-11)
- [x] **Phase 10: Positions Model & Holdings Overhaul** — Position model, 13 holding types, GL account hierarchy, holdings page restructure (completed 2026-04-12)

---

## Phase Details

### Phase 1: Foundation ✓
**Goal:** Users can authenticate, create and switch between entities, and the data model is ready for accounting operations
**Status:** Complete (2010-03-27)
**Requirements:** AUTH-01–03, ENTM-01–05, DI-01–02, UI-01, API-01–03

---

### Phase 2: Accounting Engine ✓
**Goal:** Users can manage a chart of accounts and create, approve, and post journal entries with full double-entry integrity
**Status:** Complete (2010-03-27)
**Requirements:** COA-01–07, JE-01–08, DI-03–05

---

### Phase 3: Ledger & Trial Balance ✓
**Goal:** Users can view, filter, and export posted transaction data at account-level (GL ledger) and summary-level (trial balance)
**Status:** Complete (2010-03-27)
**Requirements:** LED-01–05, TB-01–06, UI-03

---

### Phase 4: Platform ✓
**Goal:** Users have financial dashboards, financial statements (P&L/BS/CF with cash/accrual toggle), period close governance, holdings/subledger tracking with bank reconciliation and CSV import, JE templates with recurring support, COA bulk import, and entity access control — everything needed to run books end-to-end
**Status:** Complete (2010-03-29)
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

**Plans:** 5/5 plans complete

Plans:
- [ ] 05-00-PLAN.md — Wave 0 test stubs for all phase requirements (Nyquist compliance)
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

**Plans:** 3/3 plans complete

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

**Plans:** 4/4 plans complete

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

**Plans:** 4/4 plans complete

Plans:
- [x] 08-01-PLAN.md — EliminationRule schema, consolidated TypeScript types, Wave 0 test stubs
- [x] 08-02-PLAN.md — Consolidated report query functions (P&L, BS, CF) with elimination logic and API routes
- [x] 08-03-PLAN.md — Elimination rules CRUD API and Settings > Intercompany Eliminations page
- [x] 08-04-PLAN.md — Reports page consolidated mode: entity chips, expandable rows, elimination section, CSV export

---

### Phase 9: Bank Transactions — Import & Plaid Integration
**Goal:** CFO can import bank transactions (CSV or automatic Plaid bank feed), review and categorize them, and post them as journal entries — eliminating manual data entry for the most common accounting workflow
**Depends on:** Phase 8
**Requirements:** BANK-01–05
**Success Criteria:**
1. User can upload a bank statement CSV and see parsed transactions in a review queue
2. User can connect a bank account via Plaid Link and transactions sync automatically
3. Each transaction can be categorized (assigned an account) and posted as a journal entry
4. Categorization rules auto-apply to matching transactions (e.g., "AMAZON" → Office Supplies)
5. Duplicate detection prevents the same transaction from being imported twice

**Plans:** 4/4 plans complete

Plans:
- [ ] 09-01-PLAN.md — Schema (BankTransaction, PlaidConnection, CategorizationRule), Zod validators, core lib modules + test stubs
- [ ] 09-02-PLAN.md — CSV import API, transaction queue page, categorize/post/split/bulk workflows
- [ ] 09-03-PLAN.md — Plaid integration: client, Link widget, token exchange, cursor-based sync, cron job
- [ ] 09-04-PLAN.md — Categorization rules CRUD API, rules management page, auto-categorize prompt

### Phase 10: Positions Model & Holdings Overhaul ✓

**Goal:** Holdings contain positions (cash, securities, LP interests, etc.), and positions — not holdings — link to GL accounts. Holding types expanded for family office use cases (lending, operating businesses, insurance). GL accounts auto-created at position level.
**Status:** Complete (2026-04-12)
**Requirements:** POS-01, POS-02, POS-03, POS-04, POS-05, POS-06, POS-07, POS-08
**Depends on:** Phase 9
**Plans:** 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md — Schema expansion (13 holding types, Position.accountId), shared constants, GL account creation helpers, updated subledger + position API routes
- [x] 10-02-PLAN.md — Data migration script for existing holdings, bank transaction posting updated to position-level GL accounts
- [x] 10-03-PLAN.md — Holdings page restructured with 13-type grouping, aggregate totals, position GL display, AddPositionsPrompt

### Phase 11: Categorization UX & Opening Balances

**Goal:** Bank feed categorization uses holdings/positions as offset targets instead of raw GL accounts. Opening balance JEs auto-generated when holdings are created with balances. Reconciliation workflow fully integrated with bank feed as single source of truth.
**Requirements:** CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04
**Depends on:** Phase 10
**Plans:** 3/4 plans executed

Plans:
- [ ] 11-01-PLAN.md — Schema migration (positionId, reconciliationStatus), validators, positions API, Wave 0 test stubs
- [ ] 11-02-PLAN.md — PositionPicker component, CategorizePrompt position-first UX, rules API positionId support
- [ ] 11-03-PLAN.md — Opening balance JE auto-generation on holding creation, adjusting JE on balance edit
- [ ] 11-04-PLAN.md — Auto-reconcile on post, reconciliation status badges, running totals, holdings navigation

### Phase 12: Reporting Fixes & Onboarding Wizard

**Goal:** Cash flow classification uses cashFlowCategory enum field instead of name pattern matching. Contra account types via isContra boolean flag. Rate-based budget targets for investment returns. Onboarding wizard guides new entity setup (COA template, Holdings, Opening balances, First transactions). AI-powered CSV import with LLM column detection and saved mappings.
**Requirements:** SCHEMA-01, CF-01, CF-02, CF-03, CONTRA-01, CONTRA-02, RATE-01, RATE-02, WIZ-01, WIZ-02, WIZ-03, CSV-01, CSV-02, CSV-03, CSV-04
**Depends on:** Phase 11
**Plans:** 6 plans

Plans:
- [ ] 12-00-PLAN.md — Wave 0 test stubs for all phase requirements (Nyquist compliance)
- [ ] 12-01-PLAN.md — Schema migration (CashFlowCategory enum, isContra, ColumnMapping, wizardProgress), validators, backfill utility, COA templates, API routes
- [ ] 12-02-PLAN.md — Cash flow report refactor (field-based classification), account form extensions (cashFlowCategory dropdown, isContra toggle), balance sheet contra netting
- [ ] 12-03-PLAN.md — Rate-based budget computation utility, rate-target API endpoint, budget page UI integration
- [ ] 12-04-PLAN.md — LLM column mapper with Anthropic SDK, mapping persistence store, confirmation UI, integration into all 3 CSV import flows
- [ ] 12-05-PLAN.md — Onboarding wizard (4-step: COA template, holdings, opening balances, first transactions), wizard progress API, entity form redirect

---
