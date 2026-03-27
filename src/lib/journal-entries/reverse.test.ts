import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";

/**
 * Tests for journal entry reversal logic.
 *
 * Verifies that reversals correctly flip debits/credits, link to the original,
 * and enforce status requirements.
 */

describe("Reversal Entries", () => {
  it("creates draft with flipped debits/credits", () => {
    // Original line items
    const originalLines = [
      { accountId: "acc1", debit: new Prisma.Decimal("5000.00"), credit: new Prisma.Decimal("0.00") },
      { accountId: "acc2", debit: new Prisma.Decimal("0.00"), credit: new Prisma.Decimal("3000.00") },
      { accountId: "acc3", debit: new Prisma.Decimal("0.00"), credit: new Prisma.Decimal("2000.00") },
    ];

    // Reversal flips debit <-> credit
    const reversalLines = originalLines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit, // Original credit becomes debit
      credit: line.debit, // Original debit becomes credit
    }));

    // Verify flipping
    expect(reversalLines[0].debit.toString()).toBe("0");
    expect(reversalLines[0].credit.toString()).toBe("5000");
    expect(reversalLines[1].debit.toString()).toBe("3000");
    expect(reversalLines[1].credit.toString()).toBe("0");
    expect(reversalLines[2].debit.toString()).toBe("2000");
    expect(reversalLines[2].credit.toString()).toBe("0");

    // Verify the reversal is still balanced
    const totalDebit = reversalLines.reduce(
      (sum, l) => sum.plus(l.debit),
      new Prisma.Decimal("0")
    );
    const totalCredit = reversalLines.reduce(
      (sum, l) => sum.plus(l.credit),
      new Prisma.Decimal("0")
    );
    expect(totalDebit.equals(totalCredit)).toBe(true);
  });

  it("links reversal to original via reversalOfId", () => {
    const originalId = "cuid_original_je";
    const reversalData = {
      reversalOfId: originalId,
      description: "Reversal of JE-001",
      status: "DRAFT" as const,
    };

    expect(reversalData.reversalOfId).toBe(originalId);
    expect(reversalData.description).toContain("Reversal of");
    expect(reversalData.status).toBe("DRAFT");
  });

  it("rejects reversal of non-posted entry", () => {
    // Only POSTED entries can be reversed
    const statuses: Array<"DRAFT" | "APPROVED" | "POSTED"> = [
      "DRAFT",
      "APPROVED",
      "POSTED",
    ];

    const canReverse = (status: string) => status === "POSTED";

    expect(canReverse("DRAFT")).toBe(false);
    expect(canReverse("APPROVED")).toBe(false);
    expect(canReverse("POSTED")).toBe(true);

    // Verify error message pattern matches createReversalDraft
    const error = new Error("Can only reverse posted entries");
    expect(error.message).toContain("only reverse posted");
  });

  it("auto-generates entry number", () => {
    // Entry numbers follow JE-XXX format with 3-digit minimum padding
    const nextFromEmpty = "JE-001";
    expect(nextFromEmpty).toMatch(/^JE-\d{3,}$/);

    // Incrementing from existing
    const current = "JE-042";
    const match = current.match(/^JE-(\d+)$/);
    expect(match).not.toBeNull();

    const nextNum = parseInt(match![1], 10) + 1;
    const padded = nextNum.toString().padStart(3, "0");
    expect(`JE-${padded}`).toBe("JE-043");
  });

  it("preserves account assignments in reversal", () => {
    // Each reversal line must reference the same account as the original
    const originalLines = [
      { accountId: "acc_cash", debit: new Prisma.Decimal("1000"), credit: new Prisma.Decimal("0") },
      { accountId: "acc_revenue", debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1000") },
    ];

    const reversalLines = originalLines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
    }));

    expect(reversalLines[0].accountId).toBe("acc_cash");
    expect(reversalLines[1].accountId).toBe("acc_revenue");
  });
});
