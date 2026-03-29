---
phase: 06-qbo-parity-ii-class-tracking
verified: 2026-03-29T12:30:00Z
status: gaps_found
score: 17/20 must-haves verified
re_verification: false
gaps:
  - truth: "Income statement-by-dimension and TB dimension filter test files exist and cover CLASS-03/04/05"
    status: failed
    reason: "Plan 03 listed income-statement-by-dimension.test.ts, tb-dimension-filter.test.ts, and unclassified-entries.test.ts as deliverables and verify commands. None of the three files exist in tests/dimensions/."
    artifacts:
      - path: "tests/dimensions/income-statement-by-dimension.test.ts"
        issue: "MISSING — file does not exist"
      - path: "tests/dimensions/tb-dimension-filter.test.ts"
        issue: "MISSING — file does not exist"
      - path: "tests/dimensions/unclassified-entries.test.ts"
        issue: "MISSING — file does not exist"
    missing:
      - "Create tests/dimensions/income-statement-by-dimension.test.ts covering CLASS-03 (P&L column-per-tag query logic, tags array in response, Unclassified bucket)"
      - "Create tests/dimensions/tb-dimension-filter.test.ts covering CLASS-04 (INNER JOIN AND logic, zero-balance HAVING exclusion)"
      - "Create tests/dimensions/unclassified-entries.test.ts covering CLASS-05 (entries without dimension tags are unaffected)"
human_verification:
  - test: "Split assistant UX flow"
    expected: "Opening JE form, tagging a line with a dimension, clicking the split button opens the SplitAssistant dialog with a percentage input; confirming creates two lines with proportional debit/credit amounts"
    why_human: "Interactive dialog flow with state transitions — cannot verify split math propagation through useFieldArray programmatically"
  - test: "Dimension combobox keyboard navigation in JE form"
    expected: "Tab into dimension column, type to filter, arrow keys navigate list, Enter selects tag, focus advances to next column"
    why_human: "Full keyboard interaction requires a running browser environment"
  - test: "P&L column-per-tag responsive layout with many tags"
    expected: "With 5+ tags, the Income Statement shows horizontal scroll, all tag columns render, Account column is sticky left, column totals equal the Total column"
    why_human: "Visual layout and scroll behavior require a running browser environment"
  - test: "Inline quick-create tag from JE form combobox"
    expected: "Clicking 'New {DimensionName}' in the dimension combobox opens the TagForm Sheet; after save the new tag is selected and the cache is invalidated"
    why_human: "Sheet open/close and cache invalidation require a running browser with network calls"
---

# Phase 6: QBO Parity II — Multi-Dimensional Tagging Verification Report

