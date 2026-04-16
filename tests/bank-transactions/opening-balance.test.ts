import { describe, it, expect, vi, beforeEach } from "vitest";

// OBE-03: Mock the auto-number dependency at module level so generateAdjustingJE's
// internal call to generateNextEntryNumber(tx, entityId) does not require a real
// tx.journalEntry.findFirst stub. See RESEARCH.md Blocker #5.
vi.mock("@/lib/journal-entries/auto-number", () => ({
  generateNextEntryNumber: vi.fn().mockResolvedValue("JE-001"),
}));

import {
  determineJEDirection,
  computeAdjustment,
  generateAdjustingJE,
} from "@/lib/bank-transactions/opening-balance";

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

  // OBE-03: Adjusting JE creation (Prisma-tx function)
  //
  // Mocks a minimal tx proxy covering every Prisma method generateAdjustingJE touches:
  //   - tx.account.findFirst   (looks up existing OBE account; returns a stub)
  //   - tx.accountBalance.upsert (both legs of the JE)
  //   - tx.journalEntry.create (returns stub JE id)
  //   - tx.journalEntryAudit.create (audit trail)
  //
  // generateNextEntryNumber is module-mocked above so no tx.journalEntry.findFirst
  // stub is needed.
  //
  // Decimal assertions use `.toString()` on the actual argument to avoid identity
  // comparisons on Prisma.Decimal objects (RESEARCH.md Pitfall 5).
  describe("generateAdjustingJE (OBE-03)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockTx = {
        account: {
          findFirst: vi.fn().mockResolvedValue({ id: "obe-acct" }), // existing OBE found
          create: vi.fn(),
        },
        accountBalance: {
          upsert: vi.fn().mockResolvedValue(undefined),
          create: vi.fn().mockResolvedValue(undefined),
        },
        journalEntry: {
          create: vi.fn().mockResolvedValue({ id: "je-123", entryNumber: "JE-001" }),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        journalEntryAudit: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      };
    });

    it("returns null when balance unchanged (no JE created)", async () => {
      const result = await generateAdjustingJE(mockTx, {
        entityId: "entity-1",
        userId: "user-1",
        holdingAccountId: "holding-1",
        holdingAccountType: "ASSET",
        oldBalance: 10000,
        newBalance: 10000,
        date: new Date("2026-04-01"),
      });
      expect(result).toBeNull();
      expect(mockTx.journalEntry.create).not.toHaveBeenCalled();
      expect(mockTx.accountBalance.upsert).not.toHaveBeenCalled();
      expect(mockTx.journalEntryAudit.create).not.toHaveBeenCalled();
    });

    it("creates POSTED adjusting JE in same direction on balance increase for ASSET", async () => {
      await generateAdjustingJE(mockTx, {
        entityId: "entity-1",
        userId: "user-1",
        holdingAccountId: "holding-asset-1",
        holdingAccountType: "ASSET",
        oldBalance: 10000,
        newBalance: 12000,
        date: new Date("2026-04-01"),
      });

      expect(mockTx.journalEntry.create).toHaveBeenCalledTimes(1);
      const args = mockTx.journalEntry.create.mock.calls[0][0];
      expect(args.data.status).toBe("POSTED");
      expect(args.data.description).toBe("Balance adjustment");
      expect(args.data.entityId).toBe("entity-1");
      expect(args.data.entryNumber).toBe("JE-001");

      // Increase on ASSET -> debit holding, credit OBE (same as opening direction)
      const lines = args.data.lineItems.create;
      expect(lines[0].accountId).toBe("holding-asset-1");
      expect(lines[0].debit.toString()).toBe("2000");
      expect(lines[1].accountId).toBe("obe-acct");
      expect(lines[1].credit.toString()).toBe("2000");
    });

    it("creates POSTED adjusting JE in reverse direction on balance decrease for ASSET", async () => {
      await generateAdjustingJE(mockTx, {
        entityId: "entity-1",
        userId: "user-1",
        holdingAccountId: "holding-asset-1",
        holdingAccountType: "ASSET",
        oldBalance: 12000,
        newBalance: 10000,
        date: new Date("2026-04-01"),
      });

      expect(mockTx.journalEntry.create).toHaveBeenCalledTimes(1);
      const args = mockTx.journalEntry.create.mock.calls[0][0];
      const lines = args.data.lineItems.create;
      // Decrease on ASSET -> REVERSE direction: debit OBE, credit holding
      expect(lines[0].accountId).toBe("obe-acct");
      expect(lines[0].debit.toString()).toBe("2000");
      expect(lines[1].accountId).toBe("holding-asset-1");
      expect(lines[1].credit.toString()).toBe("2000");
    });

    it("updates AccountBalance for both debit and credit accounts and writes audit entry", async () => {
      await generateAdjustingJE(mockTx, {
        entityId: "entity-1",
        userId: "user-1",
        holdingAccountId: "holding-asset-1",
        holdingAccountType: "ASSET",
        oldBalance: 5000,
        newBalance: 8000,
        date: new Date("2026-04-01"),
      });

      // Two upserts: one per JE leg (debit account + credit account)
      expect(mockTx.accountBalance.upsert).toHaveBeenCalledTimes(2);
      // Exactly one audit entry per posted JE
      expect(mockTx.journalEntryAudit.create).toHaveBeenCalledTimes(1);
      const auditArgs = mockTx.journalEntryAudit.create.mock.calls[0][0];
      expect(auditArgs.data.action).toBe("POSTED");
      expect(auditArgs.data.userId).toBe("user-1");
      expect(auditArgs.data.journalEntryId).toBe("je-123");
    });
  });
});
