---
phase: 8
slug: family-office-i-multi-entity-consolidation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
audited: 2026-04-16
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
| 08-00-01 | 00 | 0 | CONS-01 | unit | `npx vitest run tests/consolidated/consolidated-income-statement.test.ts` | ✅ | ✅ green |
| 08-00-02 | 00 | 0 | CONS-02 | unit | `npx vitest run tests/consolidated/consolidated-balance-sheet.test.ts` | ✅ | ✅ green |
| 08-00-03 | 00 | 0 | CONS-03 | unit | `npx vitest run tests/consolidated/elimination-rules.test.ts` | ✅ | ✅ green |
| 08-00-04 | 00 | 0 | CONS-04 | unit | `npx vitest run tests/consolidated/elimination-display.test.ts` | ✅ | ✅ green |
| 08-00-05 | 00 | 0 | CONS-05 | unit | `npx vitest run tests/consolidated/fiscal-year-handling.test.ts` | ✅ | ✅ green |

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
| Gaps found | 5 (stale W0 entries) |
| Resolved | 5 (all task rows flipped to ✅ green) |
| Escalated | 0 |

All 5 gated REQ-IDs (CONS-01..05) have live, passing test files in `tests/consolidated/`: `consolidated-income-statement.test.ts`, `consolidated-balance-sheet.test.ts`, `elimination-rules.test.ts`, `elimination-display.test.ts`, `fiscal-year-handling.test.ts`.
