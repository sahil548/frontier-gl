---
phase: 11-categorization-ux-opening-balances
verified: 2026-04-12T21:15:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "TransactionTable inline categorization cell shows PositionPicker as default target for PENDING transactions"
    - "CategorizePrompt receives positionId and positionLabel after a position-targeted inline categorization"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open bank feed in Chrome, find a PENDING transaction row. Verify the Account cell shows a PositionPicker (not AccountCombobox) and a 'Use GL account' link below it."
    expected: "PositionPicker renders with holding/position options as default. Clicking 'Use GL account' reveals AccountCombobox with 'Use position' link to toggle back."
    why_human: "Visual rendering and interactivity must be confirmed in browser per project MEMORY.md instructions"
  - test: "Create a new holding (e.g., Bank Account) with a balance of $10,000 and a date. Submit."
    expected: "Toast 'Holding created with opening balance journal entry'. GL Ledger for the holding's account shows a POSTED JE debiting the holding account and crediting Opening Balance Equity (3900)."
    why_human: "Requires live database and API interaction"
  - test: "In Chrome, open bank feed. Post a categorized transaction. Check the Recon column badge."
    expected: "Posted transactions show green 'Reconciled' badge. Unposted/PENDING show amber 'Pending' badge."
    why_human: "Visual badge rendering requires Chrome browser check per project instructions"
  - test: "In Chrome, with a mix of posted and unposted transactions, verify the ReconciliationSummary bar shows correct counts and totals."
    expected: "Reconciled count and total matches posted transactions; Pending count matches uncategorized transactions."
    why_human: "Visual accuracy and formatCurrency output requires browser verification"
---

# Phase 11: Categorization UX & Opening Balances — Verification Report

**Phase Goal:** Bank feed categorization uses holdings/positions as offset targets instead of raw GL accounts. Opening balance JEs auto-generated when holdings are created with balances. Reconciliation workflow fully integrated with bank feed as single source of truth.
**Verified:** 2026-04-12T21:15:00Z
**Status:** human_needed (all automated checks pass; 4 items need browser confirmation)
**Re-verification:** Yes — after gap closure via Plan 11-05 (commits 6dea1b5, 4d32135)

---

## Gap Closure Confirmation

Both gaps from the initial verification are now closed:

**Gap 1 (CLOSED) — Inline position picker not wired to TransactionTable**

`src/components/bank-feed/transaction-table.tsx` now:
- Imports `PositionPicker` at line 25
- Defines `onCategorize: (transactionId: string, accountId: string, positionId?: string | null) => void` at line 63
- Accepts `entityId?: string` prop at line 70
- Tracks `rowTargetMode` as `Record<string, "position" | "account">` at line 134
- Renders `PositionPicker` as the default for PENDING rows when `!compact && entityId` (lines 248-291)
- Shows "Use GL account" button toggling to `AccountCombobox` with a "Use position" link to toggle back
- Falls back to `AccountCombobox` only in compact mode or when `entityId` is absent (lines 293-302)

**Gap 2 (CLOSED) — positionId never flowed to CategorizePrompt**

`src/app/(auth)/bank-feed/page.tsx` now:
- `handleCategorize` signature at line 267: `(transactionId: string, accountId: string, positionId?: string | null)`
- PATCH body at line 276: `{ accountId, ...(positionId ? { positionId } : {}) }`
- Position label resolution at lines 291-303: fetches `/api/entities/${entityId}/positions`, finds matching position, constructs `"${pos.holdingName} -> ${pos.name}"` label
- `setCategorizePrompt` at lines 305-312: includes `positionId: positionId ?? null` and `positionLabel: resolvedPositionLabel`
- `TransactionTable` render at line 551 passes `entityId={entityId}` prop

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | TransactionTable inline categorization cell shows PositionPicker as default target for PENDING transactions | VERIFIED | transaction-table.tsx line 252: `<PositionPicker>` renders in PENDING cell when `!compact && entityId` |
| 2 | User can toggle to AccountCombobox via "Use GL account" link in the inline cell | VERIFIED | transaction-table.tsx lines 261-269: button sets `rowTargetMode[txn.id]` to `"account"`, revealing AccountCombobox with "Use position" toggle |
| 3 | Selecting a position inline triggers handleCategorize with both positionId and accountId | VERIFIED | transaction-table.tsx lines 255-258: `onCategorize(txn.id, accountId, positionId)` when PositionPicker onChange fires with non-null values |
| 4 | CategorizePrompt receives positionId and positionLabel after a position-targeted inline categorization | VERIFIED | page.tsx lines 291-312: position label resolved and included in `setCategorizePrompt` |
| 5 | CategorizePrompt rule creation uses positionId when available (not accountId) | VERIFIED (prev) | categorize-prompt.tsx uses positionId in rule creation body when positionId prop provided |
| 6 | Opening balance JE auto-generated when holding created with balance > 0 | VERIFIED (prev) | subledger/route.ts calls `generateOpeningBalanceJE` in `$transaction`; 10 unit tests pass |
| 7 | Posting a transaction sets reconciliationStatus=RECONCILED | VERIFIED (prev) | [transactionId]/route.ts line 339; bulk-categorize/route.ts line 174 |
| 8 | Running reconciled/unreconciled totals at top of bank feed | VERIFIED (prev) | ReconciliationSummary (92 lines) wired at bank-feed/page.tsx line 541 |

