---
phase: 7
slug: qbo-parity-iii-budget-vs-actual
status: complete
nyquist_compliant: true
wave_0_complete: true
wave_0_plan: 07-00-PLAN.md
created: 2026-03-29
audited: 2026-04-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + Testing Library |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-00-01 | 00 | 0 | BUDG-01 | unit | `npx vitest run src/__tests__/validators/budget.test.ts src/__tests__/utils/fiscal-year.test.ts --reporter=verbose` | ✅ | ✅ green |
| 07-00-02 | 00 | 0 | BUDG-02, BUDG-04 | unit | `npx vitest run src/__tests__/api/budgets.test.ts src/__tests__/api/budget-import.test.ts src/__tests__/api/budget-report.test.ts --reporter=verbose` | ✅ | ✅ green |
| 07-01-01 | 01 | 1 | BUDG-01 | unit | `npx vitest run src/__tests__/validators/budget.test.ts src/__tests__/utils/fiscal-year.test.ts --reporter=verbose` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | BUDG-01, BUDG-02, BUDG-04 | unit | `npx vitest run src/__tests__/api/budgets.test.ts src/__tests__/api/budget-import.test.ts --reporter=verbose` | ✅ | ✅ green |
| 07-03-01 | 03 | 2 | BUDG-03, BUDG-05 | unit | `npx vitest run src/__tests__/api/budget-report.test.ts --reporter=verbose` | ✅ | ✅ green |

*Status: pending -- green -- red -- flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/api/budgets.test.ts` — stubs for BUDG-01, BUDG-04
- [ ] `src/__tests__/api/budget-import.test.ts` — stubs for BUDG-02
- [ ] `src/__tests__/api/budget-report.test.ts` — stubs for BUDG-03, BUDG-05
- [ ] `src/__tests__/validators/budget.test.ts` — Zod schema validation for budget inputs
- [ ] `src/__tests__/utils/fiscal-year.test.ts` — fiscal year month utility unit tests

*Wave 0 plan: 07-00-PLAN.md creates all stub files. Set `wave_0_complete: true` after 07-00 executes.*

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spreadsheet grid keyboard navigation | BUDG-01 | Browser interaction | Tab between cells, type amounts, verify save |
| Budget vs Actual report renders with green/red variance | BUDG-03 | Visual styling | Load report, verify green for favorable, red for unfavorable |
| Report tab appears alongside P&L, BS, CF | BUDG-03 | UI layout | Open Reports page, verify tab exists and switches |
| CSV export downloads correct file | BUDG-05 | Browser download | Click export, open CSV, verify columns match report |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
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
| Gaps found | 5 (stale W0 entries + frontmatter inconsistency: `nyquist_compliant: true` while `wave_0_complete: false`) |
| Resolved | 5 (all task rows flipped to ✅ green; `wave_0_complete` flipped to `true` to match nyquist compliance) |
| Escalated | 0 |

All 5 gated REQ-IDs (BUDG-01..05) have live, passing test files across `src/__tests__/validators/budget.test.ts`, `src/__tests__/utils/fiscal-year.test.ts`, `src/__tests__/api/budgets.test.ts`, `src/__tests__/api/budget-import.test.ts`, and `src/__tests__/api/budget-report.test.ts`. Previous frontmatter inconsistency (Nyquist true but Wave 0 false) resolved by confirming all five W0 files exist and are green.
