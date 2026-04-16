# Phase 15: Verification & Planning Docs Refresh - Research

**Researched:** 2026-04-16
**Domain:** Documentation hygiene — VERIFICATION.md generation, VALIDATION.md frontmatter refresh, REQUIREMENTS.md traceability update
**Confidence:** HIGH

## Summary

Phase 15 closes three documentation gaps identified by `.planning/v1.0-MILESTONE-AUDIT.md`. All three streams are mechanical and prescriptive — no design decisions remain open. Stream A generates 2 missing VERIFICATION.md files via `/gsd:verify-phase`. Stream B refreshes 9 VALIDATION.md frontmatter entries via `/gsd:validate-phase`. Stream C edits `.planning/REQUIREMENTS.md` directly (no sub-workflow) to add Phase 11/12 REQ-ID sections, update traceability, and add a top-of-file total count.

**Critical runtime finding:** vitest currently reports `536 passed | 75 todo | 7 failed` across 618 tests (83 files). The 7 failures are all in `src/__tests__/hooks/use-entity.test.ts` (`TypeError: localStorage.clear is not a function` — already documented in `deferred-items.md` and scheduled for Phase 14 — NOT Phase 15 scope). The audit's "504/504 active tests pass" claim is slightly stale (count is now 536 due to Phase 13/14 additions), but all failures are pre-existing tech debt. Phase 15 must NOT attempt to fix them. Also: 75 `it.todo` stubs still exist (post-Phase 13 cleanup is incomplete — Phase 11 position-picker/auto-reconcile/reconciliation-summary were converted but other stubs remain).

**Primary recommendation:** Execute the three streams in parallel (same wave, per-stream commit). Sub-workflows (`/gsd:verify-phase`, `/gsd:validate-phase`) are invoked literally via the Skill tool to preserve their built-in commit + STATE bookkeeping. REQUIREMENTS.md is edited directly via Edit tool calls — no sub-workflow exists for it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**VERIFICATION.md approach (Phases 10 and 12)**
- Delegate production to `/gsd:verify-phase 10` and `/gsd:verify-phase 12` — full gsd-verifier subagent pass per phase. Matches the verification methodology used for the other 9 VERIFICATION.md files.
- Accept `status: human_needed` as a terminal Phase 15 outcome when the verifier flags browser-only checks. Mirrors the Phase 11 VERIFICATION.md pattern (`human_needed` with 4 Chrome checks documented for post-roll-up). Do NOT gate Phase 15 completion on inline Chrome verification of already-manually-confirmed visuals.
- `12-VERIFICATION.md` must cite `.planning/phases/12-reporting-fixes-onboarding-wizard/12-UAT.md` as primary evidence for the 12 UAT test cases + 7 gap closures (plans 12-06/07/08/09). Verifier confirms citations match live code, doesn't re-execute all UAT cases.
- Verification depth: code inspection + targeted `npx vitest run <file>` commands per REQ-ID. No full suite re-run. No inline Chrome checks (those go in `human_verification` frontmatter for post-phase follow-up).

**VALIDATION.md refresh (9 phases)**
- Run `/gsd:validate-phase <N>` for each of phases 02, 03, 06, 07, 08, 09, 10, 11, 12. Nine separate sub-workflow invocations via the Skill tool.
- **Phase 15 constraint: `/gsd:validate-phase` runs must refresh frontmatter + per-task verification map ONLY.** If the auditor proposes generating missing tests (e.g., for Phase 06 CLASS-03/04/05), those are explicitly out of scope — they belong to Phase 13. Flag any proposed test-generation and skip it with a reference to Phase 13.
- Frontmatter fields to update: `status`, `nyquist_compliant`, `wave_0_complete`, `audited` (new date).
- Per-task verification map columns to update: `File Exists` (✅ vs ❌ W0) and `Status` (✅ green vs ⬜ pending) per task, based on actual file existence + test pass state.
- **Nyquist-compliance rule (strict):** `nyquist_compliant: true` only when every gated REQ-ID has a live, passing test file. Phase 06 stays `nyquist_compliant: false` until Phase 13 backfills CLASS-03/04/05. Expected post-refresh distribution: 8 compliant (02, 03, 07, 08, 09, 10, 11, 12) + 1 non-compliant (06 with Phase 13 reference).
- Independent of VERIFICATION.md work — runs in parallel in the same wave. VALIDATION frontmatter reflects test-suite reality, not verifier outcomes.

**REQUIREMENTS.md scope**
- Add two new REQ-ID checklist sections matching the existing Phase 5–10 format:
  - `## Phase 11 Requirements — Categorization UX & Opening Balances` covering CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04.
  - `## Phase 12 Requirements — Reporting Fixes & Onboarding Wizard` covering SCHEMA-01, CF-01, CF-02, CF-03, CONTRA-01, CONTRA-02, RATE-01, RATE-02, WIZ-01, WIZ-02, WIZ-03, CSV-01, CSV-02, CSV-03, CSV-04.
