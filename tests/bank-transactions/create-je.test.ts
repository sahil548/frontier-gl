import { describe, it, expect } from "vitest";
import { createJournalEntryFromTransaction } from "@/lib/bank-transactions/create-je";

describe("createJournalEntryFromTransaction", () => {
  const baseParams = {
    bankAccountId: "bank-acc-id",
    entityId: "entity-1",
    userId: "user-1",
    postImmediately: false,
  };

  it("produces balanced debit/credit lines for an expense (negative amount)", () => {
    const result = createJournalEntryFromTransaction({
      ...baseParams,
      transaction: {
        id: "t1",
        date: new Date("2025-01-15"),
        description: "OFFICE SUPPLIES",
        amount: -120.5, // expense: money leaving bank
        accountId: "expense-acc-id",
      },
    });

    expect(result.description).toBe("OFFICE SUPPLIES");
    expect(result.lineItems).toHaveLength(2);

    // For expense (negative): debit expense account, credit bank account
    const debitLine = result.lineItems.find((l) => Number(l.debit) > 0);
    const creditLine = result.lineItems.find((l) => Number(l.credit) > 0);

    expect(debitLine).toBeDefined();
    expect(creditLine).toBeDefined();
    expect(debitLine!.accountId).toBe("expense-acc-id");
    expect(creditLine!.accountId).toBe("bank-acc-id");
    expect(Number(debitLine!.debit)).toBe(120.5);
    expect(Number(creditLine!.credit)).toBe(120.5);
  });

  it("produces balanced debit/credit lines for a deposit (positive amount)", () => {
    const result = createJournalEntryFromTransaction({
      ...baseParams,
      transaction: {
        id: "t2",
        date: new Date("2025-01-16"),
        description: "CLIENT PAYMENT",
        amount: 5000, // deposit: money entering bank
        accountId: "income-acc-id",
      },
    });

    expect(result.lineItems).toHaveLength(2);

    // For deposit (positive): debit bank account, credit income account
    const debitLine = result.lineItems.find((l) => Number(l.debit) > 0);
    const creditLine = result.lineItems.find((l) => Number(l.credit) > 0);

    expect(debitLine!.accountId).toBe("bank-acc-id");
    expect(creditLine!.accountId).toBe("income-acc-id");
    expect(Number(debitLine!.debit)).toBe(5000);
    expect(Number(creditLine!.credit)).toBe(5000);
  });

  it("handles split transactions (multiple debit lines, one credit line to bank)", () => {
    const result = createJournalEntryFromTransaction({
      ...baseParams,
      transaction: {
        id: "t3",
        date: new Date("2025-01-17"),
        description: "AMAZON ORDER",
        amount: -500, // expense
        accountId: null, // split, no single account
      },
      splits: [
        { accountId: "office-supplies-id", amount: 300, memo: "Office supplies" },
        { accountId: "computer-equip-id", amount: 200, memo: "Equipment" },
      ],
    });

    // 2 debit lines + 1 credit line = 3 total
    expect(result.lineItems).toHaveLength(3);

    const debitLines = result.lineItems.filter((l) => Number(l.debit) > 0);
    const creditLines = result.lineItems.filter((l) => Number(l.credit) > 0);

    expect(debitLines).toHaveLength(2);
    expect(creditLines).toHaveLength(1);
    expect(creditLines[0].accountId).toBe("bank-acc-id");
    expect(Number(creditLines[0].credit)).toBe(500);

    // Split debit lines
    const totalDebit = debitLines.reduce((sum, l) => sum + Number(l.debit), 0);
    expect(totalDebit).toBe(500);
  });

  it("throws when split amounts do not sum to original transaction amount", () => {
    expect(() =>
      createJournalEntryFromTransaction({
        ...baseParams,
        transaction: {
          id: "t4",
          date: new Date("2025-01-17"),
          description: "BAD SPLIT",
          amount: -500,
          accountId: null,
        },
        splits: [
          { accountId: "acc1", amount: 300 },
          { accountId: "acc2", amount: 100 }, // sum = 400, not 500
        ],
      })
    ).toThrow();
  });

  it("supports postImmediately flag (POSTED vs DRAFT status)", () => {
    const draft = createJournalEntryFromTransaction({
      ...baseParams,
      postImmediately: false,
      transaction: {
        id: "t5",
        date: new Date("2025-01-15"),
        description: "TEST",
        amount: -100,
        accountId: "acc1",
      },
    });
    expect(draft.status).toBe("DRAFT");

    const posted = createJournalEntryFromTransaction({
      ...baseParams,
      postImmediately: true,
      transaction: {
        id: "t6",
        date: new Date("2025-01-15"),
        description: "TEST",
        amount: -100,
        accountId: "acc1",
      },
    });
    expect(posted.status).toBe("POSTED");
  });
});
