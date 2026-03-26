# Feature Landscape

**Domain:** Multi-entity general ledger for family office accounting
**Researched:** 2026-03-26
**Confidence:** MEDIUM (based on domain expertise; web verification unavailable)

## Table Stakes

Features users expect. Missing = product feels incomplete. An accountant with 10+ years of QBO experience will immediately notice gaps here.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Chart of Accounts CRUD** | Foundation of all GL work. Accountants spend significant time structuring COA. | Medium | Must support hierarchical parent/sub-account, 5 account types (Asset, Liability, Equity, Income, Expense). Include account number, name, description, active/inactive toggle. |
| **Account numbering scheme** | Every GL system has numbered accounts (1000-series Assets, 2000-series Liabilities, etc.). Accountants navigate by number. | Low | Allow customizable numbering. Default to standard ranges. Support search by number or name. |
| **Account balances on COA list** | Accountants expect to see current balance inline. QBO shows this. Without it, COA feels like a dead list. | Low | Compute from sum of posted JE line items. Cache or compute on read. |
| **Journal entry creation** | Core GL operation. Date, description/memo, line items with account + debit/credit + optional line memo. | Medium | Enforce debit = credit before save. Support 2+ line items (not just 2). |
| **Double-entry enforcement** | Non-negotiable for any GL. Out-of-balance entries = corrupt books. | Low | Client-side validation (UX) + server-side validation (safety) + DB constraint (guarantee). Three layers, non-optional. |
| **Journal entry workflow (Draft/Posted)** | Accountants need to save work-in-progress entries without affecting balances. Posted = final, affects balances. | Medium | Minimum viable: Draft and Posted states. Approved state adds value but is not strictly required for solo-accountant use. |
| **Edit/delete draft entries** | Accountants make mistakes. Must be able to fix before posting. | Low | Only drafts are editable. Posted entries are immutable (use reversals). |
| **Reversing entries** | Standard accounting operation. One-click creation of an offsetting JE that zeroes out the original. | Low | Auto-populate reversed line items. Link reversal to original for audit trail. |
| **GL ledger viewer** | Core report. Shows all transactions for a given account with running balance. Every GL has this. | Medium | Must show date, JE number, description, debit, credit, running balance. Filter by date range. |
| **Trial balance** | The fundamental GL report. Shows all accounts with debit/credit balances for a period. Debits must equal credits. | Medium | Must include verification check (total debits = total credits). Support period selection. |
| **Trial balance export (CSV)** | Accountants export trial balance to Excel constantly. This is how they share with CPAs, auditors, partners. | Low | CSV minimum. PDF is nice-to-have. |
| **Period close** | Prevents posting to closed periods. Essential for maintaining book integrity after month-end/quarter-end/year-end. | Medium | Close by month. Enforce at DB layer (not just UI). Must be airtight. |
| **Period reopen (admin)** | Mistakes happen. Admin must be able to reopen a closed period, make corrections, and re-close. | Low | Requires audit log entry. Admin-only permission. |
| **Year-end close** | Auto-generate closing entries that zero out income/expense accounts into retained earnings. | High | Must correctly identify income and expense accounts, compute net income, create closing JE to retained earnings equity account. Gets complex with multi-entity. |
| **Multi-entity selector** | Core value prop. Switching between entities must be instant (no page reload). | Medium | Header dropdown. Persist selection. Every data query must be entity-scoped. |
| **Entity CRUD** | Must create/edit entities with name, type, fiscal year end. | Low | Entity types: LP, LLC, Corporation, Trust. Fiscal year end drives period close logic. |
| **Authentication** | Obvious. Must know who is logged in. | Low | Clerk handles this. Focus on integration, not building auth. |
| **Audit trail on JE** | Accountants and auditors need to know who created, who approved, when posted. Immutable log. | Medium | Store created_by, created_at, posted_by, posted_at, and all edits. Never delete audit records. |
| **Responsive layout** | Accountants check things on phones/tablets. Doesn't need to be mobile-first, but must not break. | Medium | Data-heavy tables are hard on mobile. Prioritize readability over full functionality on small screens. |

## Differentiators

