import { describe, it, expect, vi } from "vitest";
import { createJournalEntryFromTransaction } from "@/lib/bank-transactions/create-je";
import { Prisma } from "@/generated/prisma/client";

// Mock the prisma client module so postJournalEntryInTx can be imported
// without pulling a real DB client. The wrapper-side prisma.$transaction
// is irrelevant here — we exercise the tx-aware helper directly.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

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

  describe("position-level bankAccountId resolution", () => {
    it("uses position accountId when available (migrated holding)", () => {
      // Simulate what the route does: resolve position's GL leaf account as bankAccountId
      const positionAccountId = "position-leaf-gl-id";
      const subledgerAccountId = "holding-summary-gl-id";

      // Route resolution logic: position?.accountId ?? subledgerItem.accountId
      const defaultPosition = { accountId: positionAccountId };
      const bankAccountId = defaultPosition?.accountId ?? subledgerAccountId;

      const result = createJournalEntryFromTransaction({
        ...baseParams,
        bankAccountId,
        transaction: {
          id: "t-pos-1",
          date: new Date("2025-02-01"),
          description: "ATM WITHDRAWAL",
          amount: -200,
          accountId: "expense-acc-id",
        },
      });

      // The bank (credit) side should use the position's GL leaf account
      const creditLine = result.lineItems.find((l) => Number(l.credit) > 0);
      expect(creditLine!.accountId).toBe("position-leaf-gl-id");
    });

    it("falls back to subledgerItem accountId when no position exists (legacy data)", () => {
      // Simulate unmigrated holding: no position with accountId
      const subledgerAccountId = "legacy-holding-gl-id";

      // Route resolution: undefined?.accountId ?? subledgerItem.accountId
      const defaultPosition = undefined;
      const bankAccountId =
        (defaultPosition as any)?.accountId ?? subledgerAccountId;

      const result = createJournalEntryFromTransaction({
        ...baseParams,
        bankAccountId,
        transaction: {
          id: "t-pos-2",
          date: new Date("2025-02-02"),
          description: "DIRECT DEPOSIT",
          amount: 3000,
          accountId: "income-acc-id",
        },
      });

      // The bank (debit) side should fall back to subledgerItem.accountId
      const debitLine = result.lineItems.find((l) => Number(l.debit) > 0);
      expect(debitLine!.accountId).toBe("legacy-holding-gl-id");
    });

    it("falls back when position has null accountId (partially migrated)", () => {
      // Position exists but accountId is null (migration not yet backfilled)
      const subledgerAccountId = "holding-summary-gl-id";

      const defaultPosition = { accountId: null };
      const bankAccountId =
        defaultPosition?.accountId ?? subledgerAccountId;

      const result = createJournalEntryFromTransaction({
        ...baseParams,
        bankAccountId,
        transaction: {
          id: "t-pos-3",
          date: new Date("2025-02-03"),
          description: "PAYMENT",
          amount: -50,
          accountId: "expense-acc-id",
        },
      });

      // Should fall back to subledgerItem.accountId
      const creditLine = result.lineItems.find((l) => Number(l.credit) > 0);
      expect(creditLine!.accountId).toBe("holding-summary-gl-id");
    });
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

/**
 * BANK-03 (Phase 14-03) audit-ordering regression.
 *
 * The bank-tx POST handler at
 *   src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts
 * runs the JE create + post + bank-tx update inside a single outer
 * `prisma.$transaction(async (tx) => { ... })`. Pre-refactor it inlined the
 * AccountBalance.upsert loop and wrote the POSTED audit BEFORE the CREATED
 * audit. Phase 14-03 delegates posting to `postJournalEntryInTx` and moves
 * the CREATED audit to run BEFORE the post call — flipping the order to
 * the conventional CREATED → POSTED.
 *
 * This is a Pattern A "mirror-inline" test: the route handler logic is not
 * extractable into a callable function (it owns auth, validation, and the
 * outer $transaction), so we recreate the inner sequence here and assert
 * the audit ordering produced by `postJournalEntryInTx` plus the bank-tx
 * route's pre-post CREATED audit call.
 */
describe("BANK-03: bank-tx POST audit ordering (post-refactor)", () => {
  it("writes CREATED audit before POSTED audit when postImmediately=true", async () => {
    // Import inside the test so vi.mock("@/lib/db/prisma") is in effect.
    const { postJournalEntryInTx } = await import("@/lib/journal-entries/post");

    const auditCalls: Array<{ action: string; userId: string }> = [];

    // Build a tx mock that mirrors the shape postJournalEntryInTx + the
    // bank-tx route handler interact with. Capture audit creates in order.
    const mockTx = {
      journalEntry: {
        // Bank-tx route calls tx.journalEntry.create first to insert the JE.
        create: vi.fn(async () => ({
          id: "je_bank_tx_1",
          status: "DRAFT",
          lineItems: [
            {
              accountId: "expense-acc-id",
              debit: new Prisma.Decimal("120.50"),
              credit: new Prisma.Decimal("0.00"),
            },
            {
              accountId: "bank-acc-id",
              debit: new Prisma.Decimal("0.00"),
              credit: new Prisma.Decimal("120.50"),
            },
          ],
        })),
        // postJournalEntryInTx calls findUniqueOrThrow to lock + load the JE.
        findUniqueOrThrow: vi.fn(async () => ({
          id: "je_bank_tx_1",
          status: "DRAFT",
          lineItems: [
            {
              accountId: "expense-acc-id",
              debit: new Prisma.Decimal("120.50"),
              credit: new Prisma.Decimal("0.00"),
            },
            {
              accountId: "bank-acc-id",
              debit: new Prisma.Decimal("0.00"),
              credit: new Prisma.Decimal("120.50"),
            },
          ],
        })),
        // postJournalEntryInTx flips status DRAFT -> POSTED.
        update: vi.fn(async () => ({})),
      },
      journalEntryAudit: {
        create: vi.fn(async ({ data }: { data: { action: string; userId: string } }) => {
          auditCalls.push({ action: data.action, userId: data.userId });
          return data;
        }),
      },
      accountBalance: {
        upsert: vi.fn(async () => ({})),
      },
      bankTransaction: {
        update: vi.fn(async () => ({})),
      },
    } as unknown as Prisma.TransactionClient;

    // Mirror the post-refactor inner sequence of the bank-tx POST handler:
    //   1. tx.journalEntry.create (status: DRAFT)
    //   2. tx.journalEntryAudit.create (action: CREATED)        ← FIRST audit
    //   3. await postJournalEntryInTx(tx, je.id, userId)
    //         → tx.journalEntry.update (status: POSTED)
    //         → tx.accountBalance.upsert per line item
    //         → tx.journalEntryAudit.create (action: POSTED)    ← SECOND audit
    //   4. tx.bankTransaction.update (status: POSTED, etc.)
    const userId = "user_clerk_test";

    const je = await mockTx.journalEntry.create({
      data: {
        entityId: "entity-1",
        entryNumber: "JE-001",
        date: new Date("2025-01-15"),
        description: "OFFICE SUPPLIES",
        status: "DRAFT",
        createdBy: userId,
        lineItems: { create: [] },
      },
    });

    await mockTx.journalEntryAudit.create({
      data: { journalEntryId: je.id, action: "CREATED", userId },
    });

    await postJournalEntryInTx(mockTx, je.id, userId);

    await mockTx.bankTransaction.update({
      where: { id: "bank_tx_1" },
      data: { status: "POSTED" },
    });

    // Two audits total: CREATED then POSTED, in that exact order.
    expect(auditCalls).toHaveLength(2);
    expect(auditCalls[0].action).toBe("CREATED");
    expect(auditCalls[1].action).toBe("POSTED");
    expect(auditCalls.every((a) => a.userId === userId)).toBe(true);
  });

  it("writes only CREATED audit when postImmediately=false (no post call)", async () => {
    // Sanity: when the route does NOT call postJournalEntryInTx (e.g.,
    // postImmediately=false split workflow), only the CREATED audit fires.
    const auditCalls: Array<{ action: string }> = [];

    const mockTx = {
      journalEntry: {
        create: vi.fn(async () => ({
          id: "je_draft_1",
          status: "DRAFT",
          lineItems: [],
        })),
      },
      journalEntryAudit: {
        create: vi.fn(async ({ data }: { data: { action: string } }) => {
          auditCalls.push({ action: data.action });
          return data;
        }),
      },
      bankTransaction: {
        update: vi.fn(async () => ({})),
      },
    } as unknown as Prisma.TransactionClient;

    const userId = "user_clerk_test";
    const je = await mockTx.journalEntry.create({
      data: {
        entityId: "entity-1",
        entryNumber: "JE-002",
        date: new Date("2025-01-15"),
        description: "DRAFT EXPENSE",
        status: "DRAFT",
        createdBy: userId,
        lineItems: { create: [] },
      },
    });

    await mockTx.journalEntryAudit.create({
      data: { journalEntryId: je.id, action: "CREATED", userId },
    });

    // No postJournalEntryInTx call here — DRAFT path matches today's behavior.

    await mockTx.bankTransaction.update({
      where: { id: "bank_tx_2" },
      data: { status: "CATEGORIZED" },
    });

    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0].action).toBe("CREATED");
  });
});
