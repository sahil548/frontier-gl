# Phase 14: Code Hygiene & Wizard Behavioral Fix — Research

**Researched:** 2026-04-16
**Domain:** Refactoring/cleanup — JE POST API contract, postJournalEntry extraction, applyRules orphan deletion, 5 deferred TS/test sweep
**Confidence:** HIGH (all decisions locked, all callsites enumerated by direct codebase inspection, all five TS errors reproduced via `tsc --noEmit`, jsdom localStorage root cause reproduced and fix verified)

## Summary

Phase 14 is a pure cleanup/behavioral-alignment phase with no schema changes and no new features. CONTEXT.md locks every architectural decision; this research's job is to **enumerate the exact callsites, types, and verification commands** the planner needs to act safely. The four work areas are:

1. **JE POST API gains a `status` opt-out**, default flips DRAFT → POSTED-when-balanced. Blast radius is **only two production callsites** (manual JE form + wizard OB helper) — server-side JE creators (recurring generator, JE import, year-end-close) all bypass the API and call `tx.journalEntry.create` directly with hardcoded statuses, so they are unaffected. Manual JE form needs an explicit `status: 'DRAFT'` audit-switch; wizard OB benefits from the new POSTED default automatically.

2. **`postJournalEntry` extraction.** Extract a `postJournalEntryInTx(tx, journalEntryId, userId)` internal helper. Public `postJournalEntry` becomes a thin wrapper that opens a `$transaction`. Use `Prisma.TransactionClient` from `@/generated/prisma/internal/prismaNamespace` as the `tx` type (already exported at line 3221), or reuse the `type PrismaTransactionClient = any` pattern already established in `src/lib/bank-transactions/opening-balance.ts:42` for consistency.

3. **`applyRules` deletion.** Confirmed orphan via grep — zero production imports across `src/`, only one test file references it (`tests/bank-transactions/categorize.test.ts`). `TransactionInput` interface is also `applyRules`-only and can be deleted. `RuleInput` and `matchRule` stay (live production code at `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` and the bank-tx PATCH route).

