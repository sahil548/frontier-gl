---
phase: 12-reporting-fixes-onboarding-wizard
plan: 04
subsystem: api, ui, llm
tags: [anthropic-sdk, csv, llm, column-mapping, prisma, papaparse]

# Dependency graph
requires:
  - phase: 12-01
    provides: "ColumnMapping model and Entity.wizardProgress field"
provides:
  - "inferColumnMapping LLM-based CSV column detection with graceful fallback"
  - "column-mapping-store CRUD for saved mappings per entity+source+type"
  - "csv-column-map API endpoint (saved -> LLM -> heuristic fallback chain)"
  - "column-mappings API endpoint (GET/POST for saved mapping persistence)"
  - "ColumnMappingUI confirmation component with role dropdowns and source badge"
  - "All three CSV import flows (bank, COA, budget) show mapping confirmation"
affects: [12-05]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk"]
  patterns:
    - "LLM inference with graceful null fallback on missing API key or error"
    - "Fallback chain: saved mapping -> LLM inference -> heuristic pattern matching"
    - "Mapping confirmation UI between file selection and import execution"

key-files:
  created:
    - "src/lib/bank-transactions/llm-column-mapper.ts"
    - "src/lib/bank-transactions/column-mapping-store.ts"
    - "src/app/api/entities/[entityId]/csv-column-map/route.ts"
    - "src/app/api/entities/[entityId]/column-mappings/route.ts"
    - "src/components/csv-import/column-mapping-ui.tsx"
  modified:
    - "src/lib/bank-transactions/csv-parser.ts"
    - "src/validators/bank-transaction.ts"
    - "src/app/api/entities/[entityId]/bank-transactions/route.ts"
    - "src/app/(auth)/bank-feed/page.tsx"
    - "src/app/(auth)/budgets/page.tsx"
    - "src/components/settings/coa-import-dialog.tsx"
    - "src/__tests__/utils/llm-column-mapper.test.ts"
    - "src/__tests__/api/column-mappings.test.ts"

key-decisions:
  - "Anthropic SDK mock uses function constructor pattern for vitest compatibility"
  - "Heuristic patterns duplicated in csv-column-map API route for import-type-specific detection"
  - "ColumnMappingUI fetches mapping from API on mount, falls back to empty mapping on error"
  - "detectColumns exported from csv-parser for heuristic fallback reuse"

patterns-established:
  - "LLM graceful fallback: check env var first, wrap API call in try/catch, return null on any failure"
  - "Mapping confirmation step between file selection and import execution across all CSV flows"
  - "Source badge pattern: saved/AI-detected/auto-detected/manual to communicate mapping origin"

requirements-completed: [CSV-01, CSV-02, CSV-03, CSV-04]

# Metrics
duration: 11min
completed: 2026-04-12
---

# Phase 12 Plan 04: LLM-Powered CSV Column Detection Summary

**Anthropic SDK-based column inference with saved/LLM/heuristic fallback chain, confirmation UI, and integration across bank, COA, and budget import flows**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-12T21:23:59Z
- **Completed:** 2026-04-12T21:35:28Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- LLM column mapper using Anthropic SDK with 10s timeout and graceful null fallback when API key missing or API errors
- Column mapping store with getSavedMapping/saveMapping CRUD via Prisma ColumnMapping model
- Two API endpoints: csv-column-map (inference with fallback chain) and column-mappings (GET/POST for saved mappings)
- ColumnMappingUI component with role-to-header dropdown mapping, sample data preview, source badge, and optional source name save
- All three CSV import flows (bank feed, COA import dialog, budget page) show mapping confirmation UI before proceeding
- 12 tests passing (8 LLM mapper + 4 mapping store)

## Task Commits

Each task was committed atomically:

1. **Task 1: LLM column mapper, mapping store, and API endpoints** - `5a87310` (feat) -- TDD: 12 tests passing
2. **Task 2: Column mapping confirmation UI and CSV import integration** - `dc384a0` (feat)

## Files Created/Modified
- `src/lib/bank-transactions/llm-column-mapper.ts` - Anthropic SDK-based inferColumnMapping with env check and timeout
- `src/lib/bank-transactions/column-mapping-store.ts` - getSavedMapping/saveMapping CRUD via Prisma
- `src/app/api/entities/[entityId]/csv-column-map/route.ts` - POST endpoint: saved -> LLM -> heuristic fallback
- `src/app/api/entities/[entityId]/column-mappings/route.ts` - GET/POST for saved mapping persistence
- `src/components/csv-import/column-mapping-ui.tsx` - Mapping confirmation UI with dropdowns and source badge
- `src/lib/bank-transactions/csv-parser.ts` - Exported detectColumns, added optional columnMapping parameter
- `src/validators/bank-transaction.ts` - Extended csvImportSchema with optional columnMapping
- `src/app/api/entities/[entityId]/bank-transactions/route.ts` - Passes columnMapping through to parser
- `src/app/(auth)/bank-feed/page.tsx` - Shows ColumnMappingUI before CSV import
- `src/app/(auth)/budgets/page.tsx` - Shows ColumnMappingUI before budget CSV import
- `src/components/settings/coa-import-dialog.tsx` - Shows ColumnMappingUI between file upload and import
- `src/__tests__/utils/llm-column-mapper.test.ts` - 8 tests for LLM mapper (mock, fallback, parse)
- `src/__tests__/api/column-mappings.test.ts` - 4 tests for mapping store (CRUD, upsert)

## Decisions Made
- Anthropic SDK mock uses function constructor pattern (`function Anthropic()`) for vitest mock compatibility
- Heuristic column patterns duplicated in csv-column-map API route for COA/budget import types (bank patterns already in csv-parser.ts)
- ColumnMappingUI fetches mapping from API on mount when no initialMapping provided; silently falls back to empty mapping on error
- detectColumns exported from csv-parser.ts to allow reuse as heuristic fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**External services require manual configuration.**
- **ANTHROPIC_API_KEY**: Required for LLM-powered column detection. Without it, the system gracefully falls back to heuristic pattern matching. Obtain from Anthropic Console -> API Keys (https://console.anthropic.com/settings/keys).

## Next Phase Readiness
- All CSV import flows now show mapping confirmation UI
- Saved mappings work for repeat imports from the same source
- Missing ANTHROPIC_API_KEY does not break any import flow (graceful fallback)
- Ready for onboarding wizard (Plan 05) which will use these CSV import flows

## Self-Check: PASSED
- All 7 created files exist
- Both commit hashes (5a87310, dc384a0) found in git log
- detectColumns exported from csv-parser.ts
- columnMapping field present in csvImportSchema
- ColumnMappingUI integrated in bank-feed, budgets, and COA dialog

---
*Phase: 12-reporting-fixes-onboarding-wizard*
*Completed: 2026-04-12*
