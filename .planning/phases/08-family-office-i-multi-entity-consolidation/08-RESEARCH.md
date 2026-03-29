# Phase 8: Family Office I -- Multi-Entity Consolidation - Research

**Researched:** 2026-03-29
**Domain:** Multi-entity financial statement consolidation with intercompany eliminations
**Confidence:** HIGH

## Summary

This phase adds consolidated financial statements (P&L, Balance Sheet, Cash Flow) across multiple entities with intercompany elimination rules. The existing codebase already has a strong foundation: `getConsolidatedTrialBalance` demonstrates the multi-entity aggregation pattern, `EntityTreeRows` provides the expandable row UI pattern, and the reports page has the tab/date/basis infrastructure. The primary new work is: (1) a new `EliminationRule` Prisma model, (2) consolidated variants of the three report query functions that aggregate across entities and apply eliminations, (3) a new API route pattern for consolidated reports (not scoped to a single entityId), (4) UI modifications to the reports page for consolidated mode with expandable entity rows and elimination sections, and (5) a new Settings sub-page for managing elimination rules.

The key technical challenge is the elimination calculation: fetching balances for account pairs across entity pairs, determining the smaller balance for mismatch handling, and injecting elimination rows into the report data structure. The existing raw SQL query patterns (Prisma.sql with Prisma.join) are well-suited for this. No new libraries are needed -- everything builds on the existing stack.

**Primary recommendation:** Extend the existing report query functions with consolidated variants that accept `entityIds: string[]`, aggregate per-entity data, then apply elimination rules in application logic (not SQL). Keep elimination as a post-processing step for clarity and testability.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- When "All Entities" is selected in the header switcher, reports automatically show consolidated data -- no explicit toggle needed
- Entity filter chips displayed above the report allow deselecting specific entities from consolidation
- All entity chips are selected by default; click to toggle off
- All three financial statements (P&L, Balance Sheet, Cash Flow) support consolidation
- Consistent with existing consolidated trial balance pattern
- Dedicated settings page: Settings > Intercompany Eliminations
- Rules defined as account pairs across entities: Entity A + Account paired with Entity B + Account
- Multiple rules per entity relationship supported
- Each rule has a user-defined descriptive label
- Rules are active/inactive toggleable (soft-delete pattern)
- Only users with Owner role on BOTH entities in the rule can create/edit rules; Editors and Viewers see rules applied in reports
- When rule balances don't match: eliminate the smaller amount
- Flag the difference as a warning row in the Eliminations section
- Warning banner at top of consolidated report for mismatches
- Expandable rows: each account row shows consolidated total; click to expand for per-entity breakdown underneath
- Dedicated "Intercompany Eliminations" section after entity subtotals, before final consolidated total
- Report structure: Entity subtotals -> Eliminations section -> Final consolidated total
- Consolidated reports always use the selected calendar date range regardless of entity fiscal years
- Consolidated "YTD" means January 1 through selected date (calendar year, always)
- Report header lists included entities with their fiscal year ends for transparency
- Cash/accrual basis toggle carries through to consolidated reports
- CSV export includes full detail: consolidated rows, per-entity detail rows (indented), and elimination rows
- Same export pattern (Export dropdown with CSV option) as existing reports

