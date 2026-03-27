---
phase: 1
slug: foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
audited: 2026-03-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Total tests** | 118 (8 files) |
| **Runtime** | ~1.2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01, AUTH-02 | manual | N/A (Clerk OAuth) | — | ✅ manual-only |
| 01-01-02 | 01 | 1 | AUTH-03 | unit | `npx vitest run src/__tests__/middleware.test.ts` | ✅ | ✅ green |
| 01-01-03 | 01 | 1 | ENTM-01 | unit | `npx vitest run src/__tests__/api/entities-create.test.ts` | ✅ | ✅ green |
| 01-01-04 | 01 | 1 | ENTM-02 | unit | `npx vitest run src/__tests__/api/entities-update.test.ts` | ✅ | ✅ green |
| 01-02-01 | 02 | 1 | ENTM-03, ENTM-04 | manual | N/A (visual interaction) | — | ✅ manual-only |
| 01-02-02 | 02 | 1 | ENTM-05 | unit | `npx vitest run src/__tests__/hooks/use-entity.test.ts` | ✅ | ✅ green |
| 01-02-03 | 02 | 1 | DI-01, DI-02 | unit | `npx vitest run src/__tests__/schema/decimal-fields.test.ts` | ✅ | ✅ green |
| 01-02-04 | 02 | 1 | API-01 | unit | `npx vitest run src/__tests__/api/entities-routes.test.ts` | ✅ | ✅ green |
| 01-02-05 | 02 | 1 | API-02 | unit | `npx vitest run src/__tests__/validators/entity.test.ts` | ✅ | ✅ green |
| 01-02-06 | 02 | 1 | API-03 | unit | `npx vitest run src/__tests__/api/response-format.test.ts` | ✅ | ✅ green |
| 01-02-07 | 02 | 1 | UI-01 | manual | N/A (visual theming) | — | ✅ manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Verified |
|----------|-------------|------------|-------------------|----------|
| Clerk sign-up/login flow | AUTH-01, AUTH-02 | External OAuth provider, requires real Clerk session | 1. Navigate to /sign-in 2. Sign up with email 3. Verify redirect to app 4. Refresh page — session persists | ✅ 2026-03-27 |
| Entity switcher dropdown UX | ENTM-03, ENTM-04 | Visual interaction — dropdown rendering, "All Entities" option, sub-second switching | 1. Create 2+ entities 2. Open dropdown 3. Switch entities — verify no page reload 4. Select "All Entities" | ✅ 2026-03-27 |
| Dark mode toggle | UI-01 | Visual verification of brand colors | 1. Toggle dark mode via header 2. Verify ink #0F1419 background 3. Verify teal #0D7377 accents 4. Verify text #8B95A5 | ✅ 2026-03-27 |
| Entity selection persistence | ENTM-05 | Requires browser close/reopen | 1. Select entity 2. Close browser 3. Reopen — verify same entity selected | ✅ code-verified (localStorage) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual-only classification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] All MISSING gaps resolved
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |
| Tests before | 35 |
| Tests after | 118 |
| Files added | 5 |
