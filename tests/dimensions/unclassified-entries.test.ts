import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// CLASS-05: Unclassified bucket aggregation
//
// Regression coverage for the Unclassified (tagId: null) column of the
// dimensioned income statement. Two distinct production code paths collapse
// into this bucket per src/lib/queries/report-queries.ts:237-248:
//
//   (1) Rows where tag_id IS NULL (line items with no tag assigned at all).
//   (2) Rows with a tag_id that is NOT in the active dimension's tag set
//       (e.g., tags from another dimension — they collapse into Unclassified).
//
// Exercises the same public dispatcher as CLASS-03: getIncomeStatement(...,
// dimensionId). Mocks @/lib/db/prisma.$queryRaw with TWO mockResolvedValueOnce
// calls (Pitfall 4: one for rows, one for allTags).
//
// Follows the Prisma-mock pattern and the recipe in
// .planning/phases/13-test-coverage-gaps/13-RESEARCH.md (Example 3).
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
import { getIncomeStatement } from "@/lib/queries/report-queries";

describe("Unclassified dimension entries (CLASS-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates rows with tag_id: null into the Unclassified bucket (path 1)", async () => {
    // Row with null tag — no dimension tag assigned to this line item.
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-exp",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        tag_id: null,
        tag_name: null,
        net_balance: "1500.00",
      },
    ]);
    // allTags — only Fund I is an active tag in this dimension.
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

    expect(result.expenseRows).toHaveLength(1);
    const breakdown = result.expenseRows[0].tagBreakdown;

    // Per code contract: one entry per active tag + one Unclassified.
    expect(breakdown).toHaveLength(2);

    const unclassified = breakdown.find((t) => t.tagId === null);
    expect(unclassified).toBeDefined();
    expect(unclassified?.netBalance).toBe(1500);
    expect(unclassified?.tagName).toBeNull();

    // Fund I bucket has no matching rows → zero.
    const fundI = breakdown.find((t) => t.tagId === "tag-fund-1");
    expect(fundI).toBeDefined();
    expect(fundI?.netBalance).toBe(0);

    // Row-level netBalance rolls up to the Unclassified amount only.
    expect(result.expenseRows[0].totalBalance).toBe(1500);
    expect(result.totalExpenses).toBe(1500);
  });

  it("aggregates rows with tag_id NOT in the active dimension into Unclassified (path 2)", async () => {
    // Row has a tag_id that isn't in allTags — e.g., a tag from another
    // dimension that surfaced via the LEFT JOIN. Per report-queries.ts:239-243,
    // these amounts collapse into the Unclassified bucket.
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-exp",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        tag_id: "tag-from-other-dim",
        tag_name: "Other Dimension Tag",
        net_balance: "750.00",
      },
    ]);
    mockQueryRaw.mockResolvedValueOnce([
      { id: "tag-fund-1", name: "Fund I" }, // the active dimension's only tag
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

    expect(result.expenseRows).toHaveLength(1);
    const breakdown = result.expenseRows[0].tagBreakdown;

    // Unclassified bucket absorbs the out-of-dimension tag's amount.
    const unclassified = breakdown.find((t) => t.tagId === null);
    expect(unclassified?.netBalance).toBe(750);

    // The foreign tag does NOT appear as its own column — breakdown only has
    // entries for active tags (Fund I) plus Unclassified.
    expect(breakdown).toHaveLength(2);
    const foreign = breakdown.find((t) => t.tagId === "tag-from-other-dim");
    expect(foreign).toBeUndefined();

    // Fund I bucket remains empty.
    const fundI = breakdown.find((t) => t.tagId === "tag-fund-1");
    expect(fundI?.netBalance).toBe(0);
  });

  it("splits amounts correctly when an account has both an active-tag row and a null-tag row", async () => {
    // Mixed: one row tagged Fund I, another row with null tag (same account).
    mockQueryRaw.mockResolvedValueOnce([
      {
        account_id: "acc-exp",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        tag_id: "tag-fund-1",
        tag_name: "Fund I",
        net_balance: "2000.00",
      },
      {
        account_id: "acc-exp",
        account_number: "5000",
        account_name: "Office Expense",
        account_type: "EXPENSE",
        tag_id: null,
        tag_name: null,
        net_balance: "500.00",
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

    expect(result.expenseRows).toHaveLength(1);
    const breakdown = result.expenseRows[0].tagBreakdown;

    // Fund I bucket has only the 2000 row; Unclassified has only the 500 row.
    const fundI = breakdown.find((t) => t.tagId === "tag-fund-1");
    expect(fundI?.netBalance).toBe(2000);

    const unclassified = breakdown.find((t) => t.tagId === null);
    expect(unclassified?.netBalance).toBe(500);

    // Row-level total is the sum of both buckets.
    expect(result.expenseRows[0].totalBalance).toBe(2500);
    expect(result.totalExpenses).toBe(2500);
  });
});
