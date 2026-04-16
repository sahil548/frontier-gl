---
phase: 13
slug: test-coverage-gaps
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/bank-transactions/ tests/dimensions/ --reporter=verbose` |
| **Full suite command** | `npm test` (= `npx vitest run`) |
| **Estimated runtime** | ~2s quick scope, ~15s full suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/bank-transactions/ tests/dimensions/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green with zero `it.todo` in the 8 target files
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | CLASS-03 | unit | `npx vitest run tests/dimensions/income-statement-by-dimension.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | CLASS-04 | unit | `npx vitest run tests/dimensions/tb-dimension-filter.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | CLASS-05 | unit | `npx vitest run tests/dimensions/unclassified-entries.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | CAT-03 | unit | `npx vitest run tests/bank-transactions/categorize.test.ts` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 1 | REC-01 | unit (mirror-inline) | `npx vitest run tests/bank-transactions/auto-reconcile.test.ts` | ✅ | ⬜ pending |
| 13-02-03 | 02 | 1 | REC-04 | unit (mirror-inline) | `npx vitest run tests/bank-transactions/reconciliation-summary.test.ts` | ✅ | ⬜ pending |
| 13-02-04 | 02 | 1 | OBE-03 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts` | ✅ | ⬜ pending |
| 13-02-05 | 02 | 1 | CAT-01 (file named in criteria) | unit | `npx vitest run tests/bank-transactions/position-picker.test.ts` | ✅ | ⬜ pending |

*Task IDs are indicative; planner may renumber. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dimensions/income-statement-by-dimension.test.ts` — NEW file for CLASS-03
- [ ] `tests/dimensions/tb-dimension-filter.test.ts` — NEW file for CLASS-04
- [ ] `tests/dimensions/unclassified-entries.test.ts` — NEW file for CLASS-05

*All other test files in scope already exist — the work is converting `it.todo` stubs to live `it()` assertions. No new framework install, no config changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reconciliation status badge renders green (RECONCILED), amber (PENDING), red (UNMATCHED) on each transaction row | REC-03 | Logic is inline JSX ternaries in `transaction-table.tsx:321-359`; no extractable pure helper. Mirror-inline test would only assert the test's copy of the ternaries against itself — zero regression value. | Open `/bank-feed` in Chrome against an entity with at least one RECONCILED, one PENDING, and one UNMATCHED bank transaction. Verify badge color and label render correctly on each row. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new dimension test files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter after all tasks complete and `npm test` passes

**Approval:** pending
