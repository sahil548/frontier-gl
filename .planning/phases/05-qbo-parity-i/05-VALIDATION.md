---
phase: 5
slug: qbo-parity-i
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1 + jsdom |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-00-01 | 00 | 0 | DASH-03 | unit | `npx vitest run tests/dashboard/chart-data.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-02 | 00 | 0 | AUDT-02 | unit | `npx vitest run tests/audit/field-diff.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-03 | 00 | 0 | ATTCH-01 | unit | `npx vitest run tests/attachments/upload.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-04 | 00 | 0 | ATTCH-02 | unit | `npx vitest run tests/attachments/list.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-05 | 00 | 0 | ATTCH-03 | unit | `npx vitest run tests/attachments/blob-storage.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-06 | 00 | 0 | RECR-01 | unit | `npx vitest run tests/recurring/setup.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-07 | 00 | 0 | RECR-02 | unit | `npx vitest run tests/recurring/list.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-08 | 00 | 0 | RECR-03 | unit | `npx vitest run tests/recurring/generate.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-09 | 00 | 0 | RECR-04 | unit | `npx vitest run tests/recurring/edit-stop.test.ts` | ❌ W0 | ⬜ pending |
| 05-00-10 | 00 | 0 | RECR-05 | unit | `npx vitest run tests/recurring/generated-link.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/chart-data.test.ts` — stubs for DASH-03 chart data API
- [ ] `tests/audit/field-diff.test.ts` — stubs for AUDT-02 field-level diffs
- [ ] `tests/attachments/upload.test.ts` — stubs for ATTCH-01 upload flow
- [ ] `tests/attachments/list.test.ts` — stubs for ATTCH-02 listing
- [ ] `tests/attachments/blob-storage.test.ts` — stubs for ATTCH-03 Vercel Blob integration (mock)
- [ ] `tests/recurring/setup.test.ts` — stubs for RECR-01
- [ ] `tests/recurring/list.test.ts` — stubs for RECR-02
- [ ] `tests/recurring/generate.test.ts` — stubs for RECR-03
- [ ] `tests/recurring/edit-stop.test.ts` — stubs for RECR-04
- [ ] `tests/recurring/generated-link.test.ts` — stubs for RECR-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile responsiveness at 375px | UI-02 | Visual inspection required — no horizontal overflow, no clipped content | Open each page in browser devtools at 375px width, verify no horizontal scroll, all content visible |
| Chart tooltips and click drill-down | DASH-03 | Interactive behavior requires visual verification | Hover charts for tooltip values, click pie slices/bars to verify navigation |
| Attachment preview rendering | ATTCH-02 | Image thumbnails and PDF icon display are visual | Upload PDF and image, verify inline preview renders correctly on JE detail page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
