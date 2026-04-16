---
phase: 14-code-hygiene-wizard-fix
verified: 2026-04-16T17:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 14: Code Hygiene & Wizard Behavioral Fix Verification Report

**Phase Goal:** Remove orphan production code in Phase 9 bank-transactions, eliminate AccountBalance maintenance-coupling risk by delegating to `postJournalEntry`, align Wizard opening-balance JE behavior with the Holdings OBE path (auto-post or UI disclaimer), and sweep the 7 pre-existing TypeScript/test issues catalogued in `deferred-items.md`.

**Verified:** 2026-04-16T17:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                          | Status     | Evidence                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/bank-transactions/categorize.ts` no longer exports a dead `applyRules`                                                                                                                | ✓ VERIFIED | File is 64 lines (was 111). Exports only `RuleInput`, `toNum` (private), and `matchRule`. Zero `applyRules`/`TransactionInput` matches in `src/lib/` or `tests/`.     |
| 2   | Bank-tx POST route delegates AccountBalance mutation to `postJournalEntry` instead of inlining `AccountBalance.upsert`                                                                          | ✓ VERIFIED | `route.ts:8` imports `postJournalEntryInTx`; `route.ts:310` calls it inside outer `prisma.$transaction`; zero `accountBalance.upsert` matches in route file.          |
| 3   | Wizard opening-balance JE is auto-posted to match Holdings OBE behavior                                                                                                                         | ✓ VERIFIED | `opening-balance.ts:97-105` POST body omits `status` field; JE POST API at `route.ts:205` defaults `shouldPost = status !== "DRAFT"` and calls `postJournalEntryInTx`. |
| 4   | Deferred-items.md items #1, #3, #5, #6, #7 resolved (Select onValueChange types, SerializedAccount duplicate, localStorage.clear jsdom, column-mapping-ui string\|null, blob-storage test mock) | ✓ VERIFIED | All 5 items contain `**RESOLVED in Phase 14:**` markers in `deferred-items.md`; each fix verified at the source-code level.                                            |
| 5   | `tsc --noEmit` passes clean across touched files; full test suite green                                                                                                                         | ✓ VERIFIED | `npx tsc --noEmit` returns 0 lines (zero errors anywhere). `npm test` reports 543 passed / 75 todo / 0 failed (618 total) in 12s.                                      |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                                       | Expected                                                                              | Status     | Details                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/journal-entries/post.ts`                                              | Exports `postJournalEntry` + `postJournalEntryInTx`                                   | ✓ VERIFIED | 103 lines. `postJournalEntryInTx` at line 22 (uses `Prisma.TransactionClient`). `postJournalEntry` at line 96 is 3-line wrapper.                                          |
| `src/lib/journal-entries/post.test.ts`                                         | Tests for both wrapper + tx-aware helper                                              | ✓ VERIFIED | `describe("postJournalEntryInTx (tx-aware helper)")` at line 133 with 3 assertions: import, isolation, wrapper-regression. Pre-existing 5 tests still green.              |
| `src/lib/bank-transactions/categorize.ts`                                      | `matchRule` + `RuleInput` only                                                        | ✓ VERIFIED | 64 lines, exports `RuleInput` (interface, line 5) + `matchRule` (function, line 40). `applyRules` and `TransactionInput` deleted.                                         |
| `tests/bank-transactions/categorize.test.ts`                                   | matchRule tests only (no applyRules describes)                                        | ✓ VERIFIED | Zero `applyRules` matches. 5 tests across `matchRule` and `Position-targeted rules` describe blocks; all green.                                                            |
| `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts`   | POST handler delegates via `postJournalEntryInTx`                                     | ✓ VERIFIED | Imports `postJournalEntryInTx` (line 8). Inside outer `prisma.$transaction`, JE created as DRAFT (line 273), CREATED audit before post (line 298), `postJournalEntryInTx(tx, je.id, userId)` at line 310, then `bankTransaction.update`. Response status coalesced to `"POSTED"` when `postImmediately` is true (line 339). |
| `tests/bank-transactions/create-je.test.ts`                                    | Audit-ordering test                                                                   | ✓ VERIFIED | `describe("BANK-03: bank-tx POST audit ordering (post-refactor)")` at line 250 with 2 tests: CREATED-before-POSTED when postImmediately=true; CREATED-only when postImmediately=false.            |
| `src/lib/validators/journal-entry.ts`                                          | Schema accepts optional `status: 'DRAFT' \| 'POSTED'`                                  | ✓ VERIFIED | Line 62: `status: z.enum(["DRAFT", "POSTED"]).optional()`.                                                                                                                |
| `src/app/api/entities/[entityId]/journal-entries/route.ts`                     | POST auto-posts when balanced + omitted; closed-period error mapping                  | ✓ VERIFIED | Imports `postJournalEntryInTx` (line 6). `shouldPost = status !== "DRAFT"` (line 205). JE created as DRAFT (line 246), CREATED audit (line 284), conditional `postJournalEntryInTx(tx, je.id, userId)` (line 297-299), error mapping at line 333-340.                                       |
| `src/components/journal-entries/je-form.tsx`                                   | Save Draft fetch body explicitly sends `status: "DRAFT"`                              | ✓ VERIFIED | Line 232-239: spreads `...data` and adds `status: "DRAFT"` to body for both POST (create) and PUT (edit) paths.                                                          |
| `src/components/onboarding/wizard-balances-step.tsx`                           | Toast copy reflects "posted" semantics                                                | ✓ VERIFIED | Line 161-162: `Opening balance JE posted for ${jeDate} — your Balance Sheet is ready (${result.journalEntryId})`.                                                          |
| `src/lib/onboarding/opening-balance.ts`                                        | POSTs to JE API WITHOUT a `status` field                                              | ✓ VERIFIED | Lines 97-105: `JSON.stringify({ date, description, lineItems })` — no `status` key.                                                                                       |
| `src/__tests__/utils/opening-balance-autopost.test.ts`                         | WIZ-03 regression test                                                                | ✓ VERIFIED | 83 lines. Asserts wizard helper POST body has no `status` field (and no status in line items). 2 tests, both green.                                                       |
| `src/__tests__/components/je-form-draft-opt-out.test.tsx`                      | Manual JE form regression test                                                        | ✓ VERIFIED | 113 lines. (.tsx extension per executor deviation; vitest config supports both.) Asserts Save Draft fetch body has `status: "DRAFT"`. 1 test, green.                       |
| `src/types/account.ts`                                                         | Canonical `SerializedAccount` type                                                    | ✓ VERIFIED | 23 lines. Exports `SerializedAccount` with all 13 fields including Phase 12's `cashFlowCategory: string \| null` and `isContra: boolean`.                                  |
| `src/app/(auth)/accounts/page.tsx`                                             | Imports `SerializedAccount` from `@/types/account`                                    | ✓ VERIFIED | Line 9: `import type { SerializedAccount } from "@/types/account";` — no local declaration.                                                                              |
| `src/components/accounts/account-table.tsx`                                    | Imports `SerializedAccount` from `@/types/account`                                    | ✓ VERIFIED | Line 46: `import type { SerializedAccount } from "@/types/account";`.                                                                                                    |
| `src/components/accounts/account-form.tsx`                                     | Imports `SerializedAccount` from `@/types/account`                                    | ✓ VERIFIED | Line 41: `import type { SerializedAccount } from "@/types/account";`.                                                                                                    |
| `src/app/(auth)/budgets/page.tsx`                                              | Select `onValueChange` null-coalesce at lines 746/775                                  | ✓ VERIFIED | Lines 746/775: `onValueChange={(v) => setSelectedHoldingId(v ?? "")}` and `setSelectedAccountId(v ?? "")`.                                                                |
| `src/components/csv-import/column-mapping-ui.tsx`                              | `handleRoleChange` receives non-null string via `?? "__none__"` sentinel              | ✓ VERIFIED | Line 230: `onValueChange={(val) => handleRoleChange(role, val ?? "__none__")}`.                                                                                          |
| `tests/attachments/blob-storage.test.ts`                                       | Uses `vi.mocked(put)(...)` instead of `(put as ReturnType<typeof vi.fn>)(...)`        | ✓ VERIFIED | Lines 37, 45: `vi.mocked(put)(path, file as unknown as Blob, ...)` and `vi.mocked(del)(attachmentUrl)`. Companion `as unknown as Blob` cast to satisfy real PutBody signature. |
| `package.json`                                                                 | Test script includes `NODE_OPTIONS="--no-experimental-webstorage"`                    | ✓ VERIFIED | Line 11: `"test": "NODE_OPTIONS=\"--no-experimental-webstorage\" vitest run --reporter=verbose"`.                                                                         |
| `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md`      | Items #1, #3, #5, #6, #7 marked RESOLVED in Phase 14; #2, #4 RESOLVED in 12-07 intact | ✓ VERIFIED | 47 lines. 5 occurrences of "RESOLVED in Phase 14" (items #1, #3, #5, #6, #7); 2 occurrences of "RESOLVED in 12-07" (items #2, #4) intact.                                   |

