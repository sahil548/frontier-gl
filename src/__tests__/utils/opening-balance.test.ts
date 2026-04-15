import {
  getBalanceCheck,
  generateOpeningBalanceJE,
} from "@/lib/onboarding/opening-balance";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

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

describe("generateOpeningBalanceJE date fidelity", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: true, data: { id: "je-test-1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("posts the exact YYYY-MM-DD string passed in (no timezone shift)", async () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "1000");
    grid.set("acct2-credit", "1000");

    await generateOpeningBalanceJE("entity-123", grid, "2026-01-01");

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.date).toBe("2026-01-01");
  });

  test("accepts a string jeDate parameter directly (no Date-object round-trip)", async () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "500");
    grid.set("acct2-credit", "500");

    // Form date like Apr 1, fiscal-year-start. If generateOpeningBalanceJE
    // internally called `new Date("2026-04-01")` the ISO would shift to prior
    // day in some timezones (UTC midnight). We assert the string passes through.
    await generateOpeningBalanceJE("entity-123", grid, "2026-04-01");

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.date).toBe("2026-04-01");
    expect(body.date).not.toBe("2026-03-31");
  });

  test("returns journalEntryId from API response", async () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "250");
    grid.set("acct2-credit", "250");

    const result = await generateOpeningBalanceJE("entity-123", grid, "2026-01-01");
    expect(result.journalEntryId).toBe("je-test-1");
  });
});
