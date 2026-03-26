# Frontier GL

## What This Is

Frontier GL is a standalone, multi-entity general ledger application built to replace QuickBooks Online for family office accounting. It provides chart of accounts management, double-entry journal entries, trial balance, period close, and financial dashboards — all multi-entity from day one — so accountants can manage 5-10+ family office entities from a single interface instead of switching between siloed QBO instances.

## Core Value

Accountants can view, manage, and close books across all family office entities in one fast, purpose-built GL — eliminating the per-entity cost and friction of QuickBooks Online.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chart of accounts CRUD with hierarchical parent/sub-account structure and 5-type GL system (Asset, Liability, Equity, Income, Expense)
- [ ] Customizable account numbering scheme with search/filter by name, number, or type
- [ ] Display current balance for each account (sum of all posted transactions)
- [ ] Journal entry creation with date, description, and line items (account + debit/credit + memo)
- [ ] Enforced double-entry: total debits must equal total credits (client-side + server-side validation)
- [ ] Journal entry workflow: Draft → Approved → Posted with audit trail (who created, approved, when posted, all edits logged)
- [ ] Reversing entries: one-click reversal creating offsetting JE
- [ ] Cannot post to closed periods (enforced at DB layer)
- [ ] GL ledger viewer: all posted transactions for any account with debit/credit columns and running balance
- [ ] GL ledger filtering by account, date range, amount range, memo, entry type
- [ ] GL ledger pagination (50 transactions per page) and CSV/PDF export
- [ ] Trial balance: all active accounts with debit/credit balances for a selected period
- [ ] Trial balance verification check (total debits = total credits) with sort and export
- [ ] Balance dashboard: summary cards (Total Assets, Liabilities, Equity, Net Income YTD)
- [ ] Dashboard period selector (This Month, YTD, Last 12 Months, custom range)
- [ ] Dashboard mini charts: asset breakdown, income vs expense, equity trend
- [ ] Multi-entity selector: header dropdown for single entity or "All Entities" consolidated view
- [ ] Entity CRUD: create entities with name, type (LP, LLC, Corporation, Trust), fiscal year end
- [ ] Persist entity selection in localStorage
- [ ] Period close: close month/quarter/year to prevent posting to closed periods
- [ ] Period reopen with audit log entry (admin only)
- [ ] Year-end close: auto-create closing entries (revenue/expense to retained earnings)
- [ ] Authentication via Clerk with user management
- [ ] Mobile-friendly responsive layout

### Out of Scope

- QBO OAuth integration — deferred; building standalone GL first, will add QBO sync in a future milestone
- QBO write-back — Phase 2 feature
- Financial reports (P&L, Balance Sheet, GL Detail) — Phase 2; dashboard provides summary view for now
- Accounts Receivable / Accounts Payable — Phase 2
- QBO data migration tool — Phase 2
- Role-based access control (RBAC) with per-entity roles — Phase 2; single admin/user model sufficient for v1
- Reconciliation workflow — Phase 3
- Bank feeds via Plaid — Phase 3
- Intercompany transactions — Phase 2
- Recurring journal entries — Phase 2
- Multi-currency support — future consideration

## Context

- **Organization:** Calafia Group, a family office accounting practice managing 5-10+ entities (LPs, LLCs, Corporations, Trusts)
- **Primary user:** Kathryn, FOA accountant with 10+ years experience, currently spending 40% of time on manual export/pivot/reconciliation across QBO instances
- **Product owner:** Sahil, family office principal, wants to own accounting data, eliminate QBO per-entity fees ($2,700-7,800/year), and build a defensible FOA service offering
- **Development approach:** AI-assisted "vibecoding" — no engineers on staff, built with Claude Code
- **Target cost:** <$100/month for unlimited users/entities (Vercel + PostgreSQL)
- **Scale target:** Start with 3 internal entities, grow to 20-50 FOA client entities
- **Open source leverage:** ERPNext (GL algorithms), BLNK (balance computation), Django Ledger (AR/AP patterns), shadcn/ui (components)

## Constraints

- **Tech stack**: Next.js 14 + React 18 + TypeScript, Prisma ORM, PostgreSQL (Supabase or Railway), Clerk auth, shadcn/ui + Tailwind CSS, deployed on Vercel
- **Timeline**: Phase 1 target is 4-6 weeks
- **Budget**: Near-zero infrastructure cost; Vercel free/hobby tier + managed PostgreSQL
- **Team**: Solo developer using AI-assisted coding — architecture must be simple and maintainable
- **Data integrity**: Double-entry accounting must be enforced at both application and database layers; financial data accuracy is non-negotiable
- **API-first**: All functionality exposed via REST API so Frontier Labs, Reserve, and external fintech can build on top

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone GL, not a QBO wrapper | Own the data, eliminate vendor lock-in, build on own foundation | — Pending |
| Defer QBO OAuth to later milestone | Build and validate core GL independently first; reduces Phase 1 complexity | — Pending |
| Clerk for auth (not NextAuth) | Managed service, less code to maintain, good DX for solo dev | — Pending |
| PostgreSQL via Supabase/Railway | Managed Postgres with good free tiers, Prisma compatibility | — Pending |
| shadcn/ui + Tailwind for UI | Pre-built accessible components, fast UI development, good for vibecoding | — Pending |
| Multi-entity from day one | Core value prop; retrofitting multi-tenancy later is painful | — Pending |
| Decimal type for money fields | Avoid floating-point errors in financial calculations | — Pending |

---
*Last updated: 2026-03-26 after initialization*