4. **Five deferred TS/test items.** All five reproduced via `tsc --noEmit` and `npm test`. The `localStorage.clear is not a function` failure has a clean, definitive **Node 25 root cause** (experimental Web Storage API ships globally and shadows jsdom's localStorage when no `--localstorage-file` is provided). Fix is `NODE_OPTIONS="--no-experimental-webstorage"` in the test script — verified working: 7/7 use-entity tests pass with the flag.

**Primary recommendation:** Split into 4 plans matching CONTEXT.md's suggested granularity: (a) JE POST API status opt-out + manual JE form audit-switch + wizard regression test, (b) `postJournalEntryInTx` extraction + bank-tx route delegation, (c) `applyRules` deletion, (d) five-item TS/test sweep. Plan (a) and (b) can run sequentially or with (b) depending on (a)'s completion (no shared file conflicts). Plans (c) and (d) are independent of (a)/(b) and of each other.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wizard Opening-Balance JE Behavior (Success Criterion #3)**

- **Auto-post** the wizard-generated opening-balance JE to match the Holdings OBE inline-POSTED pattern. User completes the wizard and sees a populated Balance Sheet immediately — no manual post step.
- **Implementation approach:** add `postImmediately` support to the JE POST API at `/api/entities/[entityId]/journal-entries` (do not require a second client round-trip and do not refactor the wizard to the Holdings `generateOpeningBalanceJE` server function).
- **API default changes to POSTED when the JE is balanced.** This is a system-wide behavior change, not wizard-only. Every caller of the JE POST API that does not explicitly opt out will create a POSTED entry going forward.
- **Opt-out path:** callers that intentionally want a DRAFT pass `status: 'DRAFT'` in the body. Omit = POSTED (if balanced).
- **Callsites that MUST be audit-switched to explicitly pass `status: 'DRAFT'`:**
  - Manual JE form (preserve the existing draft → approve → post UX users expect)
  - Phase 5 recurring-JE generator (generating drafts for later review is the whole point)
  - Any other UI flow that intentionally creates drafts for later approval/edit
- **Balance enforcement stays server-side.** If a caller omits the status and the JE is unbalanced, the server must reject (existing double-entry enforcement — unchanged).
- **No UI disclaimer path** — user explicitly rejected keeping DRAFT + banner.

**applyRules Orphan Cleanup (Success Criterion #1)**

- **Delete** the `applyRules` export from `src/lib/bank-transactions/categorize.ts`.
- **Keep** `matchRule` — it is the live production code, used by the bank-tx PATCH route for single-transaction categorization.
- **Delete** the `TransactionInput` interface (applyRules-only); **keep** `RuleInput` (matchRule constrains `<R extends RuleInput>`).
- **Remove** the corresponding `applyRules` test suites from `tests/bank-transactions/categorize.test.ts`. matchRule tests stay.
- **No new batch-categorization endpoint.** Inventing a feature to justify keeping `applyRules` would be scope creep.

**AccountBalance Delegation Scope (Success Criterion #2)**

- **Narrow scope:** refactor only the roadmap-flagged site — `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` POST handler (the inline upsert loop at roughly lines 293–313).
- **Holdings OBE path stays as-is.** `src/lib/bank-transactions/opening-balance.ts` (`generateOpeningBalanceJE`, `generateAdjustingJE`) keeps its inline upserts — it is tested and verified in Phase 11, and is not audit-flagged. Broadening the refactor would require re-verifying Phase 11.
- **Implementation:** extract `postJournalEntryInTx(tx, journalEntryId, userId)` as an internal export from `src/lib/journal-entries/post.ts`. The public `postJournalEntry(journalEntryId, userId)` API is unchanged — it becomes a thin wrapper that opens a `$transaction` and calls the internal helper. The bank-tx POST handler calls `postJournalEntryInTx` inside its existing outer `$transaction` block, replacing the inline balance upsert loop and the redundant POSTED audit entry.
- **Atomicity preserved:** JE create + balance upsert + bank-tx status update all still commit/rollback together inside the same outer transaction.

**TS/Test Deferred Sweep (Success Criterion #4)**

Single task per item. Fix each at the flagged location — no bundling, no opportunistic folding into unrelated work.

- **Item #1 (Select `onValueChange` `string | null`):** per-site inline handler — `onValueChange={(v) => setFoo(v ?? '')}`. No `<SafeSelect>` wrapper. No state-type change to `string | null`. Confirmed sites: `src/app/(auth)/budgets/page.tsx:746` and `:775`; plan must grep for additional sites.
- **Item #3 (SerializedAccount duplicate):** collapse to one canonical declaration (likely in a types module or the accounts server helper), import in both `src/app/(auth)/accounts/page.tsx:122` and `src/components/accounts/account-table.tsx:324/326/528/530`. Ensure it includes the `cashFlowCategory` and `isContra` fields added in Phase 12.
- **Item #5 (`localStorage.clear` not a function in `use-entity.test.ts`):** investigate jsdom/vitest environment root cause first; if the fix is clean and localised (vitest config, setup file, or env tweak), prefer the global fix. If the root cause is a jsdom version mismatch or would require a larger upgrade, fall back to a test-local stub in `beforeEach`.
- **Item #6 (`column-mapping-ui.tsx:218` `string | null`):** handle the nullable value at the call site (coalesce or narrow before passing into the `string`-typed callee).
- **Item #7 (blob-storage vitest Mock constructable type):** adjust the test-only mock type declaration in `tests/attachments/blob-storage.test.ts:35,43` to satisfy vitest's `Mock` generic. Production code untouched.

**Verification Bar (Success Criterion #5)**

- **`tsc --noEmit` clean on touched files only.** Pre-existing errors in unrelated files do not block this phase.
- **If new unrelated pre-existing TS errors surface in the transitive graph of touched files** (e.g., a new `SerializedAccount` mismatch in a file that imports the deduplicated type), document them as new entries in `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` rather than absorbing the fix into Phase 14.
- **Full test suite must remain green.** Baseline is 504/504 active tests (now 530 after Phase 13 additions). New tests added by Phase 14 (e.g., a regression test for the wizard auto-post behavior) are counted on top of that baseline.
- **Update `deferred-items.md` at end of phase** to mark items #1, #3, #5, #6, #7 as RESOLVED and note any new items discovered.

### Claude's Discretion

- How to clean `tests/bank-transactions/categorize.test.ts` — surgical describe-block removal vs file rewrite. Read the file and choose the lower-blast-radius option.
- jsdom `localStorage.clear` fix approach — root-cause vs test-local workaround. Investigate first; pick based on what the root cause turns out to be.
- Exact location of the canonical `SerializedAccount` declaration after dedup.
- Whether to add a regression test for the wizard OB auto-post behavior (recommended: yes, at least one assertion confirming the JE status is POSTED after wizard completion).
- How `postJournalEntry` tests are updated when `postJournalEntryInTx` is extracted (likely: add coverage for the tx-aware helper, keep the existing public-API tests).
- Commit/plan granularity within the phase. Suggested split: (a) JE POST API `postImmediately` + wizard, (b) `applyRules` delete, (c) bank-tx AccountBalance delegation + `postJournalEntryInTx` extraction, (d) TS/test sweep (either one plan or split by item).
- Audit-switching existing callsites that should continue creating DRAFT — Claude greps and patches; expected callsites: manual JE form and Phase 5 recurring-JE generator.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. The following were considered and explicitly deferred to future work / other phases:

- Wiring `applyRules` into a bulk batch-categorize endpoint — would invent a new feature; explicitly out of Phase 14 scope. Revisit post-v1.0 if product demand for bulk categorization emerges.
- Sweeping the Holdings OBE path (`src/lib/bank-transactions/opening-balance.ts`) to also delegate to `postJournalEntry` — tested and working per Phase 11; not audit-flagged; deferred to a future hygiene sweep if maintenance drift becomes real.
- Project-wide `tsc --noEmit` clean — touched-files-only is the Phase 14 bar. Any additional pre-existing TS errors discovered in unrelated files get documented in `deferred-items.md`, not absorbed.
- A `<SafeSelect>` wrapper component to normalise base-ui/shadcn Select's `string | null` emission — rejected as premature abstraction; per-site coalescing is sufficient for now. Revisit only if the pattern shows up in 8+ sites post-sweep.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BANK-03 | User can categorize transactions and post them as journal entries | Functionally satisfied; Phase 14 refactors the POST handler to delegate `AccountBalance.upsert` + `POSTED` audit to `postJournalEntryInTx`. Verification: existing `tests/bank-transactions/create-je.test.ts` + new regression assertion that `postJournalEntryInTx` is called inside the outer `$transaction`. |
| BANK-04 | Categorization rules auto-apply to matching transactions based on description patterns | Functionally satisfied via `matchRule` at `src/lib/bank-transactions/categorize.ts:51` (live in `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` PATCH path). Phase 14 deletes the unused `applyRules` orphan. Verification: existing `matchRule` tests in `tests/bank-transactions/categorize.test.ts` (4 tests) remain green; the 2 `applyRules` tests + the CAT-03 `applyRules` test get deleted. |
| WIZ-03 | Onboarding wizard creates opening balance JE | Functionally satisfied (12-07 closed the date-fidelity gap); Phase 14 closes the behavioral gap by flipping the JE POST API default to POSTED-when-balanced. The wizard's `generateOpeningBalanceJE` helper at `src/lib/onboarding/opening-balance.ts:94` automatically benefits — no code change required there. New regression test: assert the JE returned from `POST /api/entities/.../journal-entries` (called from wizard helper, no explicit `status`) has `status === "POSTED"`. |

This phase refines behavior/removes tech debt, so research focused on confirming **how to verify no regression** rather than re-proving the REQs themselves.

</phase_requirements>

---

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.5.0 | DB access; `Prisma.TransactionClient` type for `postJournalEntryInTx(tx, ...)` extraction | Already the project ORM; `tx: Prisma.TransactionClient` is the canonical interactive-transaction client type per Prisma 7 docs |
| Zod | 4.3.6 | Extend `journalEntrySchema` with optional `status` field | Already the project validator |
| vitest | 4.1.2 | Run regression tests for wizard OB and bank-tx delegation | Already the project test runner |
| jsdom | 29.0.1 | DOM env for `use-entity.test.ts` | Already configured at `vitest.config.ts:8` |
| Node.js | 25.8.2 | Runtime — needs `--no-experimental-webstorage` flag in test script (see Pitfall 5) | Project is on Node 25 (per `node --version`) |

### Supporting (already in scope)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast for "JE posted" copy refinement in wizard if needed | Discretionary copy update at `src/components/onboarding/wizard-balances-step.tsx:158-160` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `postImmediately: boolean` (matching `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:29` precedent) | `status: 'DRAFT' \| 'POSTED'` enum | CONTEXT.md says: "Pick whichever is easier to audit callsites against." `status: 'DRAFT'` is more **literal** and self-documenting — a grep for `status: 'DRAFT'` finds every opt-out instantly, whereas `postImmediately: false` requires a more contextual scan. **Recommend `status` enum** for audit-grep clarity. |
| Update `Prisma.TransactionClient` typing rigorously | `type PrismaTransactionClient = any` (with `// eslint-disable-next-line`) | Mirror the existing `src/lib/bank-transactions/opening-balance.ts:42` pattern — already the project convention. Strict typing has been deferred elsewhere; consistency wins. |

**No installs needed.** Phase 14 adds no dependencies.

---

## User Decisions Authoritative; Map to Code

### JE POST API Contract (from CONTEXT.md "Wizard Opening-Balance JE Behavior")

**Today's contract** at `src/app/api/entities/[entityId]/journal-entries/route.ts:173-314`:

```typescript
// Request body validated by journalEntrySchema (lib/validators/journal-entry.ts:49-73)
// — Currently has NO `status` field; always creates DRAFT.
// — Schema enforces totalDebit === totalCredit via .refine().

// Inside POST handler:
const je = await tx.journalEntry.create({
  data: {
    entityId,
    entryNumber,
    date: new Date(date),
    description,
    status: "DRAFT",   // ← hardcoded
    createdBy: userId,
    lineItems: { create: lineItems.map(...) },
  },
});
```

**Phase 14 contract** (recommended):

```typescript
// 1. Extend journalEntrySchema with optional status:
// status: z.enum(["DRAFT", "POSTED"]).optional()

// 2. Inside POST handler — after JE create with status "DRAFT" by default:
//    a. If status === 'DRAFT' OR JE is unbalanced → keep DRAFT (current behavior)
//    b. Else → call postJournalEntryInTx(tx, je.id, userId) inside the existing $transaction
//       to flip status to POSTED + upsert AccountBalance + write POSTED audit
//
// 3. Surface period-close errors cleanly (mirror /post route's error mapping):
//    - "closed period" → 400 with "Cannot post to a closed period. Reopen the period first."
//    - "already posted" → 400
//    - everything else → 500
```

### `postJournalEntry` Extraction (from CONTEXT.md "AccountBalance Delegation Scope")

**Today** at `src/lib/journal-entries/post.ts:17-73`:

```typescript
export async function postJournalEntry(journalEntryId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock JE, verify postable
    // 2. Update status to POSTED
    // 3. Upsert AccountBalance per line (atomic increment)
    // 4. Create POSTED audit entry
  });
}
```

**Phase 14 extraction** (mechanical, ~5-line delta):

```typescript
// New internal helper — same body, just takes tx as argument
export async function postJournalEntryInTx(
  tx: Prisma.TransactionClient,
  journalEntryId: string,
  userId: string
): Promise<void> {
  // 1-4 same as today's $transaction body
}

// Public API — thin wrapper, signature unchanged
export async function postJournalEntry(journalEntryId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await postJournalEntryInTx(tx, journalEntryId, userId);
  });
}
```

### Bank-Tx POST Route Delegation (from CONTEXT.md "AccountBalance Delegation Scope")

**Today** at `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:258-348`:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const entryNumber = await generateNextEntryNumber(tx, entityId);

  const je = await tx.journalEntry.create({
    data: {
      ...,
      status: jeInput.status,         // 'POSTED' if postImmediately else 'DRAFT'
      postedBy: jeInput.postedBy,
      postedAt: jeInput.postedAt,
      lineItems: { create: ... },
    },
  });

  // ───── INLINE LOGIC TO REPLACE WITH postJournalEntryInTx ─────
  if (postImmediately) {
    for (const line of je.lineItems) {
      const debitAmount = new Prisma.Decimal(line.debit.toString());
      const creditAmount = new Prisma.Decimal(line.credit.toString());
      const balanceChange = debitAmount.minus(creditAmount);
      await tx.accountBalance.upsert({ ... }); // ← inline upsert
    }
    await tx.journalEntryAudit.create({
      data: { journalEntryId: je.id, action: "POSTED", userId },
    }); // ← redundant POSTED audit
  }
  // ────────────────────────────────────────────────────────────

  await tx.journalEntryAudit.create({
    data: { journalEntryId: je.id, action: "CREATED", userId },
  }); // ← keeps (CREATED audit, unique to bank-tx flow)

  await tx.bankTransaction.update({ ... }); // ← keeps (bank-tx-specific update)

  return je;
});
```

**After Phase 14 refactor:**

```typescript
const result = await prisma.$transaction(async (tx) => {
  const entryNumber = await generateNextEntryNumber(tx, entityId);

  // Create as DRAFT first — postJournalEntryInTx flips it to POSTED + handles balance/audit
  const je = await tx.journalEntry.create({
    data: {
      ...,
      status: "DRAFT",   // ← changed: always DRAFT at create
      // postedBy/postedAt removed — postJournalEntryInTx sets them
      lineItems: { create: ... },
    },
  });

  // CREATED audit — bank-tx-specific, comes BEFORE post (matches today's audit ordering)
  await tx.journalEntryAudit.create({
    data: { journalEntryId: je.id, action: "CREATED", userId },
  });

  if (postImmediately) {
    await postJournalEntryInTx(tx, je.id, userId);
    // ↑ replaces: inline upsert loop + redundant POSTED audit
  }

  await tx.bankTransaction.update({ ... });
  return je;
});
```

**Behavioral preservation checklist:**

| Behavior | Before | After | Preserved? |
|----------|--------|-------|------------|
| JE created with all line items | ✅ | ✅ | Yes |
| AccountBalance upserted per line when posting | inline upsert loop | `postJournalEntryInTx` upsert loop | Yes (identical logic) |
| POSTED audit entry written | inline `createMany` | `postJournalEntryInTx` writes it | Yes |
| CREATED audit entry written | yes (unconditional) | yes (unconditional) | Yes |
| Audit ordering (CREATED before POSTED) | CREATED then POSTED in same tx | CREATED first, then `postJournalEntryInTx` writes POSTED | Yes (still CREATED-before-POSTED) |
| `bankTransaction.update` runs in same tx | yes | yes | Yes |
| All-or-nothing atomicity (rollback on any failure) | yes | yes | Yes |
| Error from `postJournalEntryInTx` (e.g. closed period) propagates | n/a (didn't call it) | yes — caught by outer try/catch | Yes (newly surfaces closed-period error if user posts to closed period; today's inline path would silently fail because no period-close trigger fires on `tx.accountBalance.upsert`) |

**Bonus correctness improvement:** today's inline path bypasses the `postJournalEntry` status-already-POSTED guard. Post-refactor, that guard runs (no-op since the JE was just created as DRAFT, but defensible).

### `applyRules` Deletion (from CONTEXT.md "applyRules Orphan Cleanup")

**Confirmed orphan** via `Grep "applyRules" src/`:

| Production File | Imports `applyRules`? |
|-----------------|----------------------|
| `src/lib/bank-transactions/categorize.ts` | declares + exports |
| All other `src/` files | **none** |

**Test file:** `tests/bank-transactions/categorize.test.ts` is the only consumer:
- `describe("Position-targeted rules", ...)` block has 1 `applyRules` test (lines 93-123) — added in Phase 13
- `describe("applyRules", ...)` block has 1 `applyRules` test (lines 126-162) — original Phase 9 test

**Deletion surface:**

```typescript
// src/lib/bank-transactions/categorize.ts
// DELETE: lines 17-26 (TransactionInput interface)
// DELETE: lines 77-111 (applyRules function)
// KEEP: lines 1-16 (RuleInput interface)
// KEEP: lines 28-39 (toNum helper — used by matchRule)
// KEEP: lines 41-75 (matchRule function)

// tests/bank-transactions/categorize.test.ts
// DELETE: lines 93-123 ("applyRules matches positionId-bearing rule" — inside Position-targeted describe)
// DELETE: lines 126-162 (entire applyRules describe block)
// DELETE: line 2 import — change to `import { matchRule } from "@/lib/bank-transactions/categorize"`
// KEEP: matchRule describe block (lines 26-72) and Position-targeted matchRule test (lines 76-91)
```

**Recommended cleanup approach (Claude's discretion):** **surgical describe-block removal** — file is only 162 lines; removing two specific describe/it blocks + adjusting the import line is a smaller diff than a full file rewrite.

### Five Deferred TS/Test Items (from CONTEXT.md "TS/Test Deferred Sweep")

Reproduced via `npx tsc --noEmit` — exact errors:

```
src/app/(auth)/budgets/page.tsx(746,19): error TS2322: Type 'Dispatch<SetStateAction<string>>' is not assignable to type '(value: string | null, eventDetails: SelectRootChangeEventDetails) => void'.
src/app/(auth)/budgets/page.tsx(775,19): error TS2322: same shape

src/app/(auth)/accounts/page.tsx(122,11): error TS2719: Type 'SerializedAccount[]' is not assignable to type 'SerializedAccount[]'. Two different types with this name exist, but they are unrelated.
  Type 'SerializedAccount' is missing the following properties: cashFlowCategory, isContra
src/components/accounts/account-table.tsx(324,11): same TS2719
src/components/accounts/account-table.tsx(326,11): same TS2719 (undefined variant)
src/components/accounts/account-table.tsx(528,9): same TS2719
src/components/accounts/account-table.tsx(530,9): same TS2719 (undefined variant)

src/components/csv-import/column-mapping-ui.tsx(230,70): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.

tests/attachments/blob-storage.test.ts(35,9): error TS2348: Value of type 'Mock<Procedure | Constructable>' is not callable. Did you mean to include 'new'?
tests/attachments/blob-storage.test.ts(43,9): same TS2348
```

Reproduced via `npm test` — Item #5:

```
TypeError: localStorage.clear is not a function
  at src/__tests__/hooks/use-entity.test.ts:40:18 (and 49, 111)
```

7 of 530 tests fail because of this — all in `use-entity.test.ts`.

---

## Architecture Patterns

### Recommended Project Structure (no changes — pure refactor phase)

Phase 14 touches existing files only. No new directories. Edited files:

```
src/
├── app/api/entities/[entityId]/
│   ├── journal-entries/route.ts                                    # +status opt-out, default POSTED
│   └── bank-transactions/[transactionId]/route.ts                  # delegate to postJournalEntryInTx
├── lib/
│   ├── journal-entries/post.ts                                     # +postJournalEntryInTx export
│   ├── validators/journal-entry.ts                                 # +status field on schema
│   └── bank-transactions/categorize.ts                             # -applyRules, -TransactionInput
├── components/journal-entries/je-form.tsx                          # +status: 'DRAFT' opt-out
├── components/csv-import/column-mapping-ui.tsx                     # nullable coalesce at line 230
├── app/(auth)/budgets/page.tsx                                     # 2× onValueChange coalesce
├── app/(auth)/accounts/page.tsx                                    # import dedup'd SerializedAccount
├── components/accounts/account-table.tsx                           # import dedup'd SerializedAccount
└── (new types module if needed for SerializedAccount canonical home)

tests/
├── bank-transactions/categorize.test.ts                            # -applyRules describes
└── attachments/blob-storage.test.ts                                # mock type fix

src/__tests__/
└── hooks/use-entity.test.ts                                        # green via package.json script flag

package.json                                                        # +NODE_OPTIONS in test script
```

### Pattern 1: Internal Helper That Takes `tx` as First Argument

**What:** Extract the body of an existing `prisma.$transaction(async (tx) => { ... })` block into an exported helper that takes `tx` as its first parameter. The original function becomes a one-line wrapper that opens a `$transaction` and calls the helper.

**When to use:** When two callsites need the same logic but one already runs inside an outer `$transaction` (and would deadlock or break atomicity if it tried to open its own).

**Example:** Established pattern in this codebase at `src/lib/bank-transactions/opening-balance.ts`:

```typescript
// Source: src/lib/bank-transactions/opening-balance.ts:42-90 (verified)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

export async function findOrCreateOBEAccount(
  tx: PrismaTransactionClient,
  entityId: string
): Promise<{ id: string }> {
  // ... runs inside caller's $transaction, no deadlock
}
```

**Phase 14 application** — apply the exact same pattern to `postJournalEntry`:

```typescript
// src/lib/journal-entries/post.ts (proposed)
import { Prisma } from "@/generated/prisma/client";

// Option A (typed, preferred):
export async function postJournalEntryInTx(
  tx: Prisma.TransactionClient,
  journalEntryId: string,
  userId: string
): Promise<void> { /* ... */ }

// Option B (any-typed, mirrors opening-balance.ts convention):
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;
export async function postJournalEntryInTx(
  tx: PrismaTransactionClient,
  journalEntryId: string,
  userId: string
): Promise<void> { /* ... */ }
```

**Recommendation:** **Option A** — `Prisma.TransactionClient` is exported from `src/generated/prisma/internal/prismaNamespace.ts:3221` as `Omit<DefaultPrismaClient, runtime.ITXClientDenyList>`, which is exactly the right shape and gives proper IDE autocomplete. The `any` workaround in `opening-balance.ts` predates Phase 14's narrower scope; we don't need to inherit that compromise.

### Pattern 2: Zod Schema Extension with Optional Discriminator

**What:** Add an optional field to a Zod schema that defaults to a new behavior, while still permitting an explicit opt-out value.

**When to use:** When changing an API default but needing a backward-compatible escape hatch.

**Example (proposed for `src/lib/validators/journal-entry.ts`):**

```typescript
// Source: pattern matches src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:28-31
export const journalEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1).max(500),
    lineItems: z.array(lineItemSchema).min(2),
    status: z.enum(["DRAFT", "POSTED"]).optional(),  // ← new field
  })
  .refine(
    (data) => {
      const totalDebit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.debit || "0")),
        new Decimal("0")
      );
      const totalCredit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.credit || "0")),
        new Decimal("0")
      );
      return totalDebit.equals(totalCredit);
    },
    { message: "Total debits must equal total credits", path: ["lineItems"] }
  );
