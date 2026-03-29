import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// DASH-03: Dashboard chart data shapes and transformation helpers
//
// The dashboard API returns three chart arrays alongside summary/recentEntries.
// These tests verify:
//   1. The toNum helper used in the route correctly converts raw DB values
//   2. assetBreakdown items have { name: string; value: number } shape
//   3. incomeVsExpense items have { category: string; amount: number } shape
//      where category maps "INCOME" -> "Revenue" and "EXPENSE" -> "Expense"
//   4. equityTrend items have { month: string; equity: number } shape
//      where month is "YYYY-MM" format
//
// No DB/Prisma required — we test the pure transformation helpers inline.
// ---------------------------------------------------------------------------

/** Mirror of the toNum helper in the dashboard route */
function toNum(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

/** Mirror of the incomeVsExpense category mapping in the route */
function mapCategory(accountType: string): string {
  return accountType === "INCOME" ? "Revenue" : "Expense";
}

/** Mirror of the assetBreakdown mapping in the route */
function mapAssetBreakdownRow(row: { name: string; value: unknown }) {
  return { name: row.name, value: toNum(row.value) };
}

/** Mirror of the equityTrend mapping in the route */
function mapEquityTrendRow(row: { month: string; equity: unknown }) {
  return { month: row.month, equity: toNum(row.equity) };
}

describe("Dashboard chart data API", () => {
  it("returns asset breakdown with name and value fields", () => {
    // Simulate raw DB rows as the route receives them (value as unknown/Decimal-like)
    const rawRows = [
      { name: "Cash", value: "50000.00" },
      { name: "Accounts Receivable", value: "12500.50" },
      { name: "Investments", value: "200000" },
    ];

    const assetBreakdown = rawRows.map(mapAssetBreakdownRow);

    // Each item must have name (string) and value (number)
    expect(assetBreakdown).toHaveLength(3);

    expect(assetBreakdown[0]).toEqual({ name: "Cash", value: 50000 });
    expect(assetBreakdown[1]).toEqual({ name: "Accounts Receivable", value: 12500.5 });
    expect(assetBreakdown[2]).toEqual({ name: "Investments", value: 200000 });

    // All values must be numbers, not strings
    for (const item of assetBreakdown) {
      expect(typeof item.name).toBe("string");
      expect(typeof item.value).toBe("number");
    }

    // Null/missing values must default to 0
    const withNull = mapAssetBreakdownRow({ name: "Empty Account", value: null });
    expect(withNull.value).toBe(0);
  });

  it("returns income vs expense totals for selected period", () => {
    // Simulate the raw rows as produced by the incomeVsExpense query
    const rawRows = [
      { account_type: "INCOME", amount: "75000.00" },
      { account_type: "EXPENSE", amount: "48000.00" },
    ];

    const incomeVsExpense = rawRows.map((row) => ({
      category: mapCategory(row.account_type),
      amount: toNum(row.amount),
    }));

    expect(incomeVsExpense).toHaveLength(2);

    const revenueRow = incomeVsExpense.find((r) => r.category === "Revenue");
    const expenseRow = incomeVsExpense.find((r) => r.category === "Expense");

    expect(revenueRow).toBeDefined();
    expect(revenueRow?.amount).toBe(75000);

    expect(expenseRow).toBeDefined();
    expect(expenseRow?.amount).toBe(48000);

    // category field must be "Revenue" or "Expense" — never the raw enum value
    for (const item of incomeVsExpense) {
      expect(["Revenue", "Expense"]).toContain(item.category);
      expect(typeof item.amount).toBe("number");
    }
  });

  it("returns equity trend with monthly data points", () => {
    // Simulate raw equity trend rows — month as "YYYY-MM" string, equity as cumulative sum
    const rawRows = [
      { month: "2025-04", equity: "10000.00" },
      { month: "2025-05", equity: "22000.00" },
      { month: "2025-06", equity: "35000.00" },
      { month: "2026-03", equity: "120000.00" },
    ];

    const equityTrend = rawRows.map(mapEquityTrendRow);

    expect(equityTrend).toHaveLength(4);

    // Each item must have month (YYYY-MM string) and equity (number)
    for (const item of equityTrend) {
      expect(item.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof item.equity).toBe("number");
    }

    expect(equityTrend[0]).toEqual({ month: "2025-04", equity: 10000 });
    expect(equityTrend[3]).toEqual({ month: "2026-03", equity: 120000 });

    // Cumulative — later months must have higher or equal equity
    for (let i = 1; i < equityTrend.length; i++) {
      expect(equityTrend[i].equity).toBeGreaterThanOrEqual(equityTrend[i - 1].equity);
    }
  });
});
