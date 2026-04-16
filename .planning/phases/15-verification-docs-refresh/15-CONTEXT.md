# Phase 15: Verification & Planning Docs Refresh - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Close three documentation hygiene gaps surfaced by `.planning/v1.0-MILESTONE-AUDIT.md` so `.planning/` artifacts reflect the as-built state of v1.0:

1. Generate the two missing VERIFICATION.md files (Phases 10 and 12) via `/gsd:verify-phase`.
2. Refresh the 9 stale VALIDATION.md files (Phases 02, 03, 06, 07, 08, 09, 10, 11, 12) via `/gsd:validate-phase` — frontmatter + per-task verification map.
3. Bring `.planning/REQUIREMENTS.md` current — add Phase 11/12 REQ-ID checklist sections, update traceability table for Phases 10–12, add a top-of-file unique-REQ-ID count.

**Out of scope:** no production code changes, no new test files, no REQ-ID additions. Phase 13 owns the missing CLASS-03/04/05 and Phase 11 `it.todo` tests. Phase 14 owns the `applyRules` orphan and bank-tx POST refactor. Source of truth for what's stale is `.planning/v1.0-MILESTONE-AUDIT.md` (audited 2026-04-16) combined with the actual test suite.

</domain>

<decisions>
## Implementation Decisions

### VERIFICATION.md approach (Phases 10 and 12)
- Delegate production to `/gsd:verify-phase 10` and `/gsd:verify-phase 12` — full gsd-verifier subagent pass per phase. Matches the verification methodology used for the other 9 VERIFICATION.md files.
- Accept `status: human_needed` as a terminal Phase 15 outcome when the verifier flags browser-only checks. Mirrors the Phase 11 VERIFICATION.md pattern (`human_needed` with 4 Chrome checks documented for post-roll-up). Do NOT gate Phase 15 completion on inline Chrome verification of already-manually-confirmed visuals.
- `12-VERIFICATION.md` must cite `.planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md` as primary evidence for the 12 UAT test cases + 7 gap closures (plans 12-06/07/08/09). Verifier confirms citations match live code, doesn't re-execute all UAT cases.
- Verification depth: code inspection + targeted `npx vitest run <file>` commands per REQ-ID. No full suite re-run. No inline Chrome checks (those go in `human_verification` frontmatter for post-phase follow-up).

### VALIDATION.md refresh (9 phases)
- Run `/gsd:validate-phase <N>` for each of phases 02, 03, 06, 07, 08, 09, 10, 11, 12. Nine separate sub-workflow invocations via the Skill tool.
- **Phase 15 constraint: `/gsd:validate-phase` runs must refresh frontmatter + per-task verification map ONLY.** If the auditor proposes generating missing tests (e.g., for Phase 06 CLASS-03/04/05), those are explicitly out of scope — they belong to Phase 13. Flag any proposed test-generation and skip it with a reference to Phase 13.
- Frontmatter fields to update: `status`, `nyquist_compliant`, `wave_0_complete`, `audited` (new date).
- Per-task verification map columns to update: `File Exists` (✅ vs ❌ W0) and `Status` (✅ green vs ⬜ pending) per task, based on actual file existence + test pass state.
- **Nyquist-compliance rule (strict):** `nyquist_compliant: true` only when every gated REQ-ID has a live, passing test file. Phase 06 stays `nyquist_compliant: false` until Phase 13 backfills CLASS-03/04/05. Expected post-refresh distribution across the 9 files: 8 compliant (02, 03, 07, 08, 09, 10, 11, 12) + 1 non-compliant (06 with Phase 13 reference).
- Independent of VERIFICATION.md work — runs in parallel in the same wave. VALIDATION frontmatter reflects test-suite reality, not verifier outcomes.

