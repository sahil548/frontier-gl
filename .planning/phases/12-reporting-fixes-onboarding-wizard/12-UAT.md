---
status: complete
phase: 12-reporting-fixes-onboarding-wizard
source:
  - 12-00-SUMMARY.md
  - 12-01-SUMMARY.md
  - 12-02-SUMMARY.md
  - 12-03-SUMMARY.md
  - 12-04-SUMMARY.md
  - 12-05-SUMMARY.md
  - 12-06-SUMMARY.md
  - 12-07-SUMMARY.md
  - 12-08-SUMMARY.md
  - 12-09-SUMMARY.md
started: 2026-04-15T01:36:50Z
updated: 2026-04-15T04:55:00Z
gap_closure: all gaps addressed by plans 12-06 / 12-07 / 12-08 / 12-09
---

## Current Test

status: all tests complete; all 7 gaps closed by plans 12-06 / 12-07 / 12-08 / 12-09
awaiting: phase roll-up

## Tests

### 1. Cold Start Smoke Test
expected: Kill running dev server, clear .next, restart from scratch. Server boots without errors, Prisma loads, dashboard route returns live data. No schema out-of-sync errors.
result: pass
notes: "Next.js Ready in 1067ms, middleware compiled, dashboard loaded live totals + period banner for Three Pagodas, no Prisma out-of-sync errors."

### 2. Hedge Fund COA Template Import
expected: On a fresh entity, select "Hedge Fund" template in COA import. Template imports prime brokerage structure — long/short securities accounts, management/performance fee accounts, and partner capital accounts appear in the chart of accounts.
result: pass
notes: "Template itself works. See Gap — no return path from COA page back to wizard."

### 2a. Wizard Return Path from COA Customize
expected: After clicking "Customize accounts" in the wizard (which navigates to /accounts), there should be an obvious way to return to the wizard — a back link, breadcrumb, or persistent "Return to Setup" affordance on the COA page while the wizard is incomplete.
result: issue
reported: "yes that works but when clicking away from the wizard to check on the COA i now cant get back to the wizard which is not helpful"
severity: major

### 3. Account Form: cashFlowCategory Dropdown Conditional (CF-03)
expected: When creating/editing an account with type ASSET, LIABILITY, or EQUITY — a "Cash Flow Category" dropdown (OPERATING / INVESTING / FINANCING / EXCLUDED) is visible. When type is INCOME or EXPENSE — the dropdown is hidden. Same for the isContra toggle.
result: pass

### 4. Balance Sheet Contra Account Display (CONTRA-02)
expected: On an entity with a contra account (e.g., Accumulated Depreciation under Equipment), the balance sheet shows the parent ("Equipment: $50,000"), indented contra line with "Less:" prefix ("Less: Accumulated Depreciation: $(20,000)"), and a "Net" total ("Net Equipment: $30,000").
result: skipped
reason: "No existing entity has an isContra=true account set up (neither Family Office nor Hedge Fund template marks any account as contra). Setting up Equipment + Accumulated Depreciation + posting JE purely to verify visual rendering was impractical in this session (Chrome extension hit a detached-command state mid-setup). Backend logic verified via 6 unit tests in src/__tests__/utils/contra-netting.test.ts; account-creation UX verified via Test 3. Visual rendering of 'Less:'/'Net:' on /reports balance sheet remains manually verifiable."

### 5. Rate-Based Budget Generation
expected: On the Budgets page, a "Generate from Rate" button opens a slide-over. Pick a holding with a fair market value, an income account, and enter an annual rate (e.g., 8%). Click Generate — 12 monthly budget lines appear in the grid with amounts = (marketValue × rate / 12). Recalculate button re-runs with updated holding value.
result: issue
reported: "holding dropdown empty when there are 4 holdings in the system"
severity: major

### 6. Bank CSV Import Column Mapping UI (CSV-03)
expected: On the Bank Feed page, upload a CSV. Before rows import, a "Column Mapping" confirmation panel appears showing headers mapped to roles (Date / Description / Amount / etc.) with dropdowns for each. A source badge shows "AI-detected", "auto-detected", or "saved". User can adjust before proceeding.
result: pass
notes: "Column mapping UI works as specified. User flagged architectural gap (logged separately): CSV import is single-account-scoped — can't import a multi-account CSV where Account is a column/dimension alongside Date/Amount/etc."

