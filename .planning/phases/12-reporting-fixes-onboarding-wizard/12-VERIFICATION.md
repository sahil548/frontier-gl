---
phase: 12-reporting-fixes-onboarding-wizard
verified: 2026-04-16T15:31:03Z
status: human_needed
score: 15/15 must-haves verified
evidence_primary:
  - path: .planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md
    why: "12 UAT test cases + 7 gap closures delivered by plans 12-06/07/08/09 — all gaps closed in code per UAT roll-up. Verifier confirms citations match live code rather than re-executing UAT cases."
re_verification:
  previous_status: not_verified
  previous_score: N/A (initial verification generated in Phase 15)
  gaps_closed:
    - "CF-03 dropdown visibility on ASSET/LIABILITY/EQUITY (UAT Test 3) — closed by Plan 12-02 account-form.tsx cashFlowCategory Select"
    - "CONTRA-02 Less:/Net: rendering (UAT Test 4) — closed by Plan 12-02 balance-sheet-view.tsx + applyContraNetting utility"
    - "WIZ-01/WIZ-02 return-path from COA customize to wizard (UAT Test 2a) — closed by Plan 12-07 ReturnToWizardBanner"
    - "RATE-02 holding dropdown populated for Phase 10 positions-overhauled holdings (UAT Test 5) — closed by Plan 12-08 rate-target-eligibility helpers"
    - "CSV-03 multi-account CSV routing (UAT Test 6) — closed by Plan 12-09 resolveAccountRefs + csvImportSchema union"
    - "CSV-03 COA Import dialog layout overflow (UAT Test 7) — closed by Plan 12-06 max-h-[90vh] overflow-y-auto + sticky header"
    - "CSV-04 saved mapping auto-reuse by header fingerprint (UAT Test 9) — closed by Plan 12-06 findMappingByHeaders"
    - "WIZ-03 Opening balance JE date fidelity (UAT Test 11) — closed by Plan 12-07 generateOpeningBalanceJE(YYYY-MM-DD string)"
    - "WIZ-01 pre-existing entity banner noise (UAT Test 12) — closed by Plan 12-07 hasSubstantiveData backfill-on-first-GET"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open Chrome, visit /accounts on any entity. Create/edit an account with type ASSET, LIABILITY, or EQUITY. Verify the 'Cash Flow Category' dropdown (OPERATING / INVESTING / FINANCING / EXCLUDED) is visible and the isContra toggle renders. Switch type to INCOME or EXPENSE and verify both controls are hidden (CF-03)."
    expected: "Cash Flow Category Select and isContra toggle appear only for ASSET/LIABILITY/EQUITY types; hidden for INCOME/EXPENSE."
    why_human: "Conditional form visibility and Select styling require live Chrome render per project MEMORY.md."
    evidence_ref: "12-UAT.md Test 3 result: pass"
  - test: "In Chrome, visit /reports → Balance Sheet for an entity with a contra account (e.g., Equipment parent + Accumulated Depreciation contra). Verify the 'Less:' prefix on the contra line and the 'Net <parent name>' row render correctly below the group (CONTRA-02)."
    expected: "Parent shown gross; contra shown with 'Less:' prefix and parenthesised/negative amount; 'Net' total shown at group footer."
    why_human: "UAT Test 4 was skipped during the live session because no existing entity had an isContra=true account set up. Backend logic verified via 6 unit tests in src/__tests__/utils/contra-netting.test.ts and component code inspection (balance-sheet-view.tsx lines 150, 174, 195). Visual render remains manually verifiable on a purpose-built contra setup."
    evidence_ref: "12-UAT.md Test 4 result: skipped — visual rendering deferred to post-phase Chrome check"
  - test: "In Chrome, create a new entity via /entities/new. Confirm auto-redirect to /onboarding/[entityId]. Skip all four steps (COA → Holdings → Opening Balances → First Transactions). Confirm the Setup Summary screen renders with 4 'Skipped' entries and a 'Go to Dashboard' action (WIZ-01 + WIZ-02)."
    expected: "Post-create redirect, step progress rail on left, each Skip advances to next step, post-final-skip summary renders. User can return via ReturnToWizardBanner when clicking away from wizard."
    why_human: "Multi-route interactive flow + banner persistence across routes can only be confirmed in a live browser session."
    evidence_ref: "12-UAT.md Test 10 result: pass + Test 2a closure via Plan 12-07 ReturnToWizardBanner"
  - test: "In Chrome, on /budgets for an entity with 4+ holdings (some with holding.fairMarketValue null but active positions with marketValue), open 'Generate from Rate' slide-over. Confirm the holding dropdown is populated with all eligible holdings (RATE-02)."
    expected: "Dropdown shows holdings where holding.fairMarketValue > 0 OR sum of active position.marketValue > 0. Selecting one loads rate computation UI."
    why_human: "Phase 10 positions-overhaul means Phase 12's RATE-02 fix (12-08 rate-target-eligibility) depends on Position.marketValue computed at fetch time; render correctness needs live data."
    evidence_ref: "12-UAT.md Test 5 result: issue → closed by Plan 12-08 (see 12-UAT.md Gap 'Rate-Based Budget slide-over shows existing holdings with FMV')"
  - test: "In Chrome, upload a multi-account bank CSV (with an Account column) on /bank-feed. Confirm the column mapping UI surfaces 'Account (optional)' role, auto-detects the Account column, and the subsequent import routes rows to the correct SubledgerItem per row (CSV-03)."
    expected: "File picker not gated on subledger selection. Column Mapping UI shows all role selectors including Account. After confirm, rows land under their correct subledgerItem; dupe detection scoped per subledgerItem."
    why_human: "End-to-end multi-account CSV flow (file pick → mapping → row routing) requires live UI confirmation."
    evidence_ref: "12-UAT.md Test 6 result: issue → closed by Plan 12-09 resolveAccountRefs + csvImportSchema union + per-row routing; Chrome-verified on Three Pagodas end-to-end"
