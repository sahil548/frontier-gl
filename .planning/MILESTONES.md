# Milestones

## v1.0 MVP (Shipped: 2026-04-16)

**Delivered:** A multi-entity general ledger purpose-built for family-office accounting — complete QuickBooks Online Ledger replacement plus family-office differentiators (multi-entity consolidation, position-based holdings, bank feed with position-first categorization, AI CSV import, onboarding wizard).

**Stats:**
- Phases: 15 (Phases 1–15; Phase 4 was virtual, work absorbed into Phases 3/5)
- Plans executed: 60/61 (only `02-05` UAT plan has no SUMMARY — known pre-existing doc gap; all 18 REQ-IDs it gated verified via `02-VERIFICATION.md`)
- Requirements: 99/99 REQ-IDs satisfied (per `milestones/v1.0-MILESTONE-AUDIT.md`)
- Timeline: 21 days (2026-03-26 → 2026-04-16)
- Git: 357 commits, 560 files changed, 113,531 insertions, 56 deletions
- LOC: 55,449 TS/TSX/Prisma (production + tests, excludes generated)
- Tests: 536 passing / 7 failing (pre-existing `localStorage.clear` in `use-entity.test.ts`, non-blocking per Phase 14 deferred-items.md) / 75 todo across 83 test files
- VERIFICATION.md coverage: 11/11 executed phases (100%)
- Tag: `v1.0`

**Key accomplishments:**

1. **Multi-entity double-entry GL foundation** — Chart of accounts with hierarchical structure, journal entries with Draft→Approved→Posted workflow and full audit trail, GL ledger with filtering/export, trial balance with verification, financial statements (P&L, Balance Sheet, Cash Flow — indirect method, cash/accrual toggle), period close governance. (Phases 1–3)
2. **QBO-parity feature set** — Dashboard summary + charts (asset pie, income/expense bar, equity trend area), mobile-responsive layout (375px minimum), audit trail UI with field-level diffs, JE attachments (Vercel Blob), recurring JE UI with frequency scheduling, class/dimension tracking with column-per-class P&L, Budget vs Actual with variance report. (Phases 5–7)
3. **Family-office differentiators** — Multi-entity consolidation with intercompany elimination rules, 13-type holdings model (bank/brokerage/real-estate/loan/PE/operating-business/trust/etc.), position-level GL account auto-creation with 3-level COA hierarchy, bank feed (CSV + Plaid Link) with position-first categorization + auto-apply rules, auto-generated opening-balance JEs, reconciliation summary with running totals. (Phases 8–11)
4. **Reporting accuracy + onboarding** — Field-based cash flow classification (`cashFlowCategory` enum replacing name-matching heuristics), contra-account boolean with netting display, rate-based budget targets for investment returns, 4-step onboarding wizard (COA template → Holdings → Opening Balances → First Transactions) with skip-and-return, entity-creation auto-redirect. (Phase 12)
5. **AI-powered CSV import** — LLM column mapping (Anthropic SDK) with heuristic fallback, saved-mapping reuse via server-side header-fingerprint match, multi-account bank CSV import via per-row Account column resolution, COA import dialog layout polish — applied across all three import flows (bank, COA, budgets). (Phase 12 gap closures 12-04/06/09)
6. **Tech-debt closure ahead of ship** — Test backfill for CLASS-03/04/05 + Phase 11 `it.todo` stubs (Phase 13); `applyRules` orphan removal, bank-tx POST delegation to `postJournalEntry`, Wizard OB auto-post alignment with Holdings OBE, 7 deferred TS/test items swept (Phase 14); 2 missing VERIFICATION.md generated + 9 stale VALIDATION.md refreshed + REQUIREMENTS.md traceability restored to current state (Phase 15).

### Known Gaps (non-blocking, documented)

- `02-05` UAT plan has no SUMMARY.md — pre-existing, documented in `STATE.md` as "lone pre-existing outstanding plan gap"; all 18 REQ-IDs it gated are verified in `02-VERIFICATION.md`.
- 7 test failures in `src/__tests__/hooks/use-entity.test.ts` (`localStorage.clear` not a function in jsdom) — catalogued in Phase 14's `deferred-items.md`, requires environment-level mock update unrelated to v1.0 functionality.

### Key Decisions (milestone-level)

- **Standalone GL, not a QBO wrapper** — own the data, eliminate vendor lock-in. Outcome: ✓ Good.
- **Next.js 15 + Prisma 7 + Neon + Clerk + shadcn/ui + Vercel** — stack locked at Phase 1. Outcome: ✓ Good.
- **`Decimal(19,4)` for all money fields** — avoid floating-point errors. Outcome: ✓ Good.
- **Multi-entity from day one** — retrofitting multi-tenancy later is painful. Outcome: ✓ Good.
- **Soft-delete throughout** — preserve audit trails, never destroy financial data. Outcome: ✓ Good.
- **Positions link to GL accounts, not holdings** (Phase 10 redesign) — holdings contain positions; positions are the GL anchor. Enabled 13-type holdings + position-level categorization. Outcome: ✓ Good.
- **`cashFlowCategory` field, not name matching** (Phase 12) — replaces the "cash basis = JEs touching cash account names" heuristic flagged as revisit in PROJECT.md. Outcome: ✓ Good.

### Deferred to v1.1+

- Capital account statements for LP/partnership entities (mentioned in PROJECT.md Active)
- Investment performance reporting (IRR, MOIC, unrealized/realized gains per holding)
- Multi-currency support (PROJECT.md Out of Scope for v1.0)
- AR/AP modules (PROJECT.md Out of Scope for v1.0 — QBO Ledger doesn't have them either)
- Payroll, inventory (PROJECT.md Out of Scope — no plans to add)

### Archived Artifacts

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — requirements checklist with outcomes
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — pre-close-out audit (2026-04-16, status: tech_debt → all debt closed via Phases 13/14/15)

---
