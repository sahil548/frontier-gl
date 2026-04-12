---
phase: 12
slug: reporting-fixes-onboarding-wizard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
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
| 12-00-01 | 00 | 0 | SCHEMA-01 | unit | `npx vitest run src/__tests__/validators/account.test.ts -x` | exists (extend) | ⬜ pending |
| 12-01-01 | 01 | 1 | CF-01 | unit | `npx vitest run src/__tests__/utils/cash-flow-backfill.test.ts -x` | Wave 0 | ⬜ pending |
| 12-01-02 | 01 | 1 | CF-02 | unit | `npx vitest run src/__tests__/queries/cash-flow-field.test.ts -x` | Wave 0 | ⬜ pending |
| 12-01-03 | 01 | 1 | CF-03 | manual-only | Manual: create ASSET account, verify dropdown visible; create INCOME account, verify hidden | N/A | ⬜ pending |
| 12-02-01 | 02 | 1 | CONTRA-01 | unit | `npx vitest run src/__tests__/utils/contra-netting.test.ts -x` | Wave 0 | ⬜ pending |
| 12-02-02 | 02 | 1 | CONTRA-02 | manual-only | Manual: view Balance Sheet with contra account | N/A | ⬜ pending |
| 12-03-01 | 03 | 1 | RATE-01 | unit | `npx vitest run src/__tests__/utils/rate-based-budget.test.ts -x` | Wave 0 | ⬜ pending |
| 12-03-02 | 03 | 1 | RATE-02 | unit | `npx vitest run src/__tests__/api/rate-budget.test.ts -x` | Wave 0 | ⬜ pending |
| 12-04-01 | 04 | 2 | WIZ-01 | manual-only | Manual: create entity, verify wizard appears | N/A | ⬜ pending |
| 12-04-02 | 04 | 2 | WIZ-02 | manual-only | Manual: skip all steps, verify dashboard accessible | N/A | ⬜ pending |
| 12-04-03 | 04 | 2 | WIZ-03 | unit | `npx vitest run src/__tests__/utils/opening-balance.test.ts -x` | Wave 0 | ⬜ pending |
| 12-05-01 | 05 | 2 | CSV-01 | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts -x` | Wave 0 | ⬜ pending |
| 12-05-02 | 05 | 2 | CSV-02 | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts -x` | Wave 0 | ⬜ pending |
| 12-05-03 | 05 | 2 | CSV-03 | manual-only | Manual: upload CSV, verify mapping UI appears | N/A | ⬜ pending |
| 12-05-04 | 05 | 2 | CSV-04 | unit | `npx vitest run src/__tests__/api/column-mappings.test.ts -x` | Wave 0 | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