### Claude's Discretion
- API route design for consolidated endpoints (new routes vs extending existing)
- Schema design for elimination rules (new Prisma model)
- Elimination calculation logic and query approach
- Loading states and skeleton design for consolidated reports
- Exact styling of entity filter chips, expandable rows, and elimination section
- Warning banner design and mismatch highlight styling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONS-01 | User can generate a consolidated P&L across any selected subset of entities | Consolidated income statement query function aggregating across entityIds with per-entity breakdown; entity filter chips UI; expandable row pattern from TB |
| CONS-02 | User can generate a consolidated Balance Sheet across any selected subset of entities | Consolidated balance sheet query function; same aggregation + expansion pattern as CONS-01 |
| CONS-03 | User can define intercompany elimination rules | New EliminationRule Prisma model; Settings sub-page with CRUD; Owner-on-both-entities authorization check |
| CONS-04 | Consolidated reports clearly distinguish entity-level rows from elimination rows | Expandable entity tree rows (from TB pattern); dedicated Eliminations section with labeled rows; mismatch warning banner |
| CONS-05 | Consolidation respects the entity's fiscal year end when aggregating periods | Calendar date range always used for consolidation; entity fiscal year ends displayed in report header for transparency |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | v7 | ORM + schema for EliminationRule model | Already used throughout; raw SQL via Prisma.sql for report queries |
| Next.js | 15 | API routes + pages | Existing app framework |
| Zod | v4 | API input validation | Already used in all API routes |
| shadcn/ui | v4 | UI components (Card, Badge, Table, Button, Switch) | Already used throughout |
| Tailwind CSS | v4 | Styling | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PapaParse | existing | CSV export generation | Consolidated report CSV export |
| lucide-react | existing | Icons (ChevronRight/Down, AlertTriangle, Download) | Expandable rows, warning banners |
| sonner | existing | Toast notifications | Rule create/edit/delete feedback |
| @clerk/nextjs | existing | Auth + userId extraction | API route authorization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-level elimination calc | SQL-level elimination | SQL would be more performant but harder to maintain/test; app-level is clearer for <100 entities |
| New /api/consolidated/ routes | Extend existing /api/entities/[entityId]/reports/ | New routes cleaner; existing routes are entity-scoped and consolidation is cross-entity |

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    queries/
      consolidated-report-queries.ts   # New: consolidated P&L, BS, CF queries
    db/
      entity-access.ts                 # Extend: add getOwnerEntityIds() helper
  app/
    api/
      consolidated/                    # New: cross-entity API routes
        reports/
          income-statement/route.ts
          balance-sheet/route.ts
          cash-flow/route.ts
        elimination-rules/
          route.ts                     # GET (list), POST (create)
          [ruleId]/
            route.ts                   # PATCH (update), DELETE (soft-delete)
    (auth)/
      settings/
        eliminations/
          page.tsx                     # New: elimination rules management page
      reports/
        page.tsx                       # Modified: consolidated mode + entity chips
  components/
    reports/
      consolidated-section-rows.tsx    # New: expandable entity tree rows for reports
      entity-filter-chips.tsx          # New: entity selection chips above report
      elimination-rows.tsx             # New: elimination section rows
      mismatch-banner.tsx              # New: warning banner for mismatches
    settings/
      elimination-rule-form.tsx        # New: create/edit elimination rule form
      elimination-rules-table.tsx      # New: list of rules with exposure summary
  types/
    index.ts                           # Extend: add consolidated report types
prisma/
  schema.prisma                        # Extend: add EliminationRule model
```

### Pattern 1: Consolidated Report Query (Application-Level Aggregation + Elimination)
**What:** Fetch per-entity report data using existing query functions, then aggregate and apply eliminations in TypeScript
**When to use:** All three consolidated financial statements
**Example:**
```typescript
// src/lib/queries/consolidated-report-queries.ts

export interface ConsolidatedReportRow extends ReportRow {
  entityId: string;
  entityName: string;
}

export interface EliminationRow {
  ruleId: string;
  label: string;
  accountType: AccountType;
  amount: number;         // always negative (elimination reduces)
  mismatchAmount?: number; // positive if mismatch detected
}

export interface ConsolidatedIncomeStatement {
  entityBreakdowns: {
    entityId: string;
    entityName: string;
    fiscalYearEnd: string;
    data: IncomeStatementData;
  }[];
  consolidatedRows: {
    incomeRows: ConsolidatedReportRow[];
    expenseRows: ConsolidatedReportRow[];
  };
  eliminations: EliminationRow[];
  mismatches: { ruleLabel: string; difference: number }[];
  totalIncome: number;    // after eliminations
  totalExpenses: number;  // after eliminations
  netIncome: number;      // after eliminations
}

