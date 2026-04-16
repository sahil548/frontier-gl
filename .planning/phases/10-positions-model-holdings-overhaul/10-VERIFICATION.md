---
phase: 10-positions-model-holdings-overhaul
verified: 2026-04-16T15:27:47Z
status: human_needed
score: 8/8 must-haves verified
human_verification:
  - test: "Open Chrome, visit /holdings on an entity with at least one holding per type. Verify the page renders collapsible Card sections per type group (Bank Accounts, Brokerage Accounts, Real Estate, Loans, etc.) with a count badge on each header and an expand/collapse chevron."
    expected: "One Card per type that has at least one holding. Empty types are hidden. Each Card title shows TYPE_LABELS[type] plus a count. Clicking the chevron expands to show the holding rows for that group."
    why_human: "Visual layout (group ordering, empty-state suppression, chevron rotation, badge styling) can only be confirmed in a running browser per project MEMORY.md instructions."
  - test: "In Chrome, expand a holding row that has multiple positions. Verify each position row shows: GL account number (e.g., 12110), position name, marketValue, quantity, unit cost, unit price, unrealized gain/loss, asset class badge."
    expected: "Position sub-rows render with position.account.number visible as a muted label, numeric cells formatted as currency, unrealized gain/loss computed as marketValue - costBasis."
    why_human: "Visual rendering of position-level GL number, currency formatting, and unrealized gain/loss color/sign cannot be confirmed programmatically."
  - test: "In Chrome, click 'Add Holding', fill out the form with any of the 13 new holding types (e.g., TRUST_ACCOUNT), submit. After success, verify the AddPositionsPrompt dialog appears titled 'Add Positions to <holding name>' with the first row pre-filled with DEFAULT_POSITION_NAME[type] and DEFAULT_POSITION_TYPE[type]."
    expected: "Dialog shows pre-filled first row. 'Add Row' button appends empty rows. Each row has name, positionType Select, ticker, quantity, unitCost, marketValue fields. 'Save All' POSTs each row to /positions sequentially. 'Skip for now' closes without creating."
    why_human: "Interactive dialog flow, toast rendering, multi-row form UX, and the post-creation prompt trigger require live UI to verify."
  - test: "In Chrome, open the holding creation form's type Select. Confirm only the 13 new types appear (no INVESTMENT, PRIVATE_EQUITY, or RECEIVABLE in the dropdown — these should only surface on existing holdings with '(Legacy)' label suffix)."
    expected: "Select menu shows 13 items. Existing holdings with legacy types display in the grouped layout with '(Legacy)' appended to the group label."
    why_human: "Dropdown content filtering (NEW_ITEM_TYPES vs full ITEM_TYPES) and the grouped-layout legacy suffix are visual behaviors."
---

# Phase 10: Positions Model & Holdings Overhaul — Verification Report

**Phase Goal:** Expand SubledgerItemType to 13 holding classes, introduce a Position model with its own GL anchor (3-level COA hierarchy: type parent > holding summary > position leaf), migrate existing data into the new shape, restructure the Holdings UI to group by type with aggregate totals, and route bank transactions through the position-level GL account.

**Verified:** 2026-04-16T15:27:47Z
**Status:** human_needed (all 8 must-haves verified in code + tests; 4 items need Chrome browser confirmation for visual render and interactive flow)

---

## Goal Achievement

### Observable Truths

