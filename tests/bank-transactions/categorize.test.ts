import { describe, it, expect } from "vitest";
import { matchRule } from "@/lib/bank-transactions/categorize";

// Minimal rule shape matching CategorizationRule fields used by the engine
type TestRule = {
  id: string;
  pattern: string;
  amountMin: number | null;
  amountMax: number | null;
  accountId: string | null;
  positionId?: string | null;
  dimensionTags: Record<string, string> | null;
  isActive: boolean;
  priority: number;
};

const makeRule = (overrides: Partial<TestRule> & { id: string; pattern: string; accountId: string }): TestRule => ({
  amountMin: null,
  amountMax: null,
  dimensionTags: null,
  isActive: true,
  priority: 0,
  ...overrides,
});

describe("matchRule", () => {
  it("returns matching rule for case-insensitive substring in description", () => {
    const rules = [makeRule({ id: "r1", pattern: "amazon", accountId: "acc1" })];
    const result = matchRule({ description: "AMAZON PURCHASE #123", amount: 50 }, rules);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("r1");
  });

  it("respects amountMin/amountMax range (uses absolute amount)", () => {
    const rules = [
      makeRule({ id: "r1", pattern: "payroll", accountId: "acc1", amountMin: 5000, amountMax: 10000 }),
    ];

    // Within range (absolute value)
    const match = matchRule({ description: "PAYROLL DEPOSIT", amount: -7500 }, rules);
    expect(match).not.toBeNull();
    expect(match!.id).toBe("r1");

    // Below range
    const noMatch = matchRule({ description: "PAYROLL DEPOSIT", amount: 100 }, rules);
    expect(noMatch).toBeNull();

    // Above range
    const tooHigh = matchRule({ description: "PAYROLL DEPOSIT", amount: 15000 }, rules);
    expect(tooHigh).toBeNull();
  });

  it("returns null when no rules match", () => {
    const rules = [makeRule({ id: "r1", pattern: "amazon", accountId: "acc1" })];
    const result = matchRule({ description: "WALMART PURCHASE", amount: 50 }, rules);
    expect(result).toBeNull();
  });

  it("returns first matching rule in priority order (lower = higher priority)", () => {
    const rules = [
      makeRule({ id: "r1", pattern: "amazon", accountId: "acc1", priority: 10 }),
      makeRule({ id: "r2", pattern: "amazon", accountId: "acc2", priority: 1 }),
      makeRule({ id: "r3", pattern: "amazon", accountId: "acc3", priority: 5 }),
    ];

    // Rules should be pre-sorted by priority; lower = higher priority
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const result = matchRule({ description: "AMAZON PURCHASE", amount: 50 }, sorted);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("r2"); // priority 1 wins
  });
});

describe("Position-targeted rules", () => {
  // CAT-03: Rules with positionId instead of accountId
  it("matchRule matches rule with positionId and null accountId", () => {
    const rule: TestRule = makeRule({
      id: "r1",
      pattern: "schwab",
      accountId: null as unknown as string, // null allowed when positionId set (Phase 11)
      positionId: "pos-sweep-1",
    });
    const result = matchRule(
      { description: "SCHWAB DIVIDEND DEPOSIT", amount: 500 },
      [rule]
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("r1");
    expect(result!.positionId).toBe("pos-sweep-1");
    expect(result!.accountId).toBeNull();
  });

});
