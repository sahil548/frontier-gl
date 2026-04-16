import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// CLASS-04: Trial Balance filtered by dimension
//
// Regression coverage for `getTrialBalance(entityId, asOfDate, dimensionFilters)`
// at src/lib/queries/trial-balance-queries.ts:51. The function has two branches:
// a filter branch (INNER JOIN per filter for AND logic) and a no-filter branch
// (the original LEFT JOIN query). Both branches map snake_case $queryRaw rows
// to camelCase TrialBalanceRow objects with numeric (not string) money fields.
//
// Follows the Prisma-mock pattern and the recipe in
// .planning/phases/13-test-coverage-gaps/13-RESEARCH.md (Example 2).
// ---------------------------------------------------------------------------

// vi.hoisted ensures mockQueryRaw is initialized before vi.mock (which is hoisted).
const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

// Import AFTER the mock is registered
import { getTrialBalance } from "@/lib/queries/trial-balance-queries";

describe("getTrialBalance with dimensionFilters (CLASS-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes the filter branch and maps rows to camelCase TrialBalanceRow with numeric values", async () => {
    // Raw SQL returns pre-filtered rows (INNER JOIN logic executes in DB).
    // Snake_case keys per Pitfall 3.
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-1",
        account_number: "4000",
        account_name: "Revenue",
        account_type: "INCOME",
        total_debits: "0",
        total_credits: "5000.00",
        net_balance: "5000.00",
      },
    ]);

    const result = await getTrialBalance("entity-1", new Date("2026-12-31"), [
      { dimensionId: "dim-fund", tagId: "tag-fund-1" },
    ]);

    // Filter branch uses a single $queryRaw call (no secondary allTags fetch).
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);

    // Shape: camelCase keys, numeric money values.
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      accountId: "acc-1",
      accountNumber: "4000",
      accountName: "Revenue",
      accountType: "INCOME",
      totalDebits: 0,
      totalCredits: 5000,
      netBalance: 5000,
    });

    // Explicit numeric (not string) assertions.
    expect(typeof result[0].totalDebits).toBe("number");
    expect(typeof result[0].totalCredits).toBe("number");
    expect(typeof result[0].netBalance).toBe("number");
  });

  it("executes the no-filter branch when dimensionFilters is omitted", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const result = await getTrialBalance("entity-1", new Date("2026-12-31"));

    // The no-filter branch also runs a single $queryRaw call.
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    // Empty mock → empty mapped array.
    expect(result).toEqual([]);
  });

  it("executes the no-filter branch when dimensionFilters is an empty array", async () => {
    // Per trial-balance-queries.ts:57: `hasFilters = filters && filters.length > 0`
    // so an empty array should take the no-filter path.
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-2",
        account_number: "1000",
        account_name: "Cash",
        account_type: "ASSET",
        total_debits: "1250.50",
        total_credits: "0",
        net_balance: "1250.50",
      },
    ]);

    const result = await getTrialBalance(
      "entity-1",
      new Date("2026-12-31"),
      []
    );

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe("acc-2");
    expect(result[0].netBalance).toBe(1250.5);
    expect(result[0].accountType).toBe("ASSET");
  });

  it("executes the filter branch with multiple dimensionFilters (AND logic) and maps rows", async () => {
    // Multiple INNER JOINs in SQL implement AND logic at the DB layer.
    // The mapping code returns the rows the mock emits.
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-3",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        total_debits: "750.00",
        total_credits: "0",
        net_balance: "750.00",
      },
    ]);

    const result = await getTrialBalance(
      "entity-1",
      new Date("2026-12-31"),
      [
        { dimensionId: "dim-fund", tagId: "tag-fund-1" },
        { dimensionId: "dim-prop", tagId: "tag-prop-a" },
      ]
    );

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      accountId: "acc-3",
      accountNumber: "5000",
      accountName: "Office Expense",
      accountType: "EXPENSE",
      totalDebits: 750,
      totalCredits: 0,
      netBalance: 750,
    });
  });
});
