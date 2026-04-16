---
phase: 12
slug: reporting-fixes-onboarding-wizard
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
audited: 2026-04-16
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
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
| 12-00-01 | 00 | 0 | SCHEMA-01 | unit | `npx vitest run src/__tests__/validators/account.test.ts` | ✅ | ✅ green |
| 12-01-01 | 01 | 1 | CF-01 | unit | `npx vitest run src/__tests__/utils/cash-flow-backfill.test.ts` | ✅ | ✅ green |
| 12-01-02 | 01 | 1 | CF-02 | unit | `npx vitest run src/__tests__/queries/cash-flow-field.test.ts` | ✅ | ✅ green |
| 12-01-03 | 01 | 1 | CF-03 | manual-only | Manual: create ASSET account, verify dropdown visible; create INCOME account, verify hidden | N/A | ✅ manual-only |
| 12-02-01 | 02 | 1 | CONTRA-01 | unit | `npx vitest run src/__tests__/utils/contra-netting.test.ts` | ✅ | ✅ green |
| 12-02-02 | 02 | 1 | CONTRA-02 | manual-only | Manual: view Balance Sheet with contra account | N/A | ✅ manual-only |
| 12-03-01 | 03 | 1 | RATE-01 | unit | `npx vitest run src/__tests__/utils/rate-based-budget.test.ts` | ✅ | ✅ green |
| 12-03-02 | 03 | 1 | RATE-02 | unit | `npx vitest run src/__tests__/api/rate-budget.test.ts src/__tests__/utils/rate-target-eligibility.test.ts` | ✅ | ✅ green |
| 12-04-01 | 04 | 2 | WIZ-01 | manual-only | Manual: create entity, verify wizard appears | N/A | ✅ manual-only |
| 12-04-02 | 04 | 2 | WIZ-02 | manual-only | Manual: skip all steps, verify dashboard accessible | N/A | ✅ manual-only |
| 12-04-03 | 04 | 2 | WIZ-03 | unit | `npx vitest run src/__tests__/utils/opening-balance.test.ts src/__tests__/utils/wizard-progress.test.ts` | ✅ | ✅ green |
| 12-05-01 | 05 | 2 | CSV-01 | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts` | ✅ | ✅ green |
| 12-05-02 | 05 | 2 | CSV-02 | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts` | ✅ | ✅ green |
| 12-05-03 | 05 | 2 | CSV-03 | manual-only | Manual: upload CSV, verify mapping UI appears | N/A | ✅ manual-only |
| 12-05-04 | 05 | 2 | CSV-04 | unit | `npx vitest run src/__tests__/api/column-mappings.test.ts src/__tests__/utils/csv-parser-multi-account.test.ts src/__tests__/api/bank-transactions-multi-account.test.ts src/__tests__/validators/bank-transaction.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/utils/cash-flow-backfill.test.ts` — stubs for CF-01
- [ ] `src/__tests__/queries/cash-flow-field.test.ts` — stubs for CF-02
- [ ] `src/__tests__/utils/contra-netting.test.ts` — stubs for CONTRA-01
- [ ] `src/__tests__/utils/rate-based-budget.test.ts` — stubs for RATE-01
- [ ] `src/__tests__/api/rate-budget.test.ts` — stubs for RATE-02
- [ ] `src/__tests__/utils/opening-balance.test.ts` — stubs for WIZ-03
- [ ] `src/__tests__/utils/llm-column-mapper.test.ts` — stubs for CSV-01, CSV-02
- [ ] `src/__tests__/api/column-mappings.test.ts` — stubs for CSV-04
- [ ] `src/__tests__/validators/account.test.ts` — extend for cashFlowCategory + isContra fields (SCHEMA-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| cashFlowCategory dropdown visibility | CF-03 | UI conditional rendering | Create ASSET account → verify CF dropdown visible; create INCOME → verify hidden |
| Contra account display formatting | CONTRA-02 | Visual presentation logic | View Balance Sheet with contra account → verify "Less:" prefix, netting |
| Wizard triggers after entity creation | WIZ-01 | Full app navigation flow | Create entity → verify wizard appears with 4 steps |
| All wizard steps skippable | WIZ-02 | Multi-step interaction flow | Skip all steps → verify dashboard accessible with progress indicator |
| Column mapping confirmation UI | CSV-03 | Complex interactive UI | Upload CSV → verify mapping preview renders with adjustable dropdowns |

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
| Gaps found | 15 (stale W0 entries across 8 plans) |
| Resolved | 15 (all task rows flipped appropriately) |
| Escalated | 0 |
| Manual-only preserved | CF-03 (dropdown visibility), CONTRA-02 (Less: rendering), WIZ-01 (wizard trigger), WIZ-02 (step skippability), CSV-03 (confirmation UI) |

All 10 automated-gated REQ-IDs (SCHEMA-01, CF-01, CF-02, CONTRA-01, RATE-01, RATE-02, WIZ-03, CSV-01, CSV-02, CSV-04) have live, passing test files. Eight original test files from plans 12-01..05 plus five extensions from plans 12-07/08/09: `wizard-progress.test.ts`, `rate-target-eligibility.test.ts`, `csv-parser-multi-account.test.ts`, `bank-transactions-multi-account.test.ts`, `validators/bank-transaction.test.ts`. Manual-only rows remain manual-only by design (all five require Chrome visual or full navigation flow verification).