**Score:** 8/8 truths verified (all automated checks pass)

---

## Required Artifacts

| Artifact | Status | Notes |
|----------|--------|-------|
| `src/components/bank-feed/transaction-table.tsx` | VERIFIED | PositionPicker import + entityId prop + per-row mode state + position-first inline cell |
| `src/app/(auth)/bank-feed/page.tsx` | VERIFIED | handleCategorize with positionId param, PATCH body, position label resolution, entityId prop on TransactionTable |
| `src/components/bank-feed/position-picker.tsx` | VERIFIED (prev) | 166 lines; Popover+Command, cache, positions fetch |
| `src/components/bank-feed/categorize-prompt.tsx` | VERIFIED (prev) | 179 lines; uses positionId in rule creation when provided |
| `src/components/bank-feed/rule-form.tsx` | VERIFIED (prev) | PositionPicker + targetMode toggle |
| `src/components/bank-feed/reconciliation-summary.tsx` | VERIFIED (prev) | 92 lines; useMemo aggregation, green/amber/red indicators |
| `src/lib/bank-transactions/opening-balance.ts` | VERIFIED (prev) | 317 lines; all 5 functions exported and unit-tested |
| `src/app/api/entities/[entityId]/positions/route.ts` | VERIFIED (prev) | Entity-scoped positions with holding metadata |
| `src/app/api/entities/[entityId]/subledger/route.ts` | VERIFIED (prev) | generateOpeningBalanceJE called in $transaction |
| `src/app/api/entities/[entityId]/subledger/[itemId]/route.ts` | VERIFIED (prev) | generateAdjustingJE called in $transaction |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| transaction-table.tsx | position-picker.tsx | PositionPicker import and render in PENDING row | WIRED | Line 25 import; lines 252-260 render in PENDING cell |
| transaction-table.tsx | bank-feed/page.tsx | onCategorize callback with positionId parameter | WIRED | Prop typed as `(transactionId, accountId, positionId?) => void`; called at line 257 with positionId |
| bank-feed/page.tsx | categorize-prompt.tsx | setCategorizePrompt populating positionId and positionLabel | WIRED | Lines 305-312: both fields set from resolved position data |
| bank-feed/page.tsx PATCH | positionId in request body | conditional spread in JSON.stringify | WIRED | Line 276: `{ accountId, ...(positionId ? { positionId } : {}) }` |
| position-picker.tsx | /api/entities/:entityId/positions | fetch in useEffect | WIRED (prev) | positions API fetched with 60s cache |
| subledger/route.ts | opening-balance.ts | generateOpeningBalanceJE | WIRED (prev) | Line 221 inside $transaction |
| [transactionId]/route.ts | prisma.bankTransaction.update | reconciliationStatus:RECONCILED | WIRED (prev) | Line 339 in POST handler |
| reconciliation-summary.tsx | bank-feed/page.tsx | ReconciliationSummary render | WIRED (prev) | Line 541 with tabData props |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAT-01 | 11-01, 11-02, 11-05 | Position picker replaces raw GL as default categorization target | VERIFIED | TransactionTable PENDING rows render PositionPicker as default (non-compact, with entityId); GL toggle available; positionId flows through to API and CategorizePrompt |
| CAT-03 | 11-01, 11-02 | Rules support optional positionId alongside accountId | VERIFIED (prev) | Schema positionId on CategorizationRule; rules API creates and resolves GL at apply-time |
| OBE-01 | 11-03 | Opening Balance Equity (3900) auto-created if absent | VERIFIED (prev) | findOrCreateOBEAccount in opening-balance.ts |
| OBE-02 | 11-03 | Opening balance JE auto-generated and posted when holding created with balance > 0 | VERIFIED (prev) | generateOpeningBalanceJE in subledger POST; 10 unit tests pass |
| OBE-03 | 11-03 | Adjusting JE for the difference when holding balance edited | VERIFIED (prev) | generateAdjustingJE in subledger PUT |
| REC-01 | 11-04 | Posting a categorized bank transaction auto-marks it RECONCILED | VERIFIED (prev) | reconciliationStatus:RECONCILED in single POST and bulk-categorize handlers |
| REC-03 | 11-04 | Reconciliation status badges on each transaction row | VERIFIED (code, human needed for render) | transaction-table.tsx lines 320-359: green/amber/red badge per reconciliationStatus |
| REC-04 | 11-04 | Running reconciled vs unreconciled totals at top of bank feed | VERIFIED (prev) | ReconciliationSummary wired at page.tsx line 541 |

