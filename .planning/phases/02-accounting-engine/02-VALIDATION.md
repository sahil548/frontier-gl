---
phase: 2
slug: accounting-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x + @testing-library/react ^16.x |
| **Config file** | vitest.config.ts (from Phase 1) |
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
| 02-01-01 | 01 | 1 | COA-01 | unit | `npx vitest run src/lib/validators/account.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | COA-02 | unit | `npx vitest run src/lib/accounts/hierarchy.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | COA-03 | unit | `npx vitest run src/lib/accounts/next-number.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | COA-04 | unit | `npx vitest run src/lib/accounts/search.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | COA-05 | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "balance"` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | COA-06 | unit | `npx vitest run src/lib/validators/account.test.ts -t "deactivate"` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | COA-07 | unit | `npx vitest run src/lib/accounts/scoping.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | JE-01 | unit | `npx vitest run src/lib/validators/journal-entry.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | JE-02 | unit | `npx vitest run src/lib/validators/journal-entry.test.ts -t "balance"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | JE-03 | unit | `npx vitest run src/lib/journal-entries/status.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | JE-04 | unit | `npx vitest run src/lib/journal-entries/immutability.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 1 | JE-05 | unit | `npx vitest run src/lib/journal-entries/reverse.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 1 | JE-06 | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "closed period"` | ❌ W0 | ⬜ pending |
| 02-02-07 | 02 | 1 | JE-07 | unit | `npx vitest run src/lib/journal-entries/audit.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-08 | 02 | 1 | JE-08 | integration | `npx vitest run src/lib/journal-entries/bulk-post.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | DI-03 | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "atomic balance"` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | DI-04 | integration | Manual DB test or integration test with real DB | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 1 | DI-05 | integration | Manual DB test or integration test with real DB | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/validators/account.test.ts` — Zod schema validation for accounts (COA-01, COA-06)
- [ ] `src/lib/validators/journal-entry.test.ts` — Zod schema with debit=credit refinement (JE-01, JE-02)
- [ ] `src/lib/accounts/hierarchy.test.ts` — Parent/child hierarchy validation (COA-02)
- [ ] `src/lib/accounts/next-number.test.ts` — Auto-suggest logic (COA-03)
- [ ] `src/lib/accounts/search.test.ts` — Search/filter accounts (COA-04)
- [ ] `src/lib/accounts/scoping.test.ts` — Entity scoping (COA-07)
- [ ] `src/lib/journal-entries/post.test.ts` — Posting + balance update + closed period (COA-05, JE-06, DI-03)
- [ ] `src/lib/journal-entries/reverse.test.ts` — Reversal creation (JE-05)
- [ ] `src/lib/journal-entries/bulk-post.test.ts` — Bulk posting (JE-08)
- [ ] `src/lib/journal-entries/status.test.ts` — Status transition validation (JE-03)
- [ ] `src/lib/journal-entries/immutability.test.ts` — Posted entry immutability (JE-04)
- [ ] `src/lib/journal-entries/audit.test.ts` — Audit trail recording (JE-07)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DB trigger blocks posted JE modification | DI-04 | Requires real PostgreSQL with triggers | Connect to test DB, attempt UPDATE on posted entry, verify rejection |
| DB trigger validates debit=credit | DI-05 | Requires real PostgreSQL with triggers | Connect to test DB, attempt INSERT of unbalanced lines, verify rejection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
