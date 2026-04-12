# Phase 10: Positions Model & Holdings Overhaul - Research

**Researched:** 2026-04-12
**Domain:** Prisma schema evolution, GL account hierarchy, data migration, UI restructuring
**Confidence:** HIGH

## Summary

Phase 10 restructures the holding/position data model to support family office use cases. The current system has 7 holding types with a flat SubledgerItem-to-Account link. The overhaul expands to 13 holding types, introduces a 3-level COA hierarchy (GL type parent > holding summary account > position leaf accounts), and moves the primary GL anchor from SubledgerItem to Position.

The existing codebase already has a Position model with the parent-child relationship to SubledgerItem, expandable position rows in the UI, and an auto-GL-account creation pattern in the subledger API. The core work is: (1) add `accountId` to Position, (2) expand the SubledgerItemType enum and HOLDING_TYPE_TO_GL mapping, (3) auto-create position-level GL accounts, (4) write a data migration that backfills default positions for holdings without them and transfers existing GL accounts, and (5) update the holdings page to reflect the new type taxonomy and hierarchy.

**Primary recommendation:** Execute as a layered migration: schema + enum changes first, then API + migration script, then UI updates. Use `prisma db push` (the established pattern) for schema changes, and a standalone data backfill script run within the same deploy for existing data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Holding type taxonomy:** Full restructure by asset class. New enum: BANK_ACCOUNT, BROKERAGE_ACCOUNT, CREDIT_CARD, REAL_ESTATE, EQUIPMENT, LOAN, PRIVATE_FUND, MORTGAGE, LINE_OF_CREDIT, TRUST_ACCOUNT, OPERATING_BUSINESS, NOTES_RECEIVABLE, OTHER (13 types, replacing current 7)
- **Position-to-GL wiring:** 3-level COA hierarchy (GL type parent > holding summary account > position leaf accounts). Both holdings AND positions get GL accounts. `accountId` moves from SubledgerItem to Position as primary GL anchor. Holding retains parent GL for summary/aggregation. Bank transactions post against position's GL account.
- **Position creation flow:** After creating a holding, immediately prompt "Add your first positions?" with multi-row form. User can add more later. Every holding should end up with at least one position.
- **Existing data migration:** Auto on deploy. Holdings without positions get a default position auto-created (Cash for bank accounts, General for others). Existing GL account transfers to auto-created default position. New parent summary GL account created for the holding. Holdings with positions: each position gets a GL account auto-created.
- **Holdings page hierarchy:** Grouped by holding type with collapsible sections or tabs. Holding row shows aggregate totals. Expanded position rows show full detail inline (name, GL account, balance, qty, unit cost, unit price, unrealized P&L, asset class). All add/edit via dialogs. Matches current expandable-row pattern.

### Claude's Discretion
- GL parent account number mapping for each new holding type (standard COA conventions: assets 1xxxx, liabilities 2xxxx)
- Position GL account naming convention (position name vs holding+position combined)
- Default position names per holding type (e.g., "Cash" for bank accounts)
- Migration script implementation details and ordering
- Position type enum updates if needed for new holding types
- Loading states and empty states for the restructured holdings page

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 10 in REQUIREMENTS.md is currently labeled "Family Office II: Capital Accounts" (CAP-01 through CAP-05), which is a different feature. The actual phase 10 work (positions model & holdings overhaul) was redefined via the phase directory and CONTEXT.md. Requirements are derived from the locked decisions:

