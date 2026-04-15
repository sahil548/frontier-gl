import type { ParsedBankRow } from "@/lib/bank-transactions/csv-parser";

/**
 * Minimum shape needed to resolve a per-row `accountRef` (from the CSV Account
 * column) to a subledgerItem.id. Matches the projection the bank-transactions
 * POST route uses when fetching entity subledger items.
 */
export interface ResolvableSubledgerItem {
  id: string;
  name: string;
  account: { number: string } | null;
}

/**
 * A parsed row after multi-account resolution: carries the resolved
 * `subledgerItemId` alongside the original row fields.
 */
export type ResolvedBankRow = ParsedBankRow & { subledgerItemId: string };

/**
 * Normalizes a string for case-insensitive comparison.
 * Trim + lowercase — mirrors the normalization used elsewhere in the import
 * pipeline (column-mapping-store, csv-column-map fingerprint matching).
 */
function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Resolves per-row accountRef values to subledgerItem.id by matching against
 * the provided `items`. Unresolved rows are reported as error strings rather
 * than silently dropped or causing the whole batch to fail.
 *
 * @param rows          Parsed CSV rows (with accountRef populated by parser)
 * @param items         Active subledger items for the entity (prefetched once)
 * @param matchBy       "name"   — match against subledgerItem.name (case-insensitive)
 *                      "number" — match against item.account.number
 * @returns An object with `resolved` (rows carrying subledgerItemId) and
 *          `errors` (human-readable descriptions for unresolved rows).
 *
 * Phase 12-09: Caller (bank-transactions POST) consumes `resolved` to run
 * duplicate-check and createMany per subledgerItem, and passes `errors`
 * through unchanged in the response envelope so the UI can surface them.
 */
export function resolveAccountRefs(
  rows: ParsedBankRow[],
  items: ResolvableSubledgerItem[],
  matchBy: "name" | "number"
): { resolved: ResolvedBankRow[]; errors: string[] } {
  // Build the lookup map once per request.
  const map = new Map<string, string>();
  for (const item of items) {
    if (matchBy === "name") {
      const key = norm(item.name);
      if (key) map.set(key, item.id);
    } else {
      // matchBy === "number" — skip items without a linked account.
      const num = item.account?.number;
      if (!num) continue;
      const key = norm(num);
      if (key) map.set(key, item.id);
    }
  }

  const resolved: ResolvedBankRow[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const ref = row.accountRef;
    const key = norm(ref);
    if (!key) {
      errors.push(
        `Row "${row.description}": Account column value is blank (cannot resolve)`
      );
      continue;
    }
    const subId = map.get(key);
    if (!subId) {
      errors.push(
        `Row "${row.description}": no subledger item matches "${ref ?? ""}"`
      );
      continue;
    }
    resolved.push({ ...row, subledgerItemId: subId });
  }

  return { resolved, errors };
}