```

**Important:** the existing balance refinement (`totalDebit === totalCredit`) stays. This means an unbalanced JE always 400s — even if the caller wanted `status: 'DRAFT'`. **Same as today**, since today the schema rejects unbalanced JEs at validation time. The behavioral change is purely about what happens AFTER validation: today every passing JE → DRAFT; tomorrow every passing JE without explicit `status: 'DRAFT'` → POSTED.

If the wizard wants users to save an UNbalanced draft for later, this would break it. **Confirmed safe**: the wizard's `handleGenerateJE` at `src/components/onboarding/wizard-balances-step.tsx:145-169` already gates the submit button on `balanceCheck.isBalanced` (line 418), so it only ever submits balanced JEs.

### Pattern 3: Graceful Closed-Period Error Surfacing

**What:** Catch the PostgreSQL trigger's `Cannot post to closed period: ...` error and map it to a 400 response with a user-friendly message.

**When to use:** Anywhere an API endpoint posts a JE (changes status to POSTED).

**Example** (verified pattern at `src/app/api/entities/[entityId]/journal-entries/[journalEntryId]/post/route.ts:39-54`):

```typescript
try {
  await postJournalEntry(journalEntryId, userId);
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to post entry";

  if (message.includes("already posted")) {
    return errorResponse("Journal entry is already posted", 400);
  }
  if (message.includes("closed period") || message.includes("period is closed")) {
    return errorResponse(
      "Cannot post to a closed period. Reopen the period first.",
      400
    );
  }
  return errorResponse(message, 500);
}
```

**Phase 14 application:** the JE POST route at `src/app/api/entities/[entityId]/journal-entries/route.ts:226-313` MUST add this same `try { ... } catch { ... }` mapping when the new POSTED-default path is taken. Otherwise, a wizard user trying to set OB in a closed period would see a 500 with a raw Postgres trigger message (today they get a 201 with a DRAFT JE that they later fail to post — different UX bug). Either is bad; the new error mapping fixes it.

### Anti-Patterns to Avoid

- **Don't call `prisma.$transaction(...)` inside the bank-tx route's `postJournalEntryInTx` call.** It would deadlock. The whole point of the extraction is that `postJournalEntryInTx` does NOT open its own transaction.
- **Don't change `postJournalEntry`'s public signature.** Other callers (the `/post` route, recurring/bulk-post code) depend on the `(journalEntryId, userId)` shape.
- **Don't broaden `applyRules` deletion to also touch `RuleInput` or `matchRule`.** Per CONTEXT.md.
- **Don't add a `<SafeSelect>` wrapper.** Per CONTEXT.md "Deferred Ideas". Inline `(v) => setFoo(v ?? '')` per site.
- **Don't fold the localStorage fix into a vitest config rewrite.** The fix is one line in `package.json` `"test"` script (`NODE_OPTIONS="--no-experimental-webstorage"`); changing `vitest.config.ts` doesn't help (the issue is a Node 25 global, not a jsdom URL config).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic AccountBalance + POSTED audit + status flip | Inline upsert loop + audit `createMany` (today's pattern in bank-tx route) | `postJournalEntryInTx(tx, journalEntryId, userId)` | Single source of truth — when `postJournalEntry` evolves (e.g., to also write a `materialized_balance_history` row), only one place changes. Today's drift would hide a regression. |
| Closed-period error surfacing | Custom error class hierarchy or a result-type wrapper | `try { ... } catch (e) { if (e.message.includes(...)) ... }` (mirror the `/post` route) | Already the project's pattern; trigger emits a well-known Postgres error string; substring matching is sufficient at this scale. |
| `Prisma.TransactionClient` typing for `tx` | `any` (see existing `opening-balance.ts:42`) | `Prisma.TransactionClient` directly (exported at `src/generated/prisma/internal/prismaNamespace.ts:3221`) | Real type gives IDE autocomplete + compile-time safety. The existing `any` was a Phase 11 shortcut; Phase 14 has a chance to do better without breaking anything. |
| jsdom localStorage stub for `use-entity.test.ts` | Hand-built `class StorageMock { ... }` shim in `setup.ts` | Set `NODE_OPTIONS="--no-experimental-webstorage"` in `package.json` `test` script | Root cause is Node 25 shadowing jsdom's localStorage with an experimental, unconfigured Web Storage global. Disable Node's at the runtime level — jsdom's full localStorage takes over. Verified working: 7/7 tests pass with the flag. |
| Custom `SerializedAccount` per consumer | Inline declaration in each file | Single canonical export from a types module (e.g., `src/types/account.ts` or extend `src/types/index.ts`) | Three current copies are guaranteed to drift further every time a new field is added (e.g., `cashFlowCategory` in Phase 12 already drifted from 2 of 3 sites). |

**Key insight:** The maintenance-coupling risk that motivated this phase (bank-tx route inlining `AccountBalance.upsert`) **also lives in three other places** that are explicitly out of scope per CONTEXT.md: `bulk-categorize/route.ts:144`, `year-end-close/route.ts:197`, and `lib/bank-transactions/opening-balance.ts:158/277`. These are documented for future hygiene sweeps but **MUST NOT be touched in Phase 14**. Touching them would expand the test surface beyond the audit-flagged scope and require re-verifying Phase 11.

---

## Common Pitfalls

### Pitfall 1: API Default Flip Catches a Caller Outside the Confirmed Two

**What goes wrong:** Phase 14 plans assume only the manual JE form needs `status: 'DRAFT'` opt-out. If a third caller exists that wasn't enumerated, it silently starts auto-posting.

**Why it happens:** Greps can miss dynamic URL construction (e.g., template literals built from variables, or string concatenation across modules).

**How to avoid:** Use **multiple grep variations**:
```bash
# Direct URL match
grep -rn "journal-entries.*method.*POST" src/

