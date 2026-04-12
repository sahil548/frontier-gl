---
phase: 11
slug: categorization-ux-opening-balances
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/bank-transactions/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/bank-transactions/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CAT-01 | unit | `npx vitest run tests/bank-transactions/position-picker.test.ts -x` | Wave 0 | ⬜ pending |
| 11-01-02 | 01 | 1 | CAT-03 | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Exists (extend) | ⬜ pending |
| 11-01-03 | 01 | 1 | OBE-01 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 | ⬜ pending |
| 11-01-04 | 01 | 1 | OBE-02 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 | ⬜ pending |
| 11-01-05 | 01 | 1 | OBE-03 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 | ⬜ pending |
| 11-02-01 | 02 | 2 | REC-01 | unit | `npx vitest run tests/bank-transactions/auto-reconcile.test.ts -x` | Wave 0 | ⬜ pending |
| 11-02-02 | 02 | 2 | REC-04 | unit | `npx vitest run tests/bank-transactions/reconciliation-summary.test.ts -x` | Wave 0 | ⬜ pending |
| 11-02-03 | 02 | 2 | REC-03 | manual-only | Chrome browser verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/bank-transactions/opening-balance.test.ts` — stubs for OBE-01, OBE-02, OBE-03 (opening balance JE generation, direction by account type, adjusting JE)
- [ ] `tests/bank-transactions/position-picker.test.ts` — stubs for CAT-01 (entity-wide position query, serialization)
- [ ] `tests/bank-transactions/auto-reconcile.test.ts` — stubs for REC-01 (status set on post)
- [ ] `tests/bank-transactions/reconciliation-summary.test.ts` — stubs for REC-04 (totals computation)
- [ ] Extend `tests/bank-transactions/categorize.test.ts` — stubs for CAT-03 (positionId in RuleInput)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Transaction status badge rendering | REC-03 | Visual UI component | Open bank feed page in Chrome, verify Reconciled (green), Pending (yellow), Unmatched (red) badges render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
