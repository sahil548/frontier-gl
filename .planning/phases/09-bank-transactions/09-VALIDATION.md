---
phase: 9
slug: bank-transactions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose tests/bank-transactions/` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/bank-transactions/`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | BANK-01 | unit | `npx vitest run tests/bank-transactions/csv-parser.test.ts -x` | Wave 0 | pending |
| 09-01-02 | 01 | 1 | BANK-01 | unit | `npx vitest run tests/bank-transactions/csv-parser.test.ts -x` | Wave 0 | pending |
| 09-02-01 | 02 | 1 | BANK-02 | unit | `npx vitest run tests/bank-transactions/plaid-sync.test.ts -x` | Wave 0 | pending |
| 09-02-02 | 02 | 1 | BANK-02 | unit | `npx vitest run tests/bank-transactions/plaid-sync.test.ts -x` | Wave 0 | pending |
| 09-03-01 | 03 | 2 | BANK-03 | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | Wave 0 | pending |
| 09-03-02 | 03 | 2 | BANK-03 | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | Wave 0 | pending |
| 09-04-01 | 04 | 2 | BANK-04 | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Wave 0 | pending |
| 09-04-02 | 04 | 2 | BANK-04 | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Wave 0 | pending |
| 09-05-01 | 05 | 2 | BANK-05 | unit | `npx vitest run tests/bank-transactions/duplicate-check.test.ts -x` | Wave 0 | pending |
| 09-05-02 | 05 | 2 | BANK-05 | unit | `npx vitest run tests/bank-transactions/duplicate-check.test.ts -x` | Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/bank-transactions/csv-parser.test.ts` — stubs for BANK-01
- [ ] `tests/bank-transactions/plaid-sync.test.ts` — stubs for BANK-02
- [ ] `tests/bank-transactions/create-je.test.ts` — stubs for BANK-03
- [ ] `tests/bank-transactions/categorize.test.ts` — stubs for BANK-04
- [ ] `tests/bank-transactions/duplicate-check.test.ts` — stubs for BANK-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plaid Link modal opens and completes OAuth flow | BANK-02 | Requires real Plaid sandbox interaction in browser | 1. Navigate to Bank Feed page 2. Click "Connect Bank" 3. Complete Plaid Link flow with sandbox credentials 4. Verify connection appears in UI |
| CSV file upload drag-and-drop | BANK-01 | Browser file API interaction | 1. Navigate to Bank Feed page 2. Drag CSV file onto upload area 3. Verify parsed transactions appear in review queue |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
