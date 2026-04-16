# Frontier GL

## What This Is

Frontier GL is a multi-entity general ledger application purpose-built for family office accounting. v1.0 delivers a complete QBO Ledger replacement — chart of accounts with hierarchical structure, double-entry journal entries with Draft → Approved → Posted workflow, GL ledger with filtering/export, trial balance with verification, financial statements (P&L, Balance Sheet, Cash Flow with cash/accrual toggle), period close governance, bank reconciliation with manual statements and CSV import plus auto-matching, holdings/subledger tracking, JE templates with recurring support, COA bulk import with family-office and hedge-fund presets, and entity access control — all multi-entity from day one. On top of QBO parity, v1.0 differentiates with family-office capabilities QBO cannot deliver: multi-entity consolidation with intercompany eliminations, a 13-type holdings model with position-level GL anchoring, position-first bank-feed categorization, auto-generated opening-balance JEs, AI-powered CSV column mapping (Anthropic SDK + heuristic fallback) with saved-mapping reuse, multi-account CSV import, a 4-step onboarding wizard (COA template → Holdings → Opening Balances → First Transactions), and rate-based budget targets for investment returns.

## Core Value

Accountants can view, manage, and close books across all family-office entities in one fast, purpose-built GL — eliminating the per-entity cost and friction of QuickBooks Online.

## Current State

**Version:** v1.0 shipped 2026-04-16 (tag `v1.0`)
**Codebase:** ~55k LOC TS/TSX/Prisma in production + tests (excludes generated)
**Stack:** Next.js 15 App Router (Turbopack), TypeScript, Prisma 7 (PrismaPg adapter), PostgreSQL on Neon, Clerk auth, shadcn/ui + Tailwind v4, Vercel hosting, Anthropic SDK (AI CSV mapping), Plaid Link (bank feeds), Vercel Blob (attachments), Recharts (dashboard), Papa Parse (CSV), Decimal.js
**Tests:** 536 passing / 7 failing (pre-existing `localStorage.clear` jsdom issue in `use-entity.test.ts` — catalogued in Phase 14 deferred-items) / 75 todo across 83 test files
**Requirements:** 99/99 v1.0 REQ-IDs satisfied (see `.planning/milestones/v1.0-REQUIREMENTS.md`)
**Archives:** `.planning/milestones/v1.0-ROADMAP.md`, `v1.0-REQUIREMENTS.md`, `v1.0-MILESTONE-AUDIT.md`

## Requirements

### Validated (shipped in v1.0)

- ✓ Authentication via Clerk (AUTH-01/02/03) — v1.0
- ✓ Multi-entity management with header switcher and "All Entities" view (ENTM-01–05) — v1.0
- ✓ Chart of accounts CRUD with hierarchical structure, 5-type GL system, entity-scoped (COA-01–07) — v1.0
- ✓ Customizable account numbering with search/filter and balance inline (COA-04/05) — v1.0
- ✓ Double-entry journal entries with Draft → Approved → Posted workflow, reversing entries, bulk-post (JE-01–08) — v1.0
- ✓ Balance enforcement (client + server + DB) and audit trail (DI-03/04/05, AUDT-01/02) — v1.0
- ✓ Period-close enforcement on posting, year-end auto-generated closing entries (PC-01–04) — v1.0
- ✓ GL ledger viewer with filtering, pagination, CSV + PDF export (LED-01–05) — v1.0
- ✓ Trial balance with verification, sort, CSV + PDF export, consolidated across entities (TB-01–06) — v1.0
- ✓ Dashboard with summary cards, period selector, asset pie / income-vs-expense bar / equity trend area charts (DASH-01–05) — v1.0
- ✓ Financial statements: P&L, Balance Sheet, Cash Flow with cash/accrual toggle (RPT-01–05) — v1.0
- ✓ Holdings/subledger tracking — 13 types (bank/brokerage/real estate/loans/PE/operating business/trust/etc.), position-level GL, aggregate totals (HOLD-01–05, POS-01–08) — v1.0
- ✓ Bank reconciliation — manual statements, history, CSV import + auto-matching (HOLD-03/04/05) — v1.0
- ✓ Bank feed — CSV import + Plaid Link, position-first categorization, auto-apply rules, reconciliation status badges (BANK-01–05, CAT-01/03, REC-01/03/04) — v1.0
- ✓ Auto-generated opening-balance JEs on holding creation (OBE-01–03) — v1.0
- ✓ JE templates with recurring schedule support (TMPL-01–05, RECR-01–05) — v1.0
- ✓ Attachments (PDF/image) on journal entries via Vercel Blob (ATTCH-01–03) — v1.0
- ✓ Class/dimension tracking with column-per-class P&L and dimension-filtered trial balance (CLASS-01–05) — v1.0
- ✓ Budget vs Actual with variance, CSV import/export, rate-based targets for investments (BUDG-01–05, RATE-01/02) — v1.0
- ✓ Multi-entity consolidation with intercompany elimination rules, fiscal-year-aware (CONS-01–05) — v1.0
- ✓ Mobile-responsive layout (375px minimum, hamburger sidebar, horizontal scroll tables) (UI-02) — v1.0
- ✓ Audit trail UI with field-level diffs (AUDT-01/02) — v1.0
- ✓ Field-based cash flow classification via `cashFlowCategory` enum (CF-01/02/03, SCHEMA-01) — v1.0 (replaces the name-matching heuristic flagged as revisit)
- ✓ Contra account support with netting display (CONTRA-01/02) — v1.0
- ✓ Onboarding wizard — 4-step guided setup with skip/return (WIZ-01/02/03) — v1.0
- ✓ AI-powered CSV column mapping with LLM detection, heuristic fallback, saved-mapping reuse, multi-account import (CSV-01–04) — v1.0
- ✓ Entity access control — Owner/Editor/Viewer roles (ACC-01/02) — v1.0
- ✓ Data integrity — `NUMERIC(19,4)` money fields, entity-scoped rows, cached balances, soft-delete (DI-01–05) — v1.0
- ✓ API conventions — RESTful `/api/entities/:entityId/`, Zod validation, consistent JSON response (API-01–03) — v1.0
- ✓ UI conventions — shadcn/ui + Tailwind v4, TanStack Table (UI-01/03) — v1.0

