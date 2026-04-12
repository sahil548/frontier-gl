# Phase 12: Reporting Fixes & Onboarding Wizard - Research

**Researched:** 2026-04-12
**Domain:** Schema migration, report query refactoring, multi-step wizard UX, LLM-powered CSV parsing
**Confidence:** HIGH

## Summary

Phase 12 comprises five distinct workstreams that share the same codebase but have minimal interdependency: (1) cash flow classification by field instead of name matching, (2) contra account support with isContra flag, (3) rate-based budget targets linked to holdings, (4) onboarding wizard for new entity setup, and (5) LLM-powered CSV column detection across all three import flows. All five build on well-established project patterns -- Prisma schema migration, Zod validation, react-hook-form, shadcn/ui components, and entity-scoped API routes.

The highest-risk item is the LLM-powered CSV import, which introduces a new external dependency (Anthropic SDK) and requires graceful fallback when the API is unavailable. The cash flow and contra account changes are surgical refactors of existing query logic. The onboarding wizard is the largest UI surface area but reuses existing infrastructure (COA templates, budget grid pattern, EntityForm). Rate-based budgets require a small schema extension and a computation helper.

**Primary recommendation:** Start with the schema migration (cashFlowCategory, isContra, columnMapping model) since all other workstreams depend on it, then parallelize the five workstreams.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Cash Flow Classification:** Add `cashFlowCategory` enum field (OPERATING, INVESTING, FINANCING, EXCLUDED) to Account model. Only for balance sheet accounts (Asset, Liability, Equity). Migration auto-assigns using current name-matching logic as one-time backfill. COA templates pre-fill cashFlowCategory. UI dropdown on account form, only visible for Asset/Liability/Equity. Report query switches from name matching to field lookup.
- **Contra Accounts:** Add `isContra: boolean` (default false) to Account model. Keeps 5-type AccountType enum unchanged. Contra accounts show as indented detail lines under parent with net total (Equipment $50K, Less: Accum Depr ($20K), Net $30K).
- **Rate-Based Budget Targets:** User sets target annual return rate on investment holding's linked income account. Monthly budget = holding market value x rate / 12 using snapshot at creation. Budget amounts locked after computation, not auto-recalculated. Manual recalculate option. Integrates with existing budget grid.
- **Onboarding Wizard:** Triggers after creating ANY new entity (not just first-time). WelcomeScreen remains for zero-entity users. Steps: COA template picker, Holdings setup, Opening balances, First transactions. All steps skippable with checklist progress. User can return to skipped steps. COA step shows template cards (Family Office, Hedge Fund, Blank). Opening Balances step uses spreadsheet-style grid plus CSV import option.
- **AI-Powered CSV Import:** LLM column mapping via Claude API. Falls back to existing heuristic COLUMN_PATTERNS. Applies to all three CSV flows: bank statement, COA import, budget import. Always shows mapping confirmation UI before import. Save confirmed mappings per source name for reuse.

### Claude's Discretion
- Exact cashFlowCategory dropdown placement and styling on account form
- Migration script implementation details for backfilling existing accounts
- Contra account indentation and netting formatting specifics
- Onboarding wizard UI layout (stepper, sidebar checklist, or card-based)
- LLM prompt design for column mapping inference
- Mapping persistence storage approach (DB model vs localStorage)
- Opening balance JE date selection logic

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App framework | Already in project |
| Prisma | 7.5.0 | ORM + migrations | Already in project, additive-only migration pattern |
| React Hook Form | 7.72.0 | Form state | Already in project, all forms use it |
| Zod | 4.3.6 | Schema validation | Already in project, all validators use it |
| shadcn/ui | 4.1.0 | UI components | Already in project, Card/Dialog/Sheet/Badge/Table |
| PapaParse | 5.5.3 | CSV parsing | Already in project, used by csv-parser.ts |
| Recharts | 3.8.1 | Charts | Already in project if budget visualizations needed |
| sonner | 2.0.7 | Toast notifications | Already in project |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | latest | Claude API for column mapping | LLM-powered CSV import |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @anthropic-ai/sdk | @ai-sdk/anthropic (Vercel AI SDK) | Vercel AI SDK adds abstraction layer; direct Anthropic SDK is simpler for a single structured API call without streaming. Project has no existing AI SDK dependency. |
| DB model for saved mappings | localStorage | DB persists across devices and users. localStorage is simpler but entity-scoped data should be in DB for multi-user access. Use DB. |

