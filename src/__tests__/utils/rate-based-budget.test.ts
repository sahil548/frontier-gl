import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeMonthlyBudget } from "@/lib/budgets/rate-based";

describe("computeMonthlyBudget", () => {
  it("computes monthly budget as holdingValue * rate / 12", () => {
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal(1000000),
      annualReturnRate: 0.08,
    });
    expect(result.toFixed(4)).toBe("6666.6667");
  });

  it("returns zero for zero market value", () => {
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal(0),
      annualReturnRate: 0.08,
    });
    expect(result.toFixed(4)).toBe("0.0000");
  });

  it("returns zero for zero annual rate", () => {
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal(500000),
      annualReturnRate: 0,
    });
    expect(result.toFixed(4)).toBe("0.0000");
  });

  it("rounds to 4 decimal places matching Decimal(19,4)", () => {
    // 250000 * 0.07 / 12 = 1458.333333...
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal(250000),
      annualReturnRate: 0.07,
    });
    expect(result.toFixed(4)).toBe("1458.3333");
  });

  it("handles large holding values without overflow", () => {
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal("999999999999.9999"),
      annualReturnRate: 0.15,
    });
    // 999999999999.9999 * 0.15 / 12 = 12500000000.0000
    expect(result.decimalPlaces()).toBeLessThanOrEqual(4);
    expect(result.isFinite()).toBe(true);
  });

  it("returns a Decimal instance", () => {
    const result = computeMonthlyBudget({
      holdingMarketValue: new Decimal(100000),
      annualReturnRate: 0.05,
    });
    expect(result).toBeInstanceOf(Decimal);
  });
});
