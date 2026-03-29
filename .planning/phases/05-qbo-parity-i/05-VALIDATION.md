---
phase: 5
slug: qbo-parity-i
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
validated: 2026-03-29
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
| 05-00-01 | 00 | 0 | DASH-03 | unit | `npx vitest run tests/dashboard/chart-data.test.ts` | ✅ | ✅ green |
| 05-00-02 | 00 | 0 | AUDT-02 | unit | `npx vitest run tests/audit/field-diff.test.ts` | ✅ | ✅ green |
| 05-00-03 | 00 | 0 | ATTCH-01 | unit | `npx vitest run tests/attachments/upload.test.ts` | ✅ | ✅ green |
| 05-00-04 | 00 | 0 | ATTCH-02 | unit | `npx vitest run tests/attachments/list.test.ts` | ✅ | ✅ green |
| 05-00-05 | 00 | 0 | ATTCH-03 | unit | `npx vitest run tests/attachments/blob-storage.test.ts` | ✅ | ✅ green |
| 05-00-06 | 00 | 0 | RECR-01 | unit | `npx vitest run tests/recurring/setup.test.ts` | ✅ | ✅ green |
| 05-00-07 | 00 | 0 | RECR-02 | unit | `npx vitest run tests/recurring/list.test.ts` | ✅ | ✅ green |
| 05-00-08 | 00 | 0 | RECR-03 | unit | `npx vitest run tests/recurring/generate.test.ts` | ✅ | ✅ green |
| 05-00-09 | 00 | 0 | RECR-04 | unit | `npx vitest run tests/recurring/edit-stop.test.ts` | ✅ | ✅ green |
| 05-00-10 | 00 | 0 | RECR-05 | unit | `npx vitest run tests/recurring/generated-link.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dashboard/chart-data.test.ts` — DASH-03 chart data transformation (3 tests)
- [x] `tests/audit/field-diff.test.ts` — AUDT-02 formatFieldDiffs logic (3 tests)
- [x] `tests/attachments/upload.test.ts` — ATTCH-01 upload validation (4 tests)
- [x] `tests/attachments/list.test.ts` — ATTCH-02 ordering and empty state (2 tests)
- [x] `tests/attachments/blob-storage.test.ts` — ATTCH-03 Vercel Blob put/del (2 tests)
- [x] `tests/recurring/setup.test.ts` — RECR-01 setup schema validation (1 test)
- [x] `tests/recurring/list.test.ts` — RECR-02 status computation (2 tests)
- [x] `tests/recurring/generate.test.ts` — RECR-03 date advancement and JE payload (2 tests)
- [x] `tests/recurring/edit-stop.test.ts` — RECR-04 patch schema and stop payload (3 tests)
- [x] `tests/recurring/generated-link.test.ts` — RECR-05 templateId and description marker (2 tests)

**Total: 24 tests across 10 files — all green**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile responsiveness at 375px | UI-02 | Visual inspection required — no horizontal overflow, no clipped content | Open each page in browser devtools at 375px width, verify no horizontal scroll, all content visible |
| Chart tooltips and click drill-down | DASH-03 | Interactive behavior requires visual verification | Hover charts for tooltip values, click pie slices/bars to verify navigation |
| Attachment preview rendering | ATTCH-02 | Image thumbnails and PDF icon display are visual | Upload PDF and image, verify inline preview renders correctly on JE detail page |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — 10/10 gaps filled, 24/24 tests green
