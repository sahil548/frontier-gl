# Requirements: Frontier GL

**Defined:** 2026-03-26
**Updated:** 2026-04-12 — Phase 10 redefined: Positions Model & Holdings Overhaul (replaces Capital Accounts)
**Core Value:** Accountants can view, manage, and close books across all family office entities in one fast, purpose-built GL — eliminating the per-entity cost and friction of QuickBooks Online.
**Total requirements:** 99 unique REQ-IDs across Phases 1–12, all Complete

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can sign up and log in via Clerk-managed authentication
- [x] **AUTH-02**: User session persists across browser refresh and page navigation
- [x] **AUTH-03**: All application routes are protected behind authentication

### Entity Management

- [x] **ENTM-01**: User can create an entity with name, type (LP, LLC, Corporation, Trust), and fiscal year end
- [x] **ENTM-02**: User can edit and deactivate entities
- [x] **ENTM-03**: User can switch between entities via header dropdown (sub-second)
- [x] **ENTM-04**: User can select "All Entities" for consolidated cross-entity views
- [x] **ENTM-05**: Entity selection persists in localStorage across sessions

### Chart of Accounts

- [x] **COA-01**: User can create accounts with name, number, type, and optional description
- [x] **COA-02**: User can organize accounts hierarchically with parent/sub-account relationships
- [x] **COA-03**: User can assign customizable account numbers (1000-series Assets, 2000-series Liabilities, etc.)
- [x] **COA-04**: User can search and filter accounts by name, number, or type
- [x] **COA-05**: User can see current balance inline for each account (sum of posted transactions)
- [x] **COA-06**: User can edit account details and deactivate accounts (no hard delete)
- [x] **COA-07**: Each entity has its own chart of accounts scoped by entity_id

### Journal Entries

- [x] **JE-01**: User can create journal entries with date, description/memo, and 2+ line items
- [x] **JE-02**: System enforces double-entry: total debits must equal total credits
- [x] **JE-03**: Journal entries support Draft -> Approved -> Posted workflow states
- [x] **JE-04**: User can edit and delete draft entries; posted entries are immutable
- [x] **JE-05**: User can create reversing entries (one-click offsetting JE linked to original)
- [x] **JE-06**: System prevents posting to closed periods
- [x] **JE-07**: Audit trail records who created, approved, and posted
- [x] **JE-08**: User can bulk-post multiple selected draft entries at once

### GL Ledger

- [x] **LED-01**: User can view all posted transactions for any account with running balance
- [x] **LED-02**: User can filter ledger by date range, amount range, and memo text
- [x] **LED-03**: Ledger is paginated at 50 transactions per page
- [x] **LED-04**: User can export ledger data as CSV
- [x] **LED-05**: User can export ledger data as PDF

### Trial Balance

- [x] **TB-01**: User can view all active accounts with debit/credit balances for a selected period
- [x] **TB-02**: Trial balance displays verification check (total debits = total credits)
- [x] **TB-03**: User can sort trial balance by account number, name, type, or balance
- [x] **TB-04**: User can export trial balance as CSV
- [x] **TB-05**: User can export trial balance as PDF
- [x] **TB-06**: User can view consolidated trial balance across multiple/all entities

### Period Close

- [x] **PC-01**: User can close an accounting period (month) to prevent posting
- [x] **PC-02**: Admin can reopen a closed period with audit log entry
- [x] **PC-03**: Closed period status is visually indicated in the UI
- [x] **PC-04**: User can perform year-end close that auto-generates closing entries

### Dashboard

- [x] **DASH-01**: User sees summary cards showing Total Assets, Total Liabilities, Total Equity, Net Income
- [x] **DASH-02**: User can select period for dashboard data (This Month, YTD, Last 12 Months, custom)
- [x] **DASH-03**: Dashboard displays mini charts: asset breakdown pie, income vs expense bar, equity trend area
- [x] **DASH-04**: Dashboard provides quick navigation to COA, GL Ledger, Trial Balance
- [x] **DASH-05**: Dashboard works in both single-entity and consolidated mode

### Financial Statements

