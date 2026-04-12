import { describe, test, expect } from "vitest";
import { classifyCashFlowRow } from "@/lib/queries/cash-flow-classify";

describe("getCashFlowStatement -- cashFlowCategory field", () => {
  test("classifies account with cashFlowCategory=INVESTING into investing section", () => {
    const result = classifyCashFlowRow({
      account_name: "Equity Securities",
      account_type: "ASSET",
      cash_flow_category: "INVESTING",
      net_movement: 5000,
    });

    expect(result).toEqual({
      section: "investing",
      item: { accountName: "Equity Securities", amount: -5000 },
    });
  });

  test("classifies account with cashFlowCategory=FINANCING into financing section", () => {
    const result = classifyCashFlowRow({
      account_name: "Bank Loan",
      account_type: "LIABILITY",
      cash_flow_category: "FINANCING",
      net_movement: -3000,
    });

    expect(result).toEqual({
      section: "financing",
      item: { accountName: "Bank Loan", amount: 3000 },
    });
  });

  test("classifies account with cashFlowCategory=OPERATING into operating section with Change in prefix", () => {
    const result = classifyCashFlowRow({
      account_name: "Accounts Receivable",
      account_type: "ASSET",
      cash_flow_category: "OPERATING",
      net_movement: 2000,
    });

    expect(result).toEqual({
      section: "operating",
      item: { accountName: "Change in Accounts Receivable", amount: -2000 },
    });
  });

  test("treats null cashFlowCategory as OPERATING for balance sheet accounts", () => {
    const result = classifyCashFlowRow({
      account_name: "Other Asset",
      account_type: "ASSET",
      cash_flow_category: null,
      net_movement: 1000,
    });

    expect(result).toEqual({
      section: "operating",
      item: { accountName: "Change in Other Asset", amount: -1000 },
    });
  });

  test("skips EXCLUDED category accounts from cash flow", () => {
    const result = classifyCashFlowRow({
      account_name: "Cash and Cash Equivalents",
      account_type: "ASSET",
      cash_flow_category: "EXCLUDED",
      net_movement: 10000,
    });

    expect(result).toBeNull();
  });

  test("skips INCOME accounts regardless of cashFlowCategory", () => {
    const result = classifyCashFlowRow({
      account_name: "Service Revenue",
      account_type: "INCOME",
      cash_flow_category: "OPERATING",
      net_movement: 8000,
    });

    expect(result).toBeNull();
  });

  test("skips EXPENSE accounts regardless of cashFlowCategory", () => {
    const result = classifyCashFlowRow({
      account_name: "Office Supplies",
      account_type: "EXPENSE",
      cash_flow_category: null,
      net_movement: 500,
    });

    expect(result).toBeNull();
  });

  test("preserves depreciation expense add-back in operating section", () => {
    const result = classifyCashFlowRow({
      account_name: "Depreciation Expense",
      account_type: "EXPENSE",
      cash_flow_category: null,
      net_movement: 1200,
    });

    expect(result).toEqual({
      section: "operating",
      item: { accountName: "Add back: Depreciation Expense", amount: 1200 },
    });
  });

  test("skips zero-movement accounts", () => {
    const result = classifyCashFlowRow({
      account_name: "Investments",
      account_type: "ASSET",
      cash_flow_category: "INVESTING",
      net_movement: 0,
    });

    expect(result).toBeNull();
  });

  test("handles null cashFlowCategory for LIABILITY as OPERATING", () => {
    const result = classifyCashFlowRow({
      account_name: "Accrued Liabilities",
      account_type: "LIABILITY",
      cash_flow_category: null,
      net_movement: -500,
    });

    expect(result).toEqual({
      section: "operating",
      item: { accountName: "Change in Accrued Liabilities", amount: 500 },
    });
  });

  test("handles null cashFlowCategory for EQUITY as OPERATING", () => {
    const result = classifyCashFlowRow({
      account_name: "Retained Earnings",
      account_type: "EQUITY",
      cash_flow_category: null,
      net_movement: -2000,
    });

    expect(result).toEqual({
      section: "operating",
      item: { accountName: "Change in Retained Earnings", amount: 2000 },
    });
  });
});