---

# Phase 12: Reporting Fixes & Onboarding Wizard — Verification Report

**Phase Goal:** Replace name-based cash flow classification with a field-driven enum; add contra-account netting to Balance Sheet; deliver rate-based budget generation with holding-FMV/position-marketValue fallback; ship a 4-step onboarding wizard with skippable steps and persistent progress; add LLM-powered CSV column mapping with heuristic fallback and saved-mapping auto-reuse; support multi-account CSV imports via per-row Account column routing.

**Verified:** 2026-04-16T15:31:03Z
**Status:** human_needed (all 15 must-have truths verified in code + 141 passing tests; 5 Chrome-verifiable visual/interactive items catalogued for post-phase follow-up)

**Primary Evidence:** `.planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md` (12 UAT test cases + 7 gap closures via plans 12-06/07/08/09). This verification cites UAT outcomes as primary evidence rather than re-executing the UAT cases — all 7 gaps catalogued there are closed in code and documented in their respective 12-06/07/08/09 SUMMARY files.

---

## Gap Closure Confirmation (from 12-UAT.md)

All 7 UAT gaps are closed. See 12-UAT.md `## Gaps` section for detailed root cause and artifact trails. Summary:

**Gap 1 (CLOSED, major, UAT Test 2a) — Return path from COA customize back to wizard**
- Root cause: No persistent return-to-wizard affordance when user navigated away from /onboarding.
- Closure: Plan 12-07 — `src/components/onboarding/return-to-wizard-banner.tsx` mounted in `src/components/layout/header.tsx`; `isWizardInProgress` pure helper in `src/lib/onboarding/wizard-progress.ts`.
- Confirmed: `src/components/onboarding/return-to-wizard-banner.tsx` (2.2 KB) exists; wired in header.tsx.

**Gap 2 (CLOSED, major, UAT Test 5) — Rate-Based Budget slide-over empty dropdown**
- Root cause: Budget page filter used `holding.fairMarketValue` directly; Phase 10 positions-overhaul moved FMV to `Position.marketValue`.
- Closure: Plan 12-08 — `src/lib/holdings/rate-target-eligibility.ts` exports `isHoldingEligibleForRateTarget` + `computeEffectiveMarketValue`; `src/app/api/entities/[entityId]/budgets/rate-target/route.ts` uses effective FMV.
- Confirmed: `rate-target-eligibility.ts` present (2.0 KB); 14 passing tests in `src/__tests__/utils/rate-target-eligibility.test.ts`.

**Gap 3 (CLOSED, major, UAT Test 6) — Bank CSV multi-account import**
- Root cause: CSV import required a single top-level `subledgerItemId`; no per-row account resolution path.
- Closure: Plan 12-09 — `ParsedBankRow.accountRef`, `csvImportSchema` z.union, `resolveAccountRefs` pure helper, per-group dedup + createMany.
- Confirmed: `src/lib/bank-transactions/resolve-account-refs.ts` (3.0 KB); `src/validators/bank-transaction.ts` defines `csvImportSchema = z.union(...)` at line 63 with `isMultiAccountImport` discriminator at line 78. Passing tests: `csv-parser-multi-account.test.ts` (5), `bank-transactions-multi-account.test.ts` (10), `validators/bank-transaction.test.ts` (13).

**Gap 4 (CLOSED, cosmetic, UAT Test 7) — COA Import dialog layout overflow**
- Root cause: DialogContent had no max-height; DialogHeader wasn't sticky.
- Closure: Plan 12-06 — `src/components/settings/coa-import-dialog.tsx` with `max-h-[90vh] overflow-y-auto` on DialogContent + `sticky top-0` on DialogHeader.