### Key Link Verification

| From                                                                              | To                                              | Via                                                                  | Status   | Details                                                                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/lib/journal-entries/post.ts` (postJournalEntry wrapper)                      | `postJournalEntryInTx`                          | `prisma.$transaction(async (tx) => postJournalEntryInTx(tx, ...))`   | ✓ WIRED  | Lines 100-102: wrapper opens its own `$transaction` and calls helper exactly once.                                    |
| `src/lib/journal-entries/post.test.ts`                                            | `postJournalEntryInTx` export                   | named import (dynamic in test)                                       | ✓ WIRED  | Line 144: `const { postJournalEntryInTx } = await import("./post");` — verified callable.                              |
| `src/app/api/entities/[entityId]/journal-entries/route.ts`                        | `postJournalEntryInTx`                          | named import + call inside outer `$transaction` when `shouldPost`    | ✓ WIRED  | Import at line 6; `if (shouldPost) await postJournalEntryInTx(tx, je.id, userId)` at lines 297-299.                  |
| `src/lib/onboarding/opening-balance.ts` (wizard helper)                            | `POST /api/entities/:entityId/journal-entries`  | `fetch` with body OMITTING `status` field                            | ✓ WIRED  | `fetch(url, { method: "POST", body: JSON.stringify({ date, description, lineItems }) })` — no `status` key.            |
| `src/components/journal-entries/je-form.tsx`                                      | `POST /api/entities/:entityId/journal-entries`  | `fetch` body INCLUDES `status: "DRAFT"` explicitly                   | ✓ WIRED  | Lines 232-239: `body: JSON.stringify({ ...data, status: "DRAFT" })`.                                                  |
| `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts`       | `postJournalEntryInTx`                          | named import + call inside outer `$transaction` when `postImmediately` | ✓ WIRED  | Import at line 8; `if (postImmediately) await postJournalEntryInTx(tx, je.id, userId)` at line 309-311.               |
| `src/app/(auth)/accounts/page.tsx`                                                | `src/types/account.ts`                          | `import type { SerializedAccount }`                                  | ✓ WIRED  | Line 9 + line 18 usage in `useState<SerializedAccount[]>`.                                                            |
| `src/components/accounts/account-table.tsx`                                        | `src/types/account.ts`                          | `import type { SerializedAccount }`                                  | ✓ WIRED  | Line 46 + multiple usages (lines 87, 97, 120-121, 128, 148, 150, 204).                                                |
| `src/components/accounts/account-form.tsx`                                        | `src/types/account.ts`                          | `import type { SerializedAccount }`                                  | ✓ WIRED  | Line 41 + usages at lines 67 (props.accounts), 71 (props.editAccount).                                                |
| `src/app/api/entities/[entityId]/bank-transactions/route.ts` (PATCH)               | `matchRule`                                     | named import — UNCHANGED                                             | ✓ WIRED  | Line 14: `import { matchRule } from "@/lib/bank-transactions/categorize";`. Live production callsite preserved.        |

### Requirements Coverage

| Requirement     | Source Plan(s)            | Description                                                                                          | Status      | Evidence                                                                                                                                                              |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BANK-03         | 14-01, 14-03              | User can categorize transactions and post them as JEs (debit expense/asset, credit bank account)     | ✓ SATISFIED | No regression — bank-tx POST still creates and posts JE atomically. Audit-flagged maintenance-coupling risk closed via `postJournalEntryInTx` delegation. Audit ordering corrected to CREATED→POSTED. 60 bank-transactions tests green. |
| BANK-04         | 14-04                     | Categorization rules auto-apply to matching transactions based on description patterns                | ✓ SATISFIED | No regression — `matchRule` is the live production code path used by bank-tx PATCH route (`route.ts:14`). Dead `applyRules` orphan removed; 5 categorize tests green. |
| WIZ-03          | 14-02                     | Wizard opening-balance JE auto-posts to match Holdings OBE behavior (behavioral refinement)           | ✓ SATISFIED | Wizard helper omits `status`; JE POST API defaults to POSTED-when-balanced; manual JE form opt-out preserved. 3 Wave 0 tests green. |
| DEFERRED-ITEMS  | 14-05                     | Sweep 5 remaining pre-existing TS/test issues (#1, #3, #5, #6, #7)                                    | ✓ SATISFIED | All 5 items show `**RESOLVED in Phase 14:**` markers; tsc clean across touched files; 7 use-entity tests recovered. |

**No orphaned requirements** — all 4 requirements declared across plan frontmatter (BANK-03, BANK-04, WIZ-03, DEFERRED-ITEMS) are accounted for in the verification surface. Note: BANK-03/04 and WIZ-03 are pre-satisfied refactor/refinement requirements per ROADMAP.md ("REQs already satisfied"); verification confirms no regression.

### Anti-Patterns Found

None blocking. Sweep of touched files for TODO/FIXME/PLACEHOLDER/empty implementations returned no issues.

| File                                                                              | Line | Pattern                                | Severity | Impact                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------- | ---- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/attachments/blob-storage.test.ts`                                          | 37   | `as unknown as Blob` cast              | ℹ️ Info   | Companion type cast required to satisfy real `PutBody` signature after switching to `vi.mocked(put)`. Mock ignores body type at runtime; documented in 14-05 deviations.                                                  |
| `src/components/onboarding/wizard-balances-step.tsx`                              | 161  | Toast copy includes JE id              | ℹ️ Info   | Discretionary refinement per CONTEXT.md — JE id retained in toast for support/debugging continuity.                                                                                                                      |

