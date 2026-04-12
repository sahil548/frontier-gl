# Phase 11: Categorization UX & Opening Balances - Research

**Researched:** 2026-04-12
**Domain:** Bank feed UX unification, position-based categorization, opening balance JE generation
**Confidence:** HIGH

## Summary

Phase 11 transforms the bank feed from a GL-account-centric categorization system into a holdings/position-first workflow, generates opening balance journal entries when holdings are created with balances, and merges the separate reconciliation page into the bank feed interface. The codebase is well-structured for these changes: the existing `AccountCombobox` pattern provides the template for a new `PositionPicker`, the `CategorizationRule` model needs a single optional field addition, and the subledger creation API already runs in a Prisma transaction where opening balance JE logic can be inserted.

Four distinct workstreams emerge: (1) Schema changes -- add `positionId` to `CategorizationRule` and `BankTransaction`, add `reconciliationStatus` to `BankTransaction`, create `Opening Balance Equity` account scaffolding; (2) Position picker component and categorization target refactor; (3) Opening balance JE auto-generation on holding creation/balance edit; (4) Reconciliation merge into bank feed with auto-reconcile on post.

**Primary recommendation:** Schema migration first (wave 0), then position picker + rule extension, then opening balance JE generation, then reconciliation merge -- each wave builds on the prior.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Categorization target picker:** Holdings first, GL fallback. Default picker shows holdings/positions; a "Use GL account" toggle reveals the raw account picker for expense/revenue accounts without holdings. Flat searchable list with holding name + type badge. Position-level granularity (user picks the specific position, e.g., "Schwab -> Cash Sweep"). Rules work for both targets.
- **Opening balance JE behavior:** Offset to Opening Balance Equity (3xxx series, auto-created if missing). Auto-post immediately (no draft step). User picks the date. Adjusting JE on balance edit (new JE for the difference, preserves audit trail).
- **Reconciliation <-> bank feed unification:** Auto-reconcile on post. Merge old recon into bank feed (one place for everything). Bank feed IS the holdings detail (clicking a bank account holding lands on the bank feed view). Inline badge per transaction (Reconciled green, Pending yellow, Unmatched red) with running totals at top.
- **Existing rule migration:** Keep accountId, add positionId (both paths coexist). Resolve GL at apply-time (positionId looks up GL account when applying). Display position name with GL detail in rules management page. Dimension tags in CategorizePrompt same as Phase 9.

### Claude's Discretion
- Exact layout of the merged bank feed / reconciliation page
- How the GL fallback toggle is styled (link, switch, dropdown mode)
- Opening Balance Equity account number assignment within 3xxx series
- Toast/notification design for auto-posted opening balance JEs
- Badge styling and color choices for reconciliation status

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

Since no formal IDs exist for Phase 11, these are derived from the phase goal and CONTEXT.md decisions:

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAT-01 | Position picker replaces raw GL account picker as default categorization target | PositionPicker component following AccountCombobox pattern; API endpoint for positions list |
| CAT-02 | GL fallback toggle allows selecting raw GL accounts for expense/revenue categorization | Toggle UI on CategorizePrompt; existing AccountCombobox reused in fallback mode |
| CAT-03 | Categorization rules support optional positionId alongside existing accountId | Schema migration; categorize.ts matchRule extension; positionId GL resolution at apply-time |
| CAT-04 | Rules management page shows position name as primary label with GL detail | Rules page UI update; API includes position relation |
| OBE-01 | Opening Balance Equity account (3xxx) auto-created if it does not exist | Subledger creation API extension; account lookup/creation in Prisma transaction |
| OBE-02 | Opening balance JE auto-generated and posted when holding created with balance > 0 | JE creation logic in subledger POST handler; uses existing generateNextEntryNumber |
| OBE-03 | Adjusting JE created for the difference when holding balance is edited | Subledger PUT handler extension; differential JE computation |
| OBE-04 | User picks the date for opening balance JE | Date picker field added to holding creation/edit form |
| REC-01 | Posting a categorized bank transaction auto-marks it as reconciled | Transaction POST handler extension; new reconciliationStatus field on BankTransaction |
| REC-02 | Bank feed page becomes the bank account holding detail view | Routing change: clicking bank holding navigates to /bank-feed?subledgerItemId=X |
| REC-03 | Reconciliation status badges on each transaction row (green/yellow/red) | TransactionTable component update; reconciliationStatus field rendering |
| REC-04 | Running reconciled vs unreconciled totals displayed at top of bank feed | Summary bar component using aggregated transaction status counts |
| REC-05 | Old reconciliation page merged into bank feed interface | Reconciliation history section added to bank feed; /reconcile route deprecated or redirected |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App router, API routes | Already in use |
| Prisma | 7.5.0 | ORM, schema migrations | Already in use |
| Zod | 4.3.6 | Schema validation | Already in use |
| React | 19.1.0 | UI framework | Already in use |
| shadcn/ui + @base-ui/react | 4.1.0 / 1.3.0 | UI components | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cmdk | 1.1.1 | Command menu (combobox search) | Position picker (same as AccountCombobox) |
| sonner | 2.0.7 | Toast notifications | Opening balance JE confirmation toasts |
| date-fns | 4.1.0 | Date formatting | Transaction dates, JE dates |
| lucide-react | 1.7.0 | Icons | Badge icons, status indicators |