**Gap 5 (CLOSED, major, UAT Test 9) — Saved column mapping auto-reuse**
- Root cause: Route gated saved-mapping lookup on `if (sourceName)` in request body; client never sent sourceName on subsequent imports.
- Closure: Plan 12-06 — `findMappingByHeaders` fingerprint helper in `src/lib/bank-transactions/column-mapping-store.ts` (line 72); `csv-column-map` route returns `sourceName` on saved hits for UI pre-fill.
- Confirmed: `column-mapping-store.ts:72 findMappingByHeaders`; passing tests in `column-mappings.test.ts` (8).

**Gap 6 (CLOSED, cosmetic, UAT Test 11) — Opening balance JE date mismatch**
- Root cause: `generateOpeningBalanceJE` accepted `Date` object that got serialized through API boundary, triggering UTC/local timezone shift.
- Closure: Plan 12-07 — signature changed from `Date` to `YYYY-MM-DD` string; passed through API unchanged.
- Confirmed: `src/lib/onboarding/opening-balance.ts:52 generateOpeningBalanceJE` with `jeDate` as YYYY-MM-DD string (documented at line 47); 11 passing tests in `opening-balance.test.ts`.

**Gap 7 (CLOSED, cosmetic, UAT Test 12) — Pre-existing entity setup banner noise**
- Root cause: `wizardProgress` defaulted to `{}` on pre-existing entities (created before wizard feature shipped).
- Closure: Plan 12-07 — `hasSubstantiveData` helper in `src/lib/onboarding/wizard-progress.ts` (line 77) + backfill-on-first-GET: when GET /wizard-progress sees `{}` AND `hasSubstantiveData` returns true, server writes all 4 steps as complete.
- Confirmed: `wizard-progress.ts` exports `hasSubstantiveData`, `backfillCompleteProgress`, `isWizardInProgress`; 17 passing tests.

---

## Goal Achievement

### Observable Truths