**Installation:**
```bash
npm install @anthropic-ai/sdk
```

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  schema.prisma            # Add CashFlowCategory enum, isContra, ColumnMapping model
  migrations/              # Additive migration SQL

src/
  lib/
    validators/
      account.ts           # Extend with cashFlowCategory + isContra fields
    accounts/
      template.ts          # Add cashFlowCategory to FAMILY_OFFICE_TEMPLATE entries
      cash-flow-backfill.ts  # One-time migration logic (existing name-match rules)
    bank-transactions/
      csv-parser.ts        # Refactor: extract detectColumns, add LLM detection layer
      llm-column-mapper.ts # New: Claude API call for header inference
      column-mapping-store.ts # New: saved mapping CRUD
    queries/
      report-queries.ts    # Refactor: getCashFlowStatement reads cashFlowCategory field
      consolidated-report-queries.ts # Same refactor for consolidated
    budgets/
      rate-based.ts        # New: compute monthly budget from holding value x rate

  components/
    onboarding/
      welcome-screen.tsx   # Existing -- unchanged for zero-entity users
      onboarding-wizard.tsx # New: multi-step wizard container
      wizard-coa-step.tsx  # New: template picker cards
      wizard-holdings-step.tsx  # New: holdings quick-setup
      wizard-balances-step.tsx  # New: opening balance grid
      wizard-transactions-step.tsx  # New: first transaction guide
      wizard-progress.tsx  # New: checklist/stepper indicator
    accounts/
      account-form.tsx     # Extend: cashFlowCategory dropdown + isContra toggle
    reports/               # Existing: update SectionRows for contra netting
    csv-import/
      column-mapping-ui.tsx # New: mapping confirmation/adjustment UI
      source-name-input.tsx # New: source name for saved mapping

  app/
    api/entities/[entityId]/
      accounts/
        route.ts           # Serialize cashFlowCategory + isContra
        [accountId]/route.ts # Accept cashFlowCategory + isContra in update
      csv-column-map/
        route.ts           # New: LLM column mapping endpoint
      column-mappings/
        route.ts           # New: saved mapping CRUD
      budgets/
        rate-target/
          route.ts         # New: compute rate-based budget
    (auth)/
      onboarding/
        [entityId]/page.tsx # New: wizard page for post-entity-creation
```

### Pattern 1: Additive Schema Migration (Established)
**What:** Add new fields/enums to Prisma schema with defaults, then `prisma db push` or `prisma migrate dev`
**When to use:** All schema changes in this phase
**Example:**
```prisma
// Add to schema.prisma
enum CashFlowCategory {
  OPERATING
  INVESTING
  FINANCING
  EXCLUDED
}

model Account {
  // ... existing fields ...
  cashFlowCategory CashFlowCategory?  // nullable for income/expense accounts
  isContra         Boolean             @default(false)
}
```

### Pattern 2: Module-Level Map Cache with 60s TTL (Established)
**What:** Cache dropdown data (accounts, dimension tags) in a module-level Map to avoid refetching per render
**When to use:** Account combobox in wizard forms, source name suggestions
**Example (from Phase 06-02 decision):**
```typescript
const accountCache = new Map<string, { data: Account[]; expires: number }>();
const TTL = 60_000;

