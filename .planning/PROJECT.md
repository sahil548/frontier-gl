# Frontier GL

## What This Is

Frontier GL is a multi-entity general ledger application purpose-built for family office accounting. It delivers a complete QBO Ledger replacement — chart of accounts, double-entry journal entries, GL ledger, trial balance, financial statements (P&L, Balance Sheet, Cash Flow with cash/accrual toggle), period close, bank reconciliation with CSV import and auto-matching, holdings/subledger tracking, and entity access control — all multi-entity from day one. The roadmap completes QBO Ledger parity (attachments, recurring JEs, class tracking, budget vs actual) and then differentiates with family office features QBO cannot deliver (multi-entity consolidation, capital account statements, investment performance reporting).

## Core Value

Accountants can view, manage, and close books across all family office entities in one fast, purpose-built GL — eliminating the per-entity cost and friction of QuickBooks Online.

## Requirements

### Validated

- ✓ Chart of accounts CRUD with hierarchical structure and 5-type GL system — Phase 2
- ✓ Customizable account numbering with search/filter — Phase 2
- ✓ Account balance computed from posted transactions — Phase 2
- ✓ Double-entry journal entries with Draft → Approved → Posted workflow — Phase 2
- ✓ Balance enforcement (client + server + DB) — Phase 2
- ✓ JE audit trail (who created, approved, posted) — Phase 2
- ✓ Reversing entries — Phase 2
- ✓ Period-close enforcement on posting — Phase 2
- ✓ Bulk post multiple draft JEs — Phase 2
- ✓ GL ledger viewer with filtering, pagination, CSV export — Phase 3
- ✓ Trial balance with verification, sort, export — Phase 3
- ✓ Dashboard with summary cards and period selector — Phase 4
- ✓ Period close (lock month, reopen, year-end close with closing entries) — Phase 4
- ✓ Financial statements: P&L, Balance Sheet, Cash Flow — Phase 4
- ✓ Cash vs Accrual toggle on financial statements — Phase 4
- ✓ Holdings/subledger tracking (bank accounts, investments, real estate, loans, positions) — Phase 4
- ✓ Bank reconciliation with statement entry, history, CSV import + auto-matching — Phase 4
- ✓ JE templates with recurring frequency support (schema + API) — Phase 4
- ✓ COA bulk import with family office and hedge fund templates — Phase 4
- ✓ Entity access control (Owner/Editor/Viewer roles) — Phase 4
- ✓ Multi-entity management with header switcher and "All Entities" view — Phase 1
- ✓ Authentication via Clerk — Phase 1

### Active

- [ ] Dashboard mini charts: asset breakdown pie, income vs expense bar, equity trend area
- [ ] Mobile-responsive layout: all pages usable on tablet and mobile (sidebar collapses, tables scroll, forms stack)
- [ ] Attachments: attach PDF/image receipts to journal entries, viewable inline
- [ ] Audit trail UI: visible panel on JE detail page showing full change history
- [ ] Recurring JE UI: create/manage/stop recurring templates, generate due entries as drafts
- [ ] Class/location tracking: define classes per entity, tag JE lines, segment P&L by class
- [ ] Budget vs Actual: enter budgets per account/period, variance report
- [ ] Multi-entity consolidation: rolled-up P&L and Balance Sheet with intercompany eliminations
- [ ] Capital account statements: partner capital tracking for LP/partnership entities
- [ ] Investment performance: IRR, MOIC, unrealized/realized gains per holding

### Out of Scope

- QBO OAuth / data sync — building standalone GL, no QBO integration
- Accounts Receivable / Accounts Payable — QBO Ledger doesn't have it either; out of scope for GL tier
- Payroll — out of scope entirely
- Inventory — out of scope entirely
- Multi-currency — all entities operate in USD; deferred indefinitely
- Bank feeds via Plaid — CSV import covers the use case without compliance overhead

## Context

- **Organization:** Calafia Group, a family office accounting practice managing 5-10+ entities (LPs, LLCs, Corporations, Trusts)
- **Primary user:** Kathryn, FOA accountant with 10+ years experience
- **Product owner:** Sahil, family office principal — wants to own data, eliminate QBO per-entity fees ($2,700–7,800/year), build a defensible FOA service offering
- **Development approach:** AI-assisted with Claude Code — no engineers on staff
- **Target cost:** <$100/month for unlimited users/entities (Vercel + PostgreSQL)
- **Scale target:** 3 internal entities today, grow to 20–50 FOA client entities
- **Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL (Neon), Clerk, shadcn/ui, Vercel

## Constraints

- **Tech stack**: Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, Clerk, shadcn/ui — locked in
- **Money fields**: NUMERIC(19,4) everywhere — non-negotiable
- **API-first**: All features exposed via `/api/entities/:entityId/` REST endpoints
- **Schema migrations**: Additive only — no destructive migrations, soft-delete pattern throughout
- **Solo dev**: Architecture must stay simple and maintainable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone GL, not a QBO wrapper | Own the data, eliminate vendor lock-in | ✓ Good |
| Clerk for auth | Managed service, less code to maintain | ✓ Good |
| PostgreSQL via Neon | Managed Postgres with branching, great DX | ✓ Good |
| shadcn/ui + Tailwind | Fast UI dev, accessible components | ✓ Good |
| Multi-entity from day one | Core value prop; retrofitting multi-tenancy later is painful | ✓ Good |
| Decimal type for all money fields | Avoid floating-point errors in financial calculations | ✓ Good |
| Cash basis = JEs touching cash account names | Simple heuristic, works for standard COA | ⚠️ Revisit — account flag more robust |
| Soft-delete throughout | Preserve audit trails, never destroy financial data | ✓ Good |

---
*Last updated: 2026-03-29 — Phase 4 complete, planning phases 5–7 (QBO parity) and 8–10 (family office)*