# fetch() pattern
grep -rn "fetch(.+journal-entries" src/

# Endpoint constant pattern
grep -rn "/journal-entries['\"]" src/

# Tests/scripts (already verified zero matches)
grep -rn "/api/entities/.*journal-entries" tests/ src/__tests__/ scripts/
```

**Verified findings (all 4 patterns combined):**

| Caller | File | Type | Action |
|--------|------|------|--------|
| Manual JE form | `src/components/journal-entries/je-form.tsx:226` | UI fetch POST | Add `status: 'DRAFT'` to body |
| Wizard OB | `src/lib/onboarding/opening-balance.ts:94` | UI fetch POST | NO CHANGE (benefits from default) |
| Server-side recurring | `src/app/api/entities/[entityId]/templates/recurring/route.ts:304` | Direct `tx.journalEntry.create` | NO CHANGE (bypasses API) |
| Server-side import | `src/app/api/entities/[entityId]/journal-entries/import/route.ts:157` | Direct `tx.journalEntry.create` | NO CHANGE (bypasses API) |
| Server-side year-end | `src/app/api/entities/[entityId]/year-end-close/route.ts:168` | Direct `tx.journalEntry.create` | NO CHANGE (bypasses API) |
| Server-side bank-tx single | `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:262` | Direct `tx.journalEntry.create` | Refactor to delegate to `postJournalEntryInTx` (separate plan) |
| Server-side bank-tx bulk | `src/app/api/entities/[entityId]/bank-transactions/bulk-categorize/route.ts:115` | Direct `tx.journalEntry.create` | NO CHANGE (out of scope per CONTEXT.md) |

**Warning signs:** A test fails with "JE was posted but expected DRAFT" (or vice versa) → check the calling component for missing/extra `status` field.

### Pitfall 2: Audit Ordering Inversion in Bank-Tx Route Refactor

**What goes wrong:** Today's bank-tx route writes the **POSTED** audit (line 316-323) BEFORE the **CREATED** audit (line 325-332). This order is unusual but tested by Phase 9 — flipping it could break audit-trail UI assertions.

**Why it happens:** When the inline POSTED audit gets replaced with `postJournalEntryInTx` (which writes its own POSTED audit), the natural place to put the CREATED audit is BEFORE the post call. That changes the order.

**How to avoid:** **Verify the current order:**
```typescript
// src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:316-332 (TODAY)
if (postImmediately) {
  /* upsert balances */
  await tx.journalEntryAudit.create({  // ← POSTED audit FIRST (oddly)
    data: { journalEntryId: je.id, action: "POSTED", userId },
  });
}
await tx.journalEntryAudit.create({   // ← CREATED audit SECOND
  data: { journalEntryId: je.id, action: "CREATED", userId },
});
```

After refactor, the natural flow becomes CREATED → POSTED, which is **more conventional** and matches the standalone `/post` endpoint flow. **Recommend** flipping the order to CREATED-then-POSTED for consistency with the rest of the codebase. **Verify** no tests assert the reversed order — grep for `"action: \"POSTED\""` and `"action: \"CREATED\""` near each other in `tests/`. (Spot check via grep: no test asserts POSTED-before-CREATED ordering.)

**Warning signs:** Audit trail UI test that asserts a specific order in the audit list. None found in current tests.

### Pitfall 3: `Prisma.TransactionClient` Type Import Path

**What goes wrong:** The type `Prisma.TransactionClient` is generated, not part of `@prisma/client` directly. Importing it from the wrong path silently falls back to `unknown` or `any`.

**Why it happens:** The project uses Prisma's custom output (`src/generated/prisma/`) instead of the default `node_modules/.prisma/client`.

**How to avoid:** Use the existing project alias:

```typescript
// Source: src/generated/prisma/client/index.ts (or similar barrel)
import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;
// resolves to Omit<DefaultPrismaClient, runtime.ITXClientDenyList>
```

Verify the import works by adding a temporary type assertion line in `post.ts`:
```typescript
const _check: Prisma.TransactionClient = null as never; // should typecheck
```

**Warning signs:** TS2339 "Property 'TransactionClient' does not exist on type 'typeof Prisma'" → wrong import path.

### Pitfall 4: Zod Schema Backward Compatibility on `status`

**What goes wrong:** Existing callers send the JE body without a `status` field. If the schema is changed to `status: z.enum([...])` (without `.optional()`), every existing caller suddenly 400s with a validation error.

**Why it happens:** Zod treats missing optional fields differently from missing required fields.

**How to avoid:** Use `z.enum(["DRAFT", "POSTED"]).optional()` — NOT `.default("POSTED")` (which would fight the API-handler default semantics) and NOT a non-optional enum.

```typescript
// CORRECT
status: z.enum(["DRAFT", "POSTED"]).optional()

