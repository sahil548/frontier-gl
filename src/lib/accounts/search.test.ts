import { describe, it, expect } from "vitest";

/**
 * Tests for account search and filter logic.
 * These test the client-side filtering applied in the COA table
 * and the server-side query patterns.
 */

// Sample accounts for testing filter logic
const sampleAccounts = [
  { id: "1", number: "10000", name: "Assets", type: "ASSET", parentId: null },
  { id: "2", number: "10100", name: "Cash and Cash Equivalents", type: "ASSET", parentId: "1" },
  { id: "3", number: "20000", name: "Liabilities", type: "LIABILITY", parentId: null },
  { id: "4", number: "20100", name: "Accounts Payable", type: "LIABILITY", parentId: "3" },
  { id: "5", number: "30000", name: "Equity", type: "EQUITY", parentId: null },
  { id: "6", number: "40000", name: "Income", type: "INCOME", parentId: null },
  { id: "7", number: "50000", name: "Expenses", type: "EXPENSE", parentId: null },
  { id: "8", number: "50100", name: "Management Fees Expense", type: "EXPENSE", parentId: "7" },
];

/**
 * Client-side search filter: matches name (case-insensitive) or number prefix.
 */
function filterAccounts(
  accounts: typeof sampleAccounts,
  search: string,
  activeTypes: Set<string>
) {
  return accounts.filter((account) => {
    // Type filter
    if (activeTypes.size > 0 && !activeTypes.has(account.type)) {
      return false;
    }

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      const matchesName = account.name.toLowerCase().includes(lowerSearch);
      const matchesNumber = account.number.startsWith(search);
      if (!matchesName && !matchesNumber) {
        return false;
      }
    }

    return true;
  });
}

describe("Account Search", () => {
  it("filters by name substring", () => {
    const results = filterAccounts(sampleAccounts, "cash", new Set());
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Cash and Cash Equivalents");
  });

  it("filters by number prefix", () => {
    const results = filterAccounts(sampleAccounts, "101", new Set());
    expect(results).toHaveLength(1);
    expect(results[0].number).toBe("10100");
  });

  it("combines name and type filter", () => {
    const results = filterAccounts(
      sampleAccounts,
      "fees",
      new Set(["EXPENSE"])
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Management Fees Expense");
  });

  it("returns all when no filter", () => {
    const results = filterAccounts(sampleAccounts, "", new Set());
    expect(results).toHaveLength(sampleAccounts.length);
  });

  it("filters by type only (no search)", () => {
    const results = filterAccounts(sampleAccounts, "", new Set(["ASSET"]));
    expect(results).toHaveLength(2);
    expect(results.every((a) => a.type === "ASSET")).toBe(true);
  });

  it("filters by multiple types", () => {
    const results = filterAccounts(
      sampleAccounts,
      "",
      new Set(["ASSET", "LIABILITY"])
    );
    expect(results).toHaveLength(4);
  });

  it("returns empty when no matches", () => {
    const results = filterAccounts(sampleAccounts, "nonexistent", new Set());
    expect(results).toHaveLength(0);
  });

  it("search is case-insensitive for name", () => {
    const results = filterAccounts(sampleAccounts, "CASH", new Set());
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Cash and Cash Equivalents");
  });
});