**Phase Goal:** Accountants can tag journal entry lines with a class (fund, property, department) and slice the P&L by class — the last major structural feature separating Frontier GL from QBO Ledger. User expanded scope to full multi-dimensional tagging system with user-defined dimension types.
**Verified:** 2026-03-29T12:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | User can create a dimension type (e.g., Fund) for an entity | VERIFIED | `POST /api/entities/[entityId]/dimensions` route exists, entity-scoped via `findAccessibleEntity`, validated with `createDimensionSchema` |
| 2  | User can create tags within a dimension | VERIFIED | `POST /api/entities/[entityId]/dimensions/[dimensionId]/tags/route.ts` exists; `createTagSchema` enforces code/name constraints |
| 3  | User can deactivate a tag without deleting it | VERIFIED | `DELETE` on tag route sets `isActive: false` (line 131 of tags/[tagId]/route.ts); deactivating a dimension cascades to all child tags |
| 4  | User can see all dimensions and their tags on the /dimensions page | VERIFIED | `dimension-page.tsx` fetches `?all=true`, renders shadcn Accordion with AccordionItem per dimension, TagTable in AccordionContent |
| 5  | Dimension and tag data is entity-scoped | VERIFIED | All API routes extract `entityId` from URL params and call `findAccessibleEntity`; queries filter by `entityId` |
| 6  | Each active dimension appears as a combobox column in the JE line items table | VERIFIED | `je-line-items.tsx` imports and renders `DimensionCombobox` per active dimension per line (lines 10, 227, 348) |
| 7  | User can select a tag for any dimension on each line item | VERIFIED | `DimensionCombobox` fetches tags from `/api/entities/{entityId}/dimensions/{dimensionId}/tags`, wires to `lineItems[i].dimensionTags.{dimensionId}` in form state |
| 8  | User can quick-create a tag from within the JE form combobox | VERIFIED | `dimension-combobox.tsx` imports `TagForm`, renders it in a Sheet on "New {dimensionName}" click (lines 19, 164–182) |
| 9  | Split assistant offers to split a line when two tags from same dimension are needed | VERIFIED | `SplitAssistant` imported and rendered in `je-line-items.tsx` (lines 11, 440); uses Decimal.js per summary |
| 10 | Dimension tags are persisted with the journal entry | VERIFIED | JE POST route creates `JournalEntryLineDimensionTag` junction records (lines 245–257 of journal-entries/route.ts); nested within Prisma transaction |
| 11 | Existing JE lines without dimension tags display empty cells | VERIFIED | `dimensionTags` defaults to `{}` in `lineItemSchema`; no junction records created; form renders empty comboboxes |
| 12 | JE lines with dimension tags load correctly when editing a draft | VERIFIED | GET `[journalEntryId]/route.ts` includes `dimensionTags` with `dimensionTag.dimension` relation; maps to `{dimensionId: tagId}` format (lines 85–110) |
| 13 | Income Statement has a 'View by' dimension picker that shows column-per-tag layout | VERIFIED | `income-statement-view.tsx` has `selectedDimensionId` state, "View by" Select at line 490, re-fetches with `dimensionId` param |
| 14 | P&L columns include one per tag plus Unclassified plus Total, and they reconcile | VERIFIED | `income-statement-view.tsx` line 179: `colCount = tags.length + 4`; "Unclassified" column explicit at line 609; LEFT JOIN in `getIncomeStatementByDimension` |
| 15 | Trial balance can be filtered by dimension tag with AND logic across dimensions | VERIFIED | `trial-balance-queries.ts` builds one INNER JOIN per filter (INNER JOIN enforces AND logic), dynamic aliases `jeldt0`, `jeldt1` etc. |
| 16 | TB dimension filters work alongside existing entity and date filters | VERIFIED | `trial-balance/page.tsx` passes `dimensionFilters` alongside `entityId`/`asOfDate`; `getConsolidatedTrialBalance` also accepts `dimensionFilters` |
| 17 | Unclassified entries appear correctly in P&L and are included in TB when no filter active | VERIFIED (partial) | LEFT JOIN in `getIncomeStatementByDimension` puts NULL tag_id rows into Unclassified bucket; no `dimensionFilters` means no INNER JOINs applied. Test coverage for this behaviour is MISSING. |
| 18 | Cash/accrual toggle works independently of dimension slicing on P&L | VERIFIED | `IncomeStatementView` accepts `basis` prop independently; both `basis` and `selectedDimensionId` passed in the same fetch (line 325, 328) |
| 19 | Unit tests for P&L column-per-tag logic exist | FAILED | `tests/dimensions/income-statement-by-dimension.test.ts` does not exist |
| 20 | Unit tests for TB dimension filtering and unclassified entries exist | FAILED | `tests/dimensions/tb-dimension-filter.test.ts` and `tests/dimensions/unclassified-entries.test.ts` do not exist |