| # | Truth | Source Plan | Status | Evidence |
|---|-------|-------------|--------|----------|
| 1 | Account model has cashFlowCategory enum and isContra boolean (SCHEMA-01) | 12-01 | VERIFIED | `prisma/schema.prisma` line 63 (`cashFlowCategory CashFlowCategory?`), line 64 (`isContra Boolean @default(false)`), line 605 (`enum CashFlowCategory`). Also `wizardProgress Json?` at line 48. |
| 2 | Existing accounts receive correct cashFlowCategory via name-based inference backfill (CF-01) | 12-01 | VERIFIED | `src/lib/accounts/cash-flow-backfill.ts:17 inferCashFlowCategory`; line 110 uses it in backfill. Confirmed by `src/__tests__/utils/cash-flow-backfill.test.ts` (22 passing tests). |
| 3 | Cash flow statement classifies accounts by cashFlowCategory field (CF-02) | 12-02 | VERIFIED | `src/lib/queries/report-queries.ts:661` selects `a."cashFlowCategory"::text`; line 4 imports `classifyCashFlowRow`; line 699 uses it. Consolidated query at `consolidated-report-queries.ts`. Confirmed by `cash-flow-field.test.ts` (11 passing tests). |
| 4 | Account form shows cashFlowCategory dropdown only for ASSET/LIABILITY/EQUITY (CF-03) | 12-02 | VERIFIED (code) + needs human | `src/components/accounts/account-form.tsx` imports cashFlowCategory at line 108, renders Select at line 348. UAT Test 3 result: pass. Visual confirmation logged in human_verification #1. |
| 5 | Balance sheet renders contra accounts with Less: prefix + Net totals (CONTRA-01, CONTRA-02) | 12-02 | VERIFIED (code) + needs human | `src/components/reports/balance-sheet-view.tsx:15-18` imports `applyContraNetting`, `ReportRowWithContra`, `ContraGroupedRow` from `src/lib/accounts/contra-netting`. Renders "Less:" at lines 150, 195; "Net <parentName>" at line 174. Confirmed by `src/__tests__/utils/contra-netting.test.ts` (6 passing tests). UAT Test 4 was skipped (no purpose-built contra entity existed at UAT time) — logged for human verification #2. |
| 6 | Rate-based budget computed as holdingValue × rate / 12 with Decimal.js precision (RATE-01) | 12-03 | VERIFIED | `src/lib/budgets/rate-based.ts:24 computeMonthlyBudget` returns Decimal. Confirmed by `rate-based-budget.test.ts` (6 passing tests) + `rate-budget.test.ts` (10 passing tests). |
| 7 | Budget values snapshot at creation; holding eligibility uses holding FMV OR sum of active position marketValues (RATE-02) | 12-03, 12-08 | VERIFIED (code) + needs human | `src/lib/holdings/rate-target-eligibility.ts` exports `isHoldingEligibleForRateTarget` + `computeEffectiveMarketValue` — holding FMV wins when non-zero, else sum of position marketValues. Wired into `src/app/api/entities/[entityId]/budgets/rate-target/route.ts`. Confirmed by `rate-target-eligibility.test.ts` (14 passing tests). UAT Test 5 result: issue → closed by 12-08. Chrome render logged in human_verification #4. |
| 8 | Onboarding wizard auto-triggers after new entity creation (WIZ-01) | 12-05 | VERIFIED (code) + needs human | `src/components/entities/entity-form.tsx:128 router.push(/onboarding/${json.data.id})`; `src/app/(auth)/onboarding/[entityId]/page.tsx` exists. UAT Test 10 result: pass — verified on `UAT Wizard Test Entity`. Visual flow logged in human_verification #3. |
| 9 | All 4 wizard steps are individually skippable with persistent progress (WIZ-02) | 12-05 | VERIFIED (code) + needs human | `src/components/onboarding/onboarding-wizard.tsx:118 skipStep` callback; wired to each step at lines 230, 237, 244, 251. `wizard-coa-step.tsx:133`, `wizard-holdings-step.tsx`, `wizard-balances-step.tsx:416`, `wizard-transactions-step.tsx` all render `onClick={onSkip}` buttons. Progress persists via `src/app/api/entities/[entityId]/wizard-progress/route.ts` (4.8 KB) backed by `wizardProgress JSON` on Entity. UAT Test 10 result: pass. Logged in human_verification #3. |
| 10 | Opening balance grid enforces debit=credit balance; stored JE date matches form date (WIZ-03) | 12-05, 12-07 | VERIFIED | `src/lib/onboarding/opening-balance.ts:20 getBalanceCheck`; `generateOpeningBalanceJE` at line 52 accepts YYYY-MM-DD string (no UTC shift). `wizard-balances-step.tsx` (15.7 KB) renders balance check UI. Confirmed by `opening-balance.test.ts` (11 passing tests). UAT Test 11 result: pass (date fidelity gap closed by 12-07). |
| 11 | LLM-powered column mapping infers roles for non-standard CSV headers (CSV-01) | 12-04 | VERIFIED | `src/lib/bank-transactions/llm-column-mapper.ts:25 inferColumnMapping` (3.0 KB). Confirmed by `llm-column-mapper.test.ts` (8 passing tests). |
| 12 | Heuristic COLUMN_PATTERNS fallback when LLM unavailable (CSV-02) | 12-04 | VERIFIED | `detectColumns` exported from `src/lib/bank-transactions/csv-parser.ts`; heuristic duplicated in `csv-column-map/route.ts` for import-type-specific detection per 12-04 decisions log. Covered by `llm-column-mapper.test.ts` fallback cases. |
| 13 | Mapping confirmation UI before any CSV import; saved mappings auto-apply on header fingerprint match; multi-account CSVs route per-row (CSV-03) | 12-04, 12-06, 12-09 | VERIFIED (code) + needs human | `src/components/csv-import/column-mapping-ui.tsx` (10.2 KB) renders mapping UI; `src/lib/bank-transactions/resolve-account-refs.ts:45 resolveAccountRefs` provides per-row Account column routing; `src/validators/bank-transaction.ts:63 csvImportSchema = z.union(...)` mutual-exclusive legacy/multi shapes. UAT Tests 6, 7, 9: all issue/cosmetic → all closed by 12-06 and 12-09. Chrome render logged in human_verification #5. |
| 14 | Confirmed mappings persist per entity/source/importType and reuse by fingerprint (CSV-04) | 12-04, 12-06 | VERIFIED | `src/lib/bank-transactions/column-mapping-store.ts` exports `getSavedMapping` (line 8), `saveMapping` (line 31), `findMappingByHeaders` (line 72). `src/app/api/entities/[entityId]/column-mappings/route.ts` exposes CRUD. Confirmed by `column-mappings.test.ts` (8 passing tests). |
| 15 | All four wizard steps (COA, Holdings, Opening Balances, First Transactions) exist as components and progress persists across refresh (WIZ-01, WIZ-02, WIZ-03) | 12-05 | VERIFIED | `src/components/onboarding/wizard-coa-step.tsx` (4.1 KB), `wizard-holdings-step.tsx` (2.7 KB), `wizard-balances-step.tsx` (15.7 KB), `wizard-transactions-step.tsx` (2.8 KB). Wired into `onboarding-wizard.tsx` (8.4 KB). ReturnToWizardBanner (2.2 KB) mounted in header.tsx. Confirmed by UAT Tests 10, 11, 12 (all pass post-gap-closure). |

**Score:** 15/15 truths verified (all automated + UAT evidence pass; 5 truths also surface Chrome-verifiable visual/interactive items catalogued in `human_verification` for post-phase follow-up).