| # | Truth | Source Plan | Status | Evidence |
|---|-------|-------------|--------|----------|
| 1 | SubledgerItemType enum has all 13 holding types | 10-01 | VERIFIED | `prisma/schema.prisma` lines 431-450: enum declares 13 new values (BANK_ACCOUNT, BROKERAGE_ACCOUNT, CREDIT_CARD, REAL_ESTATE, EQUIPMENT, LOAN, PRIVATE_FUND, MORTGAGE, LINE_OF_CREDIT, TRUST_ACCOUNT, OPERATING_BUSINESS, NOTES_RECEIVABLE, OTHER) + 3 legacy (INVESTMENT, PRIVATE_EQUITY, RECEIVABLE). Confirmed by `tests/holdings/enum-types.test.ts` (8 passing tests). |
| 2 | Position model has an accountId FK to Account | 10-01 | VERIFIED | `prisma/schema.prisma` lines 229-258: `accountId String?` at line 232, `account Account? @relation(...)` at line 251, `@@index([accountId])` at line 256. Nullable by design for migration compatibility. |
| 3 | Creating a position auto-creates a GL leaf account under the holding's summary account (+10 stepping) | 10-01 | VERIFIED | `src/lib/holdings/position-gl.ts:30-74` defines `createPositionGLAccount` with +10 stepping logic (line 52-55). Wired into `src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts:6,151` via import + call. Confirmed by `tests/holdings/position-gl.test.ts` (4 passing tests). |
| 4 | Creating a holding auto-creates a summary GL account (+100 stepping) plus a default position with its own GL account | 10-01 | VERIFIED | `src/lib/holdings/position-gl.ts:87-135` defines `createHoldingSummaryAccount` with +100 stepping (line 112-115). Wired into `src/app/api/entities/[entityId]/subledger/route.ts:11,169,198` — POST handler calls `createHoldingSummaryAccount` + `createPositionGLAccount` + creates default Position in a single `$transaction`. Confirmed by `tests/holdings/holding-gl.test.ts` (4 passing tests). |
| 5 | Existing holdings data migrates to the new shape (default positions, GL account transfer, summary accounts, legacy-type compat) | 10-02 | VERIFIED | `scripts/migrate-holdings-positions.ts` (8.6 KB, --dry-run support, idempotent). Confirmed by `tests/holdings/migration.test.ts` (7 passing tests covering: no-position holdings, multi-position holdings, legacy INVESTMENT/PRIVATE_EQUITY/RECEIVABLE mappings, idempotency). |
| 6 | Holdings page groups holdings by type with collapsible sections for all 13 new types and shows aggregate totals per holding | 10-03 | VERIFIED (code) + needs human | `src/app/(auth)/holdings/page.tsx:133-196` declares ITEM_TYPES (16 entries: 13 new + 3 legacy), TYPE_LABELS, TYPE_COLORS, HOLDING_GL_PARENT (line 233). Grouped layout at line 1091 (`TYPE_LABELS[type]` per group). Legacy types included in display with `(Legacy)` label per 10-03-SUMMARY key-decisions. Aggregate totals computed client-side from positions array. Visual render needs Chrome confirmation (human_verification #1). |
| 7 | After creating a holding, the user is immediately prompted to add positions via AddPositionsPrompt | 10-03 | VERIFIED (code) + needs human | `src/app/(auth)/holdings/page.tsx:65` imports `AddPositionsPrompt`, line 678 declares `promptHolding` state, line 788 triggers prompt after creation, line 1292 renders `<AddPositionsPrompt>`. `src/components/holdings/add-positions-prompt.tsx` (9.7 KB) provides multi-row form with pre-filled defaults from `DEFAULT_POSITION_NAME` + `DEFAULT_POSITION_TYPE` (imports at lines 24-27). Interactive flow needs Chrome confirmation (human_verification #3). |
| 8 | Bank transactions post against the position-level GL account (not the holding summary) with fallback to subledgerItem.accountId for legacy data | 10-02 | VERIFIED | `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:237-238`: `const defaultPosition = transaction.subledgerItem.positions?.[0]; const bankAccountId = defaultPosition?.accountId ?? transaction.subledgerItem.accountId;`. Same pattern at `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts:106`. Also position-level resolution at `[transactionId]/route.ts:97,213` for per-row position categorizations. Confirmed by `tests/bank-transactions/create-je.test.ts` (10 passing tests including `describe("position-level bankAccountId resolution")` block at line 124). |

**Score:** 8/8 truths verified (all automated checks pass; 4 truths also surface Chrome-verifiable visuals that are catalogued in `human_verification` frontmatter for post-phase follow-up).

---

## Required Artifacts

| Artifact | Plan | Status | Notes |
|----------|------|--------|-------|
| `prisma/schema.prisma` | 10-01 | VERIFIED | SubledgerItemType enum + Position.accountId FK + Account relation confirmed (lines 229-258, 431-450) |
| `src/lib/holdings/constants.ts` | 10-01 | VERIFIED | 3.1 KB; exports HOLDING_TYPE_TO_GL (16 entries), DEFAULT_POSITION_NAME, DEFAULT_POSITION_TYPE |
| `src/lib/holdings/position-gl.ts` | 10-01 | VERIFIED | 4.5 KB; exports `createPositionGLAccount`, `createHoldingSummaryAccount` — both accept Prisma tx as first arg |
| `src/app/api/entities/[entityId]/subledger/route.ts` | 10-01 | VERIFIED | POST wires `createHoldingSummaryAccount` + `createPositionGLAccount` in a single `$transaction`, plus default Position creation |
| `src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts` | 10-01 | VERIFIED | POST imports `createPositionGLAccount` + `HOLDING_TYPE_TO_GL`, creates GL leaf under holding's summary account |
| `scripts/migrate-holdings-positions.ts` | 10-02 | VERIFIED | 8.6 KB; idempotent data migration with --dry-run flag; handles no-positions, with-positions, and legacy-type cases |
| `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` | 10-02 | VERIFIED | Position-level bankAccountId resolution at line 237-238; per-row position fallback at lines 97, 213 |
| `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts` | 10-02 | VERIFIED | Position-level bankAccountId resolution at line 106 |
| `src/app/(auth)/holdings/page.tsx` | 10-03 | VERIFIED | 54 KB; ITEM_TYPES/TYPE_LABELS/HOLDING_GL_PARENT updated for 13 types; grouped rendering at line 1091; AddPositionsPrompt wired at lines 65/678/788/1292 |
| `src/components/holdings/add-positions-prompt.tsx` | 10-03 | VERIFIED | 9.7 KB; multi-row dialog with pre-filled defaults via `DEFAULT_POSITION_NAME[type]` + `DEFAULT_POSITION_TYPE[type]` |
| `tests/holdings/enum-types.test.ts` | 10-01 | VERIFIED | 8 passing tests |
| `tests/holdings/position-gl.test.ts` | 10-01 | VERIFIED | 4 passing tests (+10 stepping, AccountBalance creation) |
| `tests/holdings/holding-gl.test.ts` | 10-01 | VERIFIED | 4 passing tests (+100 stepping, AccountBalance creation) |
| `tests/holdings/migration.test.ts` | 10-02 | VERIFIED | 7 passing tests (no-positions, multi-positions, legacy types, idempotency) |
| `tests/bank-transactions/create-je.test.ts` | 10-02 | VERIFIED | 10 passing tests including position-level bankAccountId resolution block (line 124) |

**Artifacts:** 15/15 verified.

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/api/entities/[entityId]/subledger/route.ts` | `src/lib/holdings/position-gl.ts` | import createHoldingSummaryAccount, createPositionGLAccount | WIRED | Lines 11-12 import; lines 169, 198 call inside `$transaction` |
| `src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts` | `src/lib/holdings/position-gl.ts` | import createPositionGLAccount | WIRED | Line 6 import; line 151 call |
| `src/lib/holdings/position-gl.ts` | `src/lib/holdings/constants.ts` | (indirect via route files) | WIRED | position-gl.ts takes mapping prefix as arg; constants.ts provides HOLDING_TYPE_TO_GL consumed by routes (subledger/route.ts line 6, positions/route.ts line 5) |
| `scripts/migrate-holdings-positions.ts` | `src/lib/holdings/position-gl.ts` | import createPositionGLAccount, createHoldingSummaryAccount | WIRED | Imports present; migration script idempotency and legacy-type handling confirmed by `tests/holdings/migration.test.ts` |
| `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` | `prisma Position.accountId` | `transaction.subledgerItem.positions?.[0]?.accountId ?? transaction.subledgerItem.accountId` | WIRED | Lines 237-238; also lines 97, 213 for per-row position categorizations |
| `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts` | `prisma Position.accountId` | `txn.subledgerItem.positions?.[0]?.accountId ?? txn.subledgerItem.accountId` | WIRED | Line 106 |
| `src/app/(auth)/holdings/page.tsx` | `/api/entities/:entityId/subledger` (GET) | fetch GET with `include: { positions: true }` response | WIRED | Subledger GET returns positions array per 10-01 route changes; holdings page consumes positions for aggregate totals and expandable rows (line 592 reads POSITION_TYPE_LABELS from p.positionType) |
| `src/components/holdings/add-positions-prompt.tsx` | `/api/entities/:entityId/subledger/:itemId/positions` (POST) | sequential fetch POST per row | WIRED | Component imports `DEFAULT_POSITION_NAME` and `DEFAULT_POSITION_TYPE` at lines 24-27, dispatches POST requests for each row (see 10-03-SUMMARY) |

**Wiring:** 8/8 connections verified.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POS-01 | 10-01 | SubledgerItemType enum expanded to 13 holding types (plus 3 legacy) | VERIFIED | schema.prisma lines 431-450; tests/holdings/enum-types.test.ts 8/8 |
| POS-02 | 10-01 | Position model has required GL anchor via accountId FK | VERIFIED | schema.prisma line 232 (nullable by design for migration; all newly-created positions have accountId set per POST handlers) |
| POS-03 | 10-01 | Creating a position auto-creates a GL leaf account | VERIFIED | position-gl.ts:30-74, positions/route.ts:151; tests 4/4 |
| POS-04 | 10-01 | Creating a holding auto-creates summary + default position + position GL leaf | VERIFIED | position-gl.ts:87-135, subledger/route.ts:163-198; tests 4/4 |
| POS-05 | 10-02 | Data migration for existing holdings to the position model (handles no-position, with-position, and legacy types) | VERIFIED | scripts/migrate-holdings-positions.ts; tests/holdings/migration.test.ts 7/7 |
| POS-06 | 10-03 | Holdings page groups holdings by 13-type sections with aggregate totals | VERIFIED (code) + needs human | holdings/page.tsx TYPE_LABELS + HOLDING_GL_PARENT + grouped rendering at line 1091. Visual render needs Chrome check (human_verification #1, #2, #4). |
| POS-07 | 10-03 | AddPositionsPrompt shown after holding creation with pre-filled defaults | VERIFIED (code) + needs human | holdings/page.tsx:65,678,788,1292; add-positions-prompt.tsx uses DEFAULT_POSITION_NAME/DEFAULT_POSITION_TYPE. Interactive flow needs Chrome check (human_verification #3). |
| POS-08 | 10-02 | Bank transactions post against position-level GL account with fallback | VERIFIED | bank-transactions/[transactionId]/route.ts:237-238; bulk-categorize/route.ts:106; tests/bank-transactions/create-je.test.ts 10/10 including `describe("position-level bankAccountId resolution")` |

**Coverage:** 8/8 requirements satisfied in code; 3 requirements (POS-06, POS-07 visuals; aggregate-totals formatting) also catalogued for human browser verification.

---

## Anti-Patterns

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found in Phase 10 modified files | — | — | Phase 10 deliverables are substantive; no TODO/FIXME/placeholder anti-patterns detected in the verified files. |

**Anti-patterns:** 0 found.

**Note on out-of-scope debt:** v1.0-MILESTONE-AUDIT.md catalogues `localStorage.clear` Node 25 failures in `src/__tests__/hooks/use-entity.test.ts` (7 failing tests) as Phase 14 scope — explicitly out of scope for Phase 10 verification. Phase 13 closed the test-coverage gaps for Phase 11 `it.todo` stubs (not Phase 10).

---

## Human Verification Required

See frontmatter `human_verification` array for the 4 Chrome-verifiable visual/interactive items. These items do not block Phase 15 completion (CONTEXT.md locked decision: `human_needed` is an accepted terminal status for Phase 15, mirroring the Phase 11 VERIFICATION.md pattern).

Summary of items:

### 1. Holdings Page Group Layout

Open `/holdings` with holdings spanning multiple types. Verify collapsible Card per non-empty type, count badges, expand/collapse chevron rotation.

### 2. Position Row GL Account Display

Expand a holding with multiple positions. Verify each row shows GL account number, quantity, unit cost, unit price, unrealized gain/loss, asset class badge.

### 3. AddPositionsPrompt Post-Creation Flow

Create a new holding of any of the 13 new types. Verify the AddPositionsPrompt dialog appears with pre-filled first row (DEFAULT_POSITION_NAME[type] + DEFAULT_POSITION_TYPE[type]), Add Row / Save All / Skip behave as specified.

### 4. Legacy Type Exclusion in Creation Form

Inspect the holding creation form's type Select. Confirm only 13 new types appear; confirm existing legacy-type holdings display with `(Legacy)` suffix in the grouped layout.

---

## Gaps Summary

**No blocking gaps.** Phase 10 goal achievement is confirmed at the code + automated-test level for all 8 must-have truths (POS-01 through POS-08). Four Chrome-verifiable visual behaviors remain catalogued in `human_verification` for post-phase follow-up.

### Deferred (Not Phase 10 Scope)

- `src/__tests__/hooks/use-entity.test.ts` — 7 pre-existing failures (Node 25 `localStorage.clear` issue) owned by Phase 14. Not related to Phase 10 deliverables.
- `tests/bank-transactions/position-picker.test.ts`, `tests/bank-transactions/auto-reconcile.test.ts`, `tests/bank-transactions/reconciliation-summary.test.ts` — all Phase 11 `it.todo` stubs were either converted or kept by Phase 13 plan 13-02. Phase 13 closed Phase 11 test-coverage gaps; no Phase 10 regressions.

---

## Verification Metadata

**Verification approach:** Goal-backward (must-haves source: PLAN.md frontmatter for 10-01, 10-02, 10-03)

**Must-haves source:** PLAN frontmatter (Option A per verify-phase.md Step 2). All three Phase 10 PLANs have complete `must_haves` blocks.

**Automated checks:**
- `npx vitest run tests/holdings/` — 4 files, 23 tests, all passing (974ms)
- `npx vitest run tests/bank-transactions/create-je.test.ts` — 10 tests, all passing (573ms)
- Code inspection for wiring verified via `grep` on `createHoldingSummaryAccount`, `createPositionGLAccount`, `HOLDING_TYPE_TO_GL`, `DEFAULT_POSITION_NAME`, `positions?.[0]?.accountId` patterns across the 10 modified files.

**Automated check results:** 8/8 truths verified, 15/15 artifacts verified, 8/8 key links wired, 0 anti-patterns found.

**Human checks required:** 4 (catalogued in frontmatter).

**Total verification time:** ~3 min (code inspection + targeted vitest runs).

**Sub-workflow context:** This VERIFICATION.md was generated during Phase 15 Plan 15-01 (verification docs refresh) to close the coverage gap catalogued in `.planning/v1.0-MILESTONE-AUDIT.md`. `/gsd:verify-phase 10` was invoked inline (the Skill tool was not registered in this environment per task spec fallback path; fallback to direct verifier role execution was explicitly authorized by 15-01-PLAN.md Task 1 action block).

---

*Verified: 2026-04-16T15:27:47Z*
*Verifier: Claude (gsd-verifier role, inline execution)*
*Phase 15 Plan 15-01 deliverable — closes Stream A of v1.0-MILESTONE-AUDIT.md documentation hygiene gaps*