// API handler then:
const shouldPost = result.data.status !== "DRAFT"; // undefined → true → POSTED
```

**Warning signs:** Wizard suddenly fails with "Validation failed" → schema is requiring `status`.

### Pitfall 5: Node 25 Built-In Web Storage Shadows jsdom (Item #5 root cause)

**What goes wrong:** `localStorage.clear is not a function` in `use-entity.test.ts` despite vitest using jsdom env.

**Why it happens:** Node.js 25 ships an **experimental built-in `localStorage` global** that is enabled by default. When `--localstorage-file` is not provided, this global is an empty object missing all Storage API methods (`clear`, `setItem`, `getItem`, etc.). Vitest's jsdom environment does NOT override this Node global — Node's wins. Verified by inspecting `Object.getPrototypeOf(localStorage)` inside a vitest test: the prototype methods are only `Object.prototype` ones. No `Storage.prototype.clear`.

**How to avoid:** Disable Node 25's experimental Web Storage at the runtime level. Two equivalent flags:

```bash
# Option A (literal flag name, slightly more discoverable)
NODE_OPTIONS="--no-experimental-webstorage" npx vitest run

# Option B (alias, shorter)
NODE_OPTIONS="--no-webstorage" npx vitest run
```

**Apply in `package.json`:**

```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--no-experimental-webstorage' vitest run --reporter=verbose"
  }
}
```

**Verified working** by Phase 14 research:
```
$ NODE_OPTIONS="--no-experimental-webstorage" npx vitest run src/__tests__/hooks/use-entity.test.ts
✓ 7/7 tests pass (was 0/7 before flag)
```

**Warning signs:** Any localStorage test fails on Node 25; typeof `localStorage.clear` is `undefined` despite jsdom env.

**Caveat:** This is a Node 25 issue — once the project upgrades to Node 26+ (where the API is no longer experimental, or where they fix the global-shadowing) this flag may become unnecessary. Document it inline in `package.json` so a future maintainer knows why.

### Pitfall 6: SerializedAccount Dedup Surfaces NEW Type Mismatches

**What goes wrong:** Today's three `SerializedAccount` declarations have **different field sets**:

| File | Has `cashFlowCategory`? | Has `isContra`? |
|------|------------------------|-----------------|
| `src/components/accounts/account-form.tsx:59` | ✅ | ✅ |
| `src/app/(auth)/accounts/page.tsx:10` | ❌ | ❌ |
| `src/components/accounts/account-table.tsx:47` | ❌ | ❌ |

If we dedup using the form's full shape (the one that includes `cashFlowCategory` + `isContra`), then `account-table.tsx` and `accounts/page.tsx` will start rendering with these new fields available — but the API at `/api/entities/.../accounts` may not actually populate them in all paths. Need to verify the API returns these fields.

**How to avoid:** Quick spot-check on the accounts API route:

```bash
grep -rn "cashFlowCategory\|isContra" src/app/api/entities/\[entityId\]/accounts/
```

(Verified during research: yes, the accounts API now serializes both fields per Phase 12.)

**Where to put canonical:** Recommend `src/types/account.ts` (new file) or extend `src/types/index.ts` (if it exists). Mirror the pattern of `src/types/SerializedEntity` (referenced in `src/hooks/use-entity.ts:4`). Keep the type definition in one place; import in all three files.

**Warning signs:** After dedup, `npm test` produces a NEW error like `Property 'cashFlowCategory' is missing from type X` in some unrelated file. Per CONTEXT.md: log it to `deferred-items.md`, don't absorb the fix.

### Pitfall 7: vitest 4 `Mock<Procedure | Constructable>` Generic for Hoisted Module Mocks

**What goes wrong:** `tests/attachments/blob-storage.test.ts:35,43` casts `put` and `del` (mocked from `@vercel/blob`) as `ReturnType<typeof vi.fn>` and then tries to call them — fails with TS2348 because vitest 4's `Mock` generic is now `Mock<Procedure | Constructable>` and the union flips on whether the mock could be `new`-called.

**Why it happens:** vitest 4 made the Mock type more strict. `vi.fn()` returns a mock that COULD be `new`-called (constructable), so the type union includes that possibility. Calling it as a function then needs an explicit narrowing.

**How to avoid:** Use `vi.MockedFunction<typeof originalFn>` instead of `ReturnType<typeof vi.fn>`:

```typescript
// BEFORE (TS2348)
await (put as ReturnType<typeof vi.fn>)(path, file, options);

// AFTER (clean — narrows the union to function-only)
import type { put as putType, del as delType } from "@vercel/blob";
const mockPut = vi.mocked(put);   // or: put as vi.MockedFunction<typeof putType>
await mockPut(path, file, options);
```

**Verified pattern:** `vi.mocked(put)` returns `MockInstance<typeof put>` which is callable without TS2348.

**Warning signs:** Other test files in the repo using `as ReturnType<typeof vi.fn>` may also break — but we're only fixing the audit-flagged file. Per CONTEXT.md "Verification Bar" — log any newly-surfaced unrelated errors to `deferred-items.md`.

---

## Code Examples

Verified patterns from official sources and existing project code.

### Example 1: Extending the Zod Journal Entry Schema

```typescript
// Source: src/lib/validators/journal-entry.ts:49-73 + Phase 14 extension
import { z } from "zod";
import Decimal from "decimal.js";

export const journalEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1).max(500),
    lineItems: z.array(lineItemSchema).min(2, "At least 2 line items required"),
    // Phase 14 addition — opt-out for callers that explicitly want a draft.
    // Omitted = post-when-balanced (new default).
    status: z.enum(["DRAFT", "POSTED"]).optional(),
  })
  .refine(
    (data) => {
      const totalDebit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.debit || "0")),
        new Decimal("0")
      );
      const totalCredit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.credit || "0")),
        new Decimal("0")
      );
      return totalDebit.equals(totalCredit);
    },
    { message: "Total debits must equal total credits", path: ["lineItems"] }
  );
```

### Example 2: JE POST Route Handler with Optional Auto-Post

```typescript
// Source: refactor of src/app/api/entities/[entityId]/journal-entries/route.ts:226-313
// Adds postJournalEntryInTx call inside the existing $transaction when shouldPost is true.

import { postJournalEntryInTx } from "@/lib/journal-entries/post";

const { date, description, lineItems, status } = result.data;
const shouldPost = status !== "DRAFT"; // undefined or "POSTED" → post immediately

try {
  const entry = await prisma.$transaction(async (tx) => {
    const entryNumber = await generateNextEntryNumber(tx, entityId);

    // Step 1: Create JE as DRAFT
    const je = await tx.journalEntry.create({
      data: {
        entityId,
        entryNumber,
        date: new Date(date),
        description,
        status: "DRAFT", // ← always DRAFT at create; postJournalEntryInTx flips it
        createdBy: userId,
        lineItems: { create: lineItems.map(/* ... */) },
      },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });

    // Step 2: Create dimension tag junctions (unchanged — see today's lines 258-272)
    // ... existing dimension tag code ...

    // Step 3: Create CREATED audit (unchanged)
    await tx.journalEntryAudit.create({
      data: { journalEntryId: je.id, action: "CREATED", userId },
    });

    // Step 4: NEW — auto-post if not opted out
    if (shouldPost) {
      await postJournalEntryInTx(tx, je.id, userId);
    }

    // Step 5: Re-fetch with full includes (unchanged — see today's lines 284-301)
    const full = await tx.journalEntry.findUniqueOrThrow({ where: { id: je.id }, include: { /* ... */ } });
    return full;
  });

  return successResponse(serializeJournalEntry(entry as unknown as Record<string, unknown>), 201);
} catch (err) {
  // NEW error mapping — mirror /post route at src/app/api/entities/[entityId]/journal-entries/[journalEntryId]/post/route.ts:39-54
  const message = err instanceof Error ? err.message : "Failed to create journal entry";
  if (message.includes("already posted")) {
    return errorResponse("Journal entry is already posted", 400);
  }
  if (message.includes("closed period") || message.includes("period is closed")) {
    return errorResponse("Cannot post to a closed period. Reopen the period first.", 400);
  }
  console.error("JE create error:", err);
  return errorResponse("Failed to create journal entry", 500);
}
```

### Example 3: `postJournalEntryInTx` Extraction

```typescript
// Source: refactor of src/lib/journal-entries/post.ts:17-73
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Internal: Posts a journal entry inside a caller-provided Prisma transaction.
 * Use this from API routes that already have an open $transaction (e.g., bank-tx
 * POST handler). For top-level callers, use postJournalEntry() instead.
 */
