import { describe, it, expect } from "vitest";
import { determineJEDirection, computeAdjustment } from "@/lib/bank-transactions/opening-balance";

describe("Opening Balance JE Generation", () => {
  // OBE-01: Opening Balance Equity account management
  // findOrCreateOBEAccount tested via integration (Prisma transaction)

  // OBE-02: Opening balance JE creation -- direction logic
  describe("determineJEDirection", () => {
    it("debits asset holding GL and credits OBE for ASSET type", () => {
      const result = determineJEDirection("ASSET", "holding-acct-1", "obe-acct-1");
      expect(result.debitAccountId).toBe("holding-acct-1");
      expect(result.creditAccountId).toBe("obe-acct-1");
    });

    it("debits OBE and credits liability holding GL for LIABILITY type", () => {
      const result = determineJEDirection("LIABILITY", "holding-acct-2", "obe-acct-2");
      expect(result.debitAccountId).toBe("obe-acct-2");
      expect(result.creditAccountId).toBe("holding-acct-2");
    });

    it("defaults to asset direction for unknown account types", () => {
      const result = determineJEDirection("EQUITY", "hold-3", "obe-3");
      expect(result.debitAccountId).toBe("hold-3");
      expect(result.creditAccountId).toBe("obe-3");
    });
  });

  // OBE-02: Zero balance skips JE
  describe("computeAdjustment", () => {
    it("returns null when old and new balances are equal", () => {
      expect(computeAdjustment(1000, 1000)).toBeNull();
    });

    it("returns null when both balances are zero", () => {
      expect(computeAdjustment(0, 0)).toBeNull();
    });

    it("returns positive increase when balance goes up", () => {
      const result = computeAdjustment(10000, 12000);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(2000);
      expect(result!.isIncrease).toBe(true);
    });

    it("returns positive amount with isIncrease=false when balance decreases", () => {
      const result = computeAdjustment(12000, 10000);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(2000);
      expect(result!.isIncrease).toBe(false);
    });

    it("handles transition from zero to positive", () => {
      const result = computeAdjustment(0, 5000);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(5000);
      expect(result!.isIncrease).toBe(true);
    });

    it("handles transition from positive to zero", () => {
      const result = computeAdjustment(5000, 0);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(5000);
      expect(result!.isIncrease).toBe(false);
    });

    it("handles negative balance values correctly", () => {
      const result = computeAdjustment(-1000, -500);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(500);
      expect(result!.isIncrease).toBe(true);
    });
  });
});