### Human Verification Required

Per `MEMORY.md` ("Test in Chrome — Verify UI features in Chrome browser, not just automated tests") and `14-VALIDATION.md` Manual-Only table, two end-to-end UI flows are flagged for manual Chrome verification:

#### 1. Wizard OB Auto-Post End-to-End

**Test:**
1. Create a new entity
2. Complete COA step with family-office template
3. Go to Opening Balances step
4. Enter a balanced debit/credit pair (e.g., Cash $10,000 / Opening Balance Equity $10,000)
5. Click "Generate Opening Balance JE"
6. Navigate to Balance Sheet
7. Confirm the $10,000 cash balance is visible immediately (no "draft — post before use" affordance)

**Expected:** Toast shows "Opening balance JE posted for {date} — your Balance Sheet is ready ({jeId})"; Balance Sheet shows the $10,000 cash without a manual post step.

**Why human:** Visual check on toast copy, navigation timing, and Balance Sheet rendering. Unit tests cover the API contract; browser tests cover user-perceivable UX.

#### 2. Manual JE Form Save Draft / Save & Post UX

**Test:**
1. From an entity with accounts, open the JE form
2. Enter a balanced entry
3. Click "Save Draft" → confirm the new entry appears in the JE list with DRAFT status
4. Back in the form, enter another balanced entry
5. Click "Save & Post" (or equivalent) → confirm it appears with POSTED status