export async function postJournalEntryInTx(
  tx: Prisma.TransactionClient,
  journalEntryId: string,
  userId: string
): Promise<void> {
  // 1. Lock and verify
  const je = await tx.journalEntry.findUniqueOrThrow({
    where: { id: journalEntryId },
    include: { lineItems: true },
  });
  if (je.status === "POSTED") {
    throw new Error("Journal entry is already posted");
  }

  // 2. Update status to POSTED
  await tx.journalEntry.update({
    where: { id: journalEntryId },
    data: { status: "POSTED", postedBy: userId, postedAt: new Date() },
  });

  // 3. Update account balances atomically
  for (const line of je.lineItems) {
    const debitAmount = new Prisma.Decimal(line.debit.toString());
    const creditAmount = new Prisma.Decimal(line.credit.toString());
    const balanceChange = debitAmount.minus(creditAmount);

    await tx.accountBalance.upsert({
      where: { accountId: line.accountId },
      create: {
        accountId: line.accountId,
        debitTotal: debitAmount,
        creditTotal: creditAmount,
        balance: balanceChange,
      },
      update: {
        debitTotal: { increment: debitAmount },
        creditTotal: { increment: creditAmount },
        balance: { increment: balanceChange },
      },
    });
  }

  // 4. Audit trail
  await tx.journalEntryAudit.create({
    data: { journalEntryId, action: "POSTED", userId },
  });
}

/**
 * Posts a journal entry, atomically updating account balances.
 * Public API — opens its own $transaction.
 *
 * Use postJournalEntryInTx if you already have a $transaction open.
 */
export async function postJournalEntry(
  journalEntryId: string,
  userId: string
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await postJournalEntryInTx(tx, journalEntryId, userId);
  });
}
```

### Example 4: Manual JE Form Audit-Switch (DRAFT preserved)

```typescript
// Source: refactor of src/components/journal-entries/je-form.tsx:222-242
// One-line change: explicitly send status: 'DRAFT' so the form keeps its current UX.

if (!(isApproved && action === "post")) {
  const url = isEdit
    ? `/api/entities/${entityId}/journal-entries/${entry!.id}`
    : `/api/entities/${entityId}/journal-entries`;
  const method = isEdit ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      // Phase 14: explicitly opt out of new POSTED-by-default API behavior.
      // The form's draft → approve → post UX requires the entry to start as DRAFT.
      // Removing this would auto-post the entry on Save Draft, which the user does not expect.
      status: "DRAFT",
    }),
  });
  /* ... */
}
```

### Example 5: Wizard OB JE Helper (NO CHANGE)

```typescript
// Source: src/lib/onboarding/opening-balance.ts:94-106 — Phase 14 leaves this as-is.
// Helper benefits automatically from the new POSTED-by-default API behavior.

const res = await fetch(`/api/entities/${entityId}/journal-entries`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    date: jeDate,
    description: "Opening Balances",
    lineItems,
    // No status field → API defaults to POSTED (when balanced)
  }),
});
```

### Example 6: Wizard Toast Copy Refinement (Discretionary)

```typescript
// Source: src/components/onboarding/wizard-balances-step.tsx:158-160 (today)
toast.success(
  `Opening balance JE created for ${jeDate} (${result.journalEntryId})`
);

// Phase 14 (discretionary, recommended): convey the JE is now live
toast.success(
  `Opening balance JE posted for ${jeDate} — your Balance Sheet is ready`
);
```

### Example 7: `applyRules` Removal Surgical Diff

```typescript
// Source: src/lib/bank-transactions/categorize.ts (Phase 14 result)
// Goal: keep matchRule + RuleInput, delete applyRules + TransactionInput.

/**
 * Minimal rule shape used by the categorization engine.
 * Matches the relevant fields from CategorizationRule Prisma model.
 */
export interface RuleInput {
  id: string;
  pattern: string;
  amountMin: number | { toNumber?: () => number } | null;
  amountMax: number | { toNumber?: () => number } | null;
  accountId: string | null;
  positionId?: string | null;
  dimensionTags: Record<string, string> | unknown | null;
  isActive: boolean;
  priority: number;
}

// DELETED: TransactionInput interface (was applyRules-only)

function toNum(value: number | { toNumber?: () => number } | null | undefined): number {
  // ... unchanged
}

/**
 * Matches a single transaction against a list of categorization rules.
 * (unchanged from today)
 */
export function matchRule<R extends RuleInput>(
  transaction: { description: string; amount: number | { toNumber?: () => number } },
  rules: R[]
): R | null {
  // ... unchanged
}

// DELETED: applyRules function (was orphan production export)
```

```typescript
// Source: tests/bank-transactions/categorize.test.ts (Phase 14 result)
// Goal: keep matchRule tests + Position-targeted matchRule test, delete applyRules describes.

import { describe, it, expect } from "vitest";
import { matchRule } from "@/lib/bank-transactions/categorize"; // ← removed applyRules

// ... TestRule type + makeRule helper unchanged ...

describe("matchRule", () => {
  // ... 4 existing matchRule tests unchanged ...
});

describe("Position-targeted rules", () => {
  // KEEP: line 76 "matchRule matches rule with positionId and null accountId" test
  // DELETE: line 93 "applyRules matches positionId-bearing rule" test (this whole it() block + its NOTE comment)
});

// DELETE: entire describe("applyRules", () => { ... }) block at line 126
```

### Example 8: SerializedAccount Canonical Module

```typescript
// Source: NEW FILE — src/types/account.ts (recommended location)

/**
 * Serialized shape of an Account row as returned by /api/entities/:entityId/accounts.
 * Used by all UI consumers (accounts page, account-table, account-form).
 *
 * Decimal money fields are serialized as strings; nullable cashFlowCategory
 * defaults to null when the account has no explicit CF mapping (Phase 12).
 */
export type SerializedAccount = {
  id: string;
  entityId: string;
  number: string;
  name: string;
  type: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  balance: string;
  debitTotal?: string;
  creditTotal?: string;
  cashFlowCategory: string | null;  // Phase 12 addition
  isContra: boolean;                // Phase 12 addition
};
```

```typescript
// Source: src/app/(auth)/accounts/page.tsx (Phase 14)
import type { SerializedAccount } from "@/types/account";
// (delete local type declaration at lines 10-22)

// Source: src/components/accounts/account-table.tsx (Phase 14)
import type { SerializedAccount } from "@/types/account";
// (delete local type declaration at lines 47-59)

// Source: src/components/accounts/account-form.tsx (Phase 14)
import type { SerializedAccount } from "@/types/account";
// (delete local type declaration at lines 59-71)
```

### Example 9: Per-Site `(v) => set(v ?? "")` Coalesce

```typescript
// Source: src/app/(auth)/budgets/page.tsx:744-747 + 773-776 (Phase 14)

// BEFORE (TS2322 — Select onValueChange emits string|null but useState<string>'s setter rejects null)
<Select value={selectedHoldingId} onValueChange={setSelectedHoldingId}>

// AFTER (inline coalesce — no state-type change, no SafeSelect wrapper)
<Select value={selectedHoldingId} onValueChange={(v) => setSelectedHoldingId(v ?? "")}>

// Same pattern for line 775:
<Select value={selectedAccountId} onValueChange={(v) => setSelectedAccountId(v ?? "")}>
```

### Example 10: column-mapping-ui.tsx String Coalesce

```typescript
// Source: src/components/csv-import/column-mapping-ui.tsx:230 (Phase 14)

// BEFORE (TS2345 at column 70)
onValueChange={(val) => handleRoleChange(role, val)}

// AFTER
onValueChange={(val) => handleRoleChange(role, val ?? "__none__")}
// (or: val ?? "" — depending on what handleRoleChange expects.
//  Reading handleRoleChange at line 121: header === "__none__" deletes the role.
//  So the safe coalesce is the sentinel "__none__", which clears the mapping.)
```

### Example 11: blob-storage Mock Type Fix

```typescript
// Source: tests/attachments/blob-storage.test.ts:35,43 (Phase 14)

// BEFORE (TS2348 — vitest 4 Mock<Procedure | Constructable> is not callable without narrowing)
await (put as ReturnType<typeof vi.fn>)(path, file, { access: "public", contentType: file.type });
await (del as ReturnType<typeof vi.fn>)(attachmentUrl);

