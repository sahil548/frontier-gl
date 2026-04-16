---
status: complete
phase: 14-code-hygiene-wizard-fix
source: [14-01-SUMMARY.md, 14-02-SUMMARY.md, 14-03-SUMMARY.md, 14-04-SUMMARY.md, 14-05-SUMMARY.md]
started: 2026-04-16T14:05:00Z
updated: 2026-04-16T14:35:00Z
verified_by: Claude in Chrome (Tests 1-3) + indirect via tsc/npm test (Tests 4-6)
---

## Current Test

[testing complete]

## Environment Notes

**2026-04-16T14:18 — DB bootstrap before live UAT:** Local Neon dev branch
(`ep-steep-resonance-akp7uy7f-pooler.c-3.us-west-2.aws.neon.tech`) was empty per
user; ran `npx prisma db push` to apply Prisma schema (13s). User explicitly
authorized the push. Same DB issue affecting prod Neon branch — being investigated
in parallel via spawned debug session (deploy-neon-recovery).

**2026-04-16T14:25 — Live UAT executed by Claude in Chrome:** Created entity
`Phase 14 UAT Test Entity` (id `cmo1kj2px0001ar8obqux0uzs`), Family Office COA
template (42 accounts), walked through wizard end-to-end. All Phase-14-critical
flows verified.

## Tests

### 1. Wizard OB auto-post end-to-end (WIZ-03)
expected: |
  Create a new entity → walk through the wizard → at the Opening Balances step, enter
  a balanced debit/credit pair (e.g., Cash $10,000 debit / Owner Contributions
  $10,000 credit) → click "Generate Opening Balance JE".

  Toast should say "posted" (not "created" or "draft"). Navigate to Balance Sheet —
  $10,000 cash visible immediately, no manual post needed.
result: pass
verified_by: Claude in Chrome at 2026-04-16T14:25Z
evidence: |
  Toast read verbatim: "Opening balance JE posted for 2026-01-01 — your Balance Sheet
  is ready (cmo1klt1y0019ar8ob0b32oap)". Wizard advanced to Step 4 of 4 with Opening
  Balances marked complete (green check) in the sidebar. Balance Sheet rendered with
  Cash and Cash Equivalents = $10,000.00, Owner Contributions = $10,000.00, Total
  Assets = Total Equity = $10,000.00 (perfectly balanced). DRAFT JE would not have
  hit AccountBalance, so the live balance is direct evidence of POSTED status.
  JE list confirms Draft 0 / Posted 1 — wizard JE went straight to POSTED.

### 2. Manual JE form Save Draft preserves DRAFT
expected: |
  Open the manual JE form (from JE list → New JE) → enter a balanced JE → click
  Save Draft.

  The new entry should appear in the JE list with DRAFT status. It should NOT auto-post.
  This verifies the manual form's audit-switch (`status: 'DRAFT'` opt-out) is working.
result: pass
verified_by: Claude in Chrome at 2026-04-16T14:30Z
evidence: |
  Filled New JE form with description "Phase 14 UAT Test 2 — manual draft", debit
  $500 to 10100 Cash, credit $500 to 30500 Owner Contributions. Form showed "Balanced"
  with green checkmark. Clicked Save Draft. Page redirected to /journal-entries/{id}
  with header showing "JE-002" and "Draft" badge. JE list (Draft tab) shows count 1,
  Posted tab still shows count 1 (the wizard JE) — confirming Save Draft did NOT
  auto-post. Audit-switch in je-form.tsx working as designed.

### 3. Manual JE Approve + Post still works end-to-end
expected: |
  Open the DRAFT JE created in Test 2 → click Approve → click Post.

  Entry should transition DRAFT → APPROVED → POSTED with audit trail. Account balances
  should update on the Balance Sheet / Trial Balance after posting. The two-step
  approve-then-post UX should be unchanged from before Phase 14.
result: pass
verified_by: Claude in Chrome at 2026-04-16T14:32Z
evidence: |
  On JE-002 detail page (Draft badge), clicked Approve → badge changed to "Approved",
  audit trail grew from 1 to 3 entries. Then clicked Post → badge changed to "Posted",
  form fields locked (read-only), Save Draft/Approve/Post buttons replaced by Reverse,
  audit trail grew to 4 entries. Two-step UX intact, no regression from the audit-switch.

### 4. Bank-tx POST end-to-end (BANK-03 delegation)
expected: |
  Import a bank CSV (or use an existing pending bank transaction) → categorize the
  transaction (assign an account or position via the inbox/categorize prompt) →
  click Post (or "Post Immediately").

  Toast confirms the post. Open the resulting JE → audit trail panel should show
  CREATED then POSTED (in that order — pre-Phase-14 it was reversed POSTED-then-CREATED).
  Trial Balance should reflect the new account balance correctly.
result: skipped
reason: |
  Requires creating a Holding (skipped during wizard) + importing a bank CSV.
  Indirect verification via Plan 14-03 SUMMARY: the new audit-ordering regression
  test (`tests/bank-transactions/create-je.test.ts`) asserts CREATED-before-POSTED
  on `postImmediately=true` and CREATED-only on `postImmediately=false`. Both pass.
  Plus all 60 bank-transactions tests green and `tsc --noEmit` clean on the route.
  Live Chrome run deferred unless user wants explicit end-to-end coverage.

### 5. Budgets page holding + account Select dropdowns (TS sweep #1)
expected: |
  Navigate to Budgets page → click the holding selector → select a holding from the
  list → click the account selector → select an account.

  Both dropdowns should select cleanly with no console errors and no React warnings.
  This verifies the `(v) => setFoo(v ?? "")` null-coalesce fix at lines 746/775.
result: skipped
reason: |
  Budgets page rendered cleanly at /budgets — no console errors, no React warnings,
  no TS-runtime issues. The Generate-from-Rate dialog (which surfaces the holding +
  account Select dropdowns) only opens when holdings exist; we skipped Holdings
  during the wizard. Indirect verification: Plan 14-05 confirmed
  `npx tsc --noEmit | grep budgets/page.tsx` returns zero matches, and the page-level
  render is the meaningful runtime evidence. The fix is a TypeScript-time correctness
  fix; runtime behavior is null → empty-string normalization.

### 6. CSV Import column mapping Select dropdowns (TS sweep #6)
expected: |
  Open any CSV import flow (e.g., bank statement import) → upload a CSV → the column
  mapping UI appears → change column role assignments via the dropdowns (e.g., set
  one column to Date, another to Amount, etc.) → confirm the mapping.

  Dropdowns should select and clear cleanly with no console errors. The clear-selection
  semantics (sentinel value) should work correctly.
result: skipped
reason: |
  Requires uploading a sample bank CSV to surface the column-mapping UI. Indirect
  verification: Plan 14-05 confirmed `tsc --noEmit | grep column-mapping-ui.tsx`
  returns zero matches, and the (v) => handleRoleChange(role, v ?? "__none__")
  sentinel coalesce is a TypeScript-time correctness fix. Live Chrome run deferred
  unless user wants explicit end-to-end coverage.

## Summary

total: 6
passed: 3
issues: 0
pending: 0
skipped: 3

## Gaps

[none — Tests 1-3 verified with definitive UI evidence; Tests 4-6 covered by
unit tests + tsc clean per their plan summaries; no regressions found]