export async function getConsolidatedIncomeStatement(
  entityIds: string[],
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash'
): Promise<ConsolidatedIncomeStatement> {
  // 1. Fetch per-entity data in parallel
  // 2. Fetch active elimination rules for these entities
  // 3. For each rule, compute elimination amount (smaller of the two balances)
  // 4. Detect mismatches (difference between paired account balances)
  // 5. Build consolidated totals = sum of entity totals - elimination amounts
}
```

### Pattern 2: EliminationRule Prisma Model
**What:** New model for storing intercompany elimination rule definitions
**When to use:** Schema migration
**Example:**
```prisma
model EliminationRule {
  id           String   @id @default(cuid())
  label        String   // "Intercompany Loan: Holding Co -> Fund I"
  entityAId    String
  accountAId   String
  entityBId    String
  accountBId   String
  isActive     Boolean  @default(true)
  createdBy    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  entityA      Entity   @relation("EliminationRuleEntityA", fields: [entityAId], references: [id])
  accountA     Account  @relation("EliminationRuleAccountA", fields: [accountAId], references: [id])
  entityB      Entity   @relation("EliminationRuleEntityB", fields: [entityBId], references: [id])
  accountB     Account  @relation("EliminationRuleAccountB", fields: [accountBId], references: [id])

  @@index([entityAId])
  @@index([entityBId])
  @@index([isActive])
  @@map("elimination_rules")
}
```

Note: Entity and Account models need reverse relation fields added (e.g., `eliminationRulesAsA EliminationRule[] @relation("EliminationRuleEntityA")`).

### Pattern 3: Consolidated API Routes (Cross-Entity, Not Entity-Scoped)
**What:** New API route namespace at `/api/consolidated/` since consolidation spans entities
**When to use:** All consolidated endpoints
**Example:**
```typescript
// GET /api/consolidated/reports/income-statement?entityIds=a,b,c&startDate=...&endDate=...&basis=accrual
// GET /api/consolidated/reports/balance-sheet?entityIds=a,b,c&asOfDate=...&basis=accrual
// GET /api/consolidated/reports/cash-flow?entityIds=a,b,c&startDate=...&endDate=...

const querySchema = z.object({
  entityIds: z.string().transform(s => s.split(',')).pipe(z.array(z.string().min(1)).min(1)),
  startDate: z.string().refine(s => !isNaN(Date.parse(s))),
  endDate: z.string().refine(s => !isNaN(Date.parse(s))),
  basis: z.enum(['accrual', 'cash']).optional(),
});
```

### Pattern 4: Entity Filter Chips (Client-Side State)
**What:** Toggle chips above consolidated report for including/excluding entities
**When to use:** Reports page in consolidated mode
**Example:**
```typescript
// Manage selected entity IDs as client state
const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(
  new Set(entities.map(e => e.id))
);

