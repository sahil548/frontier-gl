import { describe, it, expect } from "vitest";
import { inferCashFlowCategory } from "@/lib/accounts/cash-flow-backfill";

describe("inferCashFlowCategory", () => {
  // ── INCOME / EXPENSE -> null ──
  it('returns null for INCOME type "Service Revenue"', () => {
    expect(inferCashFlowCategory("INCOME", "Service Revenue")).toBeNull();
  });

  it('returns null for EXPENSE type "Office Supplies"', () => {
    expect(inferCashFlowCategory("EXPENSE", "Office Supplies")).toBeNull();
  });

  // ── ASSET + cash -> EXCLUDED ──
  it('returns EXCLUDED for ASSET "Cash in Bank"', () => {
    expect(inferCashFlowCategory("ASSET", "Cash in Bank")).toBe("EXCLUDED");
  });

  it('returns EXCLUDED for ASSET "Cash and Cash Equivalents"', () => {
    expect(
      inferCashFlowCategory("ASSET", "Cash and Cash Equivalents"),
    ).toBe("EXCLUDED");
  });

  // ── ASSET + investment/securities/real estate/private equity -> INVESTING ──
  it('returns INVESTING for ASSET "Investments - Securities"', () => {
    expect(
      inferCashFlowCategory("ASSET", "Investments - Securities"),
    ).toBe("INVESTING");
  });

  it('returns INVESTING for ASSET "Real Estate Holdings"', () => {
    expect(inferCashFlowCategory("ASSET", "Real Estate Holdings")).toBe(
      "INVESTING",
    );
  });

  it('returns INVESTING for ASSET "Private Equity Investments"', () => {
    expect(
      inferCashFlowCategory("ASSET", "Private Equity Investments"),
    ).toBe("INVESTING");
  });

  it('returns INVESTING for ASSET "Securities - Long"', () => {
    expect(inferCashFlowCategory("ASSET", "Securities - Long")).toBe(
      "INVESTING",
    );
  });

  // ── LIABILITY + loan/mortgage -> FINANCING ──
  it('returns FINANCING for LIABILITY "Mortgage Payable"', () => {
    expect(inferCashFlowCategory("LIABILITY", "Mortgage Payable")).toBe(
      "FINANCING",
    );
  });

  it('returns FINANCING for LIABILITY "Loans Payable"', () => {
    expect(inferCashFlowCategory("LIABILITY", "Loans Payable")).toBe(
      "FINANCING",
    );
  });

  // ── EQUITY + equity/capital (not retained) -> FINANCING ──
  it('returns FINANCING for EQUITY "Owner Capital"', () => {
    expect(inferCashFlowCategory("EQUITY", "Owner Capital")).toBe(
      "FINANCING",
    );
  });

  it('returns FINANCING for EQUITY "Partner Capital - LP"', () => {
    expect(inferCashFlowCategory("EQUITY", "Partner Capital - LP")).toBe(
      "FINANCING",
    );
  });

  it('returns OPERATING for EQUITY "Retained Earnings" (excluded from financing)', () => {
    expect(inferCashFlowCategory("EQUITY", "Retained Earnings")).toBe(
      "OPERATING",
    );
  });

  // ── EQUITY + distribution -> FINANCING ──
  it('returns FINANCING for EQUITY "Distributions"', () => {
    expect(inferCashFlowCategory("EQUITY", "Distributions")).toBe(
      "FINANCING",
    );
  });

  // ── ASSET + receivable/prepaid -> OPERATING ──
  it('returns OPERATING for ASSET "Accounts Receivable"', () => {
    expect(inferCashFlowCategory("ASSET", "Accounts Receivable")).toBe(
      "OPERATING",
    );
  });

  it('returns OPERATING for ASSET "Prepaid Expenses"', () => {
    expect(inferCashFlowCategory("ASSET", "Prepaid Expenses")).toBe(
      "OPERATING",
    );
  });

  // ── LIABILITY + payable/accrued -> OPERATING ──
  it('returns OPERATING for LIABILITY "Accounts Payable"', () => {
    expect(inferCashFlowCategory("LIABILITY", "Accounts Payable")).toBe(
      "OPERATING",
    );
  });

  it('returns OPERATING for LIABILITY "Accrued Expenses"', () => {
    expect(inferCashFlowCategory("LIABILITY", "Accrued Expenses")).toBe(
      "OPERATING",
    );
  });

  // ── Default for unmatched balance sheet -> OPERATING ──
  it('returns OPERATING for unmatched ASSET "Other Asset"', () => {
    expect(inferCashFlowCategory("ASSET", "Other Asset")).toBe("OPERATING");
  });

  it('returns OPERATING for unmatched LIABILITY "Other Liabilities"', () => {
    expect(inferCashFlowCategory("LIABILITY", "Other Liabilities")).toBe(
      "OPERATING",
    );
  });

  it('returns FINANCING for EQUITY "Equity" (matches equity keyword)', () => {
    expect(inferCashFlowCategory("EQUITY", "Equity")).toBe("FINANCING");
  });

  // ── Case insensitivity ──
  it("handles case-insensitive matching", () => {
    expect(inferCashFlowCategory("ASSET", "CASH IN BANK")).toBe("EXCLUDED");
    expect(inferCashFlowCategory("LIABILITY", "MORTGAGE payable")).toBe(
      "FINANCING",
    );
  });
});