async function getCachedAccounts(entityId: string): Promise<Account[]> {
  const cached = accountCache.get(entityId);
  if (cached && Date.now() < cached.expires) return cached.data;
  const data = await fetchAccounts(entityId);
  accountCache.set(entityId, { data, expires: Date.now() + TTL });
  return data;
}
```

### Pattern 3: Entity-Scoped API Routes (Established)
**What:** All financial data routes under `/api/entities/[entityId]/...` with auth + entity access check
**When to use:** All new API endpoints (column mappings, rate-based budget, etc.)
**Example (from existing routes):**
```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) return errorResponse("Entity not found", 404);
  // ... business logic
}
```

### Pattern 4: React Hook Form + Zod + Sheet Slide-Over (Established)
**What:** All create/edit forms use react-hook-form with zodResolver, rendered in a Sheet or Dialog
**When to use:** Account form extensions, wizard step forms
**Example:** See existing `account-form.tsx` pattern with `useForm<T>({ resolver: zodResolver(schema) })`

### Pattern 5: Conditional Form Fields Based on Type (Established)
**What:** Show/hide form fields based on selected value using `watch()` from react-hook-form
**When to use:** cashFlowCategory dropdown visible only for balance sheet types, isContra toggle
**Example (from entity-form.tsx):**
```typescript
const watchType = watch("type");
// In render:
{["ASSET", "LIABILITY", "EQUITY"].includes(watchType) && (
  <CashFlowCategoryDropdown />
)}
```

### Anti-Patterns to Avoid
- **Name matching for financial classification:** This is exactly what we are removing. Never use `nameLower.includes(...)` for cash flow classification after migration.
- **Auto-recalculating budgets on holding value change:** Locked decision -- budget amounts snapshot at creation time. Do NOT create reactive computations.
- **Custom stepper/wizard library:** Use plain React state with shadcn Card components. The project has no wizard library and adding one for a 4-step flow is over-engineering.
- **Streaming LLM responses for column mapping:** This is a single structured response (column map), not a chat. Use a simple `messages.create()` call, not streaming.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | PapaParse (already installed) | Handles quoted fields, encoding, edge cases |
| Form validation | Manual validation | react-hook-form + Zod (already installed) | Consistent with entire codebase |
| LLM API communication | Raw fetch to Claude API | @anthropic-ai/sdk | Handles retries, error types, TypeScript types |
| Decimal arithmetic | JS floating point | Decimal.js (already installed) | Financial precision requirement (DI-01) |
| Toast/notification system | Custom alerts | sonner (already installed) | Consistent with entire codebase |

**Key insight:** This phase has no new UI patterns -- it extends existing ones. The only genuinely new technology is the Anthropic SDK for the LLM column mapper, and even that is a single API call wrapper.

## Common Pitfalls

### Pitfall 1: Cash Flow Migration Breaking Existing Reports
**What goes wrong:** If migration backfill misses accounts or assigns wrong categories, existing cash flow reports show different numbers immediately.
**Why it happens:** Name-matching logic has edge cases (accounts named differently across entities).
**How to avoid:** Run the existing name-matching logic as the backfill source -- accounts get EXACTLY the same classification they had before. Accounts that didn't match any name pattern get `null` cashFlowCategory and should fall into OPERATING as the default (matching current catch-all behavior).
**Warning signs:** Cash flow totals differ before/after migration for any entity.

### Pitfall 2: Contra Account Balance Sign Confusion
**What goes wrong:** Contra assets (like Accumulated Depreciation) have credit-normal balances but are displayed in the Assets section. Sign handling gets confusing.
**Why it happens:** The existing balance query returns `debit - credit` for all accounts. Contra accounts are credit-heavy, so they return negative values in a debit-normal context.
**How to avoid:** For display purposes, keep the raw balance and use `isContra` flag purely for presentation: show absolute value with "Less:" prefix, then compute net by subtracting from parent. Do NOT flip signs in the database or balance computation.
**Warning signs:** Total Assets changes after adding isContra support.

### Pitfall 3: LLM API Unavailability Breaking All CSV Imports
**What goes wrong:** If the Anthropic API is down or key is missing, CSV imports fail entirely.
**Why it happens:** Tight coupling between LLM detection and import flow.
**How to avoid:** LLM detection is an enhancement layer that falls back to existing COLUMN_PATTERNS heuristic. Wrap LLM call in try/catch. If ANTHROPIC_API_KEY is not set, skip LLM entirely and use heuristic. Never make LLM a hard requirement.
**Warning signs:** CSV import fails with "API key not found" or timeout errors.

### Pitfall 4: Wizard State Lost on Page Refresh
**What goes wrong:** User completes 2 of 4 wizard steps, refreshes page, loses progress.
**Why it happens:** Wizard state stored only in React component state.
**How to avoid:** Persist wizard completion status to the database (a simple JSON field or separate WizardProgress model). The CONTEXT.md says "User can return to skipped steps from entity dashboard" which requires persistent state.
**Warning signs:** Wizard restarts from step 1 after browser refresh.

### Pitfall 5: Opening Balance JE Doesn't Balance
**What goes wrong:** User enters amounts in the opening balance grid that don't balance (total debits != total credits).
**Why it happens:** Spreadsheet-style grid lets users enter arbitrary amounts.
**How to avoid:** Show a real-time "Out of balance by $X" indicator (like the trial balance check). Block JE generation until balanced. Consider an auto-balancing "Retained Earnings" or "Opening Balance Equity" plug account.
**Warning signs:** JE creation fails with "debits must equal credits" error.

### Pitfall 6: Column Mapping Prompt Returns Invalid JSON
**What goes wrong:** LLM returns markdown-wrapped JSON or extra text instead of clean JSON object.
**Why it happens:** LLMs sometimes wrap responses in code blocks or add explanatory text.
**How to avoid:** Use a tool/function call pattern (Anthropic's tool_use) with a Zod schema to get structured output. This forces valid JSON matching the schema. Alternatively, strip markdown code fences and parse defensively.
**Warning signs:** JSON.parse fails on LLM response.

## Code Examples

### Cash Flow Category Migration Backfill Logic
```typescript
// Source: Derived from existing report-queries.ts:686-768 name-matching logic
function inferCashFlowCategory(
  accountType: AccountType,
  accountName: string
): CashFlowCategory | null {
  // Only balance sheet accounts get a category
  if (accountType === "INCOME" || accountType === "EXPENSE") return null;

  const nameLower = accountName.toLowerCase();

  // Cash accounts are EXCLUDED (they are the result, not a source)
  if (accountType === "ASSET" && nameLower.includes("cash")) return "EXCLUDED";

  // Investing: investment-type assets
  if (
    accountType === "ASSET" &&
    (nameLower.includes("investment") ||
      nameLower.includes("securities") ||
      nameLower.includes("real estate") ||
      nameLower.includes("private equity"))
  ) return "INVESTING";

  // Financing: loans/mortgages
  if (
    accountType === "LIABILITY" &&
    (nameLower.includes("loan") || nameLower.includes("mortgage"))
  ) return "FINANCING";

  // Financing: equity contributions/distributions
  if (
    accountType === "EQUITY" &&
    (nameLower.includes("equity") || nameLower.includes("capital")) &&
    !nameLower.includes("retained")
  ) return "FINANCING";

  if (accountType === "EQUITY" && nameLower.includes("distribution"))
    return "FINANCING";

  // Operating: receivables, prepaid, payable, accrued
  if (
    accountType === "ASSET" &&
    (nameLower.includes("receivable") || nameLower.includes("prepaid"))
  ) return "OPERATING";

  if (
    accountType === "LIABILITY" &&
    (nameLower.includes("payable") || nameLower.includes("accrued"))
  ) return "OPERATING";

  // Default for unmatched balance sheet accounts
  return "OPERATING";
}
```

### Refactored Cash Flow Classification (Using cashFlowCategory Field)
```typescript
// Source: Replaces report-queries.ts:686-768
// After migration, the query includes cashFlowCategory from the accounts table
for (const r of rows) {
  const mv = toNum(r.net_movement);
  if (mv === 0) continue;
  if (r.account_type === "INCOME" || r.account_type === "EXPENSE") continue;
  if (r.cash_flow_category === "EXCLUDED") continue;

  const item: CashFlowItem = { accountName: r.account_name, amount: -mv };

  switch (r.cash_flow_category) {
    case "INVESTING":
      investingItems.push(item);
      break;
    case "FINANCING":
      financingItems.push(item);
      break;
    case "OPERATING":
    default:
      operatingItems.push({ accountName: `Change in ${r.account_name}`, amount: -mv });
      break;
  }
}
```

### LLM Column Mapping (Anthropic SDK)
```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

