# Phase 14: Code Hygiene & Wizard Behavioral Fix - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure cleanup + behavioral-alignment phase — no new features, no schema changes. Closes five audit-flagged items from the v1.0 milestone audit:

1. Orphan production export: `applyRules` in `src/lib/bank-transactions/categorize.ts`
2. Maintenance-coupling risk: `AccountBalance.upsert` inlined in bank-tx POST route instead of delegating to `postJournalEntry`
3. Behavioral gap: Wizard opening-balance JE is created as DRAFT while the Holdings OBE path creates POSTED
4. Five of the seven deferred TypeScript/test issues catalogued in `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` (items #1, #3, #5, #6, #7)
5. Verification bar: `tsc --noEmit` clean on touched files, full test suite green

Out of scope for this phase: items #2 and #4 from `deferred-items.md` (already RESOLVED in 12-07), Holdings OBE inline-upsert refactor (tested/working per Phase 11, not audit-flagged), new batch categorization features.

</domain>

<decisions>
## Implementation Decisions

### Wizard Opening-Balance JE Behavior (Success Criterion #3)

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

### applyRules Orphan Cleanup (Success Criterion #1)

- **Delete** the `applyRules` export from `src/lib/bank-transactions/categorize.ts`.
- **Keep** `matchRule` — it is the live production code, used by the bank-tx PATCH route for single-transaction categorization.
- **Delete** the `TransactionInput` interface (applyRules-only); **keep** `RuleInput` (matchRule constrains `<R extends RuleInput>`).
- **Remove** the corresponding `applyRules` test suites from `tests/bank-transactions/categorize.test.ts`. matchRule tests stay.
- **No new batch-categorization endpoint.** Inventing a feature to justify keeping `applyRules` would be scope creep.

### AccountBalance Delegation Scope (Success Criterion #2)

- **Narrow scope:** refactor only the roadmap-flagged site — `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` POST handler (the inline upsert loop at roughly lines 293–313).
- **Holdings OBE path stays as-is.** `src/lib/bank-transactions/opening-balance.ts` (`generateOpeningBalanceJE`, `generateAdjustingJE`) keeps its inline upserts — it is tested and verified in Phase 11, and is not audit-flagged. Broadening the refactor would require re-verifying Phase 11.
- **Implementation:** extract `postJournalEntryInTx(tx, journalEntryId, userId)` as an internal export from `src/lib/journal-entries/post.ts`. The public `postJournalEntry(journalEntryId, userId)` API is unchanged — it becomes a thin wrapper that opens a `$transaction` and calls the internal helper. The bank-tx POST handler calls `postJournalEntryInTx` inside its existing outer `$transaction` block, replacing the inline balance upsert loop and the redundant POSTED audit entry.
- **Atomicity preserved:** JE create + balance upsert + bank-tx status update all still commit/rollback together inside the same outer transaction.

### TS/Test Deferred Sweep (Success Criterion #4)

Single task per item. Fix each at the flagged location — no bundling, no opportunistic folding into unrelated work.

- **Item #1 (Select `onValueChange` `string | null`):** per-site inline handler — `onValueChange={(v) => setFoo(v ?? '')}`. No `<SafeSelect>` wrapper. No state-type change to `string | null`. Confirmed sites: `src/app/(auth)/budgets/page.tsx:746` and `:775`; plan must grep for additional sites.
- **Item #3 (SerializedAccount duplicate):** collapse to one canonical declaration (likely in a types module or the accounts server helper), import in both `src/app/(auth)/accounts/page.tsx:122` and `src/components/accounts/account-table.tsx:324/326/528/530`. Ensure it includes the `cashFlowCategory` and `isContra` fields added in Phase 12.
- **Item #5 (`localStorage.clear` not a function in `use-entity.test.ts`):** investigate jsdom/vitest environment root cause first; if the fix is clean and localised (vitest config, setup file, or env tweak), prefer the global fix. If the root cause is a jsdom version mismatch or would require a larger upgrade, fall back to a test-local stub in `beforeEach`.
- **Item #6 (`column-mapping-ui.tsx:218` `string | null`):** handle the nullable value at the call site (coalesce or narrow before passing into the `string`-typed callee).
- **Item #7 (blob-storage vitest Mock constructable type):** adjust the test-only mock type declaration in `tests/attachments/blob-storage.test.ts:35,43` to satisfy vitest's `Mock` generic. Production code untouched.

### Verification Bar (Success Criterion #5)

- **`tsc --noEmit` clean on touched files only.** Pre-existing errors in unrelated files do not block this phase.
- **If new unrelated pre-existing TS errors surface in the transitive graph of touched files** (e.g., a new `SerializedAccount` mismatch in a file that imports the deduplicated type), document them as new entries in `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` rather than absorbing the fix into Phase 14.
- **Full test suite must remain green.** Baseline is 504/504 active tests. New tests added by Phase 14 (e.g., a regression test for the wizard auto-post behavior) are counted on top of that baseline.
- **Update `deferred-items.md` at end of phase** to mark items #1, #3, #5, #6, #7 as RESOLVED and note any new items discovered.

### Claude's Discretion

- How to clean `tests/bank-transactions/categorize.test.ts` — surgical describe-block removal vs file rewrite. Read the file and choose the lower-blast-radius option.
- jsdom `localStorage.clear` fix approach — root-cause vs test-local workaround. Investigate first; pick based on what the root cause turns out to be.
- Exact location of the canonical `SerializedAccount` declaration after dedup.
- Whether to add a regression test for the wizard OB auto-post behavior (recommended: yes, at least one assertion confirming the JE status is POSTED after wizard completion).
- How `postJournalEntry` tests are updated when `postJournalEntryInTx` is extracted (likely: add coverage for the tx-aware helper, keep the existing public-API tests).
- Commit/plan granularity within the phase. Suggested split: (a) JE POST API `postImmediately` + wizard, (b) `applyRules` delete, (c) bank-tx AccountBalance delegation + `postJournalEntryInTx` extraction, (d) TS/test sweep (either one plan or split by item).
- Audit-switching existing callsites that should continue creating DRAFT — Claude greps and patches; expected callsites: manual JE form and Phase 5 recurring-JE generator.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `postJournalEntry()` at `src/lib/journal-entries/post.ts:17-73` — canonical JE posting logic. Opens its own `$transaction`, updates status to POSTED, upserts `AccountBalance` per line, writes POSTED audit entry. Target for `postJournalEntryInTx(tx, ...)` extraction.
- `matchRule()` at `src/lib/bank-transactions/categorize.ts:51-75` — live production code used by bank-tx PATCH route. Stays.
- `generateOpeningBalanceJE()` client helper at `src/lib/onboarding/opening-balance.ts:52-114` — thin wrapper around `fetch('/api/entities/.../journal-entries', {method: 'POST'})`. Unchanged in signature; will auto-benefit from the API-default POSTED change.
- `createJournalEntryFromTransaction()` at `src/lib/bank-transactions/create-je.ts` — already used by the bank-tx POST route; unchanged.
- `generateNextEntryNumber()` at `src/lib/journal-entries/auto-number.ts` — unchanged.
- `src/app/api/entities/[entityId]/journal-entries/route.ts` POST handler — destination for `postImmediately` / `status: 'DRAFT'` semantics. Must call into either `postJournalEntry` (if posting) or skip posting (if draft).

### Established Patterns

- API uses Zod schemas with `.safeParse()` — extend the existing JE POST schema to accept `status: z.enum(['DRAFT', 'POSTED']).optional()` (or equivalent).
- Atomic `prisma.$transaction` blocks for multi-step writes — the bank-tx POST refactor must preserve atomicity.
- Internal helpers that take `tx: PrismaTransactionClient` as first argument — mirror the pattern already in `opening-balance.ts` (`findOrCreateOBEAccount(tx, entityId)`) when extracting `postJournalEntryInTx`.
- Serialization helpers inline in route files (`serializeDecimal`) — do not centralise.
- Module-level caches with 60s TTL — unrelated to Phase 14 but context for anyone adding new UI.
- `deferred-items.md` as the canonical tracker for pre-existing issues discovered mid-phase — keep updating it rather than absorbing unrelated fixes.

### Integration Points

- `src/app/api/entities/[entityId]/journal-entries/route.ts` — POST handler gets `status`/`postImmediately` flag support; default becomes POSTED when balanced.
- `src/lib/journal-entries/post.ts` — gains a new internal `postJournalEntryInTx(tx, journalEntryId, userId)` export. Public `postJournalEntry` becomes a wrapper.
- `src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts` POST — replaces inline `AccountBalance.upsert` loop + redundant POSTED audit with a single `postJournalEntryInTx` call inside the existing outer `$transaction`.
- `src/lib/bank-transactions/categorize.ts` — loses `applyRules` export + `TransactionInput` interface.
- `tests/bank-transactions/categorize.test.ts` — loses `applyRules` test suites.
- `src/components/onboarding/wizard-balances-step.tsx` — no code change required; benefits automatically from the API default change. Toast copy may be refined to convey "posted" semantics.
- Manual JE form (find via grep for existing `POST /api/entities/.../journal-entries` callers from the auth UI) — must explicitly pass `status: 'DRAFT'` post-refactor to preserve current UX.
- Phase 5 recurring-JE generator — must explicitly pass `status: 'DRAFT'` post-refactor.
- Five deferred-item files: `src/app/(auth)/budgets/page.tsx`, `src/app/(auth)/accounts/page.tsx`, `src/components/accounts/account-table.tsx`, `src/__tests__/hooks/use-entity.test.ts`, `src/components/csv-import/column-mapping-ui.tsx`, `tests/attachments/blob-storage.test.ts`.
- `.planning/phases/12-reporting-fixes-onboarding-wizard/deferred-items.md` — update at end of phase to mark #1/#3/#5/#6/#7 RESOLVED.

</code_context>

<specifics>
## Specific Ideas

- After wizard OB submission, the Balance Sheet should immediately reflect the entered numbers. No "go to JE list → post draft" step in the user's head model.
- The toast copy in `wizard-balances-step.tsx:158-160` ("Opening balance JE created for {date}") should be updated to convey that the JE is now live, once auto-post lands. Claude's discretion on exact copy.
- `postImmediately` naming precedent: `postTransactionSchema` in the bank-tx POST route already uses `postImmediately: z.boolean().optional().default(true)`. Staying consistent with that naming is preferred if a boolean is used; alternately, accepting `status: 'DRAFT' | 'POSTED'` gives three-state clarity. Pick whichever is easier to audit callsites against.
- The Phase 5 recurring-JE generator is explicitly "create as draft for later review" — its authors will be surprised if the API silently posts. Add the explicit `status: 'DRAFT'` flag and leave a comment at the callsite explaining why.
- `applyRules` deletion should include its supporting interfaces where unambiguously unused (`TransactionInput`). `RuleInput` stays because `matchRule<R extends RuleInput>` depends on it.
- Prefer reading `tests/bank-transactions/categorize.test.ts` first before deciding surgical-describe-block vs file-rewrite on the test cleanup.
- Items #2 and #4 in `deferred-items.md` are already RESOLVED in 12-07 — do not re-fix them; just leave their RESOLVED notes intact when updating the file.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The following were considered and explicitly deferred to future work / other phases:

- Wiring `applyRules` into a bulk batch-categorize endpoint — would invent a new feature; explicitly out of Phase 14 scope. Revisit post-v1.0 if product demand for bulk categorization emerges.
- Sweeping the Holdings OBE path (`src/lib/bank-transactions/opening-balance.ts`) to also delegate to `postJournalEntry` — tested and working per Phase 11; not audit-flagged; deferred to a future hygiene sweep if maintenance drift becomes real.
- Project-wide `tsc --noEmit` clean — touched-files-only is the Phase 14 bar. Any additional pre-existing TS errors discovered in unrelated files get documented in `deferred-items.md`, not absorbed.
- A `<SafeSelect>` wrapper component to normalise base-ui/shadcn Select's `string | null` emission — rejected as premature abstraction; per-site coalescing is sufficient for now. Revisit only if the pattern shows up in 8+ sites post-sweep.

</deferred>

---

*Phase: 14-code-hygiene-wizard-fix*
*Context gathered: 2026-04-16*
