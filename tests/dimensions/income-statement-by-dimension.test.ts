import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// CLASS-03: Income Statement sliced by dimension
//
// Regression coverage for `getIncomeStatement(..., dimensionId)` — the public
// dispatcher at src/lib/queries/report-queries.ts:100, which delegates to the
// module-private `getIncomeStatementByDimension` when a dimensionId is passed.
//
// Strategy: mock @/lib/db/prisma so `$queryRaw` returns the two row fixtures
// (aggregated rows + allTags) the production code expects, then assert the
// DimensionedIncomeStatementData mapping is correct.
//
// Follows the Prisma-mock pattern from tests/bank-transactions/plaid-sync.test.ts
// and the recipe in .planning/phases/13-test-coverage-gaps/13-RESEARCH.md
// (Example 1 + Pitfalls 1, 3, 4).
// ---------------------------------------------------------------------------

// vi.mock is hoisted to the top of the file; use vi.hoisted() so the mock
// factory can reference mockQueryRaw even though it's declared up here.
const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

// Import AFTER the mock is registered
import { getIncomeStatement } from "@/lib/queries/report-queries";

describe("getIncomeStatement with dimensionId (CLASS-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns column-per-tag layout for INCOME account with one tag", async () => {
    // First $queryRaw call: aggregated rows (snake_case per SQL aliases).
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-rev",
        account_number: "4000",
        account_name: "Revenue",
        account_type: "INCOME",
        tag_id: "tag-fund-1",
        tag_name: "Fund I",
        net_balance: "10000.00",
      },
    ]);
    // Second $queryRaw call: allTags (see Pitfall 4 — two calls must be mocked).
    mockQueryRaw.mockResolvedValueOnce([
      { id: "tag-fund-1", name: "Fund I" },
      { id: "tag-fund-2", name: "Fund II" },
    ]);

    const result = await getIncomeStatement(
      "entity-1",
      new Date("2026-01-01"),
      new Date("2026-12-31"),
      "accrual",
      "dim-fund"
    );

    // Narrow the discriminated union via "tags" presence.
    expect("tags" in result).toBe(true);
    if (!("tags" in result)) {
      throw new Error("expected DimensionedIncomeStatementData (with 'tags')");
    }

    expect(result.tags).toHaveLength(2);
    expect(result.tags).toEqual([
      { id: "tag-fund-1", name: "Fund I" },
      { id: "tag-fund-2", name: "Fund II" },
    ]);

    expect(result.incomeRows).toHaveLength(1);
    expect(result.incomeRows[0].accountName).toBe("Revenue");
    expect(result.incomeRows[0].accountNumber).toBe("4000");

    // tagBreakdown has one entry per active tag PLUS Unclassified (tagId: null).
    expect(result.incomeRows[0].tagBreakdown).toHaveLength(3);

    const fundI = result.incomeRows[0].tagBreakdown.find(
      (t) => t.tagId === "tag-fund-1"
    );
    expect(fundI).toBeDefined();
    expect(fundI?.netBalance).toBe(10000);
    expect(fundI?.tagName).toBe("Fund I");

    const fundII = result.incomeRows[0].tagBreakdown.find(
      (t) => t.tagId === "tag-fund-2"
    );
    expect(fundII).toBeDefined();
    expect(fundII?.netBalance).toBe(0);

    const unclassified = result.incomeRows[0].tagBreakdown.find(
      (t) => t.tagId === null
    );
    expect(unclassified).toBeDefined();
    expect(unclassified?.netBalance).toBe(0);

    // Totals roll up to the tagged amount.
    expect(result.totalIncome).toBe(10000);
    expect(result.totalExpenses).toBe(0);
    expect(result.netIncome).toBe(10000);

    // No expense rows in this fixture.
    expect(result.expenseRows).toHaveLength(0);
  });

  it("flows EXPENSE account with dimension tag into expenseRows (branch symmetry)", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-office",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        tag_id: "tag-fund-1",
        tag_name: "Fund I",
        net_balance: "2500.00",
      },
    ]);
    mockQueryRaw.mockResolvedValueOnce([
      { id: "tag-fund-1", name: "Fund I" },
    ]);

    const result = await getIncomeStatement(
      "entity-1",
      new Date("2026-01-01"),
      new Date("2026-12-31"),
      "accrual",
      "dim-fund"
    );

    if (!("tags" in result)) {
      throw new Error("expected DimensionedIncomeStatementData (with 'tags')");
    }

    // Expense appears in expenseRows, not incomeRows.
    expect(result.incomeRows).toHaveLength(0);
    expect(result.expenseRows).toHaveLength(1);
    expect(result.expenseRows[0].accountName).toBe("Office Expense");
    expect(result.expenseRows[0].accountType).toBe("EXPENSE");

    // Fund I bucket has the mapped amount; Unclassified bucket is 0.
    const fundI = result.expenseRows[0].tagBreakdown.find(
      (t) => t.tagId === "tag-fund-1"
    );
    expect(fundI?.netBalance).toBe(2500);

    const unclassified = result.expenseRows[0].tagBreakdown.find(
      (t) => t.tagId === null
    );
    expect(unclassified?.netBalance).toBe(0);

    // Section totals
    expect(result.totalExpenses).toBe(2500);
    expect(result.totalIncome).toBe(0);
    expect(result.netIncome).toBe(-2500);
  });

  it("invokes $queryRaw exactly twice (aggregated rows + allTags)", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);

    await getIncomeStatement(
      "entity-1",
      new Date("2026-01-01"),
      new Date("2026-12-31"),
      "accrual",
      "dim-fund"
    );

    // Two raw queries per Pitfall 4 — the first fetches aggregated account×tag
    // rows, the second fetches the allTags column definition.
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });
});