### REQUIREMENTS.md scope
- Add two new REQ-ID checklist sections matching the existing Phase 5–10 format:
  - `## Phase 11 Requirements — Categorization UX & Opening Balances` covering CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04.
  - `## Phase 12 Requirements — Reporting Fixes & Onboarding Wizard` covering SCHEMA-01, CF-01, CF-02, CF-03, CONTRA-01, CONTRA-02, RATE-01, RATE-02, WIZ-01, WIZ-02, WIZ-03, CSV-01, CSV-02, CSV-03, CSV-04.
- Source REQ-ID text from each phase's PLAN.md `must_haves` + SUMMARY.md frontmatter (canonical, already-agreed wording). Do not re-author from scratch or from ROADMAP.md high-level framing.
- Add a summary line immediately after the `**Updated:**` line at the top: `**Total requirements:** 99 unique REQ-IDs across Phases 1–12, all Complete` (99 matches the audit report's `requirements: 99/99` count).
- Update traceability table:
  - Mark `POS-01--08 | Phase 10 | Complete` (was Pending).
  - Add collapsed rows matching existing style: `CAT-01, CAT-03 | Phase 11 | Complete`, `OBE-01--03 | Phase 11 | Complete`, `REC-01, REC-03, REC-04 | Phase 11 | Complete`, `SCHEMA-01 | Phase 12 | Complete`, `CF-01--03 | Phase 12 | Complete`, `CONTRA-01--02 | Phase 12 | Complete`, `RATE-01--02 | Phase 12 | Complete`, `WIZ-01--03 | Phase 12 | Complete`, `CSV-01--04 | Phase 12 | Complete`.
- Update bottom `**Coverage:**` bullets to list Phases 1–12 Complete (remove the "Phase 10: Pending" line).
- Update the `*Last updated:*` footer to 2026-04-16 with a note referencing the audit close-out.

### Plan breakdown
- Three plans, all in Wave 1 (parallel-independent streams):
  - `15-01-PLAN.md` — Generate 10-VERIFICATION.md + 12-VERIFICATION.md via `/gsd:verify-phase`.
  - `15-02-PLAN.md` — Refresh 9 VALIDATION.md files via `/gsd:validate-phase` per phase.
  - `15-03-PLAN.md` — Update REQUIREMENTS.md (top summary line + Phase 11/12 sections + traceability + coverage).
- **Skip Wave 0** — no REQ-IDs gated, no new test coverage. Phase frontmatter should explicitly reflect "documentation hygiene — no REQ-IDs gated" to match ROADMAP.md.
- Commit granularity: one commit per plan (per-stream commits). Messages follow `docs(15): ...` convention already used for 12-XX commits.
- Sub-workflow invocation: plan task specs explicitly call out `/gsd:verify-phase <N>` or `/gsd:validate-phase <N>` invocations (via the Skill tool). Executing agent follows the literal task spec — no method substitution. Preserves bookkeeping (STATE.md updates, git commits) that the sub-workflows add.

### Claude's Discretion
- Exact wording of VERIFICATION.md human_verification items (verifier subagent decides).
- Ordering of validate-phase runs within 15-02 (any order is fine since they're independent).
- Whether to batch multiple VALIDATION.md updates into a single intermediate commit during 15-02 or rely on the final plan-level commit.
- Formatting details of the new Phase 11/12 REQ-ID sections (bullet style, sub-grouping) as long as they match Phase 5–10 structure.
- Whether to re-number or re-order existing REQUIREMENTS.md sections — default to leaving order intact, append new sections after Phase 10.

</decisions>

<specifics>
## Specific Ideas

- The audit file `.planning/v1.0-MILESTONE-AUDIT.md` is the authoritative gap inventory. Phase 15 plans should cite it as source rather than rediscovering gaps.
- Phase 11's VERIFICATION.md (`status: human_needed` with `re_verification` block and 4 human checks) is the template to follow for Phase 10 and Phase 12 verification reports.
- 12-UAT.md has already closed all 7 UAT gaps via plans 12-06/07/08/09 — `12-VERIFICATION.md` should treat UAT as verified evidence, not re-litigate it.
- For Phase 06 VALIDATION, the `nyquist_compliant: false` outcome must include a frontmatter note or link pointing to Phase 13 as the remediation phase, so the non-compliant signal is clearly cataloged rather than appearing ambiguous.
- Existing "docs(NN): ..." commit conventions (e.g., `docs(12-07): ...`) are the style to emulate.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/gsd:verify-phase <N>` workflow (`~/.claude/get-shit-done/workflows/verify-phase.md`) — spawns gsd-verifier subagent, produces VERIFICATION.md via the standard template. Invoked via `Skill(skill="gsd:verify-phase", args="<N>")`.
- `/gsd:validate-phase <N>` workflow (`~/.claude/get-shit-done/workflows/validate-phase.md`) — spawns gsd-nyquist-auditor, refreshes VALIDATION.md frontmatter + per-task map. Invoked via `Skill(skill="gsd:validate-phase", args="<N>")`. Must be constrained to frontmatter/map updates only (no test generation).
- `.planning/phases/11-categorization-ux-opening-balances/11-VERIFICATION.md` — template for `human_needed` status with frontmatter `human_verification` array and `re_verification` block.
- `.planning/phases/01-foundation/01-VALIDATION.md` — template for a fully refreshed VALIDATION.md (`nyquist_compliant: true`, `wave_0_complete: true`, task map with ✅ green entries and actual test counts).
- `.planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md` — primary evidence file for 12-VERIFICATION.md citations.
- `.planning/v1.0-MILESTONE-AUDIT.md` — authoritative gap inventory and test-suite snapshot (504/504 active tests pass).
- `.planning/REQUIREMENTS.md` existing Phase 5–10 REQ-ID sections — format template for new Phase 11/12 sections.
- Per-phase PLAN.md `must_haves` and SUMMARY.md frontmatter — canonical REQ-ID text source for the new Phase 11/12 sections.

### Established Patterns
- Planning-doc conventions: frontmatter YAML block, section headers, phase directory `.planning/phases/NN-slug/`, file naming `NN-{TYPE}.md`.
- Sub-workflow invocation via Skill tool (not Task tool) to preserve workflow bookkeeping — git commits, STATE.md updates, model resolution.
- Per-phase commit convention: `docs(NN): <subject>` or `docs(NN-slug): <subject>`.
- Frontmatter field set for VALIDATION.md: `phase`, `slug`, `status`, `nyquist_compliant`, `wave_0_complete`, `created`, `audited`.
- Frontmatter field set for VERIFICATION.md: `phase`, `verified` (timestamp), `status`, `score`, `human_verification` (array), `re_verification` (block if applicable).
- Traceability table collapse style: `REQ-ID-range | Phase N | Status` (ranges use `--` separator, commas for discontinuous IDs).

### Integration Points
- `.planning/STATE.md` — each sub-workflow run records a session entry; Phase 15 completion should set `stopped_at` to "Phase 15 complete — docs hygiene closed" and advance progress.
- `.planning/ROADMAP.md` — Phase 15 status flips from `Pending` to `Complete` on roll-up; `[ ]` → `[x]` in the phases list.
- `.planning/v1.0-MILESTONE-AUDIT.md` — the six tech-debt streams it catalogues (verification coverage, Nyquist frontmatter, REQUIREMENTS traceability) map 1:1 to Phase 15's three plans, Phase 13 (tests), and Phase 14 (code hygiene). Phase 15 closes the three docs streams; audit itself is not mutated.
- No production code paths touched. No `src/`, no `tests/`, no Prisma schema, no migrations.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope. Production-code items (`applyRules` orphan, bank-tx POST refactor, Wizard OB DRAFT→POSTED behavior, 7 deferred TS/test items) are already owned by Phase 14. Missing test files (CLASS-03/04/05, Phase 11 `it.todo` stubs) are owned by Phase 13.

</deferred>

---

*Phase: 15-verification-docs-refresh*
*Context gathered: 2026-04-16*