- [x] **RPT-01**: User can view P&L (Income Statement) for any date range
- [x] **RPT-02**: User can view Balance Sheet as of any date
- [x] **RPT-03**: User can view Cash Flow Statement (indirect method) for any date range
- [x] **RPT-04**: User can toggle between Accrual and Cash basis on P&L and Balance Sheet
- [x] **RPT-05**: User can export any financial statement as CSV

### Holdings & Reconciliation

- [x] **HOLD-01**: User can create subledger items (bank accounts, investments, real estate, loans, PE, receivables)
- [x] **HOLD-02**: User can track investment positions (securities, real estate, PE) with quantity, cost, market value
- [x] **HOLD-03**: User can reconcile a subledger item against a bank/custodian statement
- [x] **HOLD-04**: User can import bank statement lines from CSV with auto-matching to GL transactions
- [x] **HOLD-05**: Reconciliation history is preserved with statement date, balances, and difference

### Templates & Import

- [x] **TMPL-01**: User can create JE templates with pre-filled accounts, debits, credits, and memos
- [x] **TMPL-02**: User can create a JE from a template (pre-populates line items)
- [x] **TMPL-03**: Templates support recurring schedule (monthly, quarterly, annually) with nextRunDate
- [x] **TMPL-04**: User can bulk-import chart of accounts from CSV
- [x] **TMPL-05**: COA import supports family office and hedge fund template presets

### Access Control

- [x] **ACC-01**: Entity access supports Owner, Editor, and Viewer roles
- [x] **ACC-02**: Entity owner can invite team members via the team management page

### Data Integrity

- [x] **DI-01**: All money fields use PostgreSQL NUMERIC(19,4) / Prisma Decimal
- [x] **DI-02**: All financial tables include entity_id foreign key with row-level scoping
- [x] **DI-03**: Account balances maintained via cached balance table updated atomically on posting
- [x] **DI-04**: DB constraint prevents modification of posted journal entries
- [x] **DI-05**: DB constraint validates SUM(debit) = SUM(credit) on journal entry lines

### UI & Responsiveness

- [x] **UI-01**: Application uses shadcn/ui + Tailwind CSS consistently
- [x] **UI-02**: Layout is fully responsive and usable on tablet and mobile screens
- [x] **UI-03**: Data tables use TanStack Table with sorting, filtering, and pagination

### API

- [x] **API-01**: All GL operations exposed via RESTful API under /api/entities/:entityId/
- [x] **API-02**: API validates all inputs with Zod schemas
- [x] **API-03**: API returns consistent JSON response format with proper HTTP status codes

---

## Phase 5 Requirements — QBO Parity I: Polish & Productivity

### Dashboard Charts

- [x] **DASH-03**: Dashboard displays mini charts: asset breakdown pie, income vs expense bar, equity trend area

### Mobile

- [x] **UI-02**: All pages are responsive and usable on tablet and mobile screens (sidebar collapses, tables horizontally scroll, forms stack vertically)

### Audit Trail UI

- [x] **AUDT-01**: User can view full audit trail on any JE detail page — who created, approved, posted, with timestamps
- [x] **AUDT-02**: Audit trail shows field-level diff for any edits made before posting

### Attachments

- [x] **ATTCH-01**: User can attach one or more files (PDF, image) to a journal entry
- [x] **ATTCH-02**: Attachments are listed and viewable inline on the JE detail page
- [x] **ATTCH-03**: Attachment upload uses Box (already connected via MCP) or Vercel Blob for storage

### Recurring JE UI

- [x] **RECR-01**: User can mark a JE template as recurring with frequency (monthly, quarterly, annually) and start date from the UI
- [x] **RECR-02**: User can view all recurring templates in a dedicated list with next run date and frequency
- [x] **RECR-03**: User can manually trigger "generate due entries" to create draft JEs for all overdue templates
- [x] **RECR-04**: User can edit or stop a recurring template
- [x] **RECR-05**: Generated entries appear in the JE list as drafts, linked back to their template

---

## Phase 6 Requirements — QBO Parity II: Class Tracking