### No New Dependencies Needed
All functionality can be built with existing libraries. No new packages required.

## Architecture Patterns

### Recommended Changes Structure
```
prisma/
  schema.prisma               # Add positionId to CategorizationRule + BankTransaction; add reconciliationStatus to BankTransaction
src/
  components/
    bank-feed/
      position-picker.tsx      # NEW: Popover+Command position picker (mirrors AccountCombobox)
      categorize-prompt.tsx    # MODIFY: Add position picker + GL fallback toggle
      rule-form.tsx            # MODIFY: Add position picker alongside account picker
      transaction-table.tsx    # MODIFY: Add reconciliation status badges
      reconciliation-summary.tsx  # NEW: Running totals bar (reconciled vs unreconciled)
    holdings/
      inline-bank-transactions.tsx  # MODIFY: Remove or redirect to bank feed
  app/
    (auth)/
      bank-feed/
        page.tsx               # MODIFY: Add reconciliation merge, holding header section
        rules/page.tsx         # MODIFY: Show position names instead of just GL accounts
      holdings/
        page.tsx               # MODIFY: Add date picker to creation form; bank account click navigates to bank feed
  app/api/
    entities/[entityId]/
      subledger/
        route.ts               # MODIFY: Add opening balance JE generation on POST
        [itemId]/route.ts      # MODIFY: Add adjusting JE on balance PUT
      bank-transactions/
        [transactionId]/route.ts  # MODIFY: Add auto-reconcile on POST
        rules/route.ts         # MODIFY: Support positionId in rule creation; resolve GL at apply-time
      positions/route.ts       # NEW: Entity-wide positions list endpoint for picker
  lib/
    bank-transactions/
      categorize.ts            # MODIFY: Extend RuleInput with optional positionId; resolve GL at match-time
  validators/
    bank-transaction.ts        # MODIFY: Add positionId to categorizationRuleSchema
```

### Pattern 1: Position Picker (mirrors AccountCombobox)
**What:** Flat searchable dropdown showing all entity positions grouped by holding, with holding name + type badge.
**When to use:** Anywhere the user needs to select a categorization target.
**Example:**
```typescript
// Follows the exact same Popover+Command+CommandItem pattern as AccountCombobox
// Data shape: { id: string, name: string, holdingName: string, holdingType: string, accountId: string }
// Search value: `${holdingName} ${positionName} ${holdingType}`
// Display: "Schwab -> Cash Sweep" with type badge
```

### Pattern 2: Opening Balance JE Generation (inside Prisma $transaction)
**What:** When a holding is created with a non-zero balance, create and post a JE in the same transaction.
**When to use:** Subledger POST and PUT handlers.
**Example:**
```typescript
// Inside the existing prisma.$transaction in subledger/route.ts POST:
// 1. Find or create "Opening Balance Equity" account (3000 series)
// 2. Generate entry number via generateNextEntryNumber(tx, entityId)
// 3. Create JE with status POSTED:
//    - Debit: holding's GL leaf account (newAccount.id)
//    - Credit: Opening Balance Equity account
// 4. Update AccountBalance for both accounts
// 5. Create audit trail entry
```