### 7. COA CSV Import Column Mapping UI
expected: In Settings → COA → Import dialog, upload a CSV. A mapping confirmation panel appears with Account Number / Name / Type / Parent role selectors before the import is applied.
result: pass
notes: "Functionally works. Verified by Claude in Chrome. Uploaded /tmp/test-coa.csv with non-standard headers (Acct #, Account Name, Category, Parent, Notes). Column Mapping panel rendered with Auto-detected badge, all 5 fields (Account Number, Name, Type, Description, Parent Number) correctly auto-mapped with Sample Values, dropdowns to adjust, and optional Source name field for saving the mapping. User flagged layout as 'a bit screwy' — logged as cosmetic gap."

### 8. Budget CSV Import Column Mapping UI
expected: On the Budgets page, upload a CSV. A column mapping confirmation panel appears with Account / Month / Amount roles before rows are written to the budget.
result: pass
notes: "Verified by Claude in Chrome. Uploaded /tmp/test-budget.csv. Column Mapping panel renders inline on the Budgets page (not modal — cleaner layout than COA). Auto-detected badge shown. All required roles present: Account Number → Account Number, Month → Period, Year → __none__, Amount → Budget Amount. Sample Values displayed. Source name field and Confirm & Import button work as expected. Layout is clean and readable — no clipping issues like Test 7."

### 9. Saved Mapping Reuse
expected: After confirming a mapping with a source name (e.g., "Chase Checking"), a subsequent import from the same source pre-applies that saved mapping automatically. Source badge reads "saved" instead of "AI-detected".
result: issue
reported: "Verified by Claude in Chrome. First import: bank CSV uploaded with sourceName='TestSource-UAT'. Second import (same columns, diff data): badge still reads 'Auto-detected' (heuristic), Source name field empty. Saved mapping NOT being reused. Root cause in src/app/api/entities/[entityId]/csv-column-map/route.ts:99: saved-mapping lookup gated on `if (sourceName)` in request body, but client (column-mapping-ui.tsx:84-92) never sends sourceName on subsequent imports. Needs header-fingerprint match server-side, or client-side pre-fetch of saved mappings by importType."
severity: major

### 10. Wizard Triggers + All Steps Skippable (WIZ-01, WIZ-02)
expected: Create a new entity. Wizard auto-appears at /onboarding/[entityId] with 4 steps (COA, Holdings, Opening Balances, First Transactions). Skip button advances through each. After the 4th skip, a "Setup Complete" screen appears with a "Go to Dashboard" action.
result: pass
notes: "Verified by Claude in Chrome. Created entity 'UAT Wizard Test Entity' (LLC, 12-31 FYE, BLANK COA). Post-create redirect landed on /onboarding/[entityId] showing 'Step 1 of 4 -- All steps can be skipped'. Progress rail on left showed all 4 steps. Skipped each in order: COA → Holdings → Opening Balances → First Transactions. After 4th skip, Setup Summary screen rendered with green check, all 4 steps listed as Skipped, and 'Go to Dashboard' button. Minor label deviation: screen titled 'Setup Summary' not 'Setup Complete' — not a defect."

### 11. Opening Balance Grid Balance Check + JE Generation (WIZ-03)
expected: On the Opening Balances step, enter unbalanced amounts — a red "Difference" indicator appears and the Generate button is disabled. Balance the debits and credits — indicator turns green. Click Generate — a success toast shows the JE id, and the JE appears in the journal entry list dated at the entity's fiscal year start.
result: pass
notes: "Verified by Claude in Chrome on entity 'UAT Opening Balance Test' (cmnzhojap0012hju4vwf9xakr) with Family Office template (42 accounts). Step 3 grid rendered with JE Date default 01/01/2026 + Debit/Credit columns. Entered $10,000 debit on 10100 Cash and Cash Equivalents with no credit → red Difference indicator shown: 'Total Debits: $10000.00 Total Credits: $0.00 Difference: $10000.00'; Generate button disabled. Added $10,000 credit to 30100 Partner Capital - LP → green checkmark indicator: 'Total Debits: $10000.00 Total Credits: $10000.00'; Generate button enabled. Clicked Generate → success toast 'Opening balance JE created (cmnzhsu2x002ahju477r50dh2)'; wizard advanced to Step 4 with Opening Balances checkmark. JE appears in Journal Entries list as JE-001 'Opening Balances' $10,000.00 Draft status. Minor date deviation: JE saved with date Dec 31, 2025 (prior day) instead of the form's 01/01/2026 (fiscal year start) — this is standard accounting practice for opening balance JEs but doesn't match the literal test expectation. Logged as minor cosmetic gap."