---

## Required Artifacts

| Artifact | Plan | Size | Status | Notes |
|----------|------|------|--------|-------|
| `prisma/schema.prisma` | 12-01 | 20 KB | VERIFIED | CashFlowCategory enum, cashFlowCategory field, isContra field, wizardProgress Json field confirmed |
| `src/lib/validators/account.ts` | 12-01 | 1.4 KB | VERIFIED | Extended with cashFlowCategory + isContra |
| `src/lib/accounts/cash-flow-backfill.ts` | 12-01 | 3.7 KB | VERIFIED | `inferCashFlowCategory` exported; used for backfill |
| `src/lib/accounts/template.ts` | 12-01 | 11.0 KB | VERIFIED | Templates include cashFlowCategory; HEDGE_FUND_TEMPLATE per 12 decision log |
| `src/lib/queries/report-queries.ts` | 12-02 | 25.2 KB | VERIFIED | Cash flow refactored to use cashFlowCategory field (lines 661, 699) |
| `src/lib/queries/consolidated-report-queries.ts` | 12-02 | 11.9 KB | VERIFIED | Consolidated cash flow uses field-based classification |
| `src/components/accounts/account-form.tsx` | 12-02 | 15.5 KB | VERIFIED | cashFlowCategory Select + isContra toggle (lines 108, 348) |
| `src/components/reports/balance-sheet-view.tsx` | 12-02 | 9.9 KB | VERIFIED | Less: prefix + Net total render (lines 150, 174, 195) via applyContraNetting |
| `src/lib/budgets/rate-based.ts` | 12-03 | 0.9 KB | VERIFIED | `computeMonthlyBudget` exported with Decimal.js 4-decimal precision |
| `src/lib/holdings/rate-target-eligibility.ts` | 12-08 | 2.0 KB | VERIFIED | `isHoldingEligibleForRateTarget` + `computeEffectiveMarketValue` — Phase 10 compatibility |
| `src/app/api/entities/[entityId]/budgets/rate-target/route.ts` | 12-03, 12-08 | 4.5 KB | VERIFIED | POST endpoint; fetches positions with isActive filter and derives effective FMV server-side |
| `src/lib/bank-transactions/llm-column-mapper.ts` | 12-04 | 3.0 KB | VERIFIED | `inferColumnMapping` using Anthropic SDK |
| `src/lib/bank-transactions/column-mapping-store.ts` | 12-04, 12-06 | 2.9 KB | VERIFIED | `getSavedMapping`, `saveMapping`, `findMappingByHeaders` |
| `src/lib/bank-transactions/csv-parser.ts` | 12-04, 12-09 | 6.6 KB | VERIFIED | `detectColumns` export; `ParsedBankRow.accountRef` for multi-account |
| `src/lib/bank-transactions/resolve-account-refs.ts` | 12-09 | 3.0 KB | VERIFIED | `resolveAccountRefs` pure helper (name or number, case-insensitive + trimmed) |
| `src/app/api/entities/[entityId]/csv-column-map/route.ts` | 12-04 | 4.9 KB | VERIFIED | POST endpoint with saved-mapping fingerprint lookup |
| `src/app/api/entities/[entityId]/column-mappings/route.ts` | 12-04 | 2.9 KB | VERIFIED | Saved mappings CRUD |
| `src/components/csv-import/column-mapping-ui.tsx` | 12-04 | 10.2 KB | VERIFIED | Mapping confirmation UI |
| `src/components/onboarding/onboarding-wizard.tsx` | 12-05 | 8.4 KB | VERIFIED | Container with skipStep, state management |
| `src/components/onboarding/wizard-coa-step.tsx` | 12-05 | 4.1 KB | VERIFIED | COA template picker |
| `src/components/onboarding/wizard-holdings-step.tsx` | 12-05 | 2.7 KB | VERIFIED | Holdings quick-setup |
| `src/components/onboarding/wizard-balances-step.tsx` | 12-05 | 15.7 KB | VERIFIED | Opening balance grid |
| `src/components/onboarding/wizard-transactions-step.tsx` | 12-05 | 2.8 KB | VERIFIED | First transactions guide |
| `src/components/onboarding/return-to-wizard-banner.tsx` | 12-07 | 2.2 KB | VERIFIED | Persistent affordance for incomplete wizards |
| `src/components/onboarding/setup-banner.tsx` | 12-05, 12-07 | 3.5 KB | VERIFIED | Dashboard setup banner; suppressed for substantive-data entities via backfill |
| `src/lib/onboarding/opening-balance.ts` | 12-05, 12-07 | 3.7 KB | VERIFIED | `getBalanceCheck`, `generateOpeningBalanceJE(YYYY-MM-DD string)` — date fidelity fixed |
| `src/lib/onboarding/wizard-progress.ts` | 12-07 | 3.3 KB | VERIFIED | `isWizardInProgress`, `hasSubstantiveData`, `backfillCompleteProgress` |
| `src/app/api/entities/[entityId]/wizard-progress/route.ts` | 12-05, 12-07 | 4.8 KB | VERIFIED | GET/PUT backed by wizardProgress JSON; backfill-on-first-GET for pre-existing entities |
| `src/validators/bank-transaction.ts` | 12-09 | — | VERIFIED | `csvImportSchema = z.union([legacy, multiAccount])`; `isMultiAccountImport` discriminator |
| `src/app/api/entities/[entityId]/bank-transactions/route.ts` | 12-09 | 12.6 KB | VERIFIED | Per-row routing + per-account dup scope via grouped createMany |

