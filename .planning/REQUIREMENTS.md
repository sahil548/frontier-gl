# Requirements: Frontier GL

**Defined:** 2026-03-26
**Core Value:** Accountants can view, manage, and close books across all family office entities in one fast, purpose-built GL — eliminating the per-entity cost and friction of QuickBooks Online.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up and log in via Clerk-managed authentication
- [x] **AUTH-02**: User session persists across browser refresh and page navigation
- [x] **AUTH-03**: All application routes are protected behind authentication

### Entity Management

- [x] **ENTM-01**: User can create an entity with name, type (LP, LLC, Corporation, Trust), and fiscal year end
- [x] **ENTM-02**: User can edit and deactivate entities
- [x] **ENTM-03**: User can switch between entities via header dropdown without page reload (sub-second)
- [x] **ENTM-04**: User can select "All Entities" for consolidated cross-entity views
- [x] **ENTM-05**: Entity selection persists in localStorage across sessions

### Chart of Accounts

- [x] **COA-01**: User can create accounts with name, number, type (Asset/Liability/Equity/Income/Expense), and optional description
- [x] **COA-02**: User can organize accounts hierarchically with parent/sub-account relationships
- [x] **COA-03**: User can assign customizable account numbers (e.g., 1000-series Assets, 2000-series Liabilities)
- [x] **COA-04**: User can search and filter accounts by name, number, or type
- [x] **COA-05**: User can see current balance inline for each account (sum of posted transactions)
- [x] **COA-06**: User can edit account details and deactivate accounts (no hard delete)
- [x] **COA-07**: Each entity has its own chart of accounts scoped by entity_id

### Journal Entries

- [x] **JE-01**: User can create journal entries with date, description/memo, and 2+ line items (account + debit/credit + optional line memo)
- [x] **JE-02**: System enforces double-entry: total debits must equal total credits (client-side + server-side + DB constraint)
- [x] **JE-03**: Journal entries support Draft -> Approved -> Posted workflow states
- [x] **JE-04**: User can edit and delete draft entries; posted entries are immutable
- [x] **JE-05**: User can create reversing entries (one-click offsetting JE linked to original)
- [x] **JE-06**: System prevents posting to closed periods (enforced at DB layer)
- [x] **JE-07**: Audit trail records who created, who approved, when posted, and all edits immutably
- [x] **JE-08**: User can bulk-post multiple selected draft entries at once

### GL Ledger

- [x] **LED-01**: User can view all posted transactions for any account with date, JE number, description, debit, credit, and running balance
- [x] **LED-02**: User can filter ledger by date range, amount range, and memo text
- [x] **LED-03**: Ledger is paginated at 50 transactions per page
- [x] **LED-04**: User can export ledger data as CSV
- [x] **LED-05**: User can export ledger data as PDF

### Trial Balance

- [x] **TB-01**: User can view all active accounts with debit/credit balances for a selected period (as-of date)
- [x] **TB-02**: Trial balance displays verification check confirming total debits equal total credits
- [x] **TB-03**: User can sort trial balance by account number, name, type, or balance
- [x] **TB-04**: User can export trial balance as CSV
- [x] **TB-05**: User can export trial balance as PDF
- [x] **TB-06**: User can view consolidated trial balance across multiple/all entities

### Period Close

- [ ] **PC-01**: User can close an accounting period (month) to prevent posting to that period
- [ ] **PC-02**: Admin can reopen a closed period with audit log entry
- [ ] **PC-03**: Closed period status is visually indicated in the UI (badge, grayed out)
- [ ] **PC-04**: User can perform year-end close that auto-generates closing entries (zero out income/expense into retained earnings)

### Dashboard

- [ ] **DASH-01**: User sees summary cards showing Total Assets, Total Liabilities, Total Equity, and Net Income YTD
- [ ] **DASH-02**: User can select period for dashboard data (This Month, YTD, Last 12 Months, custom range)
- [ ] **DASH-03**: Dashboard displays mini charts: asset breakdown (pie), income vs expense (bar/line), equity trend (area)
- [ ] **DASH-04**: Dashboard provides quick navigation to COA, GL Ledger, Trial Balance
- [ ] **DASH-05**: Dashboard works in both single-entity and consolidated (All Entities) mode

### Data Integrity

- [x] **DI-01**: All money fields use PostgreSQL NUMERIC(19,4) / Prisma Decimal — no floating-point anywhere
- [x] **DI-02**: All financial tables include entity_id foreign key with row-level entity scoping
- [x] **DI-03**: Account balances are maintained via materialized/cached balance table updated atomically within posting transactions
- [x] **DI-04**: DB trigger prevents UPDATE/DELETE on posted journal entries (immutability enforcement)
- [x] **DI-05**: DB trigger validates SUM(debit) = SUM(credit) on journal entry line items

### UI & Responsiveness