### 12. Dashboard Setup Banner
expected: For an entity with an incomplete wizard, the dashboard shows a "Continue Setup" banner with a progress indicator. Clicking it navigates to the wizard. For a complete entity, the banner is absent.
result: pass
notes: "Verified by Claude in Chrome. On UAT Opening Balance Test (wizard 2/4 — COA + Opening Balances done, Holdings + First Transactions incomplete) dashboard rendered banner: 'Continue setting up UAT Opening Balance Test / 2 of 4 steps complete' with 'Continue Setup →' button and '×' dismiss. Clicking Continue Setup navigated to /onboarding/cmnzhojap0012hju4vwf9xakr (✓). × dismiss removes banner and persists across page reload (✓). Minor gap: pre-existing entities (Three Pagodas) default to wizardProgress={} so banner shows '0 of 4 steps complete' even though entity has full COA + financial data. Logged as cosmetic gap."

## Summary

total: 12
passed: 9
issues: 4
pending: 0
skipped: 1

## Gaps

- truth: "User can return to the wizard after navigating away mid-step (e.g., Customize accounts)"
  status: closed
  reason: "User reported: yes that works but when clicking away from the wizard to check on the COA i now cant get back to the wizard which is not helpful"
  severity: major
  test: 2a
  root_cause: "No persistent return-to-wizard affordance when user navigated away from /onboarding; wizardProgress JSON was written at step completion but header had no awareness of incomplete-wizard state across routes."
  artifacts:
    - src/components/onboarding/return-to-wizard-banner.tsx
    - src/components/layout/header.tsx
    - src/lib/onboarding/wizard-progress.ts
  missing: []
  debug_session: "closed by plan 12-07 (ReturnToWizardBanner mounted in header, isWizardInProgress pure helper)"

- truth: "Rate-Based Budget slide-over shows existing holdings with FMV in the holding picker"
  status: closed
  reason: "User reported: holding dropdown empty when there are 4 holdings in the system"
  severity: major
  test: 5
  root_cause: "Budget page filter used holding.fairMarketValue directly; Phase 10 positions-overhaul moved FMV onto Position.marketValue and left holding.fairMarketValue null for new holdings, so the dropdown found nothing."
  artifacts:
    - src/lib/holdings/rate-target-eligibility.ts
    - src/__tests__/utils/rate-target-eligibility.test.ts
    - src/app/(auth)/budgets/page.tsx
    - src/app/api/entities/[entityId]/budgets/rate-target/route.ts
  missing: []
  debug_session: "closed by plan 12-08 (isHoldingEligibleForRateTarget + computeEffectiveMarketValue pure helpers; holding FMV wins when non-zero, else SUM active position marketValues)"

- truth: "Bank CSV import supports multi-account CSVs by treating account as a mappable column/dimension (like date, amount, entity)"
  status: closed
  reason: "User reported: cant import for multiple accounts at once. financial accounts/holdings are just dimensional like entity, like date, like anything else and the architecture should allow for multi account import very easily and more"
  severity: major
  test: 6
  root_cause: "CSV import route required a single top-level subledgerItemId and bank-feed page blocked file-pick until one was selected; there was no per-row account resolution path at all."
  artifacts:
    - src/lib/bank-transactions/resolve-account-refs.ts
    - src/lib/bank-transactions/csv-parser.ts
    - src/validators/bank-transaction.ts
    - src/app/api/entities/[entityId]/bank-transactions/route.ts
    - src/app/api/entities/[entityId]/csv-column-map/route.ts
    - src/components/csv-import/column-mapping-ui.tsx
    - src/app/(auth)/bank-feed/page.tsx
    - src/__tests__/utils/csv-parser-multi-account.test.ts
    - src/__tests__/validators/bank-transaction.test.ts
    - src/__tests__/api/bank-transactions-multi-account.test.ts
  missing: []
  debug_session: "closed by plan 12-09 (ParsedBankRow.accountRef, csvImportSchema union, resolveAccountRefs pure helper, per-group dedup + createMany). Chrome-verified on Three Pagodas end-to-end with Citibank Checking / Savings."

