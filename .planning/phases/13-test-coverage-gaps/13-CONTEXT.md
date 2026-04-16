# Phase 13: Test Coverage Gaps - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Write regression tests for 8 REQ-IDs (CLASS-03/04/05, CAT-03, REC-01/03/04, OBE-03) whose production code already shipped in Phases 6 and 11 but whose tests were left as empty files or `it.todo` placeholders. No production code changes. No user-facing changes. After Phase 13, `npm test` passes green and every file named in ROADMAP Success Criteria contains real assertions instead of stubs.

Files in scope:
- `tests/dimensions/income-statement-by-dimension.test.ts` — new (CLASS-03)
- `tests/dimensions/tb-dimension-filter.test.ts` — new (CLASS-04)
- `tests/dimensions/unclassified-entries.test.ts` — new (CLASS-05)
- `tests/bank-transactions/position-picker.test.ts` — convert 4 stubs (CAT-01; file named in success criteria)
- `tests/bank-transactions/auto-reconcile.test.ts` — convert 3 stubs (REC-01)
- `tests/bank-transactions/reconciliation-summary.test.ts` — convert 3 stubs (REC-04)
- `tests/bank-transactions/categorize.test.ts` — convert 2 stubs in `Position-targeted rules` describe block (CAT-03)
- `tests/bank-transactions/opening-balance.test.ts` — add assertions for adjusting-JE behavior (OBE-03)

REC-03 (reconciliation badges) is explicitly manual/Chrome-verified per Phase 11 VALIDATION.md and not a test-file target.

</domain>

<decisions>
## Implementation Decisions

### Test style — follow existing codebase conventions
- Match the pattern already used in each neighborhood of the suite. No new test infrastructure.
- `tests/bank-transactions/plaid-sync.test.ts` is the reference for Prisma-mocking (`vi.mock("@/lib/db/prisma", …)` with per-method `vi.fn()` stubs and a `$transaction` callback proxy).
- `tests/dashboard/chart-data.test.ts` is the reference for mirror-the-helper-inline tests (when the production code is a small pure mapping, the test mirrors it and asserts shape/values — no DB).
- `tests/bank-transactions/opening-balance.test.ts` is the reference for pure-function tests (direct import of the real function, no mocks).
- No real test database. No Prisma integration. Tests must run green in the existing `npm test` command without new infra.

### Scope discipline
- Only the 8 files listed above. Do NOT convert unrelated `it.todo` stubs (tb-query.test.ts, ledger-query.test.ts, consolidated-*.test.ts, etc.) — those are declared out-of-scope by the Phase 13 ROADMAP success criteria.
- No production code changes. If a test can't be written without modifying production code, flag it as a blocker rather than silently refactoring.

### CLASS-03/04/05 (dimensions)
- Three brand-new test files under `tests/dimensions/`.
- Each file mocks `@/lib/db/prisma` (since the real functions use `$queryRaw`) and asserts:
  1. The function is called with the expected entity/date/dimension parameters
  2. Rows returned by the mock flow through the mapping/serialization correctly
  3. The null-dimension / unclassified branch behaves as documented
- Assertions target `getIncomeStatementByDimension`, the TB dimension filter, and the unclassified-column logic from `src/lib/queries/report-queries.ts`.

### CAT-03 (categorize.test.ts stubs)
- Keep the 2 stub assertions inline in the existing `Position-targeted rules` describe block.
- Pure function tests — no mocks. `matchRule` and `applyRules` are already pure.
- Test 1: a rule with `positionId` set and `accountId: null` matches a transaction.
- Test 2: `applyRules` preserves `positionId` in the matched result so callers can resolve the GL account.

### REC-01 (auto-reconcile.test.ts)
- Mock Prisma at module level (plaid-sync pattern).
- Test the lib function that sets `reconciliationStatus: RECONCILED` on post — not the full HTTP route.
- If the logic lives inside the route handler rather than an extractable lib function, flag and ask before refactoring.

