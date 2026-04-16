# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-16
**Phases:** 15 (1–15; Phase 4 virtual) | **Plans:** 60/61 executed | **Commits:** 357 | **Timeline:** 21 days (2026-03-26 → 2026-04-16)

### What Was Built

- Multi-entity GL foundation — COA, journal entries (double-entry), GL ledger, trial balance, financial statements with cash/accrual toggle, period close
- Complete QBO parity feature set — dashboard charts, mobile layout, audit trail UI, attachments (Vercel Blob), recurring JEs, class tracking, Budget vs Actual with variance
- Family-office differentiators — multi-entity consolidation with intercompany eliminations, 13-type holdings model with position-level GL anchoring, bank feed (CSV + Plaid), position-first categorization, auto-generated opening-balance JEs, reconciliation integration
- Phase 12 reporting + onboarding polish — `cashFlowCategory` field replacing name-matching, contra-account netting, rate-based budget targets, 4-step onboarding wizard, AI CSV column mapping (Anthropic SDK + heuristic fallback), multi-account CSV import, header-fingerprint saved-mapping reuse
- Tech-debt closure ahead of ship — Phase 13 (test backfill CLASS/CAT/OBE/REC), Phase 14 (code hygiene: `applyRules` orphan removal, bank-tx POST delegation, Wizard OB auto-post, 7 deferred TS/test items), Phase 15 (docs hygiene: 2 VERIFICATION.md generated, 9 VALIDATION.md refreshed, REQUIREMENTS.md traceability current)
- 99/99 REQ-IDs satisfied, 11/11 VERIFICATION.md coverage, 536/543 active tests passing (7 pre-existing `localStorage.clear` jsdom failures documented as non-blocking)

### What Worked

- **Gap-closure phases (13/14/15) ahead of ship** — milestone audit (`v1.0-MILESTONE-AUDIT.md` status: `tech_debt`) identified 15 debt items; closing them via dedicated phases rather than "accept and complete" produced a cleaner v1.0 with honest VERIFICATION coverage and up-to-date REQUIREMENTS traceability.
- **Parallel-independent plans in one wave** — Phase 15's 3 plans (VERIFICATION gen / VALIDATION refresh / REQUIREMENTS update) executed in parallel with zero cross-stream conflicts. Pattern: identify independence at planning time, set `depends_on: []`, parallelize in execution.
- **Module-level Map cache with 60s TTL for form dropdowns** — established in Phase 6, reused in Phases 7/8/9/10/12. Zero dep on state library, simple invalidation model, good UX.
- **Prisma `$transaction` + explicit deletion order for FK-constrained data** — the Phase 14 UAT cleanup script handled 42 accounts with 3-level hierarchy via iterative leaf deletion + 6 related tables in a single atomic transaction. Reusable pattern for future test-data cleanup.
- **Audit-first gap-closure flow** — `/gsd:audit-milestone` → `/gsd:plan-milestone-gaps` → execute gap phases → `/gsd:complete-milestone`. Produces a measurable, REQ-ID-traceable shipping path rather than ad-hoc "is it done?" judgment.
- **Anthropic SDK LLM fallback pattern** — Phase 12-04's column mapper sends headers to Claude API with `COLUMN_PATTERNS` heuristic as offline/rate-limit fallback. Same pattern applicable to future AI-assisted features.

### What Was Inefficient

- **Late `any`-type creep in migration scripts** (Phase 10) caused a deploy failure only caught at milestone close-out. `src/scripts/` was effectively unlinted until Next.js's build-time ESLint caught it 18 days later. Lesson: run `npx tsc --noEmit` AND `npm run lint` locally before push, or CI them separately.
- **`useSearchParams()` without Suspense boundary** (Phase 11-04) also only surfaced at deploy time. Next.js 15 static prerender bails gracefully only when wrapped in Suspense. Lesson: Grep for Next.js app-router client hooks and verify Suspense wrapping as a pre-push check.
- **Shared dev/prod Neon branch** — both environments pointed at the same `ep-steep-resonance-akp7uy7f-pooler` branch. Simplified cleanup but risks: any UAT run mutates prod. Lesson: split branches for v1.1 before any customer onboarding.
- **`02-05` UAT plan with no SUMMARY.md** sat as a documentation gap for the entire milestone. All REQ-IDs it gated were verified elsewhere (02-VERIFICATION.md), so it was non-blocking — but the UI still flagged it as incomplete, noisy signal.
- **STATE.md race between parallel executors** (Phase 15 Wave 1) — the 15-01 executor aggressively advanced STATE to "Phase 15 complete" while 15-02 was still running. No functional harm (all 3 plans completed) but the intermediate STATE snapshot was misleading.
- **Phase 14 UAT test data left in shared DB** — required a targeted cleanup script post-milestone. Lesson: UAT should either use a dedicated DB branch or include teardown in the plan.