**Note:** CAT/OBE/REC requirement IDs are defined in the phase RESEARCH.md and ROADMAP.md, not in the global REQUIREMENTS.md (which uses a different ID scheme). All 8 phase-level requirements are accounted for and satisfied.

---

## TypeScript Compilation

Source files compile with zero errors. The only TypeScript errors found are in `tests/attachments/blob-storage.test.ts` — a pre-existing issue unrelated to Phase 11 (mock type mismatch in attachment tests, present before this phase).

---

## Anti-Patterns (Unchanged from Initial Verification)

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `tests/bank-transactions/categorize.test.ts` lines 76-77 | `it.todo()` for CAT-03 position-targeted rule stubs | Warning | Unit tests for rule engine behavior at position level remain as stubs |
| `tests/bank-transactions/position-picker.test.ts` | `it.todo()` throughout | Warning | Positions API correctness tests never filled in |
| `tests/bank-transactions/reconciliation-summary.test.ts` | `it.todo()` throughout | Warning | Reconciliation summary computation tests never filled in |
| `tests/bank-transactions/auto-reconcile.test.ts` | `it.todo()` throughout | Warning | Auto-reconcile unit tests never filled in |

None are blockers for the phase goal. All are pre-existing wave-0 stubs.

---

## Human Verification Required

### 1. Inline Position Picker Visual Render

**Test:** Open bank feed in Chrome. Find a PENDING transaction. Inspect the Account cell.
**Expected:** PositionPicker renders with a dropdown of holdings/positions as the default. A "Use GL account" text link sits below it. Clicking that link swaps the picker to AccountCombobox with a "Use position" link to toggle back.
**Why human:** Visual rendering and interactive toggle behavior must be confirmed in Chrome per project MEMORY.md instructions.

### 2. Opening Balance JE End-to-End

**Test:** Create a new holding (e.g., Bank Account) with a balance of $10,000 and a date. Submit.
**Expected:** Toast "Holding created with opening balance journal entry". Navigate to GL Ledger for the holding's account — a POSTED journal entry debiting the holding account and crediting Opening Balance Equity (3900) should appear.
**Why human:** Requires live database and API interaction.

### 3. Reconciliation Badges Visual Render

**Test:** In Chrome, open bank feed. Post a categorized transaction. Check the Recon column.
**Expected:** Posted transactions show green "Reconciled" badge. Unposted/PENDING show amber "Pending" badge.
**Why human:** Per project MEMORY.md, UI features must be verified in Chrome browser.

### 4. ReconciliationSummary Totals Accuracy

**Test:** In Chrome, with a mix of posted and unposted transactions, verify the summary bar shows correct counts and formatted currency totals.
**Expected:** Reconciled count and total matches posted transactions; Pending count matches uncategorized transactions; amounts formatted as currency.
**Why human:** Visual accuracy and formatCurrency output requires browser verification.

---

## Summary

Phase 11 goal achievement is confirmed at the code level. Both gaps from the initial verification are closed:

1. TransactionTable PENDING rows now default to PositionPicker (not AccountCombobox) in non-compact mode when entityId is available. The "Use GL account" / "Use position" toggle is wired. The full path from user pick -> `onCategorize(txnId, accountId, positionId)` -> PATCH with positionId is connected.

2. `handleCategorize` now accepts `positionId`, includes it in the PATCH body, resolves the position display label via the positions API, and populates both `positionId` and `positionLabel` in `setCategorizePrompt`. CategorizePrompt will therefore create position-targeted rules when the user selected a position inline.

All 8 requirements (CAT-01, CAT-03, OBE-01/02/03, REC-01/03/04) are satisfied in code. Four items remain for human browser verification: the inline picker visual render, opening balance JE end-to-end, reconciliation badges, and summary totals accuracy.

---

*Verified: 2026-04-12T21:15:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Yes — after Plan 11-05 gap closure (commits 6dea1b5, 4d32135)*
