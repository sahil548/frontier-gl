---
phase: 3
slug: ledger-and-trial-balance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (established in Phase 1/2 or Wave 0) |
| **Config file** | vitest.config.ts (see Wave 0) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LED-01 | integration | `npx vitest run tests/ledger/ledger-query.test.ts -t "running balance"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | LED-02 | unit | `npx vitest run tests/ledger/ledger-filters.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | LED-03 | unit | `npx vitest run tests/ledger/ledger-pagination.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | UI-03 | unit | `npx vitest run tests/components/data-table.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | TB-01 | integration | `npx vitest run tests/trial-balance/tb-query.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | TB-02 | unit | `npx vitest run tests/trial-balance/tb-verification.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | TB-03 | unit | `npx vitest run tests/trial-balance/tb-sorting.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | TB-06 | integration | `npx vitest run tests/trial-balance/tb-consolidated.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-05 | 02 | 2 | LED-04, TB-04 | unit | `npx vitest run tests/export/csv-export.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-06 | 02 | 2 | LED-05, TB-05 | unit | `npx vitest run tests/export/pdf-export.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ledger/ledger-query.test.ts` — stubs for LED-01 (running balance query logic)
- [ ] `tests/ledger/ledger-filters.test.ts` — stubs for LED-02 (filter by date, amount, memo)
- [ ] `tests/ledger/ledger-pagination.test.ts` — stubs for LED-03 (50 per page)
- [ ] `tests/components/data-table.test.ts` — stubs for UI-03 (DataTable sort, filter, paginate)
- [ ] `tests/trial-balance/tb-query.test.ts` — stubs for TB-01 (account balances for period)
- [ ] `tests/trial-balance/tb-verification.test.ts` — stubs for TB-02 (debit = credit check)
- [ ] `tests/trial-balance/tb-sorting.test.ts` — stubs for TB-03 (sort by number, name, type, balance)
- [ ] `tests/trial-balance/tb-consolidated.test.ts` — stubs for TB-06 (multi-entity consolidation)
- [ ] `tests/export/csv-export.test.ts` — stubs for LED-04, TB-04 (CSV generation)
- [ ] `tests/export/pdf-export.test.ts` — stubs for LED-05, TB-05 (PDF generation)
- [ ] Test framework setup (Vitest) if not established by Phase 1/2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual formatting matches branded header | LED-05, TB-05 | Visual layout verification | Open generated PDF, verify entity name, report title, date, Frontier GL branding, page numbers |
| Date range picker UX | LED-02 | UI interaction | Select date range, verify filter applies with debounce |
| Account summary card displays correctly | LED-01 | Visual | Navigate to GL Ledger, verify account name/number/type/balance/YTD stats |
| Consolidated TB tree layout | TB-06 | Visual | Select "All Entities", verify account > entity > consolidated row indentation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
