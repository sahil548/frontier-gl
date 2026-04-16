---
phase: 11
slug: categorization-ux-opening-balances
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
audited: 2026-04-16
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
| 11-01-01 | 01 | 1 | CAT-01 | unit | `npx vitest run tests/bank-transactions/position-picker.test.ts` | ✅ | ✅ green |
| 11-01-02 | 01 | 1 | CAT-03 | unit | `npx vitest run tests/bank-transactions/categorize.test.ts` | ✅ | ✅ green |
| 11-01-03 | 01 | 1 | OBE-01 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts` | ✅ | ✅ green |
| 11-01-04 | 01 | 1 | OBE-02 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts` | ✅ | ✅ green |
| 11-01-05 | 01 | 1 | OBE-03 | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts` | ✅ | ✅ green |
| 11-02-01 | 02 | 2 | REC-01 | unit | `npx vitest run tests/bank-transactions/auto-reconcile.test.ts` | ✅ | ✅ green |
| 11-02-02 | 02 | 2 | REC-04 | unit | `npx vitest run tests/bank-transactions/reconciliation-summary.test.ts` | ✅ | ✅ green |
| 11-02-03 | 02 | 2 | REC-03 | manual-only | Chrome browser verification | N/A | ✅ manual-only |

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

- [x] All tasks have `<automated>` verify or manual-only classification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-04-16

| Metric | Count |
|--------|-------|
| Gaps found | 8 (stale W0 entries) |
| Resolved | 8 (all task rows flipped appropriately) |
| Escalated | 0 |
| Manual-only preserved | REC-03 (reconciliation status badge rendering — Chrome visual) |

All 7 automated-gated REQ-IDs (CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-04) have live, passing test files in `tests/bank-transactions/`: `position-picker.test.ts`, `categorize.test.ts` (extended for CAT-03 per Phase 13 Plan 02), `opening-balance.test.ts`, `auto-reconcile.test.ts`, `reconciliation-summary.test.ts`. Phase 13 Plan 02 converted the Phase 11 `it.todo` stubs to real assertions for position-picker, auto-reconcile, reconciliation-summary, and opening-balance via the Mirror-inline pattern for non-extractable route/component logic. REC-03 remains manual-only (color-coded badge visual verification in Chrome).