- [x] **CLASS-01**: User can define classes (e.g., Fund, Property, Department) per entity
- [x] **CLASS-02**: User can tag individual JE line items with a class
- [x] **CLASS-03**: Income Statement can be filtered and segmented by class (column per class or filtered view)
- [x] **CLASS-04**: Trial balance can be filtered by class
- [x] **CLASS-05**: Class field is optional — unclassified entries continue to work normally

---

## Phase 7 Requirements — QBO Parity III: Budget vs Actual

- [x] **BUDG-01**: User can enter budget amounts per account per month
- [x] **BUDG-02**: User can import budget data from CSV (account number, period, amount)
- [x] **BUDG-03**: Budget vs Actual report shows actuals, budget, and variance ($ and %) by account for any date range
- [x] **BUDG-04**: Budget data is entity-scoped and period-specific
- [x] **BUDG-05**: Budget vs Actual report is exportable as CSV

---

## Phase 8 Requirements — Family Office I: Multi-Entity Consolidation

- [x] **CONS-01**: User can generate a consolidated P&L across any selected subset of entities
- [x] **CONS-02**: User can generate a consolidated Balance Sheet across any selected subset of entities
- [x] **CONS-03**: User can define intercompany elimination rules (e.g., eliminate loan between Entity A and Entity B)
- [x] **CONS-04**: Consolidated reports clearly distinguish entity-level rows from elimination rows
- [x] **CONS-05**: Consolidation respects the entity's fiscal year end when aggregating periods

---

## Phase 9 Requirements — Bank Transactions: Import & Plaid

- [x] **BANK-01**: User can upload a bank statement CSV; system parses transactions into a review queue
- [x] **BANK-02**: User can connect a bank account via Plaid Link; transactions sync automatically on a schedule
- [x] **BANK-03**: User can categorize transactions (assign GL account) and post them as journal entries (debit expense/asset, credit bank account)
- [x] **BANK-04**: Categorization rules auto-apply to matching transactions based on description patterns
- [x] **BANK-05**: Duplicate detection prevents re-importing the same transaction (by external ID or amount+date+description hash)

---

## Phase 10 Requirements — Positions Model & Holdings Overhaul

- [x] **POS-01**: SubledgerItemType enum expanded from 7 to 13 holding types covering all family office asset classes
- [x] **POS-02**: Position model has accountId FK as the primary GL anchor (positions link to GL accounts, not holdings)
- [x] **POS-03**: Creating a position auto-creates a GL leaf account under the holding's summary account (3-level COA hierarchy)
- [x] **POS-04**: Creating a holding auto-creates a parent summary GL account and a default position with its own GL leaf account
- [x] **POS-05**: Data migration auto-backfills default positions for existing holdings and transfers GL accounts to position level
- [x] **POS-06**: After holding creation, user is immediately prompted to add positions via a multi-row form
- [x] **POS-07**: Holdings page groups holdings by type with collapsible sections, aggregate totals, and position-level GL account display
- [x] **POS-08**: Bank transactions post against position-level GL accounts (not holding summary accounts)

---

## Phase 11 Requirements — Categorization UX & Opening Balances

- [x] **CAT-01**: Position picker replaces raw GL account picker as default categorization target for bank transactions
- [x] **CAT-03**: Categorization rules support optional positionId alongside existing accountId (GL resolved at apply-time)
- [x] **OBE-01**: Opening Balance Equity account (3900) auto-created if it does not exist
- [x] **OBE-02**: Opening balance JE auto-generated and posted immediately when holding created with non-zero balance
- [x] **OBE-03**: Adjusting JE auto-generated for the difference when holding balance is edited
- [x] **REC-01**: Posting a categorized bank transaction auto-marks it as RECONCILED (single and bulk paths)
- [x] **REC-03**: Reconciliation status badges on each transaction row (Reconciled green, Pending yellow, Unmatched red)
- [x] **REC-04**: Running reconciled vs unreconciled totals displayed at top of bank feed

---

## Phase 12 Requirements — Reporting Fixes & Onboarding Wizard

