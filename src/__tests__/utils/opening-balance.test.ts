import { getBalanceCheck } from "@/lib/onboarding/opening-balance";
import { describe, test, expect } from "vitest";

describe("getBalanceCheck", () => {
  test("returns balanced with zeros for empty Map", () => {
    const result = getBalanceCheck(new Map());
    expect(result.totalDebits).toBe(0);
    expect(result.totalCredits).toBe(0);
    expect(result.difference).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  test("returns balanced when debits equal credits", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "100");
    grid.set("acct2-credit", "100");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(100);
    expect(result.difference).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  test("returns unbalanced with correct difference when debits != credits", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "100");
    grid.set("acct2-credit", "50");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(50);
    expect(result.difference).toBe(50);
    expect(result.isBalanced).toBe(false);
  });

  test("uses 0.005 tolerance for floating point comparison", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "100.004");
    grid.set("acct2-credit", "100.001");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBeCloseTo(100.004, 3);
    expect(result.totalCredits).toBeCloseTo(100.001, 3);
    // Difference is 0.003, within 0.005 tolerance
    expect(result.isBalanced).toBe(true);
  });

  test("returns unbalanced when difference exceeds tolerance", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "100.01");
    grid.set("acct2-credit", "100.00");
    const result = getBalanceCheck(grid);
    expect(result.difference).toBeCloseTo(0.01, 3);
    expect(result.isBalanced).toBe(false);
  });

  test("handles multiple accounts with debits and credits", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "500");
    grid.set("acct2-debit", "300");
    grid.set("acct3-credit", "200");
    grid.set("acct4-credit", "600");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBe(800);
    expect(result.totalCredits).toBe(800);
    expect(result.isBalanced).toBe(true);
  });

  test("treats non-numeric values as zero", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "abc");
    grid.set("acct2-credit", "100");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBe(0);
    expect(result.totalCredits).toBe(100);
    expect(result.isBalanced).toBe(false);
  });

  test("treats empty string values as zero", () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "");
    grid.set("acct2-credit", "");
    const result = getBalanceCheck(grid);
    expect(result.totalDebits).toBe(0);
    expect(result.totalCredits).toBe(0);
    expect(result.isBalanced).toBe(true);
  });
});