### Pattern 3: GL Resolution at Apply-Time
**What:** Rules with positionId look up the position's GL accountId when the rule fires, not when the rule is saved.
**When to use:** In the categorize engine (matchRule/applyRules) and retroactive matching.
**Example:**
```typescript
// In categorize.ts, extended RuleInput:
export interface RuleInput {
  // ... existing fields
  positionId?: string | null;  // NEW: optional position target
}

// At apply-time, if rule.positionId exists:
// 1. Look up Position -> SubledgerItem -> accountId
// 2. Use that accountId for the JE creation
// This ensures if the GL account mapping changes, rules stay correct
```

### Pattern 4: Auto-Reconcile on Post
**What:** When a bank transaction is posted (JE created), mark it as reconciled automatically.
**When to use:** Transaction POST handler.
**Example:**
```typescript
// In [transactionId]/route.ts POST handler, after creating the JE:
// Update the BankTransaction to set reconciliationStatus = 'RECONCILED'
// This replaces Phase 9's "no auto-reconcile" since bank feed IS the statement
```

### Anti-Patterns to Avoid
- **Resolving GL at rule creation time:** If the user changes a position's GL mapping later, saved rules would point to stale accounts. Always resolve at apply-time.
- **Separate reconciliation page for new flows:** The merged bank feed IS the reconciliation view. Do not create a separate page for bank account reconciliation.
- **Breaking existing accountId-only rules:** The positionId field is OPTIONAL. All existing rules with only accountId continue to work unchanged.
- **Opening balance JE in a separate API call:** Embed it in the Prisma $transaction during holding creation for atomicity. If the JE fails, the holding creation should roll back.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Searchable position dropdown | Custom search input + filtered list | Popover+Command pattern (cmdk) | Same pattern as AccountCombobox; consistent UX, keyboard navigation, accessibility |
| JE number generation | Manual sequence counter | `generateNextEntryNumber(tx, entityId)` | Already handles concurrent JE creation within transactions |
| Account balance updates | Manual SQL balance updates | Prisma `accountBalance.upsert` with `increment` | Already battle-tested in transaction POST handler |
| Toast notifications | Custom notification system | sonner `toast.success()` | Already used throughout the app |
| Date formatting | Manual date string manipulation | `date-fns format()` | Already in use for transaction dates |

## Common Pitfalls

### Pitfall 1: Opening Balance JE for Zero-Balance Holdings
**What goes wrong:** Creating a $0 debit / $0 credit JE when a holding is created with balance = 0.
**Why it happens:** The opening balance logic fires unconditionally.
**How to avoid:** Guard: only generate opening balance JE when `currentBalance !== 0`. Skip silently for zero-balance holdings.
**Warning signs:** Zero-amount JEs appearing in the journal entries list.

### Pitfall 2: Opening Balance Equity Account Number Collision
**What goes wrong:** Auto-creating account 3000 collides with an existing account.
**Why it happens:** The 3xxx series may already have accounts from the COA template.
**How to avoid:** Query for an existing account named "Opening Balance Equity" first (by name + entityId). If not found, find the next available number in the 3xxx series (e.g., 3900 or 3999 as convention). Use a specific well-known number like 3900.
**Warning signs:** 409 conflict error on holding creation.

### Pitfall 3: Rule Migration -- Dual Path Confusion
**What goes wrong:** A rule has BOTH positionId AND accountId, but the position's linked GL account differs from the stored accountId.
**Why it happens:** Data inconsistency during rule creation or if GL mapping changes.
**How to avoid:** When positionId is set, ALWAYS resolve GL from position at apply-time. Ignore the stored accountId for position-targeted rules. The accountId field becomes a cache/fallback for display only.
**Warning signs:** Rules categorizing to the wrong GL account.