### Patterns Established

- **Planning-doc conventions** — per-phase dir with `{N}-CONTEXT.md`, `{N}-RESEARCH.md`, `{N}-VALIDATION.md`, `{N}-UAT.md`, `{N}-VERIFICATION.md`, `{N}-SUMMARY.md` per plan, `docs(NN-NN): ...` commit subjects. Every milestone/gap artifact traces back through this chain.
- **Wave 0 test stubs then Wave N implementation** (Nyquist) — commented-out imports in stubs to avoid parse errors before implementation files exist (Phase 7 pattern, continued in 12).
- **Entity-scoped API routes** (`/api/entities/[entityId]/...`), **Zod validation on all inputs**, **consistent JSON response shape** (`{ success, data | error }`).
- **Additive schema migrations** — new enum values added alongside legacy values kept for data compatibility (Phase 10 `SubledgerItemType`).
- **Cache invalidation via component remount or explicit refetch**, not global store. Pattern holds across v1.0.
- **Plan sub-workflow invocation via Skill tool (not Task tool)** — preserves workflow bookkeeping (git commits, STATE.md updates). Phase 15 plans explicitly invoked `/gsd:verify-phase` and `/gsd:validate-phase` this way.
- **Strict Nyquist rule for frontmatter refresh** — `nyquist_compliant: true` only when ALL gated REQ-IDs have live tests; Phase 06 stayed `false` post-Phase-15 because CLASS-03/04/05 stubs (closed in Phase 13) still had `it.todo` entries per Phase 15 RESEARCH.md note. Honest signal beats aspirational signal.

### Key Lessons

1. **Run `npx tsc --noEmit` + `npm run lint` locally before pushing** — build-time ESLint/TS errors that don't block local dev (e.g., scripts excluded from strict linting during dev) WILL block Vercel production builds. Catch them before the commit lands.
2. **Next.js 15 client hooks need Suspense boundaries** — `useSearchParams()`, `usePathname()` (sometimes), and any `use(...)` for server data require a parent `<Suspense>` to allow graceful prerender bailout. Grep for these hooks on PRs that add new pages.
3. **Gap-closure phases are worth the detour before shipping a milestone** — accumulating tech debt for a v1.1 "cleanup milestone" is easy, but shipping v1.0 with audited gaps closed (Phases 13/14/15) produced a defensible, REQ-ID-traceable release rather than a "we'll get to it" release.
4. **Parallel-independent plans need explicit `depends_on: []`** — Phase 15's 3 plans in Wave 1 worked because the planner marked them explicitly independent. Without that, the executor runs them serially.
5. **Model decisions locked in CONTEXT.md travel well** — the researcher, planner, and executor agents all read CONTEXT.md and respected locked decisions (VERIFICATION approach, PITFALL P1 refusal, REQ-ID enumeration). Centralizing decisions once prevents re-litigation across agent hops.
6. **Shared dev/prod Neon branch is a footgun** — works fine with one developer and zero real data, but any UAT test data leaks to prod. Split before customer onboarding.
7. **Prisma 7 adapter pattern** — `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` is required; connection strings don't live in `schema.prisma` anymore.
8. **Pre-existing failing tests should be catalogued, not silenced** — Phase 14's `deferred-items.md` captured the 7 `localStorage.clear` failures instead of hiding them; milestone audit correctly flagged them as non-blocking but real.

### Cost Observations

- Model mix: mostly sonnet with opus used for planner on complex phases (Phase 12 had most agent spawns: 10 plans, ~4 of which used opus for planning)
- Sessions: 15 distinct phase-execution sessions across 21 days (`/clear` between phases recommended by workflow)
- Notable: the most efficient phases were the gap-closure phases (13/14/15) — tight scope, locked decisions, parallel plans where possible. Phase 12 was the longest (10 plans, 6 initial + 4 UAT gap-closure) because UAT-driven scope refinement doubled the plan count.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~15 | 15 | Baseline — full GSD workflow (question → research → plan → verify → execute → audit → gap-closure → complete). Gap-closure phases (13/14/15) introduced late based on milestone-audit findings rather than upfront. |

### Cumulative Quality

| Milestone | Tests Passing | Test Files | VERIFICATION Coverage | REQ-IDs Satisfied |
|-----------|---------------|------------|------------------------|-------------------|
| v1.0 | 536/543 (7 pre-existing jsdom failures) | 83 | 11/11 (100%) | 99/99 (100%) |

### Top Lessons (Verified Across Milestones)

*Single milestone — trends will emerge in v1.1+.*

---

*Last updated: 2026-04-16 after v1.0 MVP milestone.*
