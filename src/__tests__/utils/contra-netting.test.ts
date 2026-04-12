import { describe, test, expect } from "vitest";
import {
  applyContraNetting,
  type ReportRowWithContra,
} from "@/lib/accounts/contra-netting";

function makeRow(
  overrides: Partial<ReportRowWithContra> & { accountId: string }
): ReportRowWithContra {
  return {
    accountNumber: "10000",
    accountName: "Test Account",
    accountType: "ASSET" as const,
    netBalance: 0,
    isContra: false,
    parentId: null,
    ...overrides,
  };
}

describe("applyContraNetting", () => {
  test("computes net amount by subtracting contra from parent", () => {
    const rows: ReportRowWithContra[] = [
      makeRow({
        accountId: "parent-1",
        accountName: "Equipment",
        netBalance: 50000,
      }),
      makeRow({
        accountId: "contra-1",
        accountName: "Accumulated Depreciation",
        netBalance: -20000,
        isContra: true,
        parentId: "parent-1",
      }),
    ];

    const result = applyContraNetting(rows);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "normal", row: rows[0] });
    expect(result[1]).toEqual({
      type: "contra",
      row: rows[1],
      parentId: "parent-1",
    });
    expect(result[2]).toEqual({
      type: "net",
      parentName: "Equipment",
      parentId: "parent-1",
      netAmount: 30000, // 50000 - |-20000| = 30000
    });
  });

  test("handles accounts with no contra children unchanged", () => {
    const rows: ReportRowWithContra[] = [
      makeRow({
        accountId: "acc-1",
        accountName: "Cash",
        netBalance: 10000,
      }),
      makeRow({
        accountId: "acc-2",
        accountName: "Investments",
        netBalance: 25000,
      }),
    ];

    const result = applyContraNetting(rows);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "normal", row: rows[0] });
    expect(result[1]).toEqual({ type: "normal", row: rows[1] });
  });

  test("handles multiple contra accounts under one parent", () => {
    const rows: ReportRowWithContra[] = [
      makeRow({
        accountId: "parent-1",
        accountName: "Gross Receivables",
        netBalance: 100000,
      }),
      makeRow({
        accountId: "contra-1",
        accountName: "Allowance for Doubtful Accounts",
        netBalance: -5000,
        isContra: true,
        parentId: "parent-1",
      }),
      makeRow({
        accountId: "contra-2",
        accountName: "Sales Returns Reserve",
        netBalance: -3000,
        isContra: true,
        parentId: "parent-1",
      }),
    ];

    const result = applyContraNetting(rows);

    expect(result).toHaveLength(4); // parent + 2 contras + net
    expect(result[0]).toEqual({ type: "normal", row: rows[0] });
    expect(result[1]).toEqual({
      type: "contra",
      row: rows[1],
      parentId: "parent-1",
    });
    expect(result[2]).toEqual({
      type: "contra",
      row: rows[2],
      parentId: "parent-1",
    });
    expect(result[3]).toEqual({
      type: "net",
      parentName: "Gross Receivables",
      parentId: "parent-1",
      netAmount: 92000, // 100000 - 5000 - 3000
    });
  });

  test("handles contra with no parent as standalone with Less: type", () => {
    const rows: ReportRowWithContra[] = [
      makeRow({
        accountId: "acc-1",
        accountName: "Cash",
        netBalance: 10000,
      }),
      makeRow({
        accountId: "contra-orphan",
        accountName: "Treasury Stock",
        netBalance: -2000,
        isContra: true,
        parentId: null,
      }),
    ];

    const result = applyContraNetting(rows);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "normal", row: rows[0] });
    expect(result[1]).toEqual({
      type: "standalone-contra",
      row: rows[1],
    });
  });

  test("handles empty rows array", () => {
    const result = applyContraNetting([]);
    expect(result).toEqual([]);
  });

  test("mixes normal accounts, parent/contra pairs, and standalone contras", () => {
    const rows: ReportRowWithContra[] = [
      makeRow({
        accountId: "cash",
        accountName: "Cash",
        netBalance: 5000,
      }),
      makeRow({
        accountId: "equip",
        accountName: "Equipment",
        netBalance: 40000,
      }),
      makeRow({
        accountId: "accum-dep",
        accountName: "Accumulated Depreciation",
        netBalance: -10000,
        isContra: true,
        parentId: "equip",
      }),
      makeRow({
        accountId: "treasury",
        accountName: "Treasury Stock",
        netBalance: -1500,
        isContra: true,
        parentId: null,
      }),
    ];

    const result = applyContraNetting(rows);

    expect(result).toHaveLength(5);
    // Cash: normal
    expect(result[0]).toEqual({ type: "normal", row: rows[0] });
    // Equipment: normal (parent)
    expect(result[1]).toEqual({ type: "normal", row: rows[1] });
    // Accum Dep: contra under Equipment
    expect(result[2]).toEqual({
      type: "contra",
      row: rows[2],
      parentId: "equip",
    });
    // Net Equipment
    expect(result[3]).toEqual({
      type: "net",
      parentName: "Equipment",
      parentId: "equip",
      netAmount: 30000,
    });
    // Treasury Stock: standalone contra
    expect(result[4]).toEqual({
      type: "standalone-contra",
      row: rows[3],
    });
  });
});