interface ColumnMapping {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  reference?: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
}

export async function inferColumnMapping(
  headers: string[],
  sampleRows: string[][],
  importType: "bank" | "coa" | "budget"
): Promise<ColumnMapping | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a CSV column mapping assistant. Given these CSV headers and sample data, identify which column maps to which role.

Headers: ${JSON.stringify(headers)}
Sample rows (first 3):
${sampleRows.slice(0, 3).map((r) => JSON.stringify(r)).join("\n")}

Import type: ${importType}

Return ONLY a JSON object mapping role names to the exact header string.
Valid roles for bank import: date, description, amount, debit, credit, reference
Valid roles for COA import: accountNumber, accountName, accountType, description, parentNumber
Valid roles for budget import: accountNumber, month, year, amount

Example response: {"date": "Transaction Date", "description": "Memo", "amount": "Net Amount"}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Strip potential markdown code fences
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback: return null, caller uses heuristic detection
    return null;
  }
}
```

### Rate-Based Budget Computation
```typescript
// Source: New utility for Phase 12
import Decimal from "decimal.js";

interface RateBudgetInput {
  holdingMarketValue: Decimal; // Current market value of holding
  annualReturnRate: number;    // e.g., 0.08 for 8%
}

export function computeMonthlyBudget(input: RateBudgetInput): Decimal {
  // monthly = holdingValue * rate / 12
  return input.holdingMarketValue
    .times(new Decimal(input.annualReturnRate))
    .dividedBy(12)
    .toDecimalPlaces(4); // Match Decimal(19,4) precision
}
```

### Opening Balance Grid (Adapted from Budget Grid Pattern)
```typescript
// Source: Adapted from src/app/(auth)/budgets/page.tsx grid pattern
// Key differences from budget grid:
// 1. Shows ALL balance sheet accounts (not just income/expense)
// 2. Has Debit AND Credit columns (not just Amount)
// 3. Shows real-time balance check (total debits = total credits)
// 4. Generates a single Opening Balance JE on save

