import { describe, it, expect } from "vitest";
import {
  resolveAccountRefs,
  type ResolvableSubledgerItem,
} from "@/lib/bank-transactions/resolve-account-refs";
import type { ParsedBankRow } from "@/lib/bank-transactions/csv-parser";
import {
  csvImportSchema,
  isMultiAccountImport,
} from "@/validators/bank-transaction";

/**
 * Phase 12-09: Multi-account CSV import — integration-level behavior.
 *
 * The route extracts the pure resolver `resolveAccountRefs` which takes:
 *   - the parsed rows (with accountRef per row)
 *   - the entity's active subledger items (prefetched once)
 *   - matchBy: "name" | "number"
 *
 * ...and returns { resolved: rows-with-subledgerItemId, errors: string[] }.
 * This keeps the DB-binding in the route thin and lets us test the routing
 * logic without mocking Prisma end-to-end.
 */

const ITEMS: ResolvableSubledgerItem[] = [
  {
    id: "sub-chase",
    name: "Chase Checking",
    account: { number: "1010" },
  },
  {
    id: "sub-wells",
    name: "Wells Fargo Savings",
    account: { number: "1020" },
  },
  {
    id: "sub-no-account",
    name: "Petty Cash",
    account: null,
  },
];

describe("resolveAccountRefs — matchBy: name", () => {
  it("resolves each row to the subledgerItem whose name matches accountRef (exact)", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "A1", amount: -100, accountRef: "Chase Checking" },
      { date: "2026-01-06", description: "A2", amount: -50, accountRef: "Wells Fargo Savings" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "name");

    expect(errors).toEqual([]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].subledgerItemId).toBe("sub-chase");
    expect(resolved[1].subledgerItemId).toBe("sub-wells");
  });

  it("is case-insensitive + trims whitespace when matching by name", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "A1", amount: -100, accountRef: "  chase checking  " },
      { date: "2026-01-06", description: "A2", amount: -50, accountRef: "WELLS FARGO SAVINGS" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "name");

    expect(errors).toEqual([]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].subledgerItemId).toBe("sub-chase");
    expect(resolved[1].subledgerItemId).toBe("sub-wells");
  });
});

describe("resolveAccountRefs — matchBy: number", () => {
  it("resolves rows via linked account.number when matchBy='number'", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "A1", amount: -100, accountRef: "1010" },
      { date: "2026-01-06", description: "A2", amount: -50, accountRef: "1020" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "number");

    expect(errors).toEqual([]);
    expect(resolved[0].subledgerItemId).toBe("sub-chase");
    expect(resolved[1].subledgerItemId).toBe("sub-wells");
  });

  it("skips subledger items without a linked account when matchBy='number'", () => {
    // "Petty Cash" has no linked account — it should never match by number.
    // Row accountRef references a non-existent account number.
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "A1", amount: -100, accountRef: "9999" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "number");

    // "9999" does not match any subledger item's account.number.
    expect(resolved).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/no subledger item/i);
    expect(errors[0]).toContain("9999");
  });
});

describe("resolveAccountRefs — unresolved rows", () => {
  it("pushes rows with unknown accountRef to errors (not resolved)", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "Known", amount: -100, accountRef: "Chase Checking" },
      { date: "2026-01-06", description: "Unknown Row", amount: -50, accountRef: "DOES-NOT-EXIST" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "name");

    expect(resolved).toHaveLength(1);
    expect(resolved[0].subledgerItemId).toBe("sub-chase");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("DOES-NOT-EXIST");
    expect(errors[0]).toContain("Unknown Row");
  });

  it("pushes rows with blank accountRef to errors", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "Good", amount: -100, accountRef: "Chase Checking" },
      { date: "2026-01-06", description: "Blank Account", amount: -50, accountRef: "" },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "name");

    expect(resolved).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Blank Account");
  });

  it("handles undefined accountRef (defensive) as unresolved", () => {
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "Missing Ref", amount: -100 /* no accountRef */ },
    ];

    const { resolved, errors } = resolveAccountRefs(rows, ITEMS, "name");

    expect(resolved).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});

describe("csvImportSchema — route branching guard", () => {
  it("legacy body routes through isMultiAccountImport=false", () => {
    const parsed = csvImportSchema.parse({
      csv: "Date,Description,Amount\n2026-01-05,x,-1",
      subledgerItemId: "sub-1",
    });
    expect(isMultiAccountImport(parsed)).toBe(false);
  });

  it("multi-account body routes through isMultiAccountImport=true", () => {
    const parsed = csvImportSchema.parse({
      csv: "Date,Description,Amount,Account\n2026-01-05,x,-1,Chase",
      columnMapping: {
        date: "Date",
        description: "Description",
        amount: "Amount",
        account: "Account",
      },
      accountResolution: { strategy: "per-row", matchBy: "name" },
    });
    expect(isMultiAccountImport(parsed)).toBe(true);
  });
});

describe("groupRowsBySubledgerItem — duplicate detection scope", () => {
  it("groups resolved rows by subledgerItemId so dupe hashes are scoped per account", () => {
    // Duplicate detection is per-account: the same row hash under account A
    // must not be treated as a duplicate of account B. We assert the grouping
    // invariant by hand.
    const rows: ParsedBankRow[] = [
      { date: "2026-01-05", description: "Txn", amount: -100, accountRef: "Chase Checking" },
      { date: "2026-01-05", description: "Txn", amount: -100, accountRef: "Wells Fargo Savings" },
    ];

    const { resolved } = resolveAccountRefs(rows, ITEMS, "name");

    const grouped = new Map<string, typeof resolved>();
    for (const r of resolved) {
      const arr = grouped.get(r.subledgerItemId) ?? [];
      arr.push(r);
      grouped.set(r.subledgerItemId, arr);
    }

    // Two distinct groups, each with one row (not collapsed as dupes)
    expect(grouped.size).toBe(2);
    expect(grouped.get("sub-chase")).toHaveLength(1);
    expect(grouped.get("sub-wells")).toHaveLength(1);
  });
});