**Score:** 17/20 truths verified (2 failed outright, 1 partial with missing test coverage)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `prisma/schema.prisma` | VERIFIED | `model Dimension` (line 291), `model DimensionTag` (line 307), `model JournalEntryLineDimensionTag` (line 326); `dimensions Dimension[]` on Entity (line 42); `dimensionTags JournalEntryLineDimensionTag[]` on JournalEntryLine (line 126) |
| `src/lib/validators/dimension.ts` | VERIFIED | 59 lines; exports `createDimensionSchema`, `updateDimensionSchema`, `createTagSchema`, `updateTagSchema` and all inferred types |
| `src/app/api/entities/[entityId]/dimensions/route.ts` | VERIFIED | Exports `GET` and `POST`; entity-scoped; `createDimensionSchema` validation |
| `src/app/(auth)/dimensions/page.tsx` | VERIFIED | File exists; renders `DimensionPage` client component |
| `src/components/dimensions/dimension-page.tsx` | VERIFIED | 243 lines; fetches `?all=true`, accordion layout, entity-scoped via `useEntityContext` |
| `src/components/dimensions/dimension-form.tsx` | VERIFIED | Exists; POST/PUT on submit based on `isEdit` flag |
| `src/components/dimensions/tag-form.tsx` | VERIFIED | Exists |
| `src/components/dimensions/tag-table.tsx` | VERIFIED | Exists |
| `src/lib/validators/dimension.test.ts` | VERIFIED | 80 lines, 11 test cases covering create/update schemas |
| `src/components/layout/sidebar.tsx` | VERIFIED | `{ href: "/dimensions", label: "Dimensions", icon: Tags }` at line 45 |

### Plan 02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/components/journal-entries/dimension-combobox.tsx` | VERIFIED | 187 lines (min 60 required); Popover+Command pattern; module-level cache; TagForm quick-create wired |
| `src/components/journal-entries/split-assistant.tsx` | VERIFIED | 143 lines (min 40 required); Dialog with percentage input and Decimal.js |
| `src/lib/validators/journal-entry.ts` | VERIFIED | `dimensionTags: z.record(z.string(), z.string()).optional().default({})` at line 36 |
| `tests/dimensions/je-dimension-tags.test.ts` | VERIFIED | 325 lines; exists in tests/dimensions/ |