- [x] **SCHEMA-01**: Account schema accepts cashFlowCategory (enum) and isContra (boolean) fields
- [x] **CF-01**: Existing accounts receive correct cashFlowCategory via name-based inference backfill migration
- [x] **CF-02**: Cash flow statement classifies accounts by cashFlowCategory field, not name matching
- [x] **CF-03**: Account form shows cashFlowCategory dropdown only for ASSET/LIABILITY/EQUITY types
- [x] **CONTRA-01**: isContra flag drives contra-netting display on Balance Sheet (parent shows gross, contra shows as deduction, net total rendered)
- [x] **CONTRA-02**: Contra accounts render with "Less:" prefix and net total on Balance Sheet
- [x] **RATE-01**: Rate-based budget computation = holdingValue × rate / 12, using Decimal.js 4-decimal precision
- [x] **RATE-02**: Budget values snapshot at creation and do not auto-recalculate; manual recalculate via re-POST; holdings eligible if holding FMV OR sum of active position marketValues is non-zero
- [x] **WIZ-01**: Onboarding wizard triggers automatically after creating any new entity
- [x] **WIZ-02**: All four wizard steps (COA, Holdings, Opening Balances, First Transactions) are individually skippable with persistent progress
- [x] **WIZ-03**: Opening balance grid enforces debit=credit balance before JE generation; stored JE date matches form date (no UTC shift)
- [x] **CSV-01**: LLM-powered column mapping infers roles for non-standard CSV headers (bank, COA, budget imports)
- [x] **CSV-02**: System falls back to heuristic COLUMN_PATTERNS when LLM unavailable (missing API key, error, timeout)
- [x] **CSV-03**: User sees mapping confirmation UI before any CSV import proceeds; saved mappings auto-apply on header-fingerprint match; multi-account CSVs route per-row via Account column
- [x] **CSV-04**: Confirmed mappings persist per entity/source/importType and reuse-by-fingerprint

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| QBO OAuth / data sync | Building standalone GL — no QBO integration |
| Accounts Receivable / Payable | GL-tier scope; QBO Ledger doesn't have it either |
| Payroll | Out of scope entirely |
| Inventory | Out of scope entirely |
| Multi-currency | All entities operate in USD |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01--03 | Phase 1 | Complete |
| ENTM-01--05 | Phase 1 | Complete |
| DI-01--02 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| API-01--03 | Phase 1 | Complete |
| COA-01--07 | Phase 2 | Complete |
| JE-01--08 | Phase 2 | Complete |
| DI-03--05 | Phase 2 | Complete |
| LED-01--05 | Phase 3 | Complete |
| TB-01--06 | Phase 3 | Complete |
| UI-03 | Phase 3 | Complete |
| DASH-01--02, DASH-04--05 | Phase 4 | Complete |
| PC-01--04 | Phase 4 | Complete |
| RPT-01--05 | Phase 4 | Complete |
| HOLD-01--05 | Phase 4 | Complete |
| TMPL-01--05 | Phase 4 | Complete |
| ACC-01--02 | Phase 4 | Complete |
| DASH-03 | Phase 5 | Complete |
| UI-02 | Phase 5 | Complete |
| AUDT-01--02 | Phase 5 | Complete |
| ATTCH-01--03 | Phase 5 | Complete |
| RECR-01--05 | Phase 5 | Complete |
| CLASS-01--05 | Phase 6 | Complete |
| BUDG-01--05 | Phase 7 | Complete |
| CONS-01--05 | Phase 8 | Complete |
| BANK-01--05 | Phase 9 | Complete |
| POS-01--08 | Phase 10 | Complete |
| CAT-01, CAT-03 | Phase 11 | Complete |
| OBE-01--03 | Phase 11 | Complete |
| REC-01, REC-03, REC-04 | Phase 11 | Complete |
| SCHEMA-01 | Phase 12 | Complete |
| CF-01--03 | Phase 12 | Complete |
| CONTRA-01--02 | Phase 12 | Complete |
| RATE-01--02 | Phase 12 | Complete |
| WIZ-01--03 | Phase 12 | Complete |
| CSV-01--04 | Phase 12 | Complete |

**Coverage:**
- Phases 1–12: Complete — 99/99 REQ-IDs satisfied per v1.0 milestone audit

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-04-16 — v1.0 milestone close-out*