// Toggle handler
function toggleEntity(entityId: string) {
  setSelectedEntityIds(prev => {
    const next = new Set(prev);
    if (next.has(entityId)) {
      if (next.size > 1) next.delete(entityId); // prevent deselecting all
    } else {
      next.add(entityId);
    }
    return next;
  });
}
```

### Pattern 5: Expandable Report Rows (Extending TB Tree Pattern)
**What:** Reuse the expandable row pattern from EntityTreeRows for financial statements
**When to use:** Consolidated P&L, BS, and CF display
**Example:**
```typescript
// Similar to tb-entity-tree.tsx but for report rows
// Parent row: consolidated total for account
// Child rows: per-entity breakdown (indented, muted text)
// After all account sections: Eliminations section with rule labels
```

### Anti-Patterns to Avoid
- **Fetching consolidated data in a single massive SQL query:** Too complex to maintain; keep per-entity fetches separate and aggregate in TypeScript
- **Storing elimination amounts:** Only store rules; compute elimination amounts at query time from live balances
- **Hard-coding entity pairs in elimination logic:** Rules are user-defined and dynamic
- **Modifying existing single-entity report queries:** Keep them unchanged; create new consolidated functions that call them internally
- **Using the existing `/api/entities/[entityId]/` namespace for consolidated routes:** Consolidation is cross-entity; a separate namespace avoids confusion

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Custom CSV serializer | PapaParse (existing) | Already used in exportToCsv utility; handles quoting/escaping |
| Entity access checks | Manual DB queries | getAccessibleEntityIds (existing) | Already handles user-to-entity resolution |
| Expandable tree rows | New component from scratch | Adapt EntityTreeRows pattern | Same UX pattern, proven in consolidated TB |
| Date formatting | Custom formatter | Existing formatDateDisplay + toISODateString | Already used in reports page |
| Currency formatting | Custom formatter | formatCurrency (existing) | Already handles negative values, zero suppression |

**Key insight:** Nearly all infrastructure already exists. The work is aggregation logic, elimination calculation, and UI composition of existing patterns.

## Common Pitfalls

### Pitfall 1: Account Number Collisions Across Entities
**What goes wrong:** Different entities may have accounts with the same number but different names/types. Grouping by account number alone produces incorrect consolidation.
**Why it happens:** Each entity has its own COA scoped by entity_id. Account numbers are unique within an entity but not across entities.
**How to avoid:** Group consolidated rows by (accountNumber, accountType) tuple, not just accountNumber. Display account name from the first entity but note if names differ across entities.
**Warning signs:** Consolidated totals that look wrong; assets appearing in liabilities section.

### Pitfall 2: Double-Counting Elimination Rules
**What goes wrong:** An elimination rule for Entity A Account X <-> Entity B Account Y could be applied twice if both entities appear in the selected set and the logic iterates incorrectly.
**Why it happens:** Each rule defines a pair; if you iterate over entities and check rules per entity, you may find the same rule from both sides.
**How to avoid:** Iterate over rules (not entities), and apply each rule exactly once. The rule is the unit of work, not the entity.
**Warning signs:** Elimination amounts that are 2x the expected value.

### Pitfall 3: Mismatch Direction Confusion
**What goes wrong:** The elimination logic picks the wrong "smaller" amount because debit-normal vs credit-normal conventions differ.
**Why it happens:** Entity A's intercompany receivable (asset, debit-normal = positive) should match Entity B's intercompany payable (liability, credit-normal = positive). But raw debit/credit sums may have opposite signs.
**How to avoid:** Convert both sides to absolute balance amounts before comparing. The elimination amount is always min(abs(balanceA), abs(balanceB)). The mismatch is abs(balanceA) - abs(balanceB).
**Warning signs:** Negative elimination amounts or eliminations that increase totals instead of decreasing them.

### Pitfall 4: Reports Page State Explosion
**What goes wrong:** The reports page already has 15+ useState calls. Adding consolidated mode, entity chips, and elimination state makes it unmanageable.
**Why it happens:** All report tabs share one page component with local state.
**How to avoid:** Extract consolidated report fetching and state into a custom hook (e.g., `useConsolidatedReport`). Keep entity filter chip state separate. Consider extracting each tab into its own component file.
**Warning signs:** Page component exceeding 500 lines; hard to trace data flow.

### Pitfall 5: Fiscal Year End Display vs Query Semantics
**What goes wrong:** Confusing "display fiscal year ends in header" with "filter data by fiscal year." The decision is clear: always use calendar date range for consolidated queries.
**Why it happens:** The word "respects" in CONS-05 is ambiguous.
**How to avoid:** Consolidated queries always use the user-selected calendar date range. Fiscal year end is display-only in the report header. No fiscal-year-based date transformations.
**Warning signs:** Different entities showing data for different date ranges in the same consolidated report.

### Pitfall 6: Owner Role Check on Both Entities
**What goes wrong:** Elimination rule creation succeeds even if user is only Owner on one of the two entities.
**Why it happens:** Standard entity access check only verifies one entity at a time.
**How to avoid:** For rule creation/editing, explicitly check that the authenticated user has OWNER role on both entityAId and entityBId via two EntityAccess lookups.
**Warning signs:** Editors creating elimination rules they shouldn't have access to.

## Code Examples

### Consolidated Income Statement Query (Core Logic)
```typescript
// Source: Project codebase pattern (report-queries.ts + trial-balance-queries.ts)
export async function getConsolidatedIncomeStatement(
  entityIds: string[],
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash' = 'accrual'
): Promise<ConsolidatedIncomeStatement> {
  // 1. Fetch entities with fiscal year info
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, name: true, fiscalYearEnd: true },
  });

  // 2. Fetch per-entity income statements in parallel
  const entityDataPromises = entities.map(async (entity) => ({
    entityId: entity.id,
    entityName: entity.name,
    fiscalYearEnd: entity.fiscalYearEnd,
    data: await getIncomeStatement(entity.id, startDate, endDate, basis),
  }));
  const entityBreakdowns = await Promise.all(entityDataPromises);

  // 3. Fetch active elimination rules involving these entities
  const rules = await prisma.eliminationRule.findMany({
    where: {
      isActive: true,
      entityAId: { in: entityIds },
      entityBId: { in: entityIds },
    },
  });

  // 4. Compute eliminations
  const eliminations: EliminationRow[] = [];
  const mismatches: { ruleLabel: string; difference: number }[] = [];

  for (const rule of rules) {
    const entityAData = entityBreakdowns.find(e => e.entityId === rule.entityAId);
    const entityBData = entityBreakdowns.find(e => e.entityId === rule.entityBId);
    if (!entityAData || !entityBData) continue;

    const balanceA = findAccountBalance(entityAData.data, rule.accountAId);
    const balanceB = findAccountBalance(entityBData.data, rule.accountBId);
    const absA = Math.abs(balanceA);
    const absB = Math.abs(balanceB);
    const eliminationAmount = Math.min(absA, absB);
    const mismatch = Math.abs(absA - absB);

    if (eliminationAmount > 0) {
      eliminations.push({
        ruleId: rule.id,
        label: rule.label,
        accountType: /* determine from account type */,
        amount: -eliminationAmount,
        mismatchAmount: mismatch > 0.005 ? mismatch : undefined,
      });
    }

    if (mismatch > 0.005) {
      mismatches.push({ ruleLabel: rule.label, difference: mismatch });
    }
  }

  // 5. Aggregate totals
  const rawTotalIncome = entityBreakdowns.reduce((s, e) => s + e.data.totalIncome, 0);
  const rawTotalExpenses = entityBreakdowns.reduce((s, e) => s + e.data.totalExpenses, 0);
  const incomeEliminations = eliminations
    .filter(e => e.accountType === 'INCOME')
    .reduce((s, e) => s + e.amount, 0);
  const expenseEliminations = eliminations
    .filter(e => e.accountType === 'EXPENSE')
    .reduce((s, e) => s + e.amount, 0);

  return {
    entityBreakdowns,
    consolidatedRows: { /* merged rows grouped by account */ },
    eliminations,
    mismatches,
    totalIncome: rawTotalIncome + incomeEliminations,
    totalExpenses: rawTotalExpenses + expenseEliminations,
    netIncome: (rawTotalIncome + incomeEliminations) - (rawTotalExpenses + expenseEliminations),
  };
}
```

### Elimination Rule Authorization Check
```typescript
// Source: Project pattern (entity-access.ts)
export async function canManageEliminationRule(
  clerkUserId: string,
  entityAId: string,
  entityBId: string
): Promise<boolean> {
  const user = await getInternalUser(clerkUserId);
  if (!user) return false;

  const [accessA, accessB] = await Promise.all([
    prisma.entityAccess.findUnique({
      where: { entityId_userId: { entityId: entityAId, userId: user.id } },
    }),
    prisma.entityAccess.findUnique({
      where: { entityId_userId: { entityId: entityBId, userId: user.id } },
    }),
  ]);

  return accessA?.role === 'OWNER' && accessB?.role === 'OWNER';
}
```

### Entity Filter Chips Component
```typescript
// Source: Project pattern (Badge component from shadcn/ui)
interface EntityFilterChipsProps {
  entities: { id: string; name: string; fiscalYearEnd: string }[];
  selectedIds: Set<string>;
  onToggle: (entityId: string) => void;
}

