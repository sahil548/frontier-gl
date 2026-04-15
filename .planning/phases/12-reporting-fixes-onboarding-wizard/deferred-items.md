# Deferred Items

Out-of-scope discoveries logged during plan execution. Not auto-fixed because they pre-existed and are in files unrelated to the current task.

## Discovered during 12-08 (Rate-Target Holdings Filter)

**1. Pre-existing TypeScript strictness errors in budgets/page.tsx**
- **Files:** `src/app/(auth)/budgets/page.tsx` (lines near 746/775, previously 735/761)
- **Error:** `Type 'Dispatch<SetStateAction<string>>' is not assignable to type '(value: string | null, eventDetails: SelectRootChangeEventDetails) => void'`
- **Context:** `<Select onValueChange={setSelectedHoldingId}>` — the shadcn/base-ui Select types emit `string | null` but React useState setter expects `string`.
- **Why deferred:** Pre-existed before 12-08 (verified via `git stash` + `tsc --noEmit`). Touching this would change every Select onValueChange call site in the codebase.

**2. Pre-existing test file type errors (opening-balance.test.ts)** — RESOLVED in 12-07
- **Files:** `src/__tests__/utils/opening-balance.test.ts` lines 113, 130, 144
- **Error:** `Argument of type 'string' is not assignable to parameter of type 'Date'`
- **Resolution:** Fixed in 12-07 by changing `generateOpeningBalanceJE` signature from `jeDate: Date` to `jeDate: string` to eliminate the UTC/local timezone shift. Tests now assert the string passes through unchanged.

**3. Pre-existing SerializedAccount type duplication**
- **Files:** `src/app/(auth)/accounts/page.tsx:122`, `src/components/accounts/account-table.tsx:324/326/528/530`
- **Error:** `Two different types with this name exist, but they are unrelated.` (missing `cashFlowCategory`, `isContra`)
- **Why deferred:** Pre-existing duplicate type definition. Out of scope for 12-08 (budgets).

**4. Pre-existing wizard-progress JSON types** — RESOLVED in 12-07
- **Files:** `src/app/api/entities/[entityId]/wizard-progress/route.ts:99`
- **Error:** `Record<string, unknown>` not assignable to Prisma JSON input type.
- **Resolution:** Fixed in 12-07 (Rule 3 blocking issue) by casting to `Prisma.InputJsonValue` in both GET backfill write and PATCH merge write.

**5. Pre-existing test infra failure (use-entity.test.ts)**
- **Files:** `src/__tests__/hooks/use-entity.test.ts:49, 111`
- **Error:** `TypeError: localStorage.clear is not a function` (jsdom setup issue)
- **Why deferred:** Test infrastructure bug unrelated to budgets.

**6. Pre-existing column-mapping-ui type error**
- **Files:** `src/components/csv-import/column-mapping-ui.tsx:218`
- **Error:** `Argument of type 'string | null' is not assignable to parameter of type 'string'`
- **Why deferred:** Plan 12-04 (CSV column mapping) territory.

**7. Pre-existing blob-storage test mock type**
- **Files:** `tests/attachments/blob-storage.test.ts:35, 43`
- **Error:** Vitest Mock constructable type mismatch.
- **Why deferred:** Unrelated attachment subsystem test.