### REC-04 (reconciliation-summary.test.ts)
- Small focused tests for the summary computation (counts of RECONCILED vs PENDING; totals aggregation).
- Pure function if possible; if it lives in a route, mock Prisma and test the query result shape.

### OBE-03 (opening-balance.test.ts extension)
- Extend the existing file with a new `describe` block for the "adjusting JE on balance edit" behavior.
- Test two cases: balance increases → additional JE created in the correct direction; balance decreases → reverse JE created.
- Existing `computeAdjustment` tests already cover the math — new tests cover the JE creation call.
- Mock Prisma / JE creation dependency; assert the correct arguments are passed.

### Position-picker.test.ts (CAT-01, file named in success criteria)
- Write real tests even though CAT-01 isn't in the Phase 13 REQ-ID list — the roadmap explicitly names this file for zero `it.todo`.
- 4 existing stubs: entity-wide listing, serialization shape, active-only filter, ordering.
- Mock Prisma and assert the route/lib function returns the expected shape.

### Acceptance gate
- Every file listed in this CONTEXT.md has zero `it.todo` left.
- `npm test` exits 0 with all new tests passing.
- No production source files modified (exception: extracting a pure helper from a route handler if strictly necessary — flag first).

### Claude's Discretion
- Exact assertion count per stub (1:1 replacement minimum, more if natural)
- Whether a given stub becomes multiple `it()` blocks or a single consolidated one
- Naming of new helper functions if extraction is required
- Mock data shape (as long as it reflects realistic production values: Decimal-like money strings, valid date ranges, scoped entity IDs)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vi.mock("@/lib/db/prisma", …)` pattern from `tests/bank-transactions/plaid-sync.test.ts:130` — full recipe for mocking Prisma with `$transaction` callback proxy
- Inline-mirror pattern from `tests/dashboard/chart-data.test.ts` — no DB, test the pure transformation helpers directly
- `tests/bank-transactions/opening-balance.test.ts` already imports and tests `computeAdjustment` / `determineJEDirection` from the real module — add a new describe block alongside
- `tests/bank-transactions/categorize.test.ts` already has real assertions for `matchRule` / `applyRules` — add the CAT-03 cases in the same style
- `src/lib/queries/report-queries.ts` (771 lines) — source of `getIncomeStatementByDimension` and the TB dimension filter; read to understand row shape and SQL params

### Established Patterns
- Tests live under `tests/<feature-area>/` mirroring `src/` folder structure
- Prisma is mocked, never a real client — no test DB exists
- `@/` path alias works in tests via `vite-tsconfig-paths`
- `describe/it/expect` globals enabled in `vitest.config.ts`

### Integration Points
- `vitest.config.ts` — include globs already cover `tests/**/*.test.{ts,tsx}`, no config changes needed
- `src/__tests__/setup.ts` — minimal jest-dom setup, no additions needed for Phase 13

</code_context>

<specifics>
## Specific Ideas

- No user-facing changes. This phase is purely CI safety net.
- When in doubt, copy the style of an adjacent passing test file rather than inventing a new pattern.
- If a stub can't be converted without modifying production code, STOP and flag — refactoring production code is out of Phase 13 scope.

</specifics>

<deferred>
## Deferred Ideas

- Converting the ~50 unrelated `it.todo` stubs in tb-query.test.ts, ledger-query.test.ts, consolidated-*.test.ts, and similar files. These exist across the codebase but are explicitly out of Phase 13 scope per ROADMAP Success Criterion 4. Consider a future "suite hygiene" phase if the backlog grows uncomfortable.
- Real test-database harness (would enable end-to-end SQL regression tests for the dimensions queries). Not needed for Phase 13 — mocks suffice.
- Formal `10-VERIFICATION.md` and `12-VERIFICATION.md` files (tech debt per v1.0 milestone audit). These are documentation gaps, not test-coverage gaps, and belong in a separate phase.

</deferred>

---

*Phase: 13-test-coverage-gaps*
*Context gathered: 2026-04-16*
