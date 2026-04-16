---
phase: 14
slug: code-hygiene-wizard-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/bank-transactions/ src/__tests__/hooks/ src/__tests__/utils/opening-balance-autopost.test.ts tests/attachments/ --reporter=verbose` |
| **Full suite command** | `npm test` (equivalent to `NODE_OPTIONS="--no-experimental-webstorage" vitest run --reporter=verbose` after Phase 14 `package.json` update) |
| **Estimated runtime** | ~15s scoped / ~25–30s full suite |

**Pre-Phase-14 baseline (verified via `npm test`):** 530 passing / 7 failing (all `use-entity` localStorage) / 75 todo / 15 skipped.

**Post-Phase-14 expectation:** 530 + 7 recovered (use-entity passes with NODE_OPTIONS fix) + N new (Phase 14 regression tests) − M deleted (applyRules describe blocks).

---

## Sampling Rate

- **After every task commit:** Run scoped command for the task's domain (e.g., for the bank-tx delegation task, `npx vitest run tests/bank-transactions/`).
- **After every plan wave:** Run full suite (`npm test`) — must be green.
- **Before `/gsd:verify-work`:** Full suite green AND `npx tsc --noEmit` clean on touched files (grep-filter against error output) before phase gate.
- **Max feedback latency:** ~15 seconds (scoped); ~25–30 seconds (full suite).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | WIZ-03 / JE POST `status` opt-in | unit | `npx vitest run src/__tests__/utils/opening-balance-autopost.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | Manual JE form explicit DRAFT opt-out | unit | `npx vitest run src/__tests__/components/je-form-draft-opt-out.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | BANK-03 / `postJournalEntryInTx` extraction + public wrapper unchanged | unit | `npx vitest run src/lib/journal-entries/post.test.ts` | ✅ | ⬜ pending |
| 14-02-02 | 02 | 2 | BANK-03 / bank-tx POST delegates via `postJournalEntryInTx`, audit ordering CREATED-then-POSTED | unit | `npx vitest run tests/bank-transactions/create-je.test.ts` | ✅ (extend with one new `it` block) | ⬜ pending |
| 14-03-01 | 03 | 1 | BANK-04 / `applyRules` + `TransactionInput` deleted; `matchRule` unchanged | unit | `npx vitest run tests/bank-transactions/categorize.test.ts` | ✅ (surgical describe removal) | ⬜ pending |
| 14-04-01 | 04 | 1 | TS sweep #1 — Select `onValueChange` null-coalesce at budgets page | tsc | `npx tsc --noEmit 2>&1 \| grep -E "budgets/page\.tsx"` (expect: zero matches) | n/a (compile-time) | ⬜ pending |
| 14-04-02 | 04 | 1 | TS sweep #3 — `SerializedAccount` canonicalised in `src/types/account.ts` | tsc | `npx tsc --noEmit 2>&1 \| grep -E "accounts/page\.tsx\|account-table\.tsx" \| grep TS2719` (expect: zero matches) | n/a (compile-time) | ⬜ pending |
| 14-04-03 | 04 | 1 | TS sweep #5 — `localStorage.clear` fix via `NODE_OPTIONS="--no-experimental-webstorage"` in `package.json` | unit | `npx vitest run src/__tests__/hooks/use-entity.test.ts` (expect: 7/7 passing) | ✅ | ⬜ pending |
| 14-04-04 | 04 | 1 | TS sweep #6 — `column-mapping-ui.tsx:230` `string \| null` handled | tsc | `npx tsc --noEmit 2>&1 \| grep -E "column-mapping-ui\.tsx"` (expect: zero matches) | n/a (compile-time) | ⬜ pending |
| 14-04-05 | 04 | 1 | TS sweep #7 — `blob-storage.test.ts:35,43` vitest Mock cast typechecks | tsc | `npx tsc --noEmit 2>&1 \| grep -E "blob-storage\.test\.ts" \| grep TS2348` (expect: zero matches) | ✅ (test-only edit) | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/utils/opening-balance-autopost.test.ts` — NEW file. Mocks `global.fetch`; asserts wizard OB helper POSTs **without** a `status` field (i.e., relies on the new POSTED default).
- [ ] `src/__tests__/components/je-form-draft-opt-out.test.ts` — NEW file. Mocks `global.fetch`; renders `JEForm`; clicks Save Draft; asserts request body includes `status: 'DRAFT'` explicitly.
- [ ] `package.json` `test` script — UPDATE to prepend `NODE_OPTIONS="--no-experimental-webstorage"`. Unblocks 7 use-entity.test.ts assertions on Node 25.
- [ ] `src/types/account.ts` — NEW file. Canonical `SerializedAccount` type (includes `cashFlowCategory` + `isContra`). Consumed by `accounts/page.tsx`, `account-table.tsx`, `account-form.tsx`.

No framework install. No `vitest.config.ts` changes (the localStorage fix is at Node runtime via `NODE_OPTIONS`, not jsdom config).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wizard OB balance flow end-to-end — user enters balances, clicks "Generate Opening Balance JE", is redirected to the wizard's next step, and Balance Sheet reflects the numbers | WIZ-03 | Chrome visual check — toast copy, navigation, Balance Sheet rendering. Unit test covers the API contract; browser test covers user-perceivable UX. | 1) Create a new entity. 2) Complete COA step with family-office template. 3) Go to Opening Balances step. 4) Enter a balanced debit/credit pair (e.g., Cash $10,000 / Opening Balance Equity $10,000). 5) Click Generate. 6) Navigate to Balance Sheet. 7) Confirm the $10,000 cash balance is visible (not "draft — post before use"). |
| Manual JE form Save Draft vs. Save & Post both behave unchanged post-refactor | JE lifecycle — existing UX | Chrome visual check — button behavior and JE list state. | 1) From an entity with accounts, open the JE form. 2) Enter a balanced entry. 3) Click "Save Draft" → confirm the new entry appears in the JE list with DRAFT status. 4) Back in the form, enter another balanced entry. 5) Click "Save & Post" (or equivalent) → confirm it appears with POSTED status. |

Per `MEMORY.md`: all UI-facing work must be verified in Chrome, not just automated tests.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies mapped
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (2 new test files + 1 types module + 1 package.json edit)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 seconds full suite
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands and manual checks pass)

**Approval:** pending
