# Phase 12: Reporting Fixes & Onboarding Wizard - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden reporting accuracy (cash flow classification by field instead of name matching, contra account support, rate-based budget targets), add a guided onboarding wizard for new entity setup, and upgrade all CSV import flows with LLM-powered column detection. No new financial statement types or transaction workflows.

</domain>

<decisions>
## Implementation Decisions

### Cash Flow Classification
- Add `cashFlowCategory` enum field (OPERATING, INVESTING, FINANCING, EXCLUDED) to the Account model
- Field only applies to balance sheet accounts (Asset, Liability, Equity) — Income/Expense accounts flow through Net Income and don't need classification
- Migration auto-assigns categories to existing accounts using the current name-matching logic as a one-time backfill — zero disruption to existing reports
- COA templates (family office, hedge fund) pre-fill cashFlowCategory for all balance sheet accounts
- UI: dropdown on the account create/edit form, only visible for Asset/Liability/Equity account types
- Cash flow report query (`report-queries.ts`) switches from `nameLower.includes(...)` to reading the `cashFlowCategory` field

### Contra Accounts
- Add `isContra: boolean` (default false) to the Account model — keeps the 5-type AccountType enum clean
- Contra flag tells the system this account has opposite normal balance (e.g., ASSET + isContra = credit-normal like Accumulated Depreciation)
- Financial statement display: contra accounts show as indented detail lines under their parent, then a net total. E.g., "Equipment: $50K" → "Less: Accum. Depreciation: ($20K)" → "Net Equipment: $30K"
- Standard accounting presentation with netting

### Rate-Based Budget Targets
- User sets a target annual return rate (e.g., 8%) on an investment holding's linked income account
- System computes monthly budget = holding market value x rate / 12, using a snapshot of current holding value at budget creation time
- Budget amounts are locked in after computation — they do NOT auto-recalculate when holding value changes
- User can manually recalculate to update if they choose
- Integrates with existing budget grid from Phase 7

### Onboarding Wizard
- Wizard triggers after creating ANY new entity (first or subsequent) — not just first-time users
- Current WelcomeScreen (zero entities) remains as the entry point for brand-new users; wizard activates after entity creation completes
- Steps: (1) COA template picker → (2) Holdings setup → (3) Opening balances → (4) First transactions
- All steps are skippable — checklist-style progress indicator shows completion status
- User can return to skipped steps from the entity dashboard
- COA step: shows 2-3 template cards (Family Office, Hedge Fund, Blank). User picks one, system imports it, then shows COA page to customize. Leverages existing COA import infrastructure
- Opening Balances step: spreadsheet-style grid of all balance sheet accounts with Debit/Credit columns (similar to budget grid pattern from Phase 7), PLUS a "Import from CSV" button as alternative. System auto-generates a balanced Opening Balance JE

### AI-Powered CSV Import
- LLM-based column mapping: send CSV headers + first few rows to Claude API to infer column roles, even for non-standard headers (e.g., "Trx Amt" → Amount, "Valor Date" → Date)
- Falls back to existing heuristic COLUMN_PATTERNS matching if LLM is unavailable
- Applies to ALL three CSV import flows: bank statement, COA import, and budget import
- Always show a mapping confirmation UI before import proceeds: "Column A → Date, Column B → Description, Column C → Amount" — user confirms or adjusts
- Save confirmed column mappings per source name (e.g., "Chase Checking", "Schwab Brokerage") for reuse on future imports. Next import from same source pre-applies saved mapping; user can still adjust

### Claude's Discretion
- Exact cashFlowCategory dropdown placement and styling on account form
- Migration script implementation details for backfilling existing accounts
- Contra account indentation and netting formatting specifics
- Onboarding wizard UI layout (stepper, sidebar checklist, or card-based)
- LLM prompt design for column mapping inference
- Mapping persistence storage approach (DB model vs localStorage)
- Opening balance JE date selection logic

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `report-queries.ts:678-768`: Current cash flow classification logic (name matching) — replace inner logic, keep structure
- `csv-parser.ts`: Bank CSV parser with `COLUMN_PATTERNS` auto-detection — upgrade detection layer, keep `ParsedBankRow` interface
- `WelcomeScreen` component (`src/components/onboarding/welcome-screen.tsx`): Zero-entity welcome — extend for wizard entry point
- Budget grid pattern (Phase 7): Spreadsheet-style input grid — reuse for opening balance entry
- COA import dialog (`src/components/settings/coa-import-dialog.tsx`): Template presets + CSV import — reuse in wizard COA step
- `AccountType` enum: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE — unchanged, contra handled by flag
- Consolidated cash flow queries (`src/lib/queries/consolidated-report-queries.ts`) — also needs cashFlowCategory update

### Established Patterns
- Entity-scoped API routes under `/api/entities/[entityId]/...`
- Zod schema validation for all inputs
- Decimal(19,4) for all financial fields
- Module-level Map cache with 60s TTL for form dropdowns
- Additive-only schema migrations with soft-delete pattern
- React Hook Form + Zod for form validation
- shadcn/ui components (Card, Dialog, Sheet, Badge, Table)

### Integration Points
- Account model (Prisma schema): add `cashFlowCategory` enum + `isContra` boolean
- Account create/edit form: add cashFlowCategory dropdown + isContra toggle for balance sheet types
- Cash flow report queries (single-entity + consolidated): switch from name matching to field lookup
- Budget model/API: extend for rate-based computation linked to holdings
- All 3 CSV import routes: wrap with LLM column detection layer
- Entity creation flow: redirect to wizard after entity is created
- Dashboard: show onboarding progress checklist if wizard incomplete

</code_context>

<specifics>
## Specific Ideas

- Cash flow migration should run the existing name-matching as a one-time backfill — accountants see zero change in reports on day one, then can override as needed
- Contra account display follows standard accounting format: gross → less contra → net (e.g., Equipment $50K, Less: Accum Depr ($20K), Net $30K)
- Rate-based budgets snapshot holding value at creation time — budgets shouldn't be a moving target
- Onboarding wizard should feel low-pressure — all steps skippable, progress visible, return anytime
- AI CSV mapping always requires user confirmation before proceeding — no silent misclassification
- Saved mappings per source name reduces friction on repeat imports from the same bank/institution

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-reporting-fixes-onboarding-wizard*
*Context gathered: 2026-04-12*