function cellKey(accountId: string, column: "debit" | "credit"): string {
  return `${accountId}-${column}`;
}

// Balance check computed from grid state
function getBalanceCheck(gridState: Map<string, string>): {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
} {
  let totalDebits = 0;
  let totalCredits = 0;
  for (const [key, value] of gridState) {
    const amount = parseFloat(value) || 0;
    if (key.endsWith("-debit")) totalDebits += amount;
    if (key.endsWith("-credit")) totalCredits += amount;
  }
  return {
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.005,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Name-matching cash flow classification | Field-based cashFlowCategory enum | This phase | Eliminates fragile string matching, user-controllable |
| No contra account support | isContra boolean flag | This phase | Standard accounting presentation (gross/contra/net) |
| Fixed budget amounts only | Rate-based targets from holdings | This phase | Investment-oriented budgeting for family offices |
| Heuristic-only column detection | LLM-first with heuristic fallback | This phase | Handles non-standard CSV headers automatically |
| No onboarding flow | Guided wizard after entity creation | This phase | Reduces time-to-first-transaction for new entities |

**Deprecated/outdated after this phase:**
- `nameLower.includes(...)` logic in report-queries.ts lines 686-768 -- replaced by cashFlowCategory field lookup
- Same pattern in consolidated-report-queries.ts -- also replaced

## Open Questions

1. **Hedge Fund COA Template**
   - What we know: CONTEXT.md mentions "Family Office, Hedge Fund, Blank" template options. Currently only one template exists (`FAMILY_OFFICE_TEMPLATE` in `src/lib/accounts/template.ts`).
   - What's unclear: The hedge fund template account list does not exist yet. Need to create it.
   - Recommendation: Create a hedge fund template with accounts typical for fund accounting (NAV, Subscriptions, Redemptions, Management Fee Income, Performance Fee Income, Prime Broker, Fund Admin, Audit Fees, etc.). Claude's discretion per CONTEXT.md.

2. **ColumnMapping Persistence: DB vs localStorage**
   - What we know: Saved mappings need to persist per source name. CONTEXT.md lists this as Claude's discretion.
   - What's unclear: Whether mappings should be entity-scoped or global per user.
   - Recommendation: Use a DB model (`ColumnMapping`) scoped to entityId. This supports multi-user access and is consistent with all other entity-scoped data in the project. Schema: `{ id, entityId, sourceName, importType, mapping: Json, createdAt, updatedAt }`.

3. **Opening Balance JE Date**
   - What we know: The system generates a balanced Opening Balance JE from the grid.
   - What's unclear: What date should the JE use? CONTEXT.md lists this as Claude's discretion.
   - Recommendation: Use the entity's fiscal year start date (derived from `fiscalYearEnd`). If entity FYE is 12-31, opening balance date would be the first day of the current fiscal year (01-01). Allow user override via a date picker in the wizard step.

4. **Wizard Progress Storage**
   - What we know: User needs to return to skipped steps from entity dashboard.
   - What's unclear: Exact storage mechanism.
   - Recommendation: Add a `wizardProgress: Json?` field to Entity model. Shape: `{ coaComplete: boolean, holdingsComplete: boolean, balancesComplete: boolean, transactionsComplete: boolean, dismissedAt?: string }`. Lightweight, no extra table needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CF-01 | cashFlowCategory backfill assigns correct categories | unit | `npx vitest run src/__tests__/utils/cash-flow-backfill.test.ts -x` | Wave 0 |
| CF-02 | Cash flow report uses cashFlowCategory field | unit | `npx vitest run src/__tests__/queries/cash-flow-field.test.ts -x` | Wave 0 |
| CF-03 | Account form shows cashFlowCategory for balance sheet types only | manual-only | Manual: create ASSET account, verify dropdown visible; create INCOME account, verify dropdown hidden | N/A |
| CONTRA-01 | isContra flag affects balance sheet display (netting) | unit | `npx vitest run src/__tests__/utils/contra-netting.test.ts -x` | Wave 0 |
| CONTRA-02 | Contra accounts render with "Less:" prefix and net total | manual-only | Manual: view Balance Sheet with contra account | N/A |
| RATE-01 | Rate-based budget computation is correct | unit | `npx vitest run src/__tests__/utils/rate-based-budget.test.ts -x` | Wave 0 |
| RATE-02 | Budget values snapshot and do not auto-update | unit | `npx vitest run src/__tests__/api/rate-budget.test.ts -x` | Wave 0 |
| WIZ-01 | Wizard triggers after entity creation | manual-only | Manual: create entity, verify wizard appears | N/A |
| WIZ-02 | All wizard steps are skippable | manual-only | Manual: skip all steps, verify dashboard accessible | N/A |
| WIZ-03 | Opening balance grid enforces debit=credit balance | unit | `npx vitest run src/__tests__/utils/opening-balance.test.ts -x` | Wave 0 |
| CSV-01 | LLM column mapper returns valid mapping for standard headers | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts -x` | Wave 0 |
| CSV-02 | Fallback to heuristic when LLM unavailable | unit | `npx vitest run src/__tests__/utils/llm-column-mapper.test.ts -x` | Wave 0 |
| CSV-03 | Mapping confirmation UI renders with adjustable columns | manual-only | Manual: upload CSV, verify mapping UI appears | N/A |
| CSV-04 | Saved mappings auto-apply on repeat import | unit | `npx vitest run src/__tests__/api/column-mappings.test.ts -x` | Wave 0 |
| SCHEMA-01 | Account schema accepts cashFlowCategory and isContra | unit | `npx vitest run src/__tests__/validators/account.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/utils/cash-flow-backfill.test.ts` -- covers CF-01
- [ ] `src/__tests__/queries/cash-flow-field.test.ts` -- covers CF-02
- [ ] `src/__tests__/utils/contra-netting.test.ts` -- covers CONTRA-01
- [ ] `src/__tests__/utils/rate-based-budget.test.ts` -- covers RATE-01
- [ ] `src/__tests__/api/rate-budget.test.ts` -- covers RATE-02
- [ ] `src/__tests__/utils/opening-balance.test.ts` -- covers WIZ-03
- [ ] `src/__tests__/utils/llm-column-mapper.test.ts` -- covers CSV-01, CSV-02
- [ ] `src/__tests__/api/column-mappings.test.ts` -- covers CSV-04
- [ ] `src/__tests__/validators/account.test.ts` -- exists but needs extension for new fields (SCHEMA-01)

## Sources

### Primary (HIGH confidence)
- Prisma schema: `/prisma/schema.prisma` -- all model structures verified
- Existing report queries: `/src/lib/queries/report-queries.ts` lines 678-768 -- cash flow name-matching logic
- Existing CSV parser: `/src/lib/bank-transactions/csv-parser.ts` -- COLUMN_PATTERNS detection
- Existing template: `/src/lib/accounts/template.ts` -- FAMILY_OFFICE_TEMPLATE structure
- Budget grid: `/src/app/(auth)/budgets/page.tsx` -- spreadsheet grid pattern
- Account form: `/src/components/accounts/account-form.tsx` -- form extension point
- Entity form: `/src/components/entities/entity-form.tsx` -- entity creation flow
- Welcome screen: `/src/components/onboarding/welcome-screen.tsx` -- zero-entity entry point
- Package.json: All dependency versions verified against installed packages

### Secondary (MEDIUM confidence)
- [@anthropic-ai/sdk npm page](https://www.npmjs.com/package/@anthropic-ai/sdk) -- SDK usage patterns
- [Anthropic TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript) -- Structured output with tools

### Tertiary (LOW confidence)
- LLM prompt design for column mapping -- needs iteration and testing with real CSV samples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project except @anthropic-ai/sdk
- Architecture: HIGH -- all patterns established in prior phases, no new paradigms
- Cash flow refactor: HIGH -- existing code fully understood, replacement is mechanical
- Contra accounts: HIGH -- simple boolean flag with presentation-only changes
- Rate-based budgets: HIGH -- straightforward computation, integrates with known budget model
- Onboarding wizard: MEDIUM -- largest new UI surface area, wizard state management needs careful design
- LLM CSV import: MEDIUM -- new external dependency, prompt engineering needs iteration, but fallback ensures safety
- Pitfalls: HIGH -- derived from direct code analysis of existing patterns

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, no fast-moving dependencies)
