import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPositionGLAccount } from "@/lib/holdings/position-gl";

// Mock Prisma transaction client
function mockTx() {
  return {
    account: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    accountBalance: {
      create: vi.fn(),
    },
  };
}

describe("createPositionGLAccount", () => {
  let tx: ReturnType<typeof mockTx>;

  beforeEach(() => {
    tx = mockTx();
  });

  it("creates account with +10 stepping when no siblings exist", async () => {
    tx.account.findUnique.mockResolvedValue({
      id: "holding-acc-1",
      number: "11100",
    });
    tx.account.findMany.mockResolvedValue([]); // no siblings
    tx.account.create.mockResolvedValue({
      id: "new-pos-acc",
      number: "11110",
      name: "Cash",
      type: "ASSET",
      parentId: "holding-acc-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    const result = await createPositionGLAccount(
      tx as never,
      "entity-1",
      "holding-acc-1",
      "Cash",
      "ASSET"
    );

    expect(result.number).toBe("11110");
    expect(result.name).toBe("Cash");
    expect(tx.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "entity-1",
        number: "11110",
        name: "Cash",
        type: "ASSET",
        parentId: "holding-acc-1",
      }),
    });
    expect(tx.accountBalance.create).toHaveBeenCalledWith({
      data: { accountId: "new-pos-acc", balance: 0 },
    });
  });

  it("creates account with +10 stepping from last sibling", async () => {
    tx.account.findUnique.mockResolvedValue({
      id: "holding-acc-1",
      number: "11100",
    });
    tx.account.findMany.mockResolvedValue([
      { id: "sibling-1", number: "11120" },
    ]);
    tx.account.create.mockResolvedValue({
      id: "new-pos-acc",
      number: "11130",
      name: "AAPL",
      type: "ASSET",
      parentId: "holding-acc-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    const result = await createPositionGLAccount(
      tx as never,
      "entity-1",
      "holding-acc-1",
      "AAPL",
      "ASSET"
    );

    expect(result.number).toBe("11130");
    expect(tx.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ number: "11130", name: "AAPL" }),
    });
  });

  it("throws if holding account not found", async () => {
    tx.account.findUnique.mockResolvedValue(null);

    await expect(
      createPositionGLAccount(
        tx as never,
        "entity-1",
        "missing-id",
        "Cash",
        "ASSET"
      )
    ).rejects.toThrow("Holding account not found");
  });

  it("creates AccountBalance with balance 0", async () => {
    tx.account.findUnique.mockResolvedValue({
      id: "holding-acc-1",
      number: "12200",
    });
    tx.account.findMany.mockResolvedValue([]);
    tx.account.create.mockResolvedValue({
      id: "new-acc",
      number: "12210",
      name: "Cash",
      type: "ASSET",
      parentId: "holding-acc-1",
      entityId: "entity-1",
    });
    tx.accountBalance.create.mockResolvedValue({});

    await createPositionGLAccount(
      tx as never,
      "entity-1",
      "holding-acc-1",
      "Cash",
      "ASSET"
    );

    expect(tx.accountBalance.create).toHaveBeenCalledWith({
      data: { accountId: "new-acc", balance: 0 },
    });
  });
});