| ID | Description | Research Support |
|----|-------------|-----------------|
| POS-01 | Expand SubledgerItemType enum from 7 to 13 holding types | Schema change pattern via `prisma db push`; HOLDING_TYPE_TO_GL mapping expansion |
| POS-02 | Add `accountId` to Position model as primary GL anchor | Prisma schema field addition, FK to Account |
| POS-03 | Auto-create GL accounts for positions (3-level hierarchy) | Extend existing HOLDING_TYPE_TO_GL + auto-number pattern from subledger route |
| POS-04 | Auto-create parent summary GL account for holdings | New account creation in holding create flow |
| POS-05 | Data migration: backfill default positions for existing holdings | Prisma transaction script, must preserve existing GL account references |
| POS-06 | Position creation flow with "Add first positions" prompt | Multi-row dialog after holding creation |
| POS-07 | Holdings page grouped by type with aggregate totals | UI restructure using existing expandable-row pattern |
| POS-08 | Bank transactions post against position-level GL accounts | Update create-je bankAccountId resolution path |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^7.5.0 | Schema changes, data migration, queries | Already in use; `db push` for schema sync |
| Next.js | 15.5.14 | API routes, page rendering | Already in use |
| Zod | (existing) | Input validation for new/updated schemas | Already used in every API route |
| shadcn/ui | (existing) | Dialog, Table, Card, Badge, Select, Input | Already used throughout holdings page |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (existing) | Toast notifications | Position CRUD feedback |
| lucide-react | (existing) | Icons for new holding types | New type icons in filter tabs and cards |

### Alternatives Considered
None needed -- this phase extends existing stack, no new libraries required.

## Architecture Patterns

### Current Model (Before)
```
Account (11100 "Chase Operating")
  ^
  | accountId (1:1)
  |
SubledgerItem (holding: "Chase Operating")
  |
  | subledgerItemId (1:N)
  v
Position (no GL link) -- "Cash", "AAPL" etc.
```

### Target Model (After)
```
Account (11000 "Cash & Cash Equivalents")      -- GL type parent (pre-existing)
  |
  +-- Account (11100 "Chase Operating")         -- Holding summary (NEW: parent GL for holding)
       |
       +-- Account (11110 "Chase Cash")         -- Position leaf (GL anchor for position)
       +-- Account (11120 "Chase Savings")       -- Position leaf

SubledgerItem (holding: "Chase Operating")
  | accountId --> 11100 (summary)
  |
  +-- Position ("Cash")
  |     | accountId --> 11110 (leaf)
  |
  +-- Position ("Savings Sweep")
        | accountId --> 11120 (leaf)
```

### Pattern 1: 3-Level GL Account Hierarchy
**What:** GL type parent (e.g., 11000) > holding summary (e.g., 11100) > position leaf (e.g., 11110)
**When to use:** Every holding creation and position creation
**Key detail:** The existing `parentId` field on Account already supports this. The subledger route already auto-creates child accounts under a parent. Extend the pattern one level deeper for positions.

Account number scheme:
```
Parent prefix (5 digits) --> Holding summary (+100 per holding) --> Position leaf (+10 per position)
Example:
  11000 (Cash & Cash Equivalents)
  11100 (Chase Operating)        -- holding summary
  11110 (Chase Operating - Cash) -- position leaf
  11120 (Chase Operating - AAPL) -- position leaf
  11200 (Schwab Brokerage)       -- next holding
  11210 (Schwab - Cash)          -- position leaf
```

### Pattern 2: Expanded HOLDING_TYPE_TO_GL Mapping
**What:** Maps each of the 13 new holding types to a GL parent prefix and account type
**Where:** `src/app/api/entities/[entityId]/subledger/route.ts`

