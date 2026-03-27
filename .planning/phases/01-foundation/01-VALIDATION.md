---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x + React Testing Library |
| **Config file** | vitest.config.ts (Wave 0 — needs creation) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | integration | `npx vitest run src/__tests__/auth/sign-in.test.tsx -t "renders sign-in"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-03 | unit | `npx vitest run src/__tests__/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | ENTM-01 | unit | `npx vitest run src/__tests__/entities/create-entity.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | ENTM-02 | unit | `npx vitest run src/__tests__/entities/update-entity.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | ENTM-03 | integration | `npx vitest run src/__tests__/entities/entity-selector.test.tsx` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | ENTM-05 | unit | `npx vitest run src/__tests__/hooks/use-entity.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | DI-01 | unit | `npx vitest run src/__tests__/schema/decimal-fields.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | API-01 | integration | `npx vitest run src/__tests__/api/entities.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-05 | 02 | 1 | API-02 | unit | `npx vitest run src/__tests__/validators/entity.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-06 | 02 | 1 | API-03 | unit | `npx vitest run src/__tests__/api/response-format.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-07 | 02 | 1 | UI-01 | smoke | `npx vitest run src/__tests__/components/ui-smoke.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with React plugin and path aliases
- [ ] `src/__tests__/setup.ts` — Test setup (jsdom, testing-library cleanup)
- [ ] `src/__tests__/validators/entity.test.ts` — Zod schema validation tests
- [ ] `src/__tests__/api/entities.test.ts` — API route handler tests
- [ ] `src/__tests__/hooks/use-entity.test.ts` — Entity context + localStorage tests
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clerk sign-up/login flow | AUTH-01, AUTH-02 | External OAuth provider, requires real Clerk session | 1. Navigate to /sign-in 2. Sign up with email 3. Verify redirect to app 4. Refresh page — session persists |
| Entity switcher dropdown UX | ENTM-03, ENTM-04 | Visual interaction — dropdown rendering, "All Entities" option, sub-second switching | 1. Create 2+ entities 2. Open dropdown 3. Switch entities — verify no page reload 4. Select "All Entities" |
| Dark mode toggle | UI-01 | Visual verification of brand colors | 1. Toggle dark mode via header 2. Verify ink #0F1419 background 3. Verify teal #0D7377 accents 4. Verify text #8B95A5 |
| Entity selection persistence | ENTM-05 | Requires browser close/reopen | 1. Select entity 2. Close browser 3. Reopen — verify same entity selected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