Features that set Frontier GL apart from QBO and generic GL software. Not expected by default, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"All Entities" consolidated view** | QBO forces one-entity-at-a-time. Seeing consolidated trial balance or dashboard across all entities is the killer feature for family offices. | High | Requires aggregating balances across entities. Must handle different fiscal year ends. Consider whether to show intercompany eliminations (defer to Phase 2). |
| **Approved workflow state** | Three-state workflow (Draft -> Approved -> Posted) enables maker-checker control. Most small GL tools skip this. | Low | Low code complexity but high accounting value. One person creates, another approves, then post. Valuable when scaling to multiple accountants. |
| **Balance dashboard with summary cards** | QBO has dashboards but they're cluttered and slow. A clean, fast dashboard showing Total Assets, Liabilities, Equity, Net Income YTD is immediately useful. | Medium | Summary cards + mini charts. Period selector (MTD, YTD, Last 12 Months, custom). |
| **Dashboard mini charts** | Visual trends (asset breakdown pie, income vs expense bar, equity trend line) make the dashboard more than a number dump. | Medium | Use a lightweight chart library (Recharts with shadcn). Keep it simple -- 3 charts max. |
| **GL ledger filtering (advanced)** | Filter by account, date range, amount range, memo text, entry type. QBO's transaction search is frustrating. Making this fast and intuitive is a win. | Medium | Combination filters. Debounced search. Save filter presets is a Phase 2 nice-to-have. |
| **Sub-second entity switching** | QBO requires a full logout/login to switch entities. Instant switching via dropdown is transformative for multi-entity workflows. | Low | Already planned. This is an architectural decision (entity_id scoping) not a feature build. |
| **Bulk journal entry operations** | Select multiple draft JEs and post them all at once. Saves time during month-end close. | Low | Checkbox selection + "Post Selected" button. Validate each JE server-side. |
| **Journal entry templates** | Save common entry patterns (e.g., monthly rent accrual) as templates for quick re-use. Not recurring (auto-post), just templates. | Low | Defer to Phase 2 -- recurring entries. But templates are simpler and useful. Consider for late Phase 1. |
| **Entity-scoped COA with defaults** | Create a default COA template and apply it when creating new entities. Family offices often have similar account structures across entities. | Medium | Huge time saver when onboarding new entities. Default COA template + per-entity customization. |

## Anti-Features

Features to explicitly NOT build in Phase 1. Building these would increase scope, delay delivery, and add complexity that is not justified yet.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **QBO OAuth sync** | Explicitly deferred. Core GL must stand alone first. Adding OAuth, token management, and data mapping doubles complexity. | Build standalone GL. Validate with manual data entry. Add QBO sync in Phase 2. |
| **Financial reports (P&L, Balance Sheet)** | Full GAAP-formatted reports are complex (formatting, subtotals, comparative periods, custom layouts). Trial balance + dashboard covers 80% of needs. | Provide trial balance + CSV export. Accountants can build reports in Excel from trial balance data. Phase 2 adds formatted reports. |
| **Accounts Receivable / Accounts Payable** | AR/AP are entire subsystems (invoicing, aging, payment application, customer/vendor management). Way too much for Phase 1. | Use journal entries for AR/AP transactions. No subledger. Phase 2. |
| **Role-based access control (RBAC)** | Per-entity role permissions add significant complexity. For a solo accountant or small team, admin/user is sufficient. | Use Clerk's built-in role model. Admin can do everything, user can create but not post/close. Phase 2 adds granular RBAC. |
| **Multi-currency** | Currency conversion, exchange rate management, unrealized gain/loss calculations -- each is a rabbit hole. Most family office entities operate in USD. | Store all amounts in USD. Add multi-currency when there's a real user need. |
| **Intercompany transactions** | Auto-creating matching entries across entities, intercompany elimination on consolidation -- very complex. | Record intercompany as regular JEs with memo notation. Phase 2 adds proper intercompany workflow. |
| **Recurring journal entries** | Auto-posting on a schedule requires a job scheduler, failure handling, and careful period-awareness. | Use journal entry templates (manual re-use). Add recurring entries in Phase 2. |
| **Bank reconciliation** | Reconciliation requires bank statement import, matching algorithms, reconciliation status tracking. Full subsystem. | Accountants reconcile in Excel for now. Phase 3. |
| **Bank feeds (Plaid)** | Third-party API integration, transaction categorization, matching -- major feature set. | Phase 3 at earliest. |
| **Attachments on journal entries** | File upload, storage (S3/Supabase storage), preview -- adds infrastructure complexity. | Accountants can reference external documents by description/memo. Phase 2. |
| **Custom report builder** | Building a report designer is building a product within a product. | Export CSV. Let accountants use Excel/Sheets for custom analysis. |
| **Data import/migration tool** | Importing from QBO or CSV requires mapping, validation, error handling, rollback. | Manual entry for Phase 1 (small number of entities). QBO migration tool in Phase 2. |

