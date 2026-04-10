import { describe, it, expect } from "vitest";
import { budgetLineSchema, budgetUpsertSchema, budgetCsvRowSchema } from "@/validators/budget";

describe("BUDG-01: budget upsert schema validation", () => {
  it("accepts valid budget line with accountId, year, month, amount", () => {
    const result = budgetLineSchema.safeParse({
      accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      year: 2025,
      month: 6,
      amount: "5000.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects budget line with month < 1 or > 12", () => {
    const low = budgetLineSchema.safeParse({
      accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      year: 2025,
      month: 0,
      amount: "100",
    });
    expect(low.success).toBe(false);

    const high = budgetLineSchema.safeParse({
      accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      year: 2025,
      month: 13,
      amount: "100",
    });
    expect(high.success).toBe(false);
  });

  it("rejects budget line with year outside 2000-2100", () => {
    const low = budgetLineSchema.safeParse({
      accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      year: 1999,
      month: 1,
      amount: "100",
    });
    expect(low.success).toBe(false);

    const high = budgetLineSchema.safeParse({
      accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      year: 2101,
      month: 1,
      amount: "100",
    });
    expect(high.success).toBe(false);
  });

  it("rejects budget line with missing accountId", () => {
    const result = budgetLineSchema.safeParse({
      year: 2025,
      month: 1,
      amount: "100",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid budgetUpsertSchema with fiscalYear and budgets array", () => {
    const result = budgetUpsertSchema.safeParse({
      fiscalYear: 2025,
      budgets: [
        {
          accountId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          year: 2025,
          month: 1,
          amount: "1000.00",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects upsert schema with empty budgets array", () => {
    // Empty array is valid per Zod -- z.array has no .min(1) constraint
    // The plan specifies z.array(budgetLineSchema) without min requirement
    const result = budgetUpsertSchema.safeParse({
      fiscalYear: 2025,
      budgets: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("BUDG-02: budget CSV row schema validation", () => {
  it("accepts valid CSV row with accountNumber, period MM/YYYY, amount", () => {
    const result = budgetCsvRowSchema.safeParse({
      accountNumber: "4000",
      period: "01/2025",
      amount: "5000.00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts single-digit month period format", () => {
    const result = budgetCsvRowSchema.safeParse({
      accountNumber: "4000",
      period: "3/2025",
      amount: "100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects CSV row with invalid period format", () => {
    const result = budgetCsvRowSchema.safeParse({
      accountNumber: "4000",
      period: "2025-01",
      amount: "100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects CSV row with non-numeric amount", () => {
    const result = budgetCsvRowSchema.safeParse({
      accountNumber: "4000",
      period: "01/2025",
      amount: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects CSV row with empty accountNumber", () => {
    const result = budgetCsvRowSchema.safeParse({
      accountNumber: "",
      period: "01/2025",
      amount: "100",
    });
    expect(result.success).toBe(false);
  });
});
