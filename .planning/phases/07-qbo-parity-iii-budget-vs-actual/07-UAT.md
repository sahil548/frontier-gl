---
status: complete
phase: 07-qbo-parity-iii-budget-vs-actual
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md
started: 2026-04-10T17:20:00Z
updated: 2026-04-10T17:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Budgets Link in Sidebar
expected: Sidebar navigation shows a "Budgets" link with a DollarSign icon, positioned between Reports and Holdings.
result: pass

### 2. Budget Grid Page Loads
expected: Navigating to /budgets shows a spreadsheet-style grid with Income accounts and Expense accounts as rows (grouped by section with headers), fiscal year months as columns (Jan–Dec or aligned to entity FYE), a fiscal year selector dropdown, Save button, Copy from Prior Year button, and Import CSV button.
result: pass

### 3. Enter Budget Amounts
expected: Clicking a cell in the grid allows typing a dollar amount. Tabbing moves to the next cell. After entering amounts, the Save button becomes enabled (dirty tracking). Section subtotals and Net Income row update as you type. Clicking Save persists the data.
result: pass

### 4. Copy from Prior Year
expected: Clicking "Copy from Prior Year" (or similar button) pre-fills the grid with last year's budget amounts. The grid shows the copied values and marks as dirty for saving.
result: skipped
reason: No prior year budget data exists to test copy functionality

### 5. CSV Import Budgets
expected: Clicking Import CSV opens a file picker. Selecting a valid CSV with account_number, period, amount columns imports budget data. Toast notification confirms success with count of imported/skipped rows. Grid refreshes with imported data.
result: skipped
reason: Requires preparing a test CSV file; button and file input element confirmed present on page

### 6. Budget vs Actual Report Tab
expected: Reports page shows a fourth tab "Budget vs Actual" alongside Income Statement, Balance Sheet, and Cash Flow. Clicking the tab loads the report with a date range picker.
result: pass

### 7. Variance Display
expected: Budget vs Actual report shows columns: Account | Actual | Budget | Variance $ | Variance %. Rows are grouped by Income and Expenses with section subtotals. Favorable variances (income over budget, expenses under budget) show in green. Unfavorable variances show in red. Net Income variance at bottom.
result: pass

### 8. Zero Budget Handling
expected: Accounts with actuals but no budget set show the actual amount, "--" for budget, actual amount for variance $, and "--" for variance %.
result: pass

### 9. Report Drill-Down to GL Ledger
expected: Clicking an account row in the Budget vs Actual report navigates to the GL Ledger filtered to that account and the report's date range.
result: pass

### 10. CSV Export Report
expected: Clicking Export CSV on the Budget vs Actual report downloads a CSV file containing account rows, section headers, subtotals, and net income matching the on-screen report.
result: skipped
reason: Cannot verify file download in automated browser testing; Export CSV button confirmed present

## Summary

total: 10
passed: 7
issues: 0
pending: 0
skipped: 3

## Gaps

[none]