function EntityFilterChips({ entities, selectedIds, onToggle }: EntityFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((entity) => {
        const isSelected = selectedIds.has(entity.id);
        return (
          <button
            key={entity.id}
            onClick={() => onToggle(entity.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {entity.name}
            <span className="text-xs opacity-70">({entity.fiscalYearEnd})</span>
          </button>
        );
      })}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-entity reports only | Consolidated TB exists (Phase 3) | Phase 3 | Proven multi-entity aggregation pattern to extend |
| entity-scoped API routes only | Need cross-entity /api/consolidated/ | This phase | New route namespace for cross-entity operations |
| No intercompany handling | Elimination rules with mismatch detection | This phase | New Prisma model + application-level elimination logic |

**Existing assets to leverage:**
- `getConsolidatedTrialBalance` -- aggregation pattern with Prisma.join for entityIds
- `EntityTreeRows` -- expandable row UI with chevrons and indented child rows
- `SectionRows` -- financial statement section rendering
- `exportToCsv` -- CSV export with PapaParse
- `getAccessibleEntityIds` -- user's entity list
- Reports page tab/date/basis infrastructure

## Open Questions

1. **Cash Flow Consolidation Complexity**
   - What we know: Cash flow uses indirect method with account-name-based classification (e.g., "cash", "investment")
   - What's unclear: How to handle elimination rules that affect accounts classified differently across entities (e.g., one entity's "Intercompany Loan Receivable" is an operating asset, another's "Intercompany Loan Payable" is a financing liability)
   - Recommendation: Apply eliminations to the line-item level before cash flow classification, OR apply them as a separate section in the cash flow statement. The latter is simpler and more transparent.

2. **Consolidated Cash Flow: Aggregation Strategy**
   - What we know: Single-entity cash flow computes net income from scratch, classifies account movements by name patterns
   - What's unclear: Whether to compute consolidated cash flow by aggregating per-entity cash flow sections, or by running the classification logic on consolidated data
   - Recommendation: Aggregate per-entity cash flow sections (operating items from all entities combined, etc.) and add an eliminations section. This reuses existing classification logic per entity.

3. **Account Grouping for Consolidated View**
   - What we know: Entities may have different COAs with different account numbers
   - What's unclear: How to group accounts across entities when numbers don't match
   - Recommendation: Group by (accountNumber, accountName) for the expandable view. Accounts that only exist in one entity appear with that entity's data only. Don't try to "match" accounts across entities -- just list all.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-01 | Consolidated P&L aggregates across entities | unit | `npx vitest run tests/consolidated/consolidated-income-statement.test.ts -x` | Wave 0 |
| CONS-02 | Consolidated BS aggregates across entities | unit | `npx vitest run tests/consolidated/consolidated-balance-sheet.test.ts -x` | Wave 0 |
| CONS-03 | Elimination rules CRUD + authorization | unit | `npx vitest run tests/consolidated/elimination-rules.test.ts -x` | Wave 0 |
| CONS-04 | Elimination rows distinguished from entity rows | unit | `npx vitest run tests/consolidated/elimination-display.test.ts -x` | Wave 0 |
| CONS-05 | Calendar date range used regardless of fiscal year | unit | `npx vitest run tests/consolidated/fiscal-year-handling.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/consolidated/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/consolidated/consolidated-income-statement.test.ts` -- covers CONS-01 (aggregation + eliminations)
- [ ] `tests/consolidated/consolidated-balance-sheet.test.ts` -- covers CONS-02 (aggregation + eliminations)
- [ ] `tests/consolidated/elimination-rules.test.ts` -- covers CONS-03 (CRUD, auth check, mismatch calc)
- [ ] `tests/consolidated/elimination-display.test.ts` -- covers CONS-04 (row type discrimination)
- [ ] `tests/consolidated/fiscal-year-handling.test.ts` -- covers CONS-05 (calendar range enforcement)

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/lib/queries/report-queries.ts` -- existing single-entity report query patterns
- Project codebase: `src/lib/queries/trial-balance-queries.ts` -- consolidated TB aggregation pattern
- Project codebase: `src/components/trial-balance/tb-entity-tree.tsx` -- expandable entity row pattern
- Project codebase: `src/app/(auth)/reports/page.tsx` -- current reports page structure
- Project codebase: `prisma/schema.prisma` -- current data model
- Project codebase: `src/lib/db/entity-access.ts` -- entity access and authorization patterns
- Project codebase: `src/app/api/entities/[entityId]/reports/income-statement/route.ts` -- API route pattern

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions -- user-locked implementation decisions from discussion phase

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- patterns directly extend existing codebase patterns (consolidated TB, report queries, entity tree rows)
- Pitfalls: HIGH -- identified from direct code analysis of account numbering, elimination logic, and state management patterns

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- internal codebase patterns unlikely to change)