### Pitfall 4: Adjusting JE Direction for Liability Holdings
**What goes wrong:** Debiting Opening Balance Equity and crediting a loan account (liability) -- the accounting is backwards.
**Why it happens:** Assets are debited to increase, but liabilities are credited to increase.
**How to avoid:** Check the account type. For ASSET accounts: Debit holding GL, Credit OBE. For LIABILITY accounts: Debit OBE, Credit holding GL. The direction depends on the GL account type.
**Warning signs:** Opening balance JE creates negative balances for liability holdings.

### Pitfall 5: Position Picker Data Freshness
**What goes wrong:** Stale position data after a holding/position is added or deactivated.
**Why it happens:** Module-level Map cache with 60s TTL may serve stale data.
**How to avoid:** Use the same cache pattern but add a manual invalidation callback (like refreshAll does for transactions). When holdings change, invalidate the position cache.
**Warning signs:** Newly created positions not appearing in the picker for up to 60 seconds.

### Pitfall 6: Auto-Reconcile Conflicting with Manual Reconciliation History
**What goes wrong:** BankReconciliation records from the old manual flow conflict with new auto-reconcile status per transaction.
**Why it happens:** Two parallel reconciliation systems: old BankReconciliation model (statement-level) and new per-transaction reconciliationStatus.
**How to avoid:** Keep both models. BankReconciliation is for historical reconciliation records. The new per-transaction status is the live indicator. Display the per-transaction status in the bank feed; historical records are viewable in a collapsible section.
**Warning signs:** Inconsistent reconciliation status between the badge and historical records.

## Code Examples

### Position Picker Component
```typescript
// src/components/bank-feed/position-picker.tsx
// Mirrors AccountCombobox exactly, with different data shape

interface PositionOption {
  id: string;             // position.id
  name: string;           // "Cash Sweep", "AAPL"
  holdingName: string;    // "Schwab Brokerage"
  holdingType: string;    // "INVESTMENT", "BANK_ACCOUNT"
  accountId: string;      // linked GL account ID (for display)
  accountNumber: string;  // "12100" (for display)
}

// Fetch endpoint: GET /api/entities/:entityId/positions
// Returns all active positions across all holdings for this entity
// Display format: "Schwab -> Cash Sweep" with Badge for holding type
// Search string: holdingName + name + holdingType for fuzzy matching
```

### Opening Balance JE in Subledger POST
```typescript
// Inside prisma.$transaction in subledger/route.ts POST:
if (data.currentBalance !== 0) {
  // Find or create Opening Balance Equity account
  let obeAccount = await tx.account.findFirst({
    where: { entityId, name: "Opening Balance Equity", type: "EQUITY" },
  });
  if (!obeAccount) {
    obeAccount = await tx.account.create({
      data: {
        entityId,
        number: "3900",  // Convention: 3900 for OBE
        name: "Opening Balance Equity",
        type: "EQUITY",
        parentId: null,  // Top-level equity account
      },
    });
    await tx.accountBalance.create({
      data: { accountId: obeAccount.id, balance: 0 },
    });
  }

  // Determine direction based on account type
  const isLiability = glMapping.accountType === "LIABILITY";
  const absBalance = Math.abs(data.currentBalance);
  const balanceDate = data.openingBalanceDate
    ? new Date(data.openingBalanceDate)
    : new Date();

  const entryNumber = await generateNextEntryNumber(tx, entityId);

  const je = await tx.journalEntry.create({
    data: {
      entityId,
      entryNumber,
      date: balanceDate,
      description: `Opening balance: ${data.name}`,
      status: "POSTED",
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lineItems: {
        create: isLiability
          ? [
              { accountId: obeAccount.id, debit: absBalance, credit: 0, sortOrder: 0 },
              { accountId: newAccount.id, debit: 0, credit: absBalance, sortOrder: 1 },
            ]
          : [
              { accountId: newAccount.id, debit: absBalance, credit: 0, sortOrder: 0 },
              { accountId: obeAccount.id, debit: 0, credit: absBalance, sortOrder: 1 },
            ],
      },
    },
  });

  // Update account balances
  // ... (same upsert pattern as transaction POST handler)
}
```