## Feature Dependencies

```
Authentication (Clerk)
  |
  v
Entity CRUD --> Multi-entity selector (depends on entities existing)
  |
  v
Chart of Accounts CRUD (scoped to entity)
  |
  v
Journal Entry creation (requires accounts to exist)
  |                |
  v                v
JE Workflow     Double-entry enforcement (validation layer)
(Draft/Approved/Posted)
  |
  v
Period Close (requires posted JEs, prevents future posting to closed periods)
  |                    |
  v                    v
Year-end Close      Period Reopen (admin)
  |
  v
GL Ledger Viewer (requires posted JEs to display)
  |
  v
Trial Balance (aggregates posted JE data across accounts)
  |
  v
Balance Dashboard (derives from same data as trial balance)
  |
  v
Dashboard Charts (requires dashboard data)

Reversing Entries --> requires existing posted JE
Bulk JE Operations --> requires JE workflow
CSV/PDF Export --> requires GL ledger or trial balance data
"All Entities" view --> requires multi-entity selector + trial balance
```

**Critical path:** Auth -> Entities -> COA -> Journal Entries -> GL Ledger -> Trial Balance -> Dashboard

**Parallel work possible:**
- Period close can be built alongside GL ledger (both depend on posted JEs)
- Dashboard charts can be built after dashboard summary cards
- Reversing entries can be built after basic JE posting

## MVP Recommendation

### Must ship (blocks core accountant workflow):

1. **Authentication via Clerk** -- gate everything behind login
2. **Entity CRUD + multi-entity selector** -- core value prop, build first
3. **Chart of accounts CRUD** with hierarchical accounts, numbering, balances
4. **Journal entry creation + double-entry enforcement** -- the core GL operation
5. **JE workflow (Draft -> Posted)** -- minimum two states; add Approved if time permits
6. **GL ledger viewer** with date filtering and running balance
7. **Trial balance** with verification check and CSV export
8. **Period close** (month-level) with DB-layer enforcement
9. **Audit trail** on all JE state changes

### Ship if time permits (high value, lower risk):

10. **Balance dashboard** with summary cards and period selector
11. **Year-end close** with auto-closing entries
12. **Reversing entries** (low complexity, high accounting value)
13. **Dashboard mini charts** (3 charts using Recharts)
14. **"All Entities" consolidated view** on trial balance
15. **Approved workflow state** (upgrade Draft/Posted to Draft/Approved/Posted)

### Defer to Phase 2 (resist scope creep):

- Financial reports (P&L, Balance Sheet)
- QBO sync
- AR/AP
- RBAC
- Recurring entries
- Intercompany transactions
- Data import/migration
- Attachments

## Phase 1 Build Order Rationale

The critical path (Auth -> Entities -> COA -> JE -> Ledger -> Trial Balance -> Dashboard) should be built in order because each layer depends on the previous. However, within each layer there are opportunities for parallel work:

1. **Foundation sprint:** Auth + Entity CRUD + Multi-entity selector + DB schema
2. **Core GL sprint:** COA CRUD + Journal entry CRUD + Double-entry validation
3. **Workflow sprint:** JE workflow states + Period close + Audit trail
4. **Reporting sprint:** GL ledger viewer + Trial balance + CSV export
5. **Dashboard sprint:** Balance dashboard + Summary cards + Charts
6. **Polish sprint:** Reversing entries, year-end close, consolidated view, responsive layout

This order ensures the accountant can start entering real data as soon as Sprint 2 completes, and each subsequent sprint adds visibility into that data.

## Sources

- Domain expertise from analysis of QBO, Xero, Sage Intacct, NetSuite, FreshBooks, Wave, ERPNext GL modules
- Project context from PROJECT.md (validated requirements, out-of-scope items, constraints)
- GAAP/double-entry accounting principles
- Confidence: MEDIUM -- based on training data domain knowledge; web search was unavailable for verification of current market trends
