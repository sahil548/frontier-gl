import { describe, it, expect } from "vitest";
import { journalEntrySchema } from "./journal-entry";

describe("Journal Entry Validators", () => {
  const validEntry = {
    date: "2024-01-15",
    description: "Office supplies purchase",
    lineItems: [
      { accountId: "acc1", debit: "100.00", credit: "0" },
      { accountId: "acc2", debit: "0", credit: "100.00" },
    ],
  };

  it("accepts valid balanced journal entry", () => {
    const result = journalEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it("accepts entry with multiple line items", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Split transaction",
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "50.00", credit: "0" },
        { accountId: "acc3", debit: "0", credit: "150.00" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unbalanced entry (debits != credits)", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Unbalanced",
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "50.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects entry with fewer than 2 line items", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "One line",
      lineItems: [{ accountId: "acc1", debit: "100.00", credit: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects line items where both debit and credit are zero", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Zero line",
      lineItems: [
        { accountId: "acc1", debit: "0", credit: "0" },
        { accountId: "acc2", debit: "100.00", credit: "0" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative debit amount", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Negative debit",
      lineItems: [
        { accountId: "acc1", debit: "-100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "100.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative credit amount", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Negative credit",
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "-100.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = journalEntrySchema.safeParse({
      date: "",
      description: "No date",
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "100.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "",
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "100.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 characters", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "A".repeat(501),
      lineItems: [
        { accountId: "acc1", debit: "100.00", credit: "0" },
        { accountId: "acc2", debit: "0", credit: "100.00" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("handles precise decimal arithmetic (0.1 + 0.2 case)", () => {
    const result = journalEntrySchema.safeParse({
      date: "2024-01-15",
      description: "Precision test",
      lineItems: [
        { accountId: "acc1", debit: "0.1", credit: "0" },
        { accountId: "acc2", debit: "0.2", credit: "0" },
        { accountId: "acc3", debit: "0", credit: "0.3" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