### Extended Categorization Rule Schema
```typescript
// In validators/bank-transaction.ts:
export const categorizationRuleSchema = z.object({
  pattern: z.string().min(1, "Pattern is required"),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  accountId: z.string().min(1).optional(),  // NOW OPTIONAL when positionId provided
  positionId: z.string().optional(),         // NEW
  dimensionTags: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) => data.accountId || data.positionId,
  { message: "Either accountId or positionId is required" }
);
```

### GL Resolution at Apply-Time in Categorize Engine
```typescript
// In categorize.ts, extend matchRule to support positionId:
// The actual GL resolution happens in the API layer, not the pure matching engine
// matchRule remains pure: it matches patterns, returns the rule
// The caller (API route) resolves positionId -> accountId before creating the JE

// In the rules API retroactive matching:
if (rule.positionId) {
  const position = await prisma.position.findUnique({
    where: { id: rule.positionId },
    include: { subledgerItem: { select: { accountId: true } } },
  });
  if (position) {
    resolvedAccountId = position.subledgerItem.accountId;
  }
}
```

### Entity-Wide Positions API Endpoint
```typescript
// NEW: GET /api/entities/:entityId/positions
// Returns all active positions across all active holdings for this entity
// Used by PositionPicker component

const positions = await prisma.position.findMany({
  where: {
    subledgerItem: { entityId, isActive: true },
    isActive: true,
  },
  include: {
    subledgerItem: {
      select: {
        id: true,
        name: true,
        itemType: true,
        accountId: true,
        account: { select: { id: true, number: true, name: true } },
      },
    },
  },
  orderBy: [
    { subledgerItem: { name: "asc" } },
    { name: "asc" },
  ],
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GL account picker for categorization | Position picker as default, GL fallback | Phase 11 | Users think in holdings/positions, not GL account numbers |
| Manual opening balance entry | Auto-generated OBE JE on holding creation | Phase 11 | Zero-friction onboarding for new holdings |
| Separate reconciliation page | Bank feed IS the reconciliation view | Phase 11 | One source of truth, eliminates context switching |
| accountId-only categorization rules | positionId + accountId coexistence | Phase 11 | Forward-compatible, existing rules unaffected |

## Schema Changes Required

### Prisma Schema Additions
```prisma
// 1. Add positionId to CategorizationRule
model CategorizationRule {
  // ... existing fields
  positionId      String?
  position        Position?         @relation(fields: [positionId], references: [id])
}

// 2. Add positionId and reconciliationStatus to BankTransaction
model BankTransaction {
  // ... existing fields
  positionId            String?
  reconciliationStatus  String          @default("PENDING")  // PENDING, RECONCILED, UNMATCHED
  position              Position?       @relation(fields: [positionId], references: [id])
}