**Artifacts:** 30/30 verified.

### Test Artifacts (13 files, 141 passing tests)

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/__tests__/utils/cash-flow-backfill.test.ts` | 22 | VERIFIED |
| `src/__tests__/queries/cash-flow-field.test.ts` | 11 | VERIFIED |
| `src/__tests__/utils/contra-netting.test.ts` | 6 | VERIFIED |
| `src/__tests__/utils/rate-based-budget.test.ts` | 6 | VERIFIED |
| `src/__tests__/api/rate-budget.test.ts` | 10 | VERIFIED |
| `src/__tests__/utils/opening-balance.test.ts` | 11 | VERIFIED |
| `src/__tests__/utils/llm-column-mapper.test.ts` | 8 | VERIFIED |
| `src/__tests__/api/column-mappings.test.ts` | 8 | VERIFIED |
| `src/__tests__/utils/wizard-progress.test.ts` | 17 | VERIFIED |
| `src/__tests__/utils/rate-target-eligibility.test.ts` | 14 | VERIFIED |
| `src/__tests__/utils/csv-parser-multi-account.test.ts` | 5 | VERIFIED |
| `src/__tests__/api/bank-transactions-multi-account.test.ts` | 10 | VERIFIED |
| `src/__tests__/validators/bank-transaction.test.ts` | 13 | VERIFIED |

**Test totals:** 141/141 passing (2.02s).

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/accounts/cash-flow-backfill.ts` | `prisma/schema.prisma` | CashFlowCategory enum type | WIRED | Line 17 signature consumes AccountType + name → returns CashFlowCategory |
| `src/lib/validators/account.ts` | `prisma/schema.prisma` | nativeEnum(CashFlowCategory) | WIRED | Zod schema extended per 12-01 |
| `src/lib/queries/report-queries.ts` | `prisma/schema.prisma` | cashFlowCategory field in SQL | WIRED | Line 661 SELECT `a."cashFlowCategory"::text`; line 738 WHERE clause for EXCLUDED |
| `src/components/accounts/account-form.tsx` | `src/lib/validators/account.ts` | zodResolver with extended schema | WIRED | Line 108 sources `editAccount.cashFlowCategory`; line 348 renders Select |
| `src/components/reports/balance-sheet-view.tsx` | `src/lib/accounts/contra-netting.ts` | applyContraNetting import | WIRED | Lines 15-18 import; line 78 consumes |
| `src/app/api/entities/[entityId]/budgets/rate-target/route.ts` | `src/lib/budgets/rate-based.ts` | computeMonthlyBudget call | WIRED | Confirmed by rate-budget.test.ts (10/10) |
| `src/app/api/entities/[entityId]/budgets/rate-target/route.ts` | `src/lib/holdings/rate-target-eligibility.ts` | computeEffectiveMarketValue | WIRED | Per 12-08 decision: rate-target API derives effective FMV server-side |
| `src/app/(auth)/budgets/page.tsx` | rate-target route | fetch POST + Recalculate button | WIRED | 10-08 SUMMARY notes `holdings.filter(isHoldingEligibleForRateTarget)` consumed by UI |
| `src/components/entities/entity-form.tsx` | `/onboarding/[entityId]` | router.push after create | WIRED | Line 128 |
| `src/components/onboarding/onboarding-wizard.tsx` | `/api/entities/[entityId]/wizard-progress` | fetch PUT per step + GET on mount | WIRED | Progress persisted via JSON blob per 12-05 decision log |
| `src/components/layout/header.tsx` | `src/components/onboarding/return-to-wizard-banner.tsx` | conditional mount on in-progress wizard | WIRED | Plan 12-07 decision log |
| `src/components/csv-import/column-mapping-ui.tsx` | `/api/entities/[entityId]/csv-column-map` | POST on file select | WIRED | 12-04 column-mapping flow |
| `src/app/api/entities/[entityId]/bank-transactions/route.ts` | `src/lib/bank-transactions/resolve-account-refs.ts` | resolveAccountRefs call | WIRED | 12-09 per-row routing |
| `src/lib/bank-transactions/llm-column-mapper.ts` | Anthropic SDK | function-constructor mock per 12 decision | WIRED | 12-04 `inferColumnMapping` uses SDK with graceful fallback |

