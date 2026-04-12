---
phase: 10
slug: positions-model-holdings-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/holdings/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/holdings/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | POS-01 | unit | `npx vitest run tests/holdings/enum-types.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | POS-02 | integration | `npx prisma db push --dry-run` | N/A | ⬜ pending |
| 10-01-03 | 01 | 1 | POS-03 | unit | `npx vitest run tests/holdings/position-gl.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | POS-04 | unit | `npx vitest run tests/holdings/holding-gl.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | POS-05 | unit | `npx vitest run tests/holdings/migration.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | POS-06 | manual-only | Manual: Chrome browser test | N/A | ⬜ pending |
| 10-03-02 | 03 | 2 | POS-07 | manual-only | Manual: Chrome browser test | N/A | ⬜ pending |
| 10-04-01 | 04 | 2 | POS-08 | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | ✅ (needs update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/holdings/enum-types.test.ts` — validates new SubledgerItemType enum (13 values)
- [ ] `tests/holdings/position-gl.test.ts` — validates position GL account auto-creation logic
- [ ] `tests/holdings/holding-gl.test.ts` — validates holding summary GL account creation
- [ ] `tests/holdings/migration.test.ts` — validates data migration backfill logic
- [ ] Update `tests/bank-transactions/create-je.test.ts` — validate position-level bankAccountId resolution

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Position creation flow prompts after holding creation | POS-06 | UI interaction flow | Create holding, verify prompt appears, add positions, confirm GL accounts created |
| Holdings page grouped by type with expandable positions | POS-07 | Visual layout verification | Navigate to Holdings, verify type grouping, expand holding, verify position detail rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