### Plan 03 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/queries/report-queries.ts` | VERIFIED | Contains `dimensionId` parameter; `getIncomeStatementByDimension` with LEFT JOIN at lines 172–173 |
| `src/lib/queries/trial-balance-queries.ts` | VERIFIED | Contains `dimensionFilters`; INNER JOIN AND logic; HAVING clause for zero-balance exclusion at lines 104, 232 |
| `src/components/reports/income-statement-view.tsx` | VERIFIED | Exists; "View by" Select, column-per-tag layout, Unclassified column, CSV export with tag columns |
| `src/app/(auth)/reports/income-statement/page.tsx` | VERIFIED | Exists |
| `tests/dimensions/income-statement-by-dimension.test.ts` | MISSING | File does not exist |
| `tests/dimensions/tb-dimension-filter.test.ts` | MISSING | File does not exist |
| `tests/dimensions/unclassified-entries.test.ts` | MISSING | File does not exist |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dimension-page.tsx` | `/api/entities/{entityId}/dimensions` | fetch on mount | WIRED | Line 65: `` `/api/entities/${currentEntityId}/dimensions?all=true` `` |
| `dimension-form.tsx` | `/api/entities/{entityId}/dimensions` | POST on submit | WIRED | Lines 83–88: `method = isEdit ? "PUT" : "POST"`, `fetch(url, { method })` |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `je-line-items.tsx` | `dimension-combobox.tsx` | renders DimensionCombobox per active dimension per line | WIRED | Lines 10 (import), 227, 348 (render) |
| `journal-entries/route.ts` | `prisma.journalEntryLineDimensionTag` | creates junction rows on JE create | WIRED | Lines 245–257: nested `dimensionTags: { create: ... }` within transaction |

### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `income-statement-view.tsx` | `/api/.../income-statement` | fetch with dimensionId query param | WIRED | Lines 327–328: `params.set("dimensionId", selectedDimensionId)` |
| `report-queries.ts` | `journal_entry_line_dimension_tags` | LEFT JOIN for dimension grouping | WIRED | Lines 172–173: `LEFT JOIN journal_entry_line_dimension_tags jeldt ON ...` |
| `trial-balance-queries.ts` | `journal_entry_line_dimension_tags` | INNER JOIN for dimension filtering | WIRED | Lines 61–64: `INNER JOIN journal_entry_line_dimension_tags jeldt${i} ON ...` |

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| CLASS-01 | 06-01 | User can define classes (Fund, Property, Department) per entity | SATISFIED | Dimension model, CRUD API, /dimensions management page all exist and are entity-scoped |
| CLASS-02 | 06-02 | User can tag individual JE line items with a class | SATISFIED | DimensionCombobox columns in JE form, junction table persisted on create/update/read |
| CLASS-03 | 06-03 | Income Statement can be filtered and segmented by class (column per class) | SATISFIED (no test coverage) | `getIncomeStatementByDimension`, column-per-tag UI, "View by" picker all exist; test file missing |
| CLASS-04 | 06-03 | Trial balance can be filtered by class | SATISFIED (no test coverage) | INNER JOIN AND logic, per-dimension filter dropdowns in TB page, HAVING for zero-balance exclusion; test file missing |
| CLASS-05 | 06-01, 06-02, 06-03 | Class field is optional — unclassified entries continue to work normally | SATISFIED (no test coverage) | `dimensionTags` defaults to `{}`; no filters = existing query unchanged; unclassified entries show in P&L Unclassified column; test file missing |

All five CLASS requirements are addressed in the codebase. Three are missing automated test coverage (CLASS-03, CLASS-04, CLASS-05) — the plan specified test files that were not created.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `tests/dimensions/` | Missing test files: `income-statement-by-dimension.test.ts`, `tb-dimension-filter.test.ts`, `unclassified-entries.test.ts` | Warning | Plan 03 verify commands reference these files; SQL query logic for dimension slicing has no automated regression protection |

No stub implementations, TODO/FIXME markers, empty handlers, or placeholder returns were found in any of the production files.

---

## Human Verification Required

### 1. Split Assistant UX Flow

**Test:** Open the JE form, add a line item, assign a dimension tag via the combobox, then click the split icon button on that line. Enter a percentage in the split dialog and confirm.
**Expected:** Two new line items replace the original, each with the proportional debit/credit amount (e.g., 60%/40% split), and each with a distinct dimension tag pre-selected.
**Why human:** The SplitAssistant dialog + `useFieldArray` mutation + resulting line state requires a running browser; the math correctness depends on Decimal.js and state propagation that cannot be traced via static grep.

### 2. Dimension Combobox Keyboard Navigation

**Test:** In the JE form, press Tab to reach a dimension combobox column. Type a partial tag name, use arrow keys to navigate, press Enter to select.
**Expected:** Search filters the list in real-time, keyboard navigation highlights items, Enter selects and closes the popover, focus advances to the next field.
**Why human:** Full keyboard interaction and focus management require a running browser.

### 3. P&L Column-Per-Tag Layout with Many Tags

**Test:** Create a dimension with 5+ active tags. Open Income Statement, select that dimension in the "View by" picker.
**Expected:** One column per tag appears (plus Unclassified and Total), horizontal scroll is available, the Account column is sticky on the left, each row's tag values sum to the Total column value.
**Why human:** Visual layout, scroll behaviour, and column alignment require a running browser.

### 4. Inline Quick-Create Tag from JE Form Combobox

**Test:** In a JE form dimension combobox, click the "New [DimensionName]" option at the bottom of the list.
**Expected:** The TagForm Sheet opens. After saving a new tag, the Sheet closes, the new tag appears selected in the combobox, and the tag is available for other lines without a page reload.
**Why human:** Sheet open/close lifecycle, cache invalidation, and re-render of the newly created option require a running browser with network calls.

---

## Gaps Summary

Three test files specified in Plan 03's `<verify>` blocks and listed as VALIDATION.md Wave 0 requirements were not created:

- `tests/dimensions/income-statement-by-dimension.test.ts` (CLASS-03)
- `tests/dimensions/tb-dimension-filter.test.ts` (CLASS-04)
- `tests/dimensions/unclassified-entries.test.ts` (CLASS-05)

The production SQL queries and UI components for these features are substantive and wired — the goal is functionally achieved at the code level. However, the reporting layer (LEFT JOIN dimension slicing, INNER JOIN AND filtering, HAVING zero-balance exclusion) contains non-trivial SQL logic with no automated regression protection. A future schema or query change could silently break dimension-sliced reports.

The `je-dimension-tags.test.ts` (CLASS-02, 325 lines) was created and does exist, so the pattern is established — the three missing files follow a similar test structure against query functions.

---

_Verified: 2026-03-29T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
