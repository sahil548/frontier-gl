import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHoldingSummaryAccount } from "@/lib/holdings/position-gl";

// Mock Prisma transaction client
function mockTx() {
  return {
    account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    accountBalance: {
      create: vi.fn(),
    },
  };
}

describe("createHoldingSummaryAccount", () => {
  let tx: ReturnType<typeof mockTx>;

  beforeEach(() => {
    tx = mockTx();
  });

  it("creates summary account with +100 stepping when no siblings exist", async () => {
    tx.account.findFirst.mockResolvedValue({
      id: "type-parent-1",
      number: "11000",
    });
    tx.account.findMany.mockResolvedValue([]); // no siblings
    tx.account.create.mockResolvedValue({
      id: "new-summary-acc",
      number: "11100",
      name: "Chase Operating",
      type: "ASSET",
      parentId: "type-parent-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    const result = await createHoldingSummaryAccount(
      tx as never,
      "entity-1",
      "11000",
      "Chase Operating",
      "ASSET"
    );

    expect(result.number).toBe("11100");
    expect(result.name).toBe("Chase Operating");
    expect(tx.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "entity-1",
        number: "11100",
        name: "Chase Operating",
        type: "ASSET",
        parentId: "type-parent-1",
      }),
    });
    expect(tx.accountBalance.create).toHaveBeenCalledWith({
      data: { accountId: "new-summary-acc", balance: 0 },
    });
  });

  it("creates summary account with +100 stepping from last sibling", async () => {
    tx.account.findFirst.mockResolvedValue({
      id: "type-parent-1",
      number: "11000",
    });
    tx.account.findMany.mockResolvedValue([
      { id: "sibling-1", number: "11300" },
    ]);
    tx.account.create.mockResolvedValue({
      id: "new-summary-acc",
      number: "11400",
      name: "Schwab Brokerage",
      type: "ASSET",
      parentId: "type-parent-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    const result = await createHoldingSummaryAccount(
      tx as never,
      "entity-1",
      "11000",
      "Schwab Brokerage",
      "ASSET"
    );

    expect(result.number).toBe("11400");
    expect(tx.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ number: "11400", name: "Schwab Brokerage" }),
    });
  });

  it("throws if type parent account not found", async () => {
    tx.account.findFirst.mockResolvedValue(null);

    await expect(
      createHoldingSummaryAccount(
        tx as never,
        "entity-1",
        "99000",
        "Unknown",
        "ASSET"
      )
    ).rejects.toThrow("GL parent account 99000 not found");
  });

  it("creates AccountBalance with balance 0 for new summary account", async () => {
    tx.account.findFirst.mockResolvedValue({
      id: "type-parent-1",
      number: "22000",
    });
    tx.account.findMany.mockResolvedValue([]);
    tx.account.create.mockResolvedValue({
      id: "new-summary-acc",
      number: "22100",
      name: "Mortgage Loan",
      type: "LIABILITY",
      parentId: "type-parent-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    await createHoldingSummaryAccount(
      tx as never,
      "entity-1",
      "22000",
      "Mortgage Loan",
      "LIABILITY"
    );

    expect(tx.accountBalance.create).toHaveBeenCalledWith({
      data: { accountId: "new-summary-acc", balance: 0 },
    });
  });
});
