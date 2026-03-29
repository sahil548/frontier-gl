---
phase: 8
slug: family-office-i-multi-entity-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/consolidated/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/consolidated/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-00-01 | 00 | 0 | CONS-01 | unit | `npx vitest run tests/consolidated/consolidated-income-statement.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-00-02 | 00 | 0 | CONS-02 | unit | `npx vitest run tests/consolidated/consolidated-balance-sheet.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-00-03 | 00 | 0 | CONS-03 | unit | `npx vitest run tests/consolidated/elimination-rules.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-00-04 | 00 | 0 | CONS-04 | unit | `npx vitest run tests/consolidated/elimination-display.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-00-05 | 00 | 0 | CONS-05 | unit | `npx vitest run tests/consolidated/fiscal-year-handling.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/consolidated/consolidated-income-statement.test.ts` — stubs for CONS-01 (aggregation + eliminations)
- [ ] `tests/consolidated/consolidated-balance-sheet.test.ts` — stubs for CONS-02 (aggregation + eliminations)
- [ ] `tests/consolidated/elimination-rules.test.ts` — stubs for CONS-03 (CRUD, auth check, mismatch calc)
- [ ] `tests/consolidated/elimination-display.test.ts` — stubs for CONS-04 (row type discrimination)
- [ ] `tests/consolidated/fiscal-year-handling.test.ts` — stubs for CONS-05 (calendar range enforcement)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entity filter chips toggle | CONS-01/02 | Visual interaction | Select All Entities, verify chips render, click to deselect one entity, verify report updates |
| Elimination warning banner | CONS-04 | Visual rendering | Create mismatched elimination rule, generate consolidated report, verify yellow banner and highlighted rows |
| CSV export content | CONS-04 | File output | Export consolidated CSV, verify entity detail rows, elimination rows, and consolidated totals present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