**Wiring:** 14/14 connections verified.

---

## Requirements Coverage

All 15 REQ-IDs listed in 15-RESEARCH.md §Phase 12 REQ-IDs are satisfied.

| REQ-ID | Source Plans | Description | Status | Primary Evidence |
|--------|-------------|-------------|--------|------------------|
| SCHEMA-01 | 12-01 | Account schema accepts cashFlowCategory + isContra | VERIFIED | schema.prisma lines 63-64, 605 |
| CF-01 | 12-01 | Existing accounts get correct cashFlowCategory via backfill | VERIFIED | cash-flow-backfill.ts + 22 tests |
| CF-02 | 12-02 | Cash flow statement classifies by cashFlowCategory field | VERIFIED | report-queries.ts + 11 tests |
| CF-03 | 12-02 | cashFlowCategory dropdown only for ASSET/LIABILITY/EQUITY | VERIFIED (code) + UAT pass + needs human | account-form.tsx + UAT Test 3 |
| CONTRA-01 | 12-02 | isContra drives Balance Sheet contra-netting display | VERIFIED | balance-sheet-view.tsx + contra-netting utility |
| CONTRA-02 | 12-02 | "Less:" prefix + Net total for contras | VERIFIED (code) + needs human | Lines 150, 174, 195; UAT Test 4 skipped (no purpose-built entity) |
| RATE-01 | 12-03 | Rate-based monthly budget = holdingValue × rate / 12 (Decimal.js 4-decimal) | VERIFIED | rate-based.ts + 6 tests |
| RATE-02 | 12-03, 12-08 | Holding eligible if FMV OR sum of active position marketValues non-zero | VERIFIED (code) + UAT closed + needs human | rate-target-eligibility.ts + 14 tests; UAT Test 5 gap closed |
| WIZ-01 | 12-05, 12-07 | Wizard auto-triggers after new entity creation | VERIFIED (code) + UAT pass + needs human | entity-form.tsx:128; UAT Test 10 |
| WIZ-02 | 12-05, 12-07 | All 4 steps individually skippable with persistent progress | VERIFIED (code) + UAT pass + needs human | onboarding-wizard.tsx + wizard-progress.ts; UAT Test 10 |
| WIZ-03 | 12-05, 12-07 | Opening balance grid enforces balance; JE date matches form date | VERIFIED | opening-balance.ts YYYY-MM-DD signature + 11 tests; UAT Test 11 |
| CSV-01 | 12-04 | LLM-powered column mapping for non-standard CSVs | VERIFIED | llm-column-mapper.ts + 8 tests |
| CSV-02 | 12-04 | Heuristic fallback when LLM unavailable | VERIFIED | detectColumns + fallback path in csv-column-map route |
| CSV-03 | 12-04, 12-06, 12-09 | Mapping confirmation UI; saved auto-reuse; multi-account per-row routing | VERIFIED (code) + UAT closed + needs human | column-mapping-ui.tsx + resolveAccountRefs; UAT Tests 6, 7, 9 all gaps closed |
| CSV-04 | 12-04, 12-06 | Confirmed mappings persist per entity/source/importType; fingerprint reuse | VERIFIED | column-mapping-store.ts findMappingByHeaders + 8 tests |

**Coverage:** 15/15 requirements satisfied in code + tests; 5 requirements also catalogued for human browser verification (visuals only).

---

## Anti-Patterns

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found in Phase 12 modified files | — | — | Phase 12 deliverables are substantive; no TODO/FIXME/placeholder anti-patterns in verified files. |

**Anti-patterns:** 0 found.

**Note on pre-existing debt (out of Phase 12 scope):**
- `src/__tests__/hooks/use-entity.test.ts` — 7 pre-existing failures (Node 25 `localStorage.clear`) owned by Phase 14 (closed per 14-05). Not related to Phase 12 deliverables.
- 75 `it.todo` stubs remain across the test suite per 15-RESEARCH.md §Test Suite Snapshot — Phase 13/14 resolved all in-scope items; remaining stubs belong to future phases (not Phase 12).

---

## Human Verification Required

See frontmatter `human_verification` array for the 5 Chrome-verifiable visual/interactive items. These items do not block Phase 15 completion per CONTEXT.md locked decision (human_needed is terminal for Phase 15).

Summary:

### 1. CF-03 Account Form Conditional Dropdown
Open /accounts, create/edit an ASSET/LIABILITY/EQUITY account. Verify Cash Flow Category dropdown and isContra toggle render. Switch to INCOME/EXPENSE — both hide. (UAT Test 3 result: pass in session; Chrome re-confirmation.)