- [x] **UI-01**: Application uses shadcn/ui + Tailwind CSS component library consistently
- [ ] **UI-02**: Layout is responsive and usable on tablet and mobile screens
- [x] **UI-03**: Data tables use TanStack Table with sorting, filtering, and pagination

### API

- [x] **API-01**: All GL operations are exposed via RESTful API endpoints scoped under /api/entities/:entityId/
- [x] **API-02**: API validates all inputs with Zod schemas matching client-side validation
- [x] **API-03**: API returns consistent JSON response format with proper HTTP status codes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Financial Reports
- **RPT-01**: User can generate formatted P&L (Income Statement) for a period
- **RPT-02**: User can generate formatted Balance Sheet as of a date
- **RPT-03**: User can generate GL Detail report with comparative periods

### QBO Integration
- **QBO-01**: User can connect to QuickBooks Online via OAuth
- **QBO-02**: System syncs Chart of Accounts from QBO
- **QBO-03**: System syncs Journal Entries from QBO
- **QBO-04**: User can write journal entries back to QBO

### Advanced Features
- **ADV-01**: User can create recurring journal entry templates that auto-post on schedule
- **ADV-02**: User can manage intercompany transactions with auto-matching entries
- **ADV-03**: User can attach files/documents to journal entries
- **ADV-04**: User can import data from QBO or CSV for migration
- **ADV-05**: Admin can manage granular per-entity RBAC roles and permissions

### Subledgers
- **SUB-01**: User can manage Accounts Receivable with invoicing and aging
- **SUB-02**: User can manage Accounts Payable with bills and payment tracking

### Reconciliation
- **REC-01**: User can import bank statements and reconcile against GL
- **REC-02**: User can connect bank feeds via Plaid for automatic transaction import

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| QBO OAuth sync | Build standalone GL first; adding OAuth/token mgmt/data mapping doubles complexity |
| Financial reports (P&L, Balance Sheet) | Complex formatting; trial balance + dashboard covers 80% of needs for v1 |
| Accounts Receivable / Accounts Payable | Entire subsystems; journal entries handle AR/AP transactions for now |
| Granular RBAC | Admin/user distinction via Clerk sufficient for solo accountant + small team |
| Multi-currency | Most family office entities operate in USD; massive complexity rabbit hole |
| Intercompany transactions | Auto-matching/elimination is very complex; use memo notation for now |
| Recurring journal entries | Requires job scheduler + period awareness; use templates manually |
| Bank reconciliation | Full subsystem with import, matching, status tracking; Excel for now |
| Bank feeds (Plaid) | Third-party API + categorization + matching; Phase 3 at earliest |
| Attachments on JEs | File upload/storage infrastructure; reference docs by memo for now |
| Custom report builder | Building a product within a product; export CSV and use Excel |
| Data import/migration | Mapping + validation + error handling; manual entry for Phase 1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| ENTM-01 | Phase 1 | Complete |
| ENTM-02 | Phase 1 | Complete |
| ENTM-03 | Phase 1 | Complete |
| ENTM-04 | Phase 1 | Complete |
| ENTM-05 | Phase 1 | Complete |
| DI-01 | Phase 1 | Complete |
| DI-02 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| API-01 | Phase 1 | Complete |
| API-02 | Phase 1 | Complete |
| API-03 | Phase 1 | Complete |
| COA-01 | Phase 2 | Complete |
| COA-02 | Phase 2 | Complete |
| COA-03 | Phase 2 | Complete |
| COA-04 | Phase 2 | Complete |
| COA-05 | Phase 2 | Complete |
| COA-06 | Phase 2 | Complete |
| COA-07 | Phase 2 | Complete |
| JE-01 | Phase 2 | Complete |
| JE-02 | Phase 2 | Complete |
| JE-03 | Phase 2 | Complete |
| JE-04 | Phase 2 | Complete |
| JE-05 | Phase 2 | Complete |
| JE-06 | Phase 2 | Complete |
| JE-07 | Phase 2 | Complete |
| JE-08 | Phase 2 | Complete |
| DI-03 | Phase 2 | Complete |
| DI-04 | Phase 2 | Complete |
| DI-05 | Phase 2 | Complete |
| LED-01 | Phase 3 | Complete |
| LED-02 | Phase 3 | Complete |
| LED-03 | Phase 3 | Complete |
| LED-04 | Phase 3 | Complete |
| LED-05 | Phase 3 | Complete |
| TB-01 | Phase 3 | Complete |
| TB-02 | Phase 3 | Complete |
| TB-03 | Phase 3 | Complete |
| TB-04 | Phase 3 | Complete |
| TB-05 | Phase 3 | Complete |
| TB-06 | Phase 3 | Complete |
| UI-03 | Phase 3 | Complete |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| PC-01 | Phase 4 | Pending |
| PC-02 | Phase 4 | Pending |
| PC-03 | Phase 4 | Pending |
| PC-04 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation*