**Expected:** Save Draft creates a DRAFT entry (not auto-posted by the new API default); Save & Post still posts via the dedicated approve+post flow.

**Why human:** Visual check on button behavior, JE list state, and form-to-list navigation timing.

### Gaps Summary

No gaps. All 5 phase Success Criteria are satisfied with strong evidence in the codebase:

1. **BANK-04 closure** — `applyRules` and `TransactionInput` removed from `categorize.ts`; live production code (`matchRule`, `RuleInput`) preserved and still imported by the bank-transactions PATCH route.
2. **BANK-03 closure** — Bank-tx POST route delegates to `postJournalEntryInTx` (Plan 14-01's foundation); audit ordering corrected from POSTED→CREATED to CREATED→POSTED; atomicity preserved inside the existing outer `prisma.$transaction`; period-close errors now properly propagate.
3. **WIZ-03 closure** — JE POST API defaults to POSTED-when-balanced when `status` is omitted; wizard helper relies on this default (no code change needed in wizard helper). Manual JE form audit-switched to send explicit `status: "DRAFT"` on Save Draft, preserving its draft → approve → post UX. Toast copy refined to convey "posted" semantics.
4. **Deferred-items sweep** — All 5 remaining items (#1, #3, #5, #6, #7) marked RESOLVED with Phase 14 reference; canonical `SerializedAccount` extracted to `src/types/account.ts`; Node 25 localStorage shadowing fixed via `NODE_OPTIONS` flag (recovered 7/7 use-entity tests); base-ui Select null-coalesce + vitest 4 Mock generic fix applied at flagged sites only.
5. **Verification bar met** — `npx tsc --noEmit` returns zero errors anywhere in the project (not just touched files); `npm test` reports 543 passed / 75 todo / 0 failed (618 total) in ~12s.

**Notable cross-checks confirmed:**
- Recurring JE generator at `src/app/api/entities/[entityId]/templates/recurring/route.ts:304` was correctly NOT audit-switched (it bypasses the JE POST API and uses `tx.journalEntry.create` directly with hardcoded `status: "DRAFT"` at line 310). The new POSTED-when-balanced default does not affect it. Verified via grep.
- Holdings OBE path (`src/lib/bank-transactions/opening-balance.ts`) intentionally NOT touched — per CONTEXT.md "Holdings OBE path stays as-is" rule. Inline upserts there remain Phase 11 territory.
- All 17 Phase 14 commits land on `main`; SUMMARY files exist for all 5 plans (14-01 through 14-05).

---

*Verified: 2026-04-16T17:00:00Z*
*Verifier: Claude (gsd-verifier)*