- truth: "COA CSV Import dialog layout renders cleanly without overflow/clipping"
  status: closed
  reason: "User reported: UI looks a biy screwy tho on test 7. Observed: dialog header description gets clipped above viewport when Column Mapping panel opens; modal grows taller than viewport."
  severity: cosmetic
  test: 7
  root_cause: "DialogContent had no max-height and DialogHeader wasn't sticky, so when the Column Mapping panel expanded the dialog dynamically grew past viewport height and pushed the header off-screen."
  artifacts:
    - src/components/settings/coa-import-dialog.tsx
  missing: []
  debug_session: "closed by plan 12-06 (max-h-[90vh] overflow-y-auto on DialogContent + sticky top-0 on DialogHeader — reusable pattern for modals with dynamic content growth)"

- truth: "Saved column mappings are auto-reused on subsequent imports with same CSV structure; badge reads 'Saved'"
  status: closed
  reason: "First import saved with sourceName='TestSource-UAT'. Second import with identical columns: badge shows 'Auto-detected', Source name empty. Saved mapping lookup never fires."
  severity: major
  test: 9
  root_cause: "csv-column-map route gated saved-mapping lookup on `if (sourceName)` in request body, but the client only sent headers/sampleRows/importType. Server always fell through to LLM/heuristic even when an identical saved mapping existed."
  artifacts:
    - src/app/api/entities/[entityId]/csv-column-map/route.ts
    - src/components/csv-import/column-mapping-ui.tsx
    - src/lib/bank-transactions/column-mapping-store.ts
    - src/app/api/entities/[entityId]/column-mappings/route.ts
    - src/__tests__/api/column-mappings.test.ts
  missing: []
  debug_session: "closed by plan 12-06 (findMappingByHeaders fingerprint helper: normalize trim+lowercase, superset-check stored headers against incoming CSV headers, orderBy updatedAt desc. Server returns sourceName on saved hits so UI pre-fills the Source name field with a 'Saved' badge)"

- truth: "Opening Balance JE is dated at the entity's fiscal year start, matching the date shown in the wizard form"
  status: closed
  reason: "Form defaulted JE Date to 01/01/2026 (FY start for 12-31 FYE entity) but generated JE was saved with date Dec 31, 2025 (prior day). Standard accounting convention places opening balance JEs on the last day of prior FY so balances are available Jan 1 — but the UX mismatch between form date and stored date is confusing."
  severity: cosmetic
  test: 11
  root_cause: "generateOpeningBalanceJE accepted a Date object that got serialized through an API boundary, triggering UTC/local timezone shift — a form date of 2026-01-01 in America/Chicago became 2025-12-31 UTC on the server."
  artifacts:
    - src/lib/onboarding/opening-balance.ts
    - src/components/onboarding/wizard-balances-step.tsx
    - src/__tests__/utils/opening-balance.test.ts
  missing: []
  debug_session: "closed by plan 12-07 (generateOpeningBalanceJE signature changed from Date to YYYY-MM-DD string; string is passed through API unchanged — stored date == form date)"

- truth: "Setup banner is absent for entities that have substantive data but pre-date the wizard feature (no explicit wizard run)"
  status: closed
  reason: "Three Pagodas, LLC (pre-existing entity with full COA, JEs, holdings) shows banner 'Continue setting up Three Pagodas, LLC / 0 of 4 steps complete'. User can dismiss via × but this is noise — banner logic should detect that the entity has substantive data (posted JEs, COA imported, holdings present) and suppress the banner, OR the system should backfill wizardProgress for existing entities on migration."
  severity: cosmetic
  test: 12
  root_cause: "wizardProgress JSON defaulted to {} on pre-existing entities because the onboarding wizard (plan 12-05) shipped after those entities were created; the banner treated {} as 'all 4 steps incomplete'."
  artifacts:
    - src/app/api/entities/[entityId]/wizard-progress/route.ts
    - src/lib/onboarding/wizard-progress.ts
    - src/components/onboarding/setup-banner.tsx
  missing: []
  debug_session: "closed by plan 12-07 (hasSubstantiveData helper + backfill-on-first-GET: when GET /wizard-progress sees {} AND hasSubstantiveData returns true, server writes all 4 steps as complete and returns the backfilled state)"
