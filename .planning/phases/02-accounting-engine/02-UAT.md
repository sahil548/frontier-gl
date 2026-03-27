---
status: resolved
phase: 02-accounting-engine
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-03-27T01:30:00Z
updated: 2026-03-27T01:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. COA Page — View Accounts
expected: Navigate to /accounts. Indented table shows ~42 template accounts. Parents at top level, sub-accounts indented beneath. Columns: number, name, type, balance.
result: pass

### 2. COA — Search and Filter
expected: Type a search term in the search bar — table filters. Click a type filter chip — only that type shows. Clear filters to see all.
result: pass

### 3. COA — Create New Account
expected: Click Add Account. Slide-over opens. Fill in name, number (auto-suggested), type, optional parent. Submit. New account appears in table.
result: issue
reported: "Slide-over blurs the COA table instead of letting user see it alongside. Parent account dropdown shows top-level category accounts (10000 Assets, 20000 Liabilities, etc.) which are account groups, not meaningful parents. These are section headers determined by type — the parent dropdown should only show mid-level accounts like Private Equity Investments that a sub-account would roll up into. Nobody posts to account 10000."
severity: major

### 4. COA — Edit Account
expected: Hover over row — edit icon appears. Click it. Slide-over opens pre-filled. Change name or description. Save. Table updates.
result: issue
reported: "Edit works but should not allow editing account number to less than 5 digits. Needs minimum digit validation."
severity: minor

### 5. COA — Deactivate Account
expected: Hover over row — kebab menu. Click Deactivate. Account disappears from active list.
result: pass

### 6. JE — Create and Save Draft
expected: Navigate to /journal-entries/new. Fill in date, description, 2+ line items with balanced debits/credits. Green Balanced indicator. Save Draft. Toast confirms. Redirects to saved entry with Draft status.
result: pass

### 7. JE — Account Combobox Search
expected: Click account selector. Searchable dropdown opens. Type partial number/name — filters in real-time. Select — shows "number name".
result: pass

### 8. JE — Live Balance Indicator
expected: Mismatched totals show red Unbalanced with difference. Approve/Post disabled. Balance them — green Balanced, buttons enable.
result: pass

### 9. JE — Approve Entry
expected: On Draft, click Approve. Transitions to Approved. Save Draft/Approve disappear, Post button shows.
result: pass

### 10. JE — Post Entry
expected: Click Post. Transitions to Posted. Read-only. Reverse button appears. Account balances update.
result: pass

### 11. JE — Posted Entry Immutability
expected: Posted entry — all fields disabled/read-only. No Save/Edit. Only Reverse available.
result: pass

### 12. JE — Reverse Posted Entry
expected: Click Reverse on Posted entry. New Draft created with swapped debits/credits. Redirects to reversal. Link to original.
result: pass

### 13. JE — List Page with Tabs
expected: /journal-entries shows Draft/Approved/Posted tabs with count badges. Switching filters list. Shows entry number, date, description, status.
result: pass

### 14. JE — Bulk Actions
expected: Select multiple entries via checkboxes. Floating action bar appears. Click Approve/Post Selected. Entries transition. List updates.
result: pass

### 15. JE — Audit Trail
expected: JE detail page has Audit Trail section. Shows timeline: CREATED, APPROVED, POSTED with timestamps.
result: pass

## Summary

total: 15
passed: 13
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Create account slide-over shows COA table alongside and parent dropdown only shows meaningful mid-level parent accounts"
  status: resolved
  reason: "Sheet made non-modal (no backdrop), parent filter changed to exclude only category headers (divisible by 10000) while showing all other active accounts."
  severity: major
  test: 3
  root_cause: "Sheet was modal with dark overlay. Parent filter used parentId===null which excluded mid-level accounts."
  artifacts: [src/components/ui/sheet.tsx, src/components/accounts/account-form.tsx]
  missing: []
  debug_session: ""

- truth: "Account number field validates minimum 5 digits on edit"
  status: resolved
  reason: "Validation changed from exactly 5 digits to minimum 5 digits. Error message shown inline on edit."
  severity: minor
  test: 4
  root_cause: "Regex was ^\d{5}$ (exactly 5). Changed to .min(5) + ^\d+$ (at least 5 digits)."
  artifacts: [src/lib/validators/account.ts, src/components/accounts/account-number-input.tsx]
  missing: []
  debug_session: ""