// AFTER (use vi.mocked() — narrows to MockInstance<typeof put>, which is callable)
await vi.mocked(put)(path, file, { access: "public", contentType: file.type });
await vi.mocked(del)(attachmentUrl);

// (vi.mocked is an existing vitest helper, no install needed)
```

### Example 12: Wizard Auto-Post Regression Test

```typescript
// Source: NEW FILE — src/__tests__/utils/opening-balance-autopost.test.ts (recommended)
// Wave 0 file for Phase 14's WIZ-03 behavioral assertion.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch so we can spy on the JE POST request body
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { generateOpeningBalanceJE } from "@/lib/onboarding/opening-balance";

describe("WIZ-03: wizard opening-balance JE auto-posts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "je-123", status: "POSTED" } }),
    });
  });

  it("does NOT send status: 'DRAFT' in the body (so API default POSTED kicks in)", async () => {
    const grid = new Map([
      ["acc-1-debit", "1000"],
      ["acc-2-credit", "1000"],
    ]);

    await generateOpeningBalanceJE("entity-1", grid, "2026-01-01");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);

    // The wizard helper must NOT send a status field — that's the whole point
    // of letting the new API default (POSTED-when-balanced) take over.
    expect(body).not.toHaveProperty("status");
    expect(body.lineItems).toHaveLength(2);
    expect(body.description).toBe("Opening Balances");
  });
});
```

### Example 13: Manual JE Form Opt-Out Regression Test

```typescript
// Source: NEW FILE — src/__tests__/components/je-form-draft-opt-out.test.ts (recommended)
// Wave 0 file for Phase 14's manual JE form audit-switch assertion.

import { describe, it, expect, vi, beforeEach } from "vitest";

// (Mocking pattern: render JEForm with mode="create", click Save Draft button,
// assert the fetch POST body has status: 'DRAFT'. Sketch only — full impl in plan.)

