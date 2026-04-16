---
phase: 10
slug: positions-model-holdings-overhaul
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
audited: 2026-04-16
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
| 10-01-01 | 01 | 1 | POS-01 | unit | `npx vitest run tests/holdings/enum-types.test.ts` | ✅ | ✅ green |
| 10-01-02 | 01 | 1 | POS-02 | integration | `npx prisma db push --dry-run` | N/A | ✅ manual-only |
| 10-01-03 | 01 | 1 | POS-03 | unit | `npx vitest run tests/holdings/position-gl.test.ts` | ✅ | ✅ green |
| 10-01-04 | 01 | 1 | POS-04 | unit | `npx vitest run tests/holdings/holding-gl.test.ts` | ✅ | ✅ green |
| 10-02-01 | 02 | 1 | POS-05 | unit | `npx vitest run tests/holdings/migration.test.ts` | ✅ | ✅ green |
| 10-03-01 | 03 | 2 | POS-06 | manual-only | Manual: Chrome browser test | N/A | ✅ manual-only |
| 10-03-02 | 03 | 2 | POS-07 | manual-only | Manual: Chrome browser test | N/A | ✅ manual-only |
| 10-03-03 | 03 | 2 | POS-08 | unit | `npx vitest run tests/bank-transactions/create-je.test.ts` | ✅ | ✅ green |

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
| Gaps found | 8 (stale W0 entries + orphan task ID 10-04-01 → Phase 10 has no plan 04) |
| Resolved | 8 (all task rows flipped to appropriate status; orphan reconciled per below) |
| Escalated | 0 |
| Manual-only preserved | POS-06, POS-07 (Chrome visual verification), POS-02 (Prisma db push integration check) |

**Orphan reconciliation:** Per RESEARCH.md §P3 (Stale References), task `10-04-01` referenced a non-existent Plan 04 in Phase 10 (phase has only plans 01/02/03). Reconciled to `10-03-03` — the semantically-closest match since POS-08 (bankAccountId resolution in bank-tx JE creation) is validated via `tests/bank-transactions/create-je.test.ts`, and plan 03 already owns POS-06 (10-03-01) and POS-07 (10-03-02). POS-08 becomes the third sub-task under plan 03.

All 5 automated-gated REQ-IDs (POS-01, POS-03, POS-04, POS-05, POS-08) have live, passing test files in `tests/holdings/` (4 files) and `tests/bank-transactions/create-je.test.ts`. POS-06/07 remain manual-only (Chrome visuals — position creation prompt flow, Holdings page grouping), POS-02 remains schema-level (`npx prisma db push --dry-run`).