// 3. Add relations to Position model
model Position {
  // ... existing fields
  categorizationRules   CategorizationRule[]
  bankTransactions      BankTransaction[]
}
```

### Migration Notes
- `positionId` on CategorizationRule is nullable -- existing rules keep working with just `accountId`
- `reconciliationStatus` defaults to "PENDING" -- all existing transactions get this status
- No data migration needed for existing rules -- they continue to work via accountId path
- The `accountId` field on CategorizationRule becomes optional in the Zod schema but remains required in Prisma for backward compatibility (existing rules). The Zod refine ensures at least one of accountId/positionId is provided.

## Open Questions

1. **Opening Balance Equity account number**
   - What we know: Must be in 3xxx equity series. User decision says auto-create if missing.
   - What's unclear: What number to use -- 3000, 3900, 3999?
   - Recommendation: Use 3900 as convention. Check for existing account by name first, fall back to creating 3900. If 3900 is taken, increment until available.

2. **Adjusting JE behavior for negative balance changes**
   - What we know: User says "new JE for the difference" when balance changes.
   - What's unclear: If balance goes from $10K to $8K, is the adjusting JE a reversal (credit asset, debit OBE)?
   - Recommendation: Yes. Compute the difference (new - old). If positive, same direction as opening balance. If negative, reverse direction. The magnitude is always the absolute difference.

3. **Reconciliation status for pre-existing posted transactions**
   - What we know: New transactions auto-reconcile on post. Existing POSTED transactions have no reconciliationStatus.
   - What's unclear: Should existing POSTED transactions be migrated to RECONCILED?
   - Recommendation: Default migration sets all existing to PENDING. The user can manually reconcile old transactions or accept them as-is. Auto-reconcile only applies going forward.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/bank-transactions/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Position picker returns correct data | unit | `npx vitest run tests/bank-transactions/position-picker.test.ts -x` | Wave 0 |
| CAT-03 | Rules with positionId resolve GL at apply-time | unit | `npx vitest run tests/bank-transactions/categorize.test.ts -x` | Exists (extend) |
| OBE-01 | Opening Balance Equity account auto-created | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 |
| OBE-02 | Opening balance JE generated with correct debit/credit | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 |
| OBE-03 | Adjusting JE created for balance difference | unit | `npx vitest run tests/bank-transactions/opening-balance.test.ts -x` | Wave 0 |
| REC-01 | Auto-reconcile sets status on post | unit | `npx vitest run tests/bank-transactions/auto-reconcile.test.ts -x` | Wave 0 |
| REC-03 | Transaction status badge rendering | manual-only | Chrome browser verification | N/A |
| REC-04 | Running totals computed correctly | unit | `npx vitest run tests/bank-transactions/reconciliation-summary.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/bank-transactions/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps
- [ ] `tests/bank-transactions/opening-balance.test.ts` -- covers OBE-01, OBE-02, OBE-03 (opening balance JE generation, direction by account type, adjusting JE)
- [ ] `tests/bank-transactions/position-picker.test.ts` -- covers CAT-01 (entity-wide position query, serialization)
- [ ] `tests/bank-transactions/auto-reconcile.test.ts` -- covers REC-01 (status set on post)
- [ ] `tests/bank-transactions/reconciliation-summary.test.ts` -- covers REC-04 (totals computation)
- [ ] Extend `tests/bank-transactions/categorize.test.ts` -- covers CAT-03 (positionId in RuleInput)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `prisma/schema.prisma` -- full schema, all models and relations
- Codebase inspection: `src/components/ui/account-combobox.tsx` -- Popover+Command pattern to replicate
- Codebase inspection: `src/lib/bank-transactions/categorize.ts` -- matchRule/applyRules engine to extend
- Codebase inspection: `src/app/api/entities/[entityId]/subledger/route.ts` -- holding creation with GL auto-creation
- Codebase inspection: `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` -- JE creation from transactions
- Codebase inspection: `src/lib/bank-transactions/create-je.ts` -- JE line item direction logic
- Codebase inspection: `src/lib/journal-entries/auto-number.ts` -- entry number generation
- Codebase inspection: `src/components/bank-feed/categorize-prompt.tsx` -- rule creation prompt flow
- Codebase inspection: `src/components/bank-feed/rule-form.tsx` -- rule form with account picker
- Codebase inspection: `src/app/(auth)/bank-feed/page.tsx` -- full bank feed page structure
- Codebase inspection: `src/app/(auth)/holdings/page.tsx` -- holdings page with expanded rows
- Codebase inspection: `src/app/(auth)/bank-feed/rules/page.tsx` -- rules management page
- Codebase inspection: `src/app/(auth)/reconcile/[itemId]/page.tsx` -- reconciliation page to merge

### Secondary (MEDIUM confidence)
- Codebase patterns: Module-level Map cache with 60s TTL (confirmed across 5+ files)
- Codebase patterns: Entity-scoped API routes under /api/entities/[entityId]/...
- Accounting convention: Opening Balance Equity as 3xxx equity series (standard accounting practice)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing libraries
- Architecture: HIGH - all patterns extend existing code, no novel architecture
- Pitfalls: HIGH - identified from direct codebase analysis of integration points
- Schema changes: HIGH - straightforward nullable field additions
- Opening balance accounting: MEDIUM - direction logic for liabilities needs careful implementation

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable codebase, no external dependency changes expected)
