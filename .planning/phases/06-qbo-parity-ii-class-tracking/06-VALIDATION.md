---
phase: 6
slug: qbo-parity-ii-class-tracking
status: complete
nyquist_compliant: false
# nyquist_note: Phase 13 owns remediation for CLASS-03/04/05 it.todo to real assertions.
# Stubs exist at tests/dimensions/ (wave_0 complete) but per 15-RESEARCH.md §4, assertions in
# CLASS-03/04/05 test files are still incomplete (real full test coverage pending Phase 13 roll-up).
wave_0_complete: true
created: 2026-03-29
audited: 2026-04-16
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @vitejs/plugin-react |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CLASS-01 | unit | `npx vitest run src/lib/validators/dimension.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | CLASS-02 | unit | `npx vitest run tests/dimensions/je-dimension-tags.test.ts` | ✅ | ✅ green |
| 06-03-01 | 03 | 2 | CLASS-03 | unit | `npx vitest run tests/dimensions/income-statement-by-dimension.test.ts` | ✅ | ⚠️ stubs-only (Phase 13 remediation) |
| 06-03-02 | 03 | 2 | CLASS-04 | unit | `npx vitest run tests/dimensions/tb-dimension-filter.test.ts` | ✅ | ⚠️ stubs-only (Phase 13 remediation) |
| 06-03-02 | 03 | 2 | CLASS-05 | unit | `npx vitest run tests/dimensions/unclassified-entries.test.ts` | ✅ | ⚠️ stubs-only (Phase 13 remediation) |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/validators/dimension.test.ts` — stubs for CLASS-01 (dimension/tag Zod schema validation)
- [ ] `tests/dimensions/je-dimension-tags.test.ts` — stubs for CLASS-02 (JE line dimension tagging)
- [ ] `tests/dimensions/income-statement-by-dimension.test.ts` — stubs for CLASS-03 (P&L by dimension)
- [ ] `tests/dimensions/tb-dimension-filter.test.ts` — stubs for CLASS-04 (TB dimension filtering)
- [ ] `tests/dimensions/unclassified-entries.test.ts` — stubs for CLASS-05 (unclassified entries)
- [ ] Install shadcn accordion: `npx shadcn@latest add accordion`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Split assistant UX flow | CLASS-02 | Interactive modal flow with percentage input | 1. Open JE form 2. Add line with dimension tag 3. Try to add second tag from same dimension 4. Verify split assistant appears with % input 5. Confirm two lines created with proportional amounts |
| Dimension combobox keyboard navigation | CLASS-02 | Full keyboard interaction testing | 1. Tab to dimension column 2. Type to search 3. Arrow keys to navigate 4. Enter to select 5. Verify focus moves to next column |
| P&L column-per-tag responsive layout | CLASS-03 | Visual layout verification with many columns | 1. Create 5+ tags in one dimension 2. View Income Statement "By [dimension]" 3. Verify horizontal scroll, column alignment, totals |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or manual-only classification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (stubs exist at `tests/dimensions/`)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter — **INTENTIONALLY FALSE**, see note below

**Approval:** complete (with Nyquist caveat — see Validation Audit 2026-04-16 below)

---

## Validation Audit 2026-04-16

| Metric | Count |
|--------|-------|
| Gaps found | 5 (stale W0 entries) |
| Resolved | 5 (all task rows have File Exists ✅; statuses flipped appropriately) |
| Escalated | 3 (CLASS-03, CLASS-04, CLASS-05 — Phase 13 owns) |

**Phase 13 pointer — non-compliance note:**

Phase 06 stays `nyquist_compliant: false` post-refresh per the locked decision in `15-CONTEXT.md` Implementation Decisions and `15-RESEARCH.md §4`. Reasoning:

- CLASS-01 (dimension/tag Zod validation) and CLASS-02 (JE line dimension tagging) have real live assertions in `src/lib/validators/dimension.test.ts` and `tests/dimensions/je-dimension-tags.test.ts` respectively — these are green.
- CLASS-03/04/05 test files exist (created by **Phase 13 Plan 13-01 — Test Coverage Gaps**) and run green in the suite, **but per Phase 15 research §4, their assertion depth is still being audited**. Phase 13 owns the remediation: validating that `income-statement-by-dimension.test.ts`, `tb-dimension-filter.test.ts`, and `unclassified-entries.test.ts` contain behavioral assertions (not just smoke-level "it runs" coverage).
- Re-audit of Phase 06's `nyquist_compliant` flip to `true` is deferred until Phase 13 certifies CLASS-03/04/05 assertion completeness.
- `wave_0_complete: true` is accurate — the test files do exist; only their assertion depth is the open item.

**See also:** `.planning/phases/13-test-coverage-gaps/13-01-SUMMARY.md` for the stub-creation history, and Phase 13's forthcoming roll-up for the certification of full-assertion coverage.