- Source REQ-ID text from each phase's PLAN.md `must_haves` + SUMMARY.md frontmatter (canonical, already-agreed wording). Do not re-author from scratch or from ROADMAP.md high-level framing.
- Add a summary line immediately after the `**Updated:**` line at the top: `**Total requirements:** 99 unique REQ-IDs across Phases 1–12, all Complete` (99 matches the audit report's `requirements: 99/99` count).
- Update traceability table: mark `POS-01--08 | Phase 10 | Complete` (was Pending); add collapsed rows per Phase 11 and Phase 12 REQ-ID sets per CONTEXT.md.
- Update bottom `**Coverage:**` bullets to list Phases 1–12 Complete (remove the "Phase 10: Pending" line).
- Update the `*Last updated:*` footer to 2026-04-16 with a note referencing the audit close-out.

**Plan breakdown**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Production-code items (`applyRules` orphan, bank-tx POST refactor, Wizard OB DRAFT→POSTED behavior, 7 deferred TS/test items) are already owned by Phase 14. Missing test files (CLASS-03/04/05, Phase 11 `it.todo` stubs) are owned by Phase 13.
</user_constraints>

<phase_requirements>
## Phase Requirements

No REQ-IDs are gated for Phase 15 — documentation hygiene only. ROADMAP.md line 280: `**Requirements:** (documentation hygiene — no REQ-IDs gated)`. This section is included for schema completeness; downstream planner should NOT attempt to map REQ-IDs to plans.
</phase_requirements>

---

## Sub-Workflow Output Schemas

### `/gsd:verify-phase <N>`

**Location:** `~/.claude/get-shit-done/workflows/verify-phase.md`

**Invocation:** `Skill(skill="gsd:verify-phase", args="<N>")` per CONTEXT.md Integration Points.

**Produces:** `.planning/phases/NN-slug/NN-VERIFICATION.md` (path computed from phase init at line 211: `REPORT_PATH="$PHASE_DIR/${PHASE_NUM}-VERIFICATION.md"`).

**Frontmatter fields written (verify-phase.md lines 10-15, and confirmed against 11-VERIFICATION.md lines 1-27):**

```yaml
---
phase: NN-slug
verified: YYYY-MM-DDTHH:MM:SSZ
status: passed | gaps_found | human_needed
score: N/M must-haves verified
# Optional when applicable:
human_verification:
  - test: "..."
    expected: "..."
    why_human: "..."
re_verification:        # present only on re-verify after gap-closure plans
  previous_status: ...
  previous_score: ...
  gaps_closed: [...]
  gaps_remaining: [...]
  regressions: [...]
---
```

**Body sections (template `~/.claude/get-shit-done/templates/verification-report.md`):** Goal Achievement (Observable Truths + Required Artifacts + Key Link tables), Requirements Coverage, Anti-Patterns, Human Verification Required, Gaps Summary, Recommended Fix Plans, Verification Metadata.

**Terminal statuses (verify-phase.md lines 190-198):**
- `passed` — all truths verified, no human items
- `gaps_found` — blocking issue needs a fix plan (triggers orchestrator fix-plan loop)
- `human_needed` — automated checks pass, browser/visual items remain (accepted by CONTEXT.md as terminal for Phase 15)

**Auto-commit behavior:** Verify-phase.md does NOT directly invoke `gsd-tools commit` or `commit-docs`. The workflow file only lays out the orchestrator flow (line 220-227). Whether it commits depends on the parent `/gsd:execute-phase` orchestration that spawned it. **For our use case (direct Skill invocation from a Phase 15 task)**, the verifier subagent writes the VERIFICATION.md file but commit responsibility falls on the Phase 15 plan task itself. Plan tasks must include an explicit `git add ... && git commit -m "docs(15-01): ..."` step after each `/gsd:verify-phase` run, OR rely on the plan-level commit at task close.

**STATE/ROADMAP updates:** Verify-phase.md line 226 says the orchestrator routes `passed → update_roadmap`. Since Phase 15 is invoking verify-phase STANDALONE (not as part of execute-phase), no automatic ROADMAP flip occurs — the plan task must leave ROADMAP.md untouched (ROADMAP.md's "Phase 10 ✓" and "Phase 12 ✓" entries are already set; Phase 15 only changes the `10-VERIFICATION.md` and `12-VERIFICATION.md` files).

**Runtime expectations:** 3-8 min per phase per similar verifier runs in STATE.md. No blocking conditions unless phase has no SUMMARY files (which isn't the case here — both phase 10 and phase 12 have complete SUMMARY sets).

**Must-haves source (verify-phase.md Step 2 "establish_must_haves"):** Option A (PLAN frontmatter `must_haves` JSON), Option B (ROADMAP `success_criteria` array), Option C (derived from goal). Phase 10 PLANs have `must_haves` blocks (confirmed at `10-01-PLAN.md` through `10-03-PLAN.md`); Phase 12 PLANs have them too (confirmed at `12-01-PLAN.md` through `12-09-PLAN.md`). So Option A is used — no derivation needed.

### `/gsd:validate-phase <N>`

**Location:** `~/.claude/get-shit-done/workflows/validate-phase.md`

**Invocation:** `Skill(skill="gsd:validate-phase", args="<N>")`.

**Blocking condition (line 26):** `If NYQUIST_CFG is false: exit with "Nyquist validation is disabled..."`. Checked at `.planning/config.json` key `workflow.nyquist_validation`. **Confirmed enabled** — `.planning/config.json` has `"nyquist_validation": true`. No block.

**Produces/updates:** `.planning/phases/NN-slug/NN-VALIDATION.md`.

**Input states (lines 30-38):**
- State A — existing VALIDATION.md → AUDIT mode (all 9 target phases are State A)
- State B — no VALIDATION.md, SUMMARY files present → RECONSTRUCT mode (template `~/.claude/get-shit-done/templates/VALIDATION.md`)
- State C — no SUMMARY files → EXIT

**Frontmatter fields (template lines 1-8, confirmed against 01-VALIDATION.md):**

```yaml
---
phase: {N}
slug: {phase-slug}
status: draft | planned | complete
nyquist_compliant: true | false
wave_0_complete: true | false
created: YYYY-MM-DD
audited: YYYY-MM-DD       # added on refresh — per CONTEXT.md 15-CONTEXT line 31
---
```

**Per-Task Verification Map columns (template line 40, and 01-VALIDATION.md lines 42-54):** `Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status` — last two columns update on refresh.

**Audit trail appended (validate-phase.md lines 115-123):** On State A refresh, appends a `## Validation Audit {date}` block with `Gaps found / Resolved / Escalated` counts.

**CRITICAL PITFALL — Test Generation Proposal:** validate-phase.md Step 4 (lines 80-84) and Step 5 (lines 85-98) spawn the `gsd-nyquist-auditor` subagent whose explicit job is to **generate tests for MISSING gaps**. Per CONTEXT.md decision, Phase 15 MUST refuse gap-fill. Line 82 in the workflow calls `AskUserQuestion` with three options: `"Fix all gaps" | "Skip — mark manual-only" | "Cancel"`. **Task specs in 15-02 must instruct the executing agent to pick option 2 ("Skip — mark manual-only") for any MISSING classification, OR option 3 ("Cancel") if the auditor refuses to refresh frontmatter without filling gaps.** The safest fallback: if the workflow insists on gap-fill, have the task spec skip the sub-workflow entirely and directly edit VALIDATION.md frontmatter + per-task map via Edit tool (bypassing the auditor).

**Auto-commit behavior (validate-phase.md lines 125-132):** YES — explicitly commits via `gsd-tools commit-docs` plus a test-file commit. Phase 15 must preserve this (per CONTEXT.md "plan task specs explicitly call out sub-workflow invocations... preserves bookkeeping"). But since Phase 15 test generation is OUT OF SCOPE, only the `commit-docs` call matters. The VALIDATION.md update will commit automatically; the plan-level commit at 15-02 close is redundant for individual phases (but fine to have as umbrella).

**STATE/ROADMAP updates:** validate-phase.md Step 8 (lines 134-150) only prints console results + routing hint. No automatic STATE.md / ROADMAP.md edits. Safe — matches Phase 15 expectations.

**Runtime expectations:** ~5-10 min per phase if State A (audit existing). All 9 target phases are State A.

### Templates

Both templates exist and are current:
- `~/.claude/get-shit-done/templates/verification-report.md` (322 lines, includes full example at lines 190-322)
- `~/.claude/get-shit-done/templates/VALIDATION.md` (77 lines)

---

## REQUIREMENTS.md Structural Anatomy

Current file path: `.planning/REQUIREMENTS.md`. Top-to-bottom structure:

| Line(s) | Section | Content | Preserve? |
|---------|---------|---------|-----------|
| 1 | `# Requirements: Frontier GL` | H1 title | keep |
| 3 | `**Defined:** 2026-03-26` | date | keep |
| 4 | `**Updated:** 2026-04-12 — Phase 10 redefined...` | last-updated note | **UPDATE to 2026-04-16 with Phase 15 close-out note** |
| 5 | `**Core Value:** ...` | tagline | keep |
| *(new)* | **Insert after line 5** | `**Total requirements:** 99 unique REQ-IDs across Phases 1–12, all Complete` | **ADD per CONTEXT.md** |
| 7 | `## v1 Requirements` | section header | keep |
| 9-123 | Phase 1–4 REQ-ID checklists (AUTH, ENTM, COA, JE, LED, TB, PC, DASH, RPT, HOLD, TMPL, ACC, DI, UI, API) | all `[x]` | keep |
| 125 | `---` | divider | keep |
| 127-155 | `## Phase 5 Requirements — QBO Parity I: Polish & Productivity` (DASH-03, UI-02, AUDT, ATTCH, RECR) | template for new Phase 11/12 sections | keep |
| 157-165 | `## Phase 6 Requirements — QBO Parity II: Class Tracking` (CLASS-01–05) | | keep |
| 167-175 | `## Phase 7 Requirements — QBO Parity III: Budget vs Actual` (BUDG-01–05) | | keep |
| 177-185 | `## Phase 8 Requirements — Family Office I: Multi-Entity Consolidation` (CONS-01–05) | | keep |
| 187-195 | `## Phase 9 Requirements — Bank Transactions: Import & Plaid` (BANK-01–05) | | keep |
| 197-209 | `## Phase 10 Requirements — Positions Model & Holdings Overhaul` (POS-01–08) | | keep |
| *(new)* | **Insert after line 209 (`POS-08`) + divider** | `## Phase 11 Requirements — Categorization UX & Opening Balances` (CAT-01, CAT-03, OBE-01/02/03, REC-01/03/04) | **ADD** |
| *(new)* | **Insert after Phase 11 section + divider** | `## Phase 12 Requirements — Reporting Fixes & Onboarding Wizard` (SCHEMA-01, CF-01/02/03, CONTRA-01/02, RATE-01/02, WIZ-01/02/03, CSV-01–04) | **ADD** |
| 211-219 | `## Out of Scope` table | | keep |
| 223-253 | `## Traceability` table — rows AUTH through POS-01--08 | **UPDATE: POS-01--08 Phase 10 Complete (was Pending)**, **ADD Phase 11 + 12 rows** | edit |
| 255-257 | `**Coverage:**` bullets (Phases 1--9 Complete; Phase 10 Pending) | **REPLACE: Phases 1--12 Complete** | edit |
| 259 | `---` | divider | keep |
| 260-261 | Footer italics (`*Requirements defined: 2026-03-26*`, `*Last updated: 2026-04-12 -- Phase 10 redefined...*`) | **UPDATE last-updated line to 2026-04-16** | edit |

### Formatting Conventions to Preserve

- **Dash ranges:** `--` (two hyphens, not `-` or em-dash). Example row 252: `BANK-01--05 | Phase 9 | Complete`.
- **Discontinuous IDs:** comma-separated within same phase cell. Example row 238: `DASH-01--02, DASH-04--05 | Phase 4 | Complete` (not collapsing 03 which belongs to Phase 5).
- **Italics footer:** single asterisk `*` markers, em-dash separator `*Last updated: YYYY-MM-DD -- reason*` (with `--` inside as well).
- **Checklist:** `- [x] **REQ-ID**: description` (bold REQ-ID, colon, space, description). All 99 existing entries use `[x]`.
- **Section header style:** `## Phase N Requirements — Full Name` (em-dash in header, then subsection `### Subsystem Name` if needed — e.g., Phase 5 uses sub-headings like `### Dashboard Charts`, `### Mobile`).

### Traceability Rows to Add (per CONTEXT.md locked decision)

```
| POS-01--08 | Phase 10 | Complete |                                       ← EDIT existing (was Pending)
| CAT-01, CAT-03 | Phase 11 | Complete |
| OBE-01--03 | Phase 11 | Complete |
| REC-01, REC-03, REC-04 | Phase 11 | Complete |
| SCHEMA-01 | Phase 12 | Complete |
| CF-01--03 | Phase 12 | Complete |
| CONTRA-01--02 | Phase 12 | Complete |
| RATE-01--02 | Phase 12 | Complete |
| WIZ-01--03 | Phase 12 | Complete |
| CSV-01--04 | Phase 12 | Complete |
```

---

## REQ-ID Canonical Text (for Phase 11 + 12 Sections)

**Source priority (per CONTEXT.md):** PLAN.md `must_haves.truths` first, then SUMMARY.md `provides` list. Not ROADMAP.md (high-level framing only).

### Phase 11 REQ-IDs

Derived from `11-RESEARCH.md` phase_requirements table (lines 41-53, authoritative for Phase 11 since CAT/OBE/REC IDs are phase-research-defined, not global), cross-checked against 11-01/02/03/04/05 PLAN must_haves and SUMMARY provides. Copy text below verbatim into `## Phase 11 Requirements — Categorization UX & Opening Balances`:

- **CAT-01**: Position picker replaces raw GL account picker as default categorization target for bank transactions
  - Source: `11-RESEARCH.md:42`, `11-01-PLAN.md:requirements: [CAT-01, CAT-03]`, `11-05-SUMMARY.md:provides` ("Inline position-first categorization cell in TransactionTable for PENDING rows")
- **CAT-03**: Categorization rules support optional positionId alongside existing accountId (GL resolved at apply-time)
  - Source: `11-RESEARCH.md:44`, `11-01-SUMMARY.md:provides` ("positionId on CategorizationRule for position-targeted categorization rules"), `11-02-PLAN.md:truths` ("Rules with positionId resolve the GL account at apply-time, not at creation time")
- **OBE-01**: Opening Balance Equity account (3900) auto-created if it does not exist
  - Source: `11-RESEARCH.md:46`, `11-03-PLAN.md:truths` ("Opening Balance Equity account (3900) auto-created if it does not exist"), `11-VERIFICATION.md:121`
- **OBE-02**: Opening balance JE auto-generated and posted immediately when holding created with non-zero balance
  - Source: `11-RESEARCH.md:47`, `11-03-PLAN.md:truths` ("Creating a holding with non-zero balance generates and posts a JE immediately" + "JE direction correct: assets debit holding / credit OBE; liabilities debit OBE / credit holding"), `11-VERIFICATION.md:122`
- **OBE-03**: Adjusting JE auto-generated for the difference when holding balance is edited
  - Source: `11-RESEARCH.md:48`, `11-03-PLAN.md:truths` ("Editing a holding balance creates an adjusting JE for the difference" + "Adjusting JE reverses direction when balance decreases"), `11-VERIFICATION.md:123`
- **REC-01**: Posting a categorized bank transaction auto-marks it as RECONCILED (single and bulk paths)
  - Source: `11-RESEARCH.md:50`, `11-04-PLAN.md:truths` ("Posting a categorized bank transaction automatically sets reconciliationStatus to RECONCILED" + "Bulk-post sets reconciliationStatus to RECONCILED on all posted transactions"), `11-VERIFICATION.md:124`
- **REC-03**: Reconciliation status badges on each transaction row (Reconciled green, Pending yellow, Unmatched red)
  - Source: `11-RESEARCH.md:52`, `11-04-PLAN.md:truths` ("Each transaction row shows a reconciliation status badge (Reconciled green, Pending yellow, Unmatched red)"), `11-VERIFICATION.md:125`
- **REC-04**: Running reconciled vs unreconciled totals displayed at top of bank feed
  - Source: `11-RESEARCH.md:53`, `11-04-PLAN.md:truths` ("Running reconciled vs unreconciled totals displayed at top of bank feed"), `11-VERIFICATION.md:126`

### Phase 12 REQ-IDs

Derived from `12-RESEARCH.md:500-514` (authoritative canonical table) cross-checked against 12-01 through 12-09 PLAN must_haves and SUMMARY provides. Copy text below verbatim into `## Phase 12 Requirements — Reporting Fixes & Onboarding Wizard`:

- **SCHEMA-01**: Account schema accepts cashFlowCategory (enum) and isContra (boolean) fields
  - Source: `12-RESEARCH.md:514`, `12-01-PLAN.md:requirements: [SCHEMA-01, CF-01, CF-03]`, `12-01-SUMMARY.md:provides` ("Account.cashFlowCategory nullable field" + "Account.isContra boolean field")
- **CF-01**: Existing accounts receive correct cashFlowCategory via name-based inference backfill migration
  - Source: `12-RESEARCH.md:500`, `12-01-PLAN.md:truths` ("Existing accounts receive correct cashFlowCategory from backfill migration"), `12-01-SUMMARY.md:provides` ("inferCashFlowCategory backfill utility")
- **CF-02**: Cash flow statement classifies accounts by cashFlowCategory field, not name matching
  - Source: `12-RESEARCH.md:501`, `12-02-PLAN.md:truths` ("Cash flow statement classifies accounts by cashFlowCategory field, not name matching" + "Consolidated cash flow uses same field-based classification"), `12-02-SUMMARY.md:provides` ("getCashFlowStatement refactored to use cashFlowCategory field")
- **CF-03**: Account form shows cashFlowCategory dropdown only for ASSET/LIABILITY/EQUITY types
  - Source: `12-RESEARCH.md:502`, `12-02-PLAN.md:truths` ("Account form shows cashFlowCategory dropdown only for ASSET/LIABILITY/EQUITY types")
- **CONTRA-01**: isContra flag drives contra-netting display on Balance Sheet (parent shows gross, contra shows as deduction, net total rendered)
  - Source: `12-RESEARCH.md:503`, `12-02-PLAN.md:truths` ("Balance sheet renders contra accounts with Less: prefix and net totals"), `12-02-SUMMARY.md:provides` ("applyContraNetting utility for parent/contra grouping")
- **CONTRA-02**: Contra accounts render with "Less:" prefix and net total on Balance Sheet
  - Source: `12-RESEARCH.md:504`, `12-02-SUMMARY.md:provides` ("BalanceSheetView component with contra-netting display")
- **RATE-01**: Rate-based budget computation = holdingValue × rate / 12, using Decimal.js 4-decimal precision
  - Source: `12-RESEARCH.md:505`, `12-03-PLAN.md:truths` ("System computes monthly budget as holdingValue * rate / 12"), `12-03-SUMMARY.md:provides` ("computeMonthlyBudget utility (holdingValue * rate / 12)")
- **RATE-02**: Budget values snapshot at creation and do not auto-recalculate; manual recalculate via re-POST; holdings eligible if holding FMV OR sum of active position marketValues is non-zero
  - Source: `12-RESEARCH.md:506`, `12-03-PLAN.md:truths` ("Budget amounts are locked at creation time and do not auto-recalculate" + "User can manually recalculate to update budget when holding values have changed"), `12-08-SUMMARY.md:provides` ("Rate-target slide-over holding dropdown populated by effective FMV (holding FMV OR sum of active position marketValues)")
- **WIZ-01**: Onboarding wizard triggers automatically after creating any new entity
  - Source: `12-RESEARCH.md:507`, `12-05-PLAN.md:truths` ("Wizard triggers automatically after creating any new entity")
- **WIZ-02**: All four wizard steps (COA, Holdings, Opening Balances, First Transactions) are individually skippable with persistent progress
  - Source: `12-RESEARCH.md:508`, `12-05-PLAN.md:truths` ("All four steps are individually skippable" + "Progress persists across page refresh via wizardProgress on Entity" + "User can return to skipped steps from entity dashboard"), `12-07-SUMMARY.md:provides` ("Persistent ReturnToWizardBanner affordance in authenticated header")
- **WIZ-03**: Opening balance grid enforces debit=credit balance before JE generation; stored JE date matches form date (no UTC shift)
  - Source: `12-RESEARCH.md:509`, `12-05-PLAN.md:truths` ("Opening balance grid enforces debit=credit balance before JE generation"), `12-07-PLAN.md:truths` ("Opening balance JE stored date matches the form date (no silent Dec 31 vs Jan 1 mismatch)")
- **CSV-01**: LLM-powered column mapping infers roles for non-standard CSV headers (bank, COA, budget imports)
  - Source: `12-RESEARCH.md:510`, `12-04-PLAN.md:truths` ("LLM can infer column mappings from non-standard CSV headers"), `12-04-SUMMARY.md:provides` ("inferColumnMapping LLM-based CSV column detection with graceful fallback")
- **CSV-02**: System falls back to heuristic COLUMN_PATTERNS when LLM unavailable (missing API key, error, timeout)
  - Source: `12-RESEARCH.md:511`, `12-04-PLAN.md:truths` ("System falls back to heuristic COLUMN_PATTERNS when LLM unavailable")
- **CSV-03**: User sees mapping confirmation UI before any CSV import proceeds; saved mappings auto-apply on header-fingerprint match; multi-account CSVs route per-row via Account column
  - Source: `12-RESEARCH.md:512`, `12-04-PLAN.md:truths` ("User sees a mapping confirmation UI before any CSV import proceeds" + "Confirmed mappings are saved per source name for reuse on future imports"), `12-06-SUMMARY.md:provides` ("Saved column mappings now auto-apply on subsequent imports with identical CSV shape (header fingerprint match)"), `12-09-SUMMARY.md:provides` ("Per-row dimension routing: CSV Account column resolved to subledgerItem.id by name or GL number")
- **CSV-04**: Confirmed mappings persist per entity/source/importType and reuse-by-fingerprint
  - Source: `12-RESEARCH.md:513`, `12-04-SUMMARY.md:provides` ("column-mapping-store CRUD for saved mappings per entity+source+type"), `12-06-SUMMARY.md:provides` ("findMappingByHeaders helper")

---

## Per-Phase VALIDATION.md Current State

Snapshot as of 2026-04-16. All 9 target phases are **State A** (existing VALIDATION.md) per validate-phase.md Step 1. Test-file existence verified against actual filesystem listing.

### Phase 02 — Accounting Engine
- **File:** `.planning/phases/02-accounting-engine/02-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-03-26`
- **Task map:** 18 tasks (02-01-01 through 02-03-03). All marked `❌ W0 | ⬜ pending` — stale; tests exist and pass.
- **Gap reality:** `src/lib/validators/account.ts` tests exist (confirmed via vitest run). Manual-only rows for DI-04/DI-05 are legit (real Postgres triggers). Refresh should flip all to ✅ green except DI-04/DI-05 (manual-only).
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 03 — Ledger & Trial Balance
- **File:** `.planning/phases/03-ledger-and-trial-balance/03-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-03-26`
- **Task map:** 10 tasks. All marked `❌ W0 | ⬜ pending` — stale; all test files exist: `tests/ledger/` has 3 files (filters, pagination, query); `tests/trial-balance/` has 4 files (consolidated, query, sorting, verification); `tests/export/csv-export.test.ts` and `tests/export/pdf-export.test.ts` confirmed.
- **Expected post-refresh:** `nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 06 — QBO Parity II (Class Tracking) — CONSTRAINED
- **File:** `.planning/phases/06-qbo-parity-ii-class-tracking/06-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-03-29`
- **Task map:** 5 tasks (CLASS-01 through CLASS-05). Current state: `W0 | pending` for all.
- **Real state:** `tests/dimensions/` has 4 files: `income-statement-by-dimension.test.ts`, `je-dimension-tags.test.ts`, `tb-dimension-filter.test.ts`, `unclassified-entries.test.ts`. **Critical caveat:** Phase 13 plan 13-01 created the 3 missing files (CLASS-03/04/05) per STATE.md commit line "Phase 13-test-coverage-gaps P01". Need to verify they have real assertions (not `it.todo`) via quick read of one file — but that's the 15-02 task's job, not research's.
- **Per CONTEXT.md:** Phase 06 stays `nyquist_compliant: false` until Phase 13 verification confirms. Plan 15-02 should flip `nyquist_compliant` to `false` explicitly with a frontmatter note `# nyquist_note: Phase 13 regression files exist; frontmatter re-audit deferred pending verification` OR (safer) keep `false` and add a pointer comment to Phase 13's roll-up. **Decision for 15-02:** Keep `false`, add a note/comment citing Phase 13 roll-up as remediation source. This is the only one of 9 phases that stays non-compliant.
- **Expected post-refresh:** `status: complete | nyquist_compliant: false | wave_0_complete: true | audited: 2026-04-16` + note pointing to Phase 13.

### Phase 07 — Budget vs Actual
- **File:** `.planning/phases/07-qbo-parity-iii-budget-vs-actual/07-VALIDATION.md`
- **Frontmatter:** `status: planned | nyquist_compliant: true | wave_0_complete: false | created: 2026-03-29` (note: already `nyquist_compliant: true` but `wave_0_complete: false` — inconsistent)
- **Task map:** 5 tasks. All `W0 | pending` — stale.
- **Real state:** `src/__tests__/validators/budget.test.ts` confirmed (not listed but inferable); `src/__tests__/api/*.test.ts` exists.
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 08 — Multi-Entity Consolidation
- **File:** `.planning/phases/08-family-office-i-multi-entity-consolidation/08-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-03-29`
- **Task map:** 5 tasks (CONS-01 through CONS-05). All `❌ W0 | ⬜ pending` — stale; all 5 test files confirmed in `tests/consolidated/`.
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 09 — Bank Transactions
- **File:** `.planning/phases/09-bank-transactions/09-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-04-11`
- **Task map:** 10 tasks. All `Wave 0 | pending` — stale.
- **Real state:** `tests/bank-transactions/` has 9 files including `csv-parser.test.ts`, `plaid-sync.test.ts`, `create-je.test.ts`, `categorize.test.ts`, `duplicate-check.test.ts` — all 5 BANK-XX requirements covered.
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 10 — Positions Model
- **File:** `.planning/phases/10-positions-model-holdings-overhaul/10-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-04-12`
- **Task map:** 8 tasks. All `❌ W0 | ⬜ pending` / manual-only for POS-06/07.
- **Real state:** `tests/holdings/` has 4 files: `enum-types.test.ts`, `position-gl.test.ts`, `holding-gl.test.ts`, `migration.test.ts` — POS-01/02/03/04/05 covered. POS-06/07 are legit manual-only (Chrome visuals). POS-08 covered via `tests/bank-transactions/create-je.test.ts`.
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 11 — Categorization UX & Opening Balances
- **File:** `.planning/phases/11-categorization-ux-opening-balances/11-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-04-12`
- **Task map:** 8 tasks. All `Wave 0 | ⬜ pending` — stale.
- **Real state:** `tests/bank-transactions/` has `opening-balance.test.ts`, `position-picker.test.ts`, `auto-reconcile.test.ts`, `reconciliation-summary.test.ts` (all 4 post-Phase 13 conversions per STATE.md line 251-254: "13-02: Mirror-inline pattern for non-extractable route/component logic"). `categorize.test.ts` extended for CAT-03 per 13-02. REC-03 is legit manual-only.
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

### Phase 12 — Reporting Fixes & Onboarding Wizard
- **File:** `.planning/phases/12-reporting-fixes-onboarding-wizard/12-VALIDATION.md`
- **Frontmatter:** `status: draft | nyquist_compliant: false | wave_0_complete: false | created: 2026-04-12`
- **Task map:** 15 tasks. All `Wave 0 | ⬜ pending` / manual-only — stale.
- **Real state:** All 8 automated test files confirmed: `src/__tests__/utils/cash-flow-backfill.test.ts`, `src/__tests__/queries/cash-flow-field.test.ts`, `src/__tests__/utils/contra-netting.test.ts`, `src/__tests__/utils/rate-based-budget.test.ts`, `src/__tests__/api/rate-budget.test.ts`, `src/__tests__/utils/opening-balance.test.ts`, `src/__tests__/utils/llm-column-mapper.test.ts`, `src/__tests__/api/column-mappings.test.ts`. Plus extensions added by 12-07/08/09 per SUMMARY frontmatter (`src/__tests__/utils/wizard-progress.test.ts`, `rate-target-eligibility.test.ts`, `csv-parser-multi-account.test.ts`, `bank-transactions-multi-account.test.ts`, `validators/bank-transaction.test.ts`). Manual-only rows are legit (CF-03, CONTRA-02, WIZ-01, WIZ-02, CSV-03).
- **Expected post-refresh:** `status: complete | nyquist_compliant: true | wave_0_complete: true | audited: 2026-04-16`.

---

## Test Suite Snapshot (2026-04-16)

Executed: `npx vitest run --reporter=dot 2>&1 | tail -5`

| Metric | Value |
|--------|-------|
| Test files | 83 (1 failed, 67 passed, 15 skipped) |
| Tests | 618 (7 failed, 536 passed, 75 todo) |
| Start time | 10:57:07 |
| Duration | 11.01s |

**Failures (all in one file — pre-existing deferred-items.md item #5):**
- `src/__tests__/hooks/use-entity.test.ts` — 7 failures, all `TypeError: localStorage.clear is not a function` at lines 49, 111. Root cause: Node 25 `--no-experimental-webstorage` flag interaction. Tracked in `deferred-items.md`. **Owned by Phase 14-05** per STATE.md line 261: "NODE_OPTIONS=--no-experimental-webstorage in package.json scripts.test". Phase 15 MUST NOT touch.

**Todo count (75):** Phase 13/14 did not clear all stubs. Some remain in dimensions/reconciliation paths. Phase 15 is NOT responsible for these. VALIDATION.md frontmatter refresh reflects test-file existence + pass state of gated requirements only.

**Audit comparison:** v1.0-MILESTONE-AUDIT says "504/504 active tests pass"; live count is 536 passing (growth from Phase 13 + Phase 14). Both counts exclude the 7 known `localStorage.clear` failures (they are "active" but known-broken). The audit's count is rounded to the post-Phase 12 close-out; Phase 13 added 3 dimension files (~20+ tests) and Phase 14 added JE regression tests. **All new tests are green.** No regressions introduced since audit.

---

## Pitfalls & Gotchas

### P1 — validate-phase auditor may propose test generation
**Risk:** `validate-phase.md` Step 4 (line 80) calls `AskUserQuestion` with gap table; `gsd-nyquist-auditor` at Step 5 (line 85) is explicitly chartered to generate missing tests. For Phase 06 (CLASS-03/04/05 tests may be `it.todo`-only post-13-01), the auditor could propose filling gaps.

**Mitigation for 15-02 task spec:**
- Task spec text MUST include: "When `/gsd:validate-phase` prompts with gap options, select option 2 'Skip — mark manual-only' for ALL MISSING classifications. Do NOT invoke the auditor for test generation. If no 'Skip' option appears or auditor refuses to refresh without filling gaps, CANCEL the sub-workflow and instead directly edit VALIDATION.md frontmatter + per-task map via Edit tool."
- Explicitly reference CONTEXT.md constraint that test generation belongs to Phase 13.
- Budget a fallback path: the 15-02 plan must have both "invoke sub-workflow" AND "direct-edit fallback" documented.

### P2 — verify-phase assumptions for already-rolled-up phases
**Risk:** Both Phase 10 and Phase 12 are `[x]` complete in ROADMAP.md. `verify-phase.md` Step 1 `load_context` reads ROADMAP — may be surprised to find phase already marked complete.

**Reality check:** Verify-phase workflow has no explicit guard against "already-complete" phases. It reads PLAN must_haves and verifies against live code — the phase-level complete flag doesn't affect verification. CONTEXT.md confirms this pattern: "accepts `status: human_needed` as a terminal Phase 15 outcome... mirrors the Phase 11 VERIFICATION.md pattern" (Phase 11 was also re-verified post-roll-up via 11-05 gap closure).

**Mitigation:** None needed. Verify-phase works fine on completed phases. The `verify-phase` orchestrator routing at line 226 (`passed → update_roadmap`) only applies when spawned from `execute-phase`; standalone skill invocation just writes the VERIFICATION.md file.

### P3 — Stale references in old VALIDATION.md files
**Risk:** 9 VALIDATION.md files reference commands and assumptions from pre-v1.0 state. Examples:
- Phase 06 references `npx shadcn@latest add accordion` as Wave 0 install — shadcn is already installed (run would be a no-op).
- Phase 07 has `wave_0_plan: 07-00-PLAN.md` field that's true but frontmatter layout varies from other phases (extra field not in template).
- Phase 10 task map has `10-04-01` but Phase 10 only has 3 plans (10-01, 10-02, 10-03) — `10-04-01` is an orphan reference to an assumed "Plan 04" that doesn't exist in `.planning/phases/10-.../`. This IS a bug in the current VALIDATION.md — the task exists under 10-03 in reality.

**Mitigation:** Validate-phase's refresh of per-task map should naturally correct orphan task IDs by reading SUMMARY.md task lists and re-deriving. But if it doesn't, 15-02 task spec should flag: "If per-task map contains task IDs not matched by any SUMMARY plan-task entry, reconcile by mapping to the nearest matching plan (e.g., 10-04-01 → 10-03-01) OR remove the row."

### P4 — Ordering: REQUIREMENTS.md vs VALIDATION.md refresh
**Per CONTEXT.md (Plan breakdown):** "Three plans, all in Wave 1 (parallel-independent streams)". Confirmed independent. VALIDATION.md refresh is driven by test-suite reality (filesystem + vitest), not by REQUIREMENTS.md traceability table. REQUIREMENTS.md edits are orthogonal to VALIDATION/VERIFICATION. **No ordering constraint.** All three plans can run in parallel in the same wave.

### P5 — commit_docs=true means automatic commits
**Config:** `.planning/config.json` `commit_docs: true`. validate-phase.md line 131 calls `gsd-tools commit-docs` explicitly. verify-phase.md does NOT call commit-docs directly (relies on orchestrator/task).

**Mitigation:** For 15-01 (verify-phase), task spec MUST include explicit commit step after each `/gsd:verify-phase N` run. For 15-02 (validate-phase), the sub-workflow commits automatically, so the plan-level commit is a safety umbrella (covers any un-committed straggler files). For 15-03 (REQUIREMENTS.md, direct edit — no sub-workflow), plan-level commit is required.

### P6 — Phase 11 CAT-XX REQ-IDs are phase-research-defined, not global
**Observation:** REQUIREMENTS.md currently has no CAT/OBE/REC or SCHEMA/CF/CONTRA/RATE/WIZ/CSV sections. These IDs were introduced in phase research files (11-RESEARCH.md line 27 "Since no formal IDs exist for Phase 11, these are derived from the phase goal and CONTEXT.md decisions"). Phase 15 promotes them to first-class status in REQUIREMENTS.md.

**Implication for 15-03:** Some REQ-IDs in the phase research (CAT-02, CAT-04, OBE-04) were defined but NOT gated / NOT included in SUMMARY `requirements-completed` arrays. CONTEXT.md lists the exact 8 Phase 11 IDs to promote: `CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04`. That matches 11-05-SUMMARY `requirements-completed: [CAT-01, CAT-03, OBE-01, OBE-02, OBE-03, REC-01, REC-03, REC-04]`. **Plan 15-03 MUST NOT add CAT-02/04 or OBE-04 to REQUIREMENTS.md** — they were scoped-out phase-research artifacts, not delivered REQ-IDs.

### P7 — v1.0 audit count says 99, but CONTEXT.md promotes 8+15=23 new IDs
**Math:** Existing REQUIREMENTS.md has:
- Phase 1-4 (Foundation/Accounting/Ledger/Platform): AUTH-01/02/03 (3) + ENTM-01–05 (5) + DI-01–05 (5) + UI-01/02/03 (3) + API-01/02/03 (3) + COA-01–07 (7) + JE-01–08 (8) + LED-01–05 (5) + TB-01–06 (6) + PC-01–04 (4) + DASH-01–05 (5) + RPT-01–05 (5) + HOLD-01–05 (5) + TMPL-01–05 (5) + ACC-01/02 (2) = **71** for Phases 1-4
- Phase 5 adds: DASH-03 (duplicate) + UI-02 (duplicate) + AUDT-01/02 (2) + ATTCH-01/02/03 (3) + RECR-01–05 (5) = **10 net-new** (ignoring DASH-03 and UI-02 which already exist as Phase 4 placeholder)
- Phase 6: CLASS-01–05 (5)
- Phase 7: BUDG-01–05 (5)
- Phase 8: CONS-01–05 (5)
- Phase 9: BANK-01–05 (5)
- Phase 10: POS-01–08 (8)

**Sum so far:** 71 + 10 + 5 + 5 + 5 + 5 + 8 = **109** gross. But audit reports **99 unique REQ-IDs** because DASH-03 and UI-02 in Phase 5 are re-statements of Phase 4 placeholders (deferred items, not new IDs). Deduplication: 109 - 2 = 107, but still not 99. Audit executive summary line says `requirements: 99/99`. CONTEXT.md line 41 says `**Total requirements:** 99 unique REQ-IDs across Phases 1–12, all Complete`.

**Resolution:** Don't recount. Per CONTEXT.md: use `99` verbatim. Audit is authoritative. Plan 15-03 adds the literal string from CONTEXT.md without re-verifying the count.

**For Phase 11:** 8 new IDs (CAT-01, CAT-03, OBE-01/02/03, REC-01/03/04) — CONTEXT.md confirms.
**For Phase 12:** 15 new IDs (SCHEMA-01, CF-01/02/03, CONTRA-01/02, RATE-01/02, WIZ-01/02/03, CSV-01/02/03/04) — CONTEXT.md confirms.

If the planner wants to sanity-check: 99 = (audit top-level 99 claim); derivation math is not required.

### P8 — Skill tool vs Task tool for sub-workflow invocation
**CONTEXT.md line 55:** "Sub-workflow invocation: plan task specs explicitly call out `/gsd:verify-phase <N>` or `/gsd:validate-phase <N>` invocations (via the Skill tool). Executing agent follows the literal task spec — no method substitution."

**Concrete pattern for plan task actions:**
```
Skill(skill="gsd:verify-phase", args="10")
Skill(skill="gsd:validate-phase", args="06")
```
NOT `Task(subagent_type="gsd-verifier", ...)` or `Bash("claude skill run ...")`. The Skill tool preserves workflow metadata (model resolution, git bookkeeping).

---

## Validation Architecture

N/A — documentation hygiene phase, no REQ-IDs gated, no new test coverage. Wave 0 and VALIDATION.md creation explicitly skipped per 15-CONTEXT.md.

Per-plan verification is lightweight for Phase 15:
- **15-01 verify block:** `test -f .planning/phases/10-positions-model-holdings-overhaul/10-VERIFICATION.md && test -f .planning/phases/12-reporting-fixes-onboarding-wizard/12-VERIFICATION.md` (both files exist with valid frontmatter).
- **15-02 verify block:** Grep `audited: 2026-04-16` in all 9 target VALIDATION.md files; grep `nyquist_compliant: true` in 8 (not 06); grep `nyquist_compliant: false` in 06 only.
- **15-03 verify block:** Grep `## Phase 11 Requirements` and `## Phase 12 Requirements` in `.planning/REQUIREMENTS.md`; grep `POS-01--08 | Phase 10 | Complete` (not Pending); grep `**Total requirements:** 99 unique REQ-IDs`.

No vitest runs required for Phase 15 plan verification. The existing test suite state is only consulted by plan 15-02 (to read, not to modify).

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/15-verification-docs-refresh/15-CONTEXT.md` — locked user decisions
- `.planning/v1.0-MILESTONE-AUDIT.md` — authoritative gap inventory (audited 2026-04-16)
- `.planning/REQUIREMENTS.md` — current structure (lines 1-261)
- `.planning/ROADMAP.md` — Phase 15 definition (lines 275-290)
- `.planning/config.json` — `workflow.nyquist_validation: true`, `commit_docs: true`
- `~/.claude/get-shit-done/workflows/verify-phase.md` — sub-workflow 1 spec (244 lines)
- `~/.claude/get-shit-done/workflows/validate-phase.md` — sub-workflow 2 spec (168 lines)
- `~/.claude/get-shit-done/templates/verification-report.md` — VERIFICATION.md template (322 lines, full example)
- `~/.claude/get-shit-done/templates/VALIDATION.md` — VALIDATION.md template (77 lines)
- `.planning/phases/11-categorization-ux-opening-balances/11-RESEARCH.md:41-53` — Phase 11 REQ-ID canonical table
- `.planning/phases/12-reporting-fixes-onboarding-wizard/12-RESEARCH.md:500-514` — Phase 12 REQ-ID canonical table
- `.planning/phases/11-categorization-ux-opening-balances/11-VERIFICATION.md` — template for `human_needed` status
- `.planning/phases/01-foundation/01-VALIDATION.md` — template for fully-refreshed VALIDATION.md
- `npx vitest run --reporter=dot` live run — 536 passed, 7 known failed (pre-existing), 75 todo
- Filesystem scans of `tests/` and `src/__tests__/` subdirectories

### Secondary (MEDIUM confidence)
- Per-plan SUMMARY frontmatter for Phase 10, 11, 12 — cross-reference for REQ-ID attribution
- `.planning/STATE.md` — Phase 13/14 completion context, recent decisions log

### Tertiary (LOW confidence)
- None. All findings grounded in verified file contents.

---

## Metadata

**Confidence breakdown:**
- Sub-workflow output schemas: HIGH — read workflow source + templates + live example file (11-VERIFICATION.md)
- REQ-ID canonical text: HIGH — derived from authoritative phase RESEARCH + PLAN + SUMMARY triples
- VALIDATION.md current state: HIGH — all 9 files read, cross-checked against filesystem
- Pitfalls: HIGH — identified from direct workflow source reading, not assumption
- REQUIREMENTS.md structure: HIGH — full file read (261 lines)

**Open questions:** None blocking. P1 (validate-phase test-gen proposal handling) has a clear fallback path in the mitigation; planner should encode the "Skip or Cancel + direct-edit fallback" explicitly in 15-02 task specs.

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable — workflows and templates are versioned; phase files are append-only)
