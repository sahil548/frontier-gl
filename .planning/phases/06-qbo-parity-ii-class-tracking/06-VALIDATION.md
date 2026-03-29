---
phase: 6
slug: qbo-parity-ii-class-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
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
| 06-01-01 | 01 | 1 | CLASS-01 | unit | `npx vitest run src/lib/validators/dimension.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | CLASS-02 | unit | `npx vitest run tests/dimensions/je-dimension-tags.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | CLASS-03 | unit | `npx vitest run tests/dimensions/income-statement-by-dimension.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | CLASS-04 | unit | `npx vitest run tests/dimensions/tb-dimension-filter.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-05-01 | 05 | 2 | CLASS-05 | unit | `npx vitest run tests/dimensions/unclassified-entries.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