describe("Manual JE form preserves DRAFT-on-Save behavior post-Phase-14", () => {
  it("explicitly sends status: 'DRAFT' on Save Draft action", async () => {
    // ... render <JEForm mode="create" entityId="e1" />
    // ... fill in date/desc/lines
    // ... click Save Draft button
    // expect(mockFetch).toHaveBeenCalledWith(
    //   expect.stringContaining("/journal-entries"),
    //   expect.objectContaining({
    //     body: expect.stringContaining('"status":"DRAFT"'),
    //   })
    // );
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `tx.accountBalance.upsert` loop in bank-tx POST handler | Delegate to `postJournalEntryInTx(tx, ...)` | Phase 14 | Reduces ~20 lines of duplicated logic; eliminates maintenance-coupling drift |
| Wizard OB creates DRAFT JE → user must manually post | API default flips to POSTED-when-balanced; wizard benefits automatically | Phase 14 | One-step user flow (no second click); aligns with Holdings OBE behavior |
| `applyRules` exported as future-proofing | Deleted (orphan; no batch endpoint planned) | Phase 14 | Reduces dead code surface |
| Three local `SerializedAccount` declarations with drift | Single canonical type module | Phase 14 | Stops compiler errors at every Phase X+1 field addition |
| `localStorage.clear is not a function` failures (Node 25 Web Storage shadowing jsdom) | `NODE_OPTIONS="--no-experimental-webstorage"` in package.json `test` script | Phase 14 | 7/7 use-entity tests green; no test-file mock workaround needed |
| `(put as ReturnType<typeof vi.fn>)(...)` blob-storage mock cast (vitest 4 TS2348) | `vi.mocked(put)(...)` | Phase 14 | Cleaner; satisfies vitest 4 Mock generic |
| Per-site `<Select onValueChange={setFoo}>` (TS2322 from base-ui's `string \| null` emission) | Per-site `(v) => setFoo(v ?? "")` inline coalesce | Phase 14 | No new abstraction; minimal diff |

**Deprecated/outdated:**

- `applyRules` and `TransactionInput` interface in `src/lib/bank-transactions/categorize.ts` — replaced by direct `matchRule` calls in production routes; deleted in Phase 14.
- `as ReturnType<typeof vi.fn>` mock cast pattern — replaced by `vi.mocked()` per vitest 4 best practice.

---

## Open Questions

1. **Should `Prisma.TransactionClient` be the new typed pattern, OR should we keep the `any` shortcut for consistency with `opening-balance.ts:42`?**
   - What we know: `Prisma.TransactionClient` is exported and works (verified by source inspection at `src/generated/prisma/internal/prismaNamespace.ts:3221`).
   - What's unclear: Whether the existing `any` was a deliberate choice or a Phase 11 shortcut.
   - Recommendation: **Use `Prisma.TransactionClient`.** It's strictly better; the `any` in `opening-balance.ts` predates this phase and could be revisited in a future hygiene sweep. Don't import that compromise.

2. **Should the wizard toast copy be updated to say "posted"?**
   - What we know: Today's copy says "created" which becomes inaccurate after auto-post lands.
   - What's unclear: Whether the user wants exact copy specified or trusts Claude.
   - Recommendation: Per CONTEXT.md "Claude's discretion" — yes, update to convey "posted" semantics. Suggested: `Opening balance JE posted for ${jeDate} — your Balance Sheet is ready` (matches the user's mental model that the wizard "completes" the setup).

3. **Should the Plan 4 (TS/test sweep) be one plan with 5 tasks, or 5 separate plans?**
   - What we know: CONTEXT.md says "either one plan or split by item."
   - What's unclear: How the project's verification cadence handles plan-granularity tradeoffs.
   - Recommendation: **One plan with 5 tasks.** Each task is a tiny diff (1-3 line change), often in unrelated files. Five separate plans means five separate verifications, five summaries, five commits — disproportionate overhead. One plan with five tasks lets the verifier sample after each task while keeping the planning artifact lean.

4. **Should we add a regression test for the bank-tx POST audit-ordering CREATED-then-POSTED?**
   - What we know: Today's order is POSTED-then-CREATED (oddly inverted). Refactor naturally inverts to CREATED-then-POSTED. No existing test asserts either order.
   - What's unclear: Whether downstream UI assumes a specific order.
   - Recommendation: **Yes, add a single assertion** to `tests/bank-transactions/create-je.test.ts` (or a new file) that verifies `JournalEntryAudit` records for the bank-tx-created JE are in CREATED-then-POSTED order. Cheap insurance.

5. **Will the `tsc --noEmit` "touched files only" verification need scripting, or is a manual file list acceptable?**
   - What we know: TypeScript doesn't natively support "lint these files only" — `tsc --noEmit` typechecks the whole project graph.
   - What's unclear: Whether the user expects a custom script or accepts "run `tsc --noEmit` and grep for the specific file paths in the output."
   - Recommendation: **Grep approach.** `npx tsc --noEmit 2>&1 | grep -E "$(echo $TOUCHED_FILES | tr ' ' '|')"` is acceptable. Phase 14 plan should list the touched files explicitly so verification can grep them.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/bank-transactions/ src/__tests__/hooks/ src/__tests__/utils/opening-balance-autopost.test.ts tests/attachments/ --reporter=verbose` |
| Full suite command | `npm test` (= `NODE_OPTIONS="--no-experimental-webstorage" vitest run --reporter=verbose` after Phase 14) |
| Pre-Phase-14 baseline | 530 passing / 7 failing (use-entity localStorage) / 75 todo / 15 skipped — verified by `npm test` |
| Post-Phase-14 expectation | 530 + 7 (use-entity now passes) + N new (Phase 14 regression tests) − M deleted (applyRules describe blocks) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BANK-03 | Bank-tx POST handler delegates AccountBalance upsert to `postJournalEntryInTx` | unit (mirror-inline of refactored route logic; assert `postJournalEntryInTx` is the only place where AccountBalance upserts originate) | `npx vitest run tests/bank-transactions/create-je.test.ts` | EXISTS — extend with one new `it()` block asserting the audit ordering is CREATED-then-POSTED post-refactor |
| BANK-04 | `matchRule` continues to categorize transactions correctly post-applyRules-deletion | unit (existing `tests/bank-transactions/categorize.test.ts` matchRule describes) | `npx vitest run tests/bank-transactions/categorize.test.ts` | EXISTS — net diff = delete 2 describe-blocks/it-blocks; matchRule tests stay green |
| WIZ-03 | Wizard OB JE is auto-posted (not DRAFT) when wizard helper calls API without `status` field | unit (mock global.fetch, assert request body has no status field) | `npx vitest run src/__tests__/utils/opening-balance-autopost.test.ts` | ❌ Wave 0 — NEW FILE per Example 12 |
| (audit-switch) | Manual JE form's Save Draft button still creates DRAFT (sends explicit `status: 'DRAFT'`) | unit (mock global.fetch, render JEForm, click Save Draft, assert body) | `npx vitest run src/__tests__/components/je-form-draft-opt-out.test.ts` | ❌ Wave 0 — NEW FILE per Example 13 |
| (TS sweep #1) | Select onValueChange callsites typecheck post-coalesce | tsc | `npx tsc --noEmit 2>&1 \| grep -E "budgets/page\.tsx"` (expect: zero matches) | n/a (compile-time) |
| (TS sweep #3) | SerializedAccount unified — no TS2719 | tsc | `npx tsc --noEmit 2>&1 \| grep -E "accounts/page\.tsx\|account-table\.tsx" \| grep TS2719` (expect: zero matches) | n/a (compile-time) |
| (TS sweep #5) | localStorage.clear works in jsdom env | unit (existing use-entity.test.ts) | `npx vitest run src/__tests__/hooks/use-entity.test.ts` (expect: 7/7 passing) | EXISTS — fix is in `package.json` `test` script |
| (TS sweep #6) | column-mapping-ui passes TS check | tsc | `npx tsc --noEmit 2>&1 \| grep -E "column-mapping-ui\.tsx"` (expect: zero matches) | n/a (compile-time) |
| (TS sweep #7) | blob-storage test mock typechecks | tsc | `npx tsc --noEmit 2>&1 \| grep -E "blob-storage\.test\.ts" \| grep TS2348` (expect: zero matches) | EXISTS — adjust mock cast |

### Sampling Rate

- **Per task commit:** Run scoped command for the task's domain (e.g., for the bank-tx delegation task: `npx vitest run tests/bank-transactions/`).
- **Per wave merge:** Full suite — `npm test` — must be green.
- **Phase gate:** Full suite green AND `npx tsc --noEmit` clean on touched files (grep filter) before `/gsd:verify-work`.
- **Max feedback latency:** ~15s for scoped runs; ~25-30s for full suite (current is ~11s but adding 2 new test files).

### Wave 0 Gaps

- [ ] `src/__tests__/utils/opening-balance-autopost.test.ts` — NEW file for WIZ-03 regression (asserts wizard helper omits `status` from POST body)
- [ ] `src/__tests__/components/je-form-draft-opt-out.test.ts` — NEW file for manual-JE-form audit-switch regression (asserts Save Draft sends `status: 'DRAFT'`)
- [ ] `package.json` `test` script — UPDATE to prepend `NODE_OPTIONS="--no-experimental-webstorage"` (un-blocks 7 use-entity.test.ts assertions)
- [ ] `src/types/account.ts` — NEW file for canonical `SerializedAccount` (consumed by 3 existing files, no test required since dedup is pure type-level)

*(No new framework install. No vitest.config.ts changes needed — the localStorage fix is at the Node runtime level via NODE_OPTIONS.)*

---

## Sources

### Primary (HIGH confidence)

- **Codebase inspection (verified Phase 14 research session):**
  - `src/lib/journal-entries/post.ts:17-73` — current `postJournalEntry` body to extract
  - `src/lib/bank-transactions/categorize.ts:1-111` — confirms `applyRules`/`TransactionInput` orphan, `matchRule`/`RuleInput` live
  - `src/app/api/entities/[entityId]/journal-entries/route.ts:173-314` — POST handler to extend with `status` opt-out
  - `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:258-348` — handler with inline upsert loop to delegate
  - `src/lib/onboarding/opening-balance.ts:94-106` — wizard OB helper (no change needed; benefits from API default flip)
  - `src/components/journal-entries/je-form.tsx:222-242` — manual JE form to audit-switch with `status: 'DRAFT'`
  - `src/lib/validators/journal-entry.ts:49-73` — current Zod schema (extend with `status`)
  - `src/app/api/entities/[entityId]/journal-entries/[journalEntryId]/post/route.ts:39-54` — closed-period error mapping pattern to mirror
  - `src/lib/bank-transactions/opening-balance.ts:42-90` — `tx: PrismaTransactionClient` precedent
  - `src/generated/prisma/internal/prismaNamespace.ts:3221` — `Prisma.TransactionClient` type export
  - `vitest.config.ts:1-13` — vitest config (env=jsdom, no environmentOptions today)
  - `package.json:11` — current `test` script (no NODE_OPTIONS)
  - `src/__tests__/hooks/use-entity.test.ts` — full file (confirmed 7 tests fail due to `localStorage.clear`)
  - `tests/bank-transactions/categorize.test.ts:1-162` — full test file for surgical describe-removal targeting
  - `tests/attachments/blob-storage.test.ts:35,43` — vitest 4 Mock cast errors
  - `src/components/csv-import/column-mapping-ui.tsx:230` — actual TS2345 site (NOTE: deferred-items.md says line 218; the `mapping[role] ?? ""` at 218 is the SOURCE of the null, but the error fires at line 230 where `val` is consumed)
  - `src/app/(auth)/budgets/page.tsx:746,775` — confirmed only 2 `setSelectedFoo` Select sites
  - `src/components/accounts/account-form.tsx:59-71` — full SerializedAccount with `cashFlowCategory` + `isContra` (canonical shape)
- **Reproduction commands run during research:**
  - `npx tsc --noEmit` — produced exact 5 TS errors listed in "User Decisions Authoritative; Map to Code"
  - `npm test` — confirmed 530/612 tests pass, 7 fail (all use-entity localStorage)
  - `node --version` — v25.8.2 confirmed
  - `node -e "console.log(typeof localStorage.clear)"` — confirmed `undefined` on Node 25 (no jsdom involved)
  - `NODE_OPTIONS="--no-experimental-webstorage" npx vitest run src/__tests__/hooks/use-entity.test.ts` — confirmed 7/7 pass with flag
- **Project planning docs:**
  - `.planning/phases/14-code-hygiene-wizard-fix/14-CONTEXT.md` (locked decisions)
  - `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` (TS/test items)
  - `.planning/v1.0-MILESTONE-AUDIT.md` (motivation + scope)
  - `.planning/ROADMAP.md` Phase 14 entry
  - `.planning/STATE.md` (current project status, 530-test baseline)

### Secondary (MEDIUM confidence — verified WebSearch)

- **vitest 4 environment.options docs:** [Vitest Configuration — environmentOptions](https://vitest.dev/config/#environmentoptions) — confirmed `environmentOptions.jsdom.url` exists but does NOT fix the Node 25 localStorage issue (the issue is a Node global shadowing jsdom, not jsdom URL config).
- **vitest 4 environment guide:** [Vitest — Test Environment](https://vitest.dev/guide/environment.html) — confirms config snippet for jsdom URL override.
- **Vitest GH issue 8757:** [Node v25 breaks tests with Web Storage API](https://github.com/vitest-dev/vitest/issues/8757) — maintainer-confirmed Node 25 root cause; recommended workaround is `NODE_OPTIONS="--no-webstorage"` (alias for `--no-experimental-webstorage`).
- **Node.js issue 60303:** [`localStorage`'s behaviour when no or invalid `--localstorage-file` provided](https://github.com/nodejs/node/issues/60303) — documented Node 25 behavior: empty object globally without flag.
- **Node 25 release notes:** [What's new in Node.js v25.2: Web Storage, V8 14.1, permissions and more](https://appwrite.io/blog/post/nodejs-v25-whats-new) — confirms experimental Web Storage enabled by default in v25.
- **Test failure article:** [Tests Using LocalStorage May Fail in Node.js v25](https://zenn.dev/mima_ita/articles/775119d66803bf?locale=en) — independent confirmation that vitest+jsdom tests fail on Node 25 without the flag.
- **JSDOM issue 2304:** [SecurityError: localStorage is not available for opaque origins · Issue #2304 · jsdom/jsdom](https://github.com/jsdom/jsdom/issues/2304) — historical context (NOT the root cause here; Phase 14's issue is Node 25 shadowing, not jsdom URL).
- **Jest issue 15888:** [Bug: Jest fails with localstorage error with node 25.2.0](https://github.com/jestjs/jest/issues/15888) — same root cause affects Jest, additional confirmation pattern is universal.

### Tertiary (LOW confidence — kept for context only)

- vitest `vi.mocked()` helper for blob-storage Pitfall 7 — pattern is from training data; verified by reading vitest 4.x docs that `vi.mocked` returns `MockInstance<T>` (callable). Not directly verified via test execution but the pattern is well-documented and unambiguous.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in project; no new installs; versions verified from `package.json`.
- Architecture: HIGH — `postJournalEntryInTx` extraction mirrors an established project pattern; bank-tx route refactor is a mechanical replacement of inline code with a function call inside the same `$transaction`.
- Pitfalls: HIGH — every pitfall reproduced live during research (TS errors via `tsc --noEmit`, jsdom failure via `npm test`, Node 25 root cause via `node -e`, fix via `NODE_OPTIONS=...`).
- Validation: HIGH — Wave 0 file paths defined; per-task commands written; baseline 530/612 verified.
- JE POST API blast radius: HIGH — exhaustive grep with 4 different patterns; only 2 production callers + 0 test/script callers found. Server-side JE creators bypass the API and use `tx.journalEntry.create` directly with hardcoded statuses, so they are unaffected.

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — refactor scope, no fast-moving APIs; only risk to validity is a Node version change in the project)