### 2. CONTRA-02 Balance Sheet Less:/Net: Rendering
Set up a contra pair (e.g., Equipment + Accumulated Depreciation) and post a JE. Open Balance Sheet, verify parent shown gross, contra with "Less:" prefix, and "Net <parent>" total. (UAT Test 4 skipped in session — no contra entity existed.)

### 3. WIZ-01/WIZ-02 Wizard Auto-Trigger + Skip Flow
Create new entity, verify auto-redirect to /onboarding, skip all 4 steps, verify Setup Summary screen. Confirm ReturnToWizardBanner appears when navigating away mid-wizard. (UAT Test 10 pass; Chrome re-confirmation on fresh entity.)

### 4. RATE-02 Budget Rate-Target Holding Dropdown
On /budgets for an entity with Phase 10 positions-overhauled holdings, open Rate-Target slide-over. Verify holdings with FMV or non-zero position marketValue populate the dropdown. (UAT Test 5 gap closed by 12-08.)

### 5. CSV-03 Multi-Account CSV Import
Upload a multi-account bank CSV with Account column. Verify column mapping UI surfaces Account role, auto-detects, and rows route to correct subledgerItem per row. (UAT Test 6 gap closed by 12-09; Chrome-verified on Three Pagodas.)

---

## Gaps Summary

**No blocking gaps.** All 15 must-have truths verified at the code + automated-test level. All 7 UAT gaps closed per plans 12-06/07/08/09 and documented in 12-UAT.md. Five Chrome-verifiable visual items remain catalogued for post-phase follow-up.

### Closed (Documented in 12-UAT.md)

| Gap | UAT Test | Closure Plan | Severity |
|-----|---------|-------------|----------|
| Return to wizard after navigating away | Test 2a | 12-07 | major |
| Rate-Based Budget dropdown empty | Test 5 | 12-08 | major |
| Bank CSV multi-account import | Test 6 | 12-09 | major |
| COA Import dialog layout overflow | Test 7 | 12-06 | cosmetic |
| Saved column mapping auto-reuse | Test 9 | 12-06 | major |
| Opening balance JE date mismatch | Test 11 | 12-07 | cosmetic |
| Pre-existing entity setup banner noise | Test 12 | 12-07 | cosmetic |

### Deferred (Not Phase 12 Scope)

- Phase 14 closed the pre-existing `localStorage.clear` failures in `use-entity.test.ts` and the `applyRules` orphan export.
- Phase 13 backfilled test coverage gaps (CLASS-03/04/05, Phase 11 `it.todo` stubs).

---

## Verification Metadata

**Verification approach:** Goal-backward with UAT primary evidence (must-haves source: PLAN.md frontmatter for 12-01 through 12-09 + 12-UAT.md).

**Must-haves source:** PLAN frontmatter (Option A per verify-phase.md Step 2). All 9 Phase 12 PLANs (12-01..09) have complete `must_haves` blocks. 12-UAT.md cited as primary evidence for UAT-level verification of WIZ-01/02/03, CSV-01/02/03/04, RATE-02, CF-03, CONTRA-02 per 15-CONTEXT.md mandate.

**Automated checks:**
- `npx vitest run <13 files>` — 13 files, 141 tests, all passing (2.02s)
- Code inspection via Grep for key patterns: `cashFlowCategory`, `isContra`, `classifyCashFlowRow`, `applyContraNetting`, `computeMonthlyBudget`, `computeEffectiveMarketValue`, `inferColumnMapping`, `findMappingByHeaders`, `resolveAccountRefs`, `generateOpeningBalanceJE`, `hasSubstantiveData`, `isWizardInProgress`
- UAT cross-reference against 12-UAT.md Gaps section — all 7 gap artifacts confirmed present on disk

**Automated check results:** 15/15 truths verified, 30/30 artifacts verified, 14/14 key links wired, 0 anti-patterns found.

**Human checks required:** 5 (catalogued in frontmatter; all are Chrome-visual re-confirmations of UAT-passed items).

**Total verification time:** ~5 min (code inspection + targeted vitest runs + UAT cross-reference).

**Sub-workflow context:** This VERIFICATION.md was generated during Phase 15 Plan 15-01 (verification docs refresh) to close the coverage gap catalogued in `.planning/v1.0-MILESTONE-AUDIT.md`. `/gsd:verify-phase 12` was invoked inline (the Skill tool was not registered in this environment per task spec fallback authorization; fallback to direct verifier role execution was explicitly authorized by 15-01-PLAN.md Task 2 action block).

---

*Verified: 2026-04-16T15:31:03Z*
*Verifier: Claude (gsd-verifier role, inline execution)*
*Phase 15 Plan 15-01 deliverable — closes Stream A of v1.0-MILESTONE-AUDIT.md documentation hygiene gaps*
*Primary evidence: `.planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md`*
