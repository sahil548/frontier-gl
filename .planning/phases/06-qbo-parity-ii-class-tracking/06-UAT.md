---
status: testing
phase: 06-qbo-parity-ii-class-tracking
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-03-29T12:15:00Z
updated: 2026-03-29T12:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Dimensions Page Navigation
expected: |
  Click "Dimensions" in the sidebar. The /dimensions page loads showing either an empty state or any previously created dimensions in an accordion layout.
awaiting: user response

## Tests

### 1. Dimensions Page Navigation
expected: Click "Dimensions" in the sidebar. The /dimensions page loads showing either an empty state or any previously created dimensions in an accordion layout.
result: pass

### 2. Create a Dimension Type
expected: Click "New Dimension" button at the top of the /dimensions page. A slide-over panel opens. Enter a name (e.g., "Fund"). Save. The new dimension appears as an accordion section on the page.
result: [pending]

### 3. Create Tags Within a Dimension
expected: Expand the "Fund" accordion section. Click "New Tag" within it. Slide-over opens with fields for code, name, description. Create a tag (e.g., code "FND1", name "Fund I"). Save. Tag appears in the table within the accordion section. Create at least 2 more tags.
result: [pending]

### 4. Edit and Deactivate a Tag
expected: In the tag table, click edit on a tag. Slide-over opens pre-filled. Toggle the active/inactive switch to deactivate. Save. Tag shows inactive status in the table.
result: [pending]

### 5. JE Form Shows Dimension Columns
expected: Go to Journal Entries > New. The line items table shows a "Fund" column (or whatever dimension you created) between Account and Debit columns. Each line has a searchable combobox for that dimension.
result: [pending]

### 6. Tag a JE Line via Dimension Combobox
expected: On a JE line, click the dimension combobox. Type to search tags. Select "Fund I". The tag appears selected in the cell. Save the JE as draft. Reopen it — the tag is still there.
result: [pending]

### 7. Inline Quick-Create Tag from JE Form
expected: On a JE line dimension combobox, scroll to bottom of dropdown. A "New [Dimension Name]" option appears. Click it. A slide-over opens to create a new tag without leaving the JE form. After saving, the new tag is auto-selected in the combobox.
result: [pending]

### 8. Split Assistant for Allocation
expected: On a JE line that already has a dimension tag, click the split icon. A dialog appears asking for allocation percentage. Enter 60%. Two lines are created: one with 60% of the original amount keeping the original tag, and one with 40% — you can then assign a different tag to the second line.
result: [pending]

### 9. Income Statement "View by" Dimension
expected: Go to Reports > Income Statement. A "View by" dropdown appears (defaulting to "None"). Select your dimension (e.g., "Fund"). The P&L reorganizes into columns: one per tag (Fund I, Fund II, etc.) + "Unclassified" + "Total". Amounts from tagged JE lines appear in their respective tag columns.
result: [pending]

### 10. P&L Cash/Accrual with Dimension View
expected: While viewing Income Statement by a dimension, toggle between Cash and Accrual basis. The column-per-tag layout remains but amounts update according to the selected basis. Both toggles work independently.
result: [pending]

### 11. Trial Balance Dimension Filtering
expected: Go to Trial Balance. Per-dimension filter dropdowns appear in the filter bar. Select a tag from one dimension (e.g., "Fund I"). The TB filters to show only accounts with transactions tagged "Fund I". Zero-balance accounts are hidden. The verification check (debits = credits) applies to the filtered subset.
result: [pending]

### 12. Existing Entries Without Dimension Tags
expected: View a journal entry created before dimensions existed (or one where you didn't tag lines). Dimension columns show empty cells — no errors, no "Unclassified" markers. The entry works normally. Reports without dimension parameters display exactly as before.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
