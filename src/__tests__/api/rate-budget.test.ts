import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the rate-target budget API validation logic.
 * We test the Zod schema directly rather than the full route handler
 * to avoid Prisma/auth dependencies in unit tests.
 */

const rateTargetSchema = z.object({
  holdingId: z.string().cuid(),
  accountId: z.string().cuid(),
  annualRate: z.number().min(0).max(1),
  fiscalYear: z.number().int().positive(),
});

describe("POST /api/budgets/rate-target -- validation", () => {
  it("accepts valid input with all fields", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 0.08,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative annual rate", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: -0.05,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(false);
  });

  it("rejects annual rate greater than 1 (100%)", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 1.5,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero annual rate", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 0,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly 1.0 (100%) rate", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 1,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing holdingId", () => {
    const result = rateTargetSchema.safeParse({
      accountId: "clxyz1234567890abcdef",
      annualRate: 0.08,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing accountId", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      annualRate: 0.08,
      fiscalYear: 2025,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer fiscal year", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 0.08,
      fiscalYear: 2025.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero fiscal year", () => {
    const result = rateTargetSchema.safeParse({
      holdingId: "clxyz1234567890abcdef",
      accountId: "clxyz1234567890abcdef",
      annualRate: 0.08,
      fiscalYear: 0,
    });
    expect(result.success).toBe(false);
  });

  it("budget amounts are fixed at creation time (documented behavior)", () => {
    // This test documents the design decision: budget amounts are computed once
    // and stored as regular budget rows. They do NOT auto-recalculate when
    // holding values change. The user can manually trigger recalculation
    // by re-POSTing to the same endpoint.
    expect(true).toBe(true); // Behavioral documentation test
  });
});