### Active (v1.1 candidates — not yet planned)

- [ ] Capital account statements for LP/partnership entities — partner capital tracking, contributions/distributions/allocations
- [ ] Investment performance reporting — IRR, MOIC, unrealized/realized gains per position
- [ ] Production observability — error tracking, performance metrics, user analytics
- [ ] Resolve pre-existing test debt in `use-entity.test.ts` (7 `localStorage.clear` jsdom failures) + `02-05` UAT plan missing SUMMARY.md

### Out of Scope

- QBO OAuth / data sync — building standalone GL, no QBO integration (confirmed v1.0)
- Accounts Receivable / Accounts Payable — QBO Ledger doesn't have them either; out of scope for GL tier (confirmed v1.0)
- Payroll — out of scope entirely
- Inventory — out of scope entirely
- Multi-currency — all entities operate in USD; deferred indefinitely

## Context

- **Organization:** Calafia Group — family-office accounting practice managing 5–10+ entities (LPs, LLCs, Corporations, Trusts)
- **Primary user:** Kathryn, FOA accountant with 10+ years experience
- **Product owner:** Sahil, family office principal — wants to own the data, eliminate QBO per-entity fees ($2,700–7,800/year), build a defensible FOA service offering
- **Development approach:** AI-assisted with Claude Code — no engineers on staff
- **Target cost:** <$100/month for unlimited users/entities (Vercel + PostgreSQL)
- **Scale target:** 3 internal entities today, grow to 20–50 FOA client entities
- **v1.0 deployment:** Vercel production on `frontier-labs/frontier-gl`; single Neon branch shared dev/prod post-audit-cleanup

## Constraints

- **Tech stack:** Next.js 15 App Router, TypeScript, Prisma 7 with PrismaPg adapter, PostgreSQL (Neon), Clerk, shadcn/ui + Tailwind v4 — locked in
- **Money fields:** `NUMERIC(19,4)` / Prisma `Decimal` everywhere — non-negotiable
- **API-first:** All features exposed via `/api/entities/:entityId/` REST endpoints
- **Schema migrations:** Additive only — no destructive migrations, soft-delete pattern throughout
- **Solo dev:** Architecture must stay simple and maintainable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone GL, not a QBO wrapper | Own the data, eliminate vendor lock-in | ✓ Good |
| Clerk for auth | Managed service, less code to maintain | ✓ Good |
| PostgreSQL via Neon | Managed Postgres with branching, great DX | ✓ Good |
| shadcn/ui + Tailwind | Fast UI dev, accessible components | ✓ Good |
| Multi-entity from day one | Core value prop; retrofitting multi-tenancy later is painful | ✓ Good |
| `Decimal` type for all money fields | Avoid floating-point errors in financial calculations | ✓ Good |
| Soft-delete throughout | Preserve audit trails, never destroy financial data | ✓ Good |
| Prisma 7 with PrismaPg adapter | Prisma v7 requires adapter pattern — connection string not in schema | ✓ Good |
| Next.js 15 + Turbopack | Clerk v7 requires Next 15 as peer dep | ✓ Good |
| Cash basis = JEs touching cash account names (Phase 3) | Simple heuristic, works for standard COA | ✗ Superseded in v1.0 by `cashFlowCategory` enum (Phase 12) |
| Name-based cash flow classification (Phase 3) | Quick-start heuristic | ✗ Superseded by `cashFlowCategory` field lookup (Phase 12) — more robust, migration backfills existing |
| Position-first holdings model (Phase 10 redesign) | Position, not holding, is the GL anchor — supports 13 holding types including operating businesses, trusts, insurance | ✓ Good |
| 3-level COA hierarchy (Phase 10) | Type parent > holding summary (+100) > position leaf (+10) | ✓ Good |
| Module-level Map cache with 60s TTL for form dropdowns | Reduces API calls on combobox re-renders without a state library | ✓ Good (pattern across Phase 6/7/8/9) |
| Wizard OB JE auto-posts (Phase 14) | Aligns with Holdings OBE behavior; user doesn't need manual post step | ✓ Good |
| Bank-tx POST delegates to `postJournalEntry` (Phase 14) | Eliminates maintenance-coupling risk; single source of truth for AccountBalance upsert | ✓ Good |
| LLM CSV column mapping with heuristic fallback (Phase 12) | Handles non-standard headers (e.g., "Trx Amt" → Amount) while preserving offline/rate-limit resilience | ✓ Good |
| Header-fingerprint saved-mapping reuse (Phase 12-06) | Server-side superset-match against stored headers; no client-side mapping list fetch | ✓ Good |
| `--auto` chain flag separate from `workflow.auto_advance` user preference (meta: GSD workflow) | Ephemeral chain flag vs persistent preference; allows manual invocation to clear prior interrupted chains | — Pending user validation of next milestone |

---

*Last updated: 2026-04-16 after v1.0 MVP milestone. Next: `/gsd:new-milestone` to begin v1.1 requirements.*
