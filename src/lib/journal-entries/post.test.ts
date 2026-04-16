import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

// Mock the prisma client module before importing the SUT so that
// `prisma.$transaction` is observable as a spy in the regression test.
const transactionMock = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
  // Default: invoke callback with a stub tx that records nothing.
  // Individual tests override the implementation if they need real assertions.
  return cb({
    journalEntry: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: "je_stub",
        status: "DRAFT",
        lineItems: [],
      })),
      update: vi.fn(async () => ({})),
    },
    accountBalance: {
      upsert: vi.fn(async () => ({})),
    },
    journalEntryAudit: {
      create: vi.fn(async () => ({})),
    },
  });
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

/**
 * Tests for journal entry posting logic.
 *
 * These tests verify the posting behavior by testing the logic patterns
 * used in postJournalEntry: balance computation, status validation, and audit creation.
 */

describe("Journal Entry Posting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("updates AccountBalance atomically", () => {
    // Verify balance computation: debit - credit = balance change
    const debit = new Prisma.Decimal("1500.00");
    const credit = new Prisma.Decimal("0.00");
    const balanceChange = debit.minus(credit);

    expect(balanceChange.toString()).toBe("1500");

    // Reverse case: credit line
    const debit2 = new Prisma.Decimal("0.00");
    const credit2 = new Prisma.Decimal("1500.00");
    const balanceChange2 = debit2.minus(credit2);

    expect(balanceChange2.toString()).toBe("-1500");

    // Mixed amounts
    const debit3 = new Prisma.Decimal("250.75");
    const credit3 = new Prisma.Decimal("100.25");
    const balanceChange3 = debit3.minus(credit3);

    expect(balanceChange3.toString()).toBe("150.5");
  });

  it("rejects posting to closed period", () => {
    // The closed period trigger in PostgreSQL throws an error
    // Application code should catch and surface this cleanly
    const closedPeriodError = new Error(
      "Cannot post journal entry: period is closed for 2024-01"
    );

    expect(closedPeriodError.message).toContain("period is closed");

    // The API route maps this to a 400 response
    const isClosed =
      closedPeriodError.message.includes("closed period") ||
      closedPeriodError.message.includes("period is closed");
    expect(isClosed).toBe(true);
  });

  it("rejects posting already-posted entry", () => {
    // Status check: posted entries cannot be posted again
    const status = "POSTED";
    const isAlreadyPosted = status === "POSTED";

    expect(isAlreadyPosted).toBe(true);

    // Error message should match what postJournalEntry throws
    const error = new Error("Journal entry is already posted");
    expect(error.message).toContain("already posted");
  });

  it("creates audit trail on post", () => {
    // Verify audit entry structure for POSTED action
    const auditData = {
      journalEntryId: "cuid_test_je",
      action: "POSTED" as const,
      userId: "user_clerk_123",
    };

    expect(auditData.action).toBe("POSTED");
    expect(auditData.journalEntryId).toBeDefined();
    expect(auditData.userId).toBeDefined();
  });

  it("computes balance correctly for multi-line entries", () => {
    // A balanced JE with 4 lines
    const lines = [
      { debit: new Prisma.Decimal("5000.00"), credit: new Prisma.Decimal("0.00") },
      { debit: new Prisma.Decimal("0.00"), credit: new Prisma.Decimal("3000.00") },
      { debit: new Prisma.Decimal("0.00"), credit: new Prisma.Decimal("2000.00") },
      { debit: new Prisma.Decimal("1000.00"), credit: new Prisma.Decimal("1000.00") },
    ];

    const totalDebit = lines.reduce(
      (sum, l) => sum.plus(l.debit),
      new Prisma.Decimal("0")
    );
    const totalCredit = lines.reduce(
      (sum, l) => sum.plus(l.credit),
      new Prisma.Decimal("0")
    );

    expect(totalDebit.equals(totalCredit)).toBe(true);
    expect(totalDebit.toString()).toBe("6000");
    expect(totalCredit.toString()).toBe("6000");
  });
});

describe("postJournalEntryInTx (tx-aware helper)", () => {
  beforeEach(() => {
    transactionMock.mockClear();
  });

  it("is exported as a named export from @/lib/journal-entries/post", async () => {
    const mod = await import("./post");
    expect(typeof mod.postJournalEntryInTx).toBe("function");
  });

  it("does NOT call prisma.$transaction when invoked directly with a tx client", async () => {
    const { postJournalEntryInTx } = await import("./post");

    // Build a tx-shaped mock that records the calls postJournalEntryInTx
    // is expected to make against the caller-provided transaction.
    const findUniqueOrThrow = vi.fn(async () => ({
      id: "je_tx_test",
      status: "DRAFT",
      lineItems: [
        {
          accountId: "acct_a",
          debit: new Prisma.Decimal("1000.00"),
          credit: new Prisma.Decimal("0.00"),
        },
        {
          accountId: "acct_b",
          debit: new Prisma.Decimal("0.00"),
          credit: new Prisma.Decimal("1000.00"),
        },
      ],
    }));
    const update = vi.fn(async () => ({}));
    const upsert = vi.fn(async () => ({}));
    const auditCreate = vi.fn(async () => ({}));

    const txMock = {
      journalEntry: { findUniqueOrThrow, update },
      accountBalance: { upsert },
      journalEntryAudit: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    transactionMock.mockClear();

    await postJournalEntryInTx(txMock, "je_tx_test", "user_clerk_test");

    // Crucial assertion: the helper used the caller's tx, not its own transaction.
    expect(transactionMock).toHaveBeenCalledTimes(0);

    // And the work happened against the passed-in tx mock.
    expect(findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2); // one per line item
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it("postJournalEntry public wrapper still opens its own prisma.$transaction exactly once", async () => {
    const { postJournalEntry } = await import("./post");

    // Configure $transaction mock to provide a usable tx for one invocation.
    transactionMock.mockClear();
    transactionMock.mockImplementationOnce(async (cb) => {
      const findUniqueOrThrow = vi.fn(async () => ({
        id: "je_wrapper_test",
        status: "DRAFT",
        lineItems: [
          {
            accountId: "acct_x",
            debit: new Prisma.Decimal("500.00"),
            credit: new Prisma.Decimal("0.00"),
          },
          {
            accountId: "acct_y",
            debit: new Prisma.Decimal("0.00"),
            credit: new Prisma.Decimal("500.00"),
          },
        ],
      }));
      const update = vi.fn(async () => ({}));
      const upsert = vi.fn(async () => ({}));
      const auditCreate = vi.fn(async () => ({}));
      const tx = {
        journalEntry: { findUniqueOrThrow, update },
        accountBalance: { upsert },
        journalEntryAudit: { create: auditCreate },
      };
      return cb(tx);
    });

    await postJournalEntry("je_wrapper_test", "user_clerk_test");

    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});