Recommended mapping (Claude's discretion):
```typescript
const HOLDING_TYPE_TO_GL: Record<string, { parentPrefix: string; accountType: AccountType }> = {
  // Assets (1xxxx)
  BANK_ACCOUNT:       { parentPrefix: "11000", accountType: "ASSET" },
  BROKERAGE_ACCOUNT:  { parentPrefix: "12000", accountType: "ASSET" },
  TRUST_ACCOUNT:      { parentPrefix: "12500", accountType: "ASSET" },
  PRIVATE_FUND:       { parentPrefix: "13000", accountType: "ASSET" },
  NOTES_RECEIVABLE:   { parentPrefix: "14000", accountType: "ASSET" },
  REAL_ESTATE:        { parentPrefix: "16000", accountType: "ASSET" },
  EQUIPMENT:          { parentPrefix: "17000", accountType: "ASSET" },
  OPERATING_BUSINESS: { parentPrefix: "18000", accountType: "ASSET" },
  OTHER:              { parentPrefix: "19000", accountType: "ASSET" },
  // Liabilities (2xxxx)
  CREDIT_CARD:        { parentPrefix: "21000", accountType: "LIABILITY" },
  LOAN:               { parentPrefix: "22000", accountType: "LIABILITY" },
  MORTGAGE:           { parentPrefix: "23000", accountType: "LIABILITY" },
  LINE_OF_CREDIT:     { parentPrefix: "24000", accountType: "LIABILITY" },
};
```

### Pattern 3: Default Position Names Per Holding Type
**What:** When auto-creating a default position during migration or when user skips position creation
**Recommended defaults (Claude's discretion):**
```typescript
const DEFAULT_POSITION_NAME: Record<string, string> = {
  BANK_ACCOUNT:       "Cash",
  BROKERAGE_ACCOUNT:  "Cash",
  CREDIT_CARD:        "Balance",
  REAL_ESTATE:        "Property",
  EQUIPMENT:          "Equipment",
  LOAN:               "Principal",
  PRIVATE_FUND:       "LP Interest",
  MORTGAGE:           "Principal",
  LINE_OF_CREDIT:     "Balance",
  TRUST_ACCOUNT:      "Corpus",
  OPERATING_BUSINESS: "Equity Interest",
  NOTES_RECEIVABLE:   "Note",
  OTHER:              "General",
};
```

### Pattern 4: Position GL Account Naming
**What:** How position GL accounts are named in the COA
**Recommendation (Claude's discretion):** Use position name directly since the COA hierarchy provides context.
- Position name for the account name: `"AAPL"`, `"Cash"`, `"LP Interest"`
- The parent account (holding summary) provides the context: under "Schwab Brokerage", an account named "AAPL" is unambiguous
- For trial balance/reports, the full path is rendered by the existing COA hierarchy display

### Pattern 5: Data Migration Strategy
**What:** How to handle existing holdings and positions during deploy
**Approach:** A TypeScript backfill script executed after `prisma db push`. Uses Prisma client within a transaction.

Migration steps per existing SubledgerItem:
1. Create a new parent summary GL account under the type parent (e.g., 11100 under 11000)
2. If holding has no positions: create a default position, transfer existing `accountId` GL account to it
3. If holding has positions: for each position, auto-create a leaf GL account under the holding summary
4. Update the holding's `accountId` to point to the new summary account
5. The old leaf account that was on the holding becomes a child of the summary (re-parent it)

### Anti-Patterns to Avoid
- **Breaking GL account references:** Never delete or re-number existing GL accounts. Existing journal entry line items reference them. Only re-parent them in the hierarchy.
- **Orphaned positions without GL accounts:** Every position must end up with an `accountId`. The migration and creation flow must enforce this.
- **Dual account numbering:** Don't create a second numbering scheme. Extend the existing parent+100 / parent+10 pattern consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Account number generation | Custom sequence logic | Extend existing sibling-query pattern from subledger route | Already handles collisions, uses parent+100 stepping |
| Schema migration | Manual SQL ALTER TABLE | `prisma db push` + data backfill script | Established project pattern since Phase 2 |
| Enum expansion | Raw SQL enum modification | Update Prisma schema enum + `db push` | Prisma handles PostgreSQL enum ALTER automatically |
| Balance aggregation | Manual sum queries | Extend existing `syncParentBalance()` | Already aggregates position marketValues to parent |

## Common Pitfalls

### Pitfall 1: Enum Migration Breaking Existing Data
**What goes wrong:** Renaming enum values (e.g., INVESTMENT -> BROKERAGE_ACCOUNT) causes PostgreSQL to reject existing rows.
**Why it happens:** PostgreSQL enums are strict; values in existing rows must exist in the new enum.
**How to avoid:** Add new enum values FIRST (BROKERAGE_ACCOUNT etc.), then run data migration to update existing rows from old values to new values, then remove old values. With `prisma db push`, Prisma handles additive enum changes automatically. For value renames (INVESTMENT -> BROKERAGE_ACCOUNT, PRIVATE_EQUITY -> PRIVATE_FUND), the safest approach is: add new values, update data, then mark old values as deprecated or keep them.
**Warning signs:** `prisma db push` fails with "cannot drop enum value that is still in use."

### Pitfall 2: Foreign Key Ordering in Migration Transaction
**What goes wrong:** Creating a position with accountId before the GL account exists, or vice versa.
**Why it happens:** Circular dependency between Account creation and Position creation within a transaction.
**How to avoid:** Within the transaction: (1) create GL account, (2) create AccountBalance, (3) create/update Position with accountId, (4) update SubledgerItem accountId. This ordering respects FK constraints.

### Pitfall 3: Breaking Bank Transaction Posting
**What goes wrong:** Bank transactions currently use `subledgerItem.accountId` as the `bankAccountId` in JE creation. After the change, this points to the summary account, not the position where transactions should post.
**Why it happens:** `createJournalEntryFromTransaction()` receives `bankAccountId` from `subledgerItem.accountId`.
**How to avoid:** Update the bank transaction posting flow to resolve the correct position's `accountId`. For bank accounts with a single "Cash" position, this is straightforward. For brokerage accounts, the categorization UI needs to let the user pick which position. However, this can be deferred if categorization only targets the default position initially.
**Warning signs:** JE line items posting to summary accounts instead of leaf accounts, causing incorrect trial balance drill-down.

### Pitfall 4: Holding Type Rename Data Corruption
**What goes wrong:** Existing holdings with type INVESTMENT need to become BROKERAGE_ACCOUNT, but the rename is not atomic with the enum change.
**Why it happens:** Prisma db push adds the new enum value but does not rename existing data.
**How to avoid:** The migration script must explicitly update all existing rows: `INVESTMENT -> BROKERAGE_ACCOUNT`, `PRIVATE_EQUITY -> PRIVATE_FUND`, `RECEIVABLE -> NOTES_RECEIVABLE`. Run this BEFORE removing old enum values. Actually, since this is `db push` (not `migrate`), the safest approach is to keep old values temporarily and migrate data, then do a second push to remove them.

### Pitfall 5: Account Number Collisions
**What goes wrong:** Auto-generated account numbers for new holdings or positions collide with existing accounts.
**Why it happens:** The +100/+10 stepping pattern assumes sequential creation, but migration creates many accounts at once.
**How to avoid:** Query max existing account number under each parent before generating new numbers. Process migration holdings sequentially, not in parallel. The existing pattern already does this (finds highest sibling, adds increment).

## Code Examples

### Schema Changes (Position model addition)
```prisma
// Source: Existing schema + CONTEXT.md decisions
model Position {
  id              String          @id @default(cuid())
  subledgerItemId String
  accountId       String          // NEW: GL anchor for position
  name            String
  positionType    PositionType
  quantity        Decimal?        @db.Decimal(19, 6)
  unitCost        Decimal?        @db.Decimal(19, 6)
  unitPrice       Decimal?        @db.Decimal(19, 6)
  costBasis       Decimal?        @db.Decimal(19, 4)
  marketValue     Decimal         @default(0) @db.Decimal(19, 4)
  ticker          String?
  assetClass      String?
  acquiredDate    DateTime?       @db.Date
  notes           String?
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  subledgerItem   SubledgerItem   @relation(fields: [subledgerItemId], references: [id], onDelete: Cascade)
  account         Account         @relation(fields: [accountId], references: [id])  // NEW

  @@index([subledgerItemId])
  @@index([accountId])                                                                // NEW
  @@map("positions")
}
```

### Expanded SubledgerItemType Enum
```prisma
enum SubledgerItemType {
  BANK_ACCOUNT
  BROKERAGE_ACCOUNT    // replaces INVESTMENT
  CREDIT_CARD          // NEW
  REAL_ESTATE
  EQUIPMENT            // NEW
  LOAN
  PRIVATE_FUND         // replaces PRIVATE_EQUITY
  MORTGAGE             // NEW
  LINE_OF_CREDIT       // NEW
  TRUST_ACCOUNT        // NEW
  OPERATING_BUSINESS   // NEW
  NOTES_RECEIVABLE     // replaces RECEIVABLE
  OTHER
}
```

### Position GL Account Auto-Creation Pattern
```typescript
// Source: Extending existing pattern from subledger/route.ts
async function createPositionGLAccount(
  tx: PrismaTransaction,
  entityId: string,
  holdingAccountId: string,  // parent summary account
  positionName: string,
  accountType: AccountType
) {
  // Find highest sibling number under the holding account
  const holdingAccount = await tx.account.findUnique({
    where: { id: holdingAccountId },
    select: { id: true, number: true },
  });
  if (!holdingAccount) throw new Error("Holding account not found");

  const siblings = await tx.account.findMany({
    where: { entityId, parentId: holdingAccountId },
    orderBy: { number: "desc" },
    take: 1,
  });

  const parentNum = parseInt(holdingAccount.number, 10);
  const nextNumber = siblings.length === 0
    ? (parentNum + 10).toString()   // +10 for position-level stepping
    : (parseInt(siblings[0].number, 10) + 10).toString();

  const account = await tx.account.create({
    data: {
      entityId,
      number: nextNumber,
      name: positionName,
      type: accountType,
      parentId: holdingAccountId,
    },
  });

  await tx.accountBalance.create({
    data: { accountId: account.id, balance: 0 },
  });

  return account;
}
```

### Migration Backfill Script Pattern
```typescript
// Source: Project pattern from STATE.md [02-01] decision
// Run after prisma db push, within same deploy
async function migrateHoldingsToPositionModel() {
  const holdings = await prisma.subledgerItem.findMany({
    where: { isActive: true },
    include: { account: true, positions: { where: { isActive: true } } },
  });

  for (const holding of holdings) {
    await prisma.$transaction(async (tx) => {
      // 1. Create summary account for the holding (new parent)
      const glMapping = HOLDING_TYPE_TO_GL[holding.itemType];
      const parentAccount = await tx.account.findFirst({
        where: { entityId: holding.entityId, number: glMapping.parentPrefix },
      });

      // ... create summary, re-parent existing account, create default position if needed
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 7 holding types (BANK_ACCOUNT, INVESTMENT, REAL_ESTATE, LOAN, PRIVATE_EQUITY, RECEIVABLE, OTHER) | 13 holding types by asset class | Phase 10 | Full enum replacement with data migration |
| SubledgerItem.accountId as primary GL anchor | Position.accountId as primary GL anchor | Phase 10 | Bank transactions, reconciliation, JE creation all update |
| Flat holding-to-account link | 3-level COA hierarchy (type > holding > position) | Phase 10 | Richer drill-down in trial balance and reports |
| Positions optional, no GL link | Every position gets a GL account | Phase 10 | Positions become first-class GL citizens |

## Open Questions

1. **Enum rename strategy**
   - What we know: INVESTMENT, PRIVATE_EQUITY, RECEIVABLE need renaming to BROKERAGE_ACCOUNT, PRIVATE_FUND, NOTES_RECEIVABLE. Prisma `db push` can add new values but removing old ones with data in place fails.
   - What's unclear: Whether to keep old enum values as deprecated aliases or do a two-step push (add new, migrate data, remove old).
   - Recommendation: Add all new values first, run migration to update existing rows, then do a second `db push` with old values removed. This is safest but requires two pushes. Alternatively, keep old values permanently (harmless) and only use new values in code.

2. **Bank transaction position selection UI**
   - What we know: CONTEXT.md says "categorization UI needs to let user pick which position within the holding." Currently, categorization assigns a GL account (expense category), not a position.
   - What's unclear: Whether this means the Phase 10 categorization UI change is in scope, or if it's deferred to a future phase.
   - Recommendation: For Phase 10, bank transactions for bank accounts auto-resolve to the default "Cash" position. Brokerage position selection UI can be deferred since bank feeds are primarily for bank accounts, not brokerage accounts.

3. **PositionType enum expansion**
   - What we know: CONTEXT.md mentions "Position type enum updates if needed for new holding types" as Claude's discretion.
   - What's unclear: Whether new position types like LOAN_PRINCIPAL, INSURANCE_VALUE, etc. are needed.
   - Recommendation: The existing PositionType enum (CASH, PUBLIC_EQUITY, FIXED_INCOME, MUTUAL_FUND, ETF, PRIVATE_EQUITY, REAL_PROPERTY, ACCUMULATED_DEPRECIATION, OTHER) is sufficient. New holding types like MORTGAGE can use CASH or OTHER for their default positions. No new position types needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/bank-transactions/create-je.test.ts --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POS-01 | SubledgerItemType enum has 13 values | unit | `npx vitest run tests/holdings/enum-types.test.ts -x` | Wave 0 |
| POS-02 | Position.accountId FK exists and is required | integration | `npx prisma db push --dry-run` | N/A (schema validation) |
| POS-03 | Position creation auto-creates GL account | unit | `npx vitest run tests/holdings/position-gl.test.ts -x` | Wave 0 |
| POS-04 | Holding creation creates parent summary GL account | unit | `npx vitest run tests/holdings/holding-gl.test.ts -x` | Wave 0 |
| POS-05 | Migration backfills default positions | unit | `npx vitest run tests/holdings/migration.test.ts -x` | Wave 0 |
| POS-06 | Position creation flow UI | manual-only | Manual: Chrome browser test | N/A |
| POS-07 | Holdings page grouped by type | manual-only | Manual: Chrome browser test | N/A |
| POS-08 | Bank transaction posts to position GL | unit | `npx vitest run tests/bank-transactions/create-je.test.ts -x` | Exists (needs update) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/holdings/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/holdings/enum-types.test.ts` -- validates new SubledgerItemType enum values
- [ ] `tests/holdings/position-gl.test.ts` -- validates position GL account auto-creation logic
- [ ] `tests/holdings/holding-gl.test.ts` -- validates holding summary GL account creation
- [ ] `tests/holdings/migration.test.ts` -- validates data migration backfill logic
- [ ] Update `tests/bank-transactions/create-je.test.ts` -- validate position-level bankAccountId resolution

## Sources

### Primary (HIGH confidence)
- Prisma schema at `prisma/schema.prisma` -- current model structure, enums, relations
- Subledger API at `src/app/api/entities/[entityId]/subledger/route.ts` -- HOLDING_TYPE_TO_GL mapping, auto-account creation
- Position API at `src/app/api/entities/[entityId]/subledger/[itemId]/positions/route.ts` -- syncParentBalance, position CRUD
- Holdings page at `src/app/(auth)/holdings/page.tsx` -- UI structure, expandable rows, filter tabs
- Bank transaction JE creation at `src/lib/bank-transactions/create-je.ts` -- bankAccountId usage pattern
- CONTEXT.md -- all locked decisions verified against codebase

### Secondary (MEDIUM confidence)
- STATE.md decisions log -- project conventions (db push pattern, module-level cache, soft-delete)
- Existing migration SQL files in `prisma/migrations/` -- trigger patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- extending existing patterns (auto-GL, expandable rows, Prisma transactions)
- Pitfalls: HIGH -- identified from direct codebase inspection of FK constraints, enum behavior, and JE creation flow
- Migration: MEDIUM -- data migration script needs careful ordering and testing; enum rename strategy has two valid approaches

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, no external dependency changes)
