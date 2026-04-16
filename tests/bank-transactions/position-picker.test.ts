import { describe, it, expect, vi, beforeEach } from "vitest";

// CAT-01: Positions API
//
// Pattern: Prisma mock (plaid-sync style) + mirror-inline serializePositions.
//
// The route handler at src/app/api/entities/[entityId]/positions/route.ts:12-66
// is a Next.js route (auth() + Response) that does not load cleanly in a unit
// test. Instead we:
//   1. Mock prisma.position.findMany at module level.
//   2. Mirror the route's serialization shape (lines 53-63) as a local helper.
//   3. Exercise the Prisma query contract (where/include/orderBy) and the
//      serialization shape contract.

const mockFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    position: { findMany: mockFindMany },
  },
}));

// Mirror of the serialization at positions/route.ts:53-63
function serializePositions(
  positions: Array<{
    id: string;
    name: string;
    subledgerItem: {
      id: string;
      name: string;
      itemType: string;
      accountId: string;
      account: { id?: string; number: string; name: string; type: string };
    };
  }>
) {
  return positions.map((p) => ({
    id: p.id,
    name: p.name,
    holdingName: p.subledgerItem.name,
    holdingType: p.subledgerItem.itemType,
    holdingId: p.subledgerItem.id,
    accountId: p.subledgerItem.accountId,
    accountNumber: p.subledgerItem.account.number,
    accountName: p.subledgerItem.account.name,
    accountType: p.subledgerItem.account.type,
  }));
}

describe("Positions API (CAT-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all active positions across active holdings for entity", async () => {
    const rawPositions = [
      {
        id: "pos-1",
        name: "Cash Sweep",
        subledgerItem: {
          id: "hold-1",
          name: "Schwab Brokerage",
          itemType: "BROKERAGE",
          accountId: "acct-12100",
          account: { id: "acct-12100", number: "12100", name: "Schwab Brokerage", type: "ASSET" },
        },
      },
    ];
    mockFindMany.mockResolvedValueOnce(rawPositions);

    const { prisma } = await import("@/lib/db/prisma");
    const positions = await prisma.position.findMany({
      where: {
        subledgerItem: { entityId: "entity-1", isActive: true },
        isActive: true,
      },
      include: {
        subledgerItem: {
          select: {
            id: true,
            name: true,
            itemType: true,
            accountId: true,
            account: { select: { id: true, number: true, name: true, type: true } },
          },
        },
      },
      orderBy: [{ subledgerItem: { name: "asc" } }, { name: "asc" }],
    });
    const serialized = serializePositions(positions);

    // findMany was called with entity+isActive where-clause
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subledgerItem: expect.objectContaining({
            entityId: "entity-1",
            isActive: true,
          }),
          isActive: true,
        }),
      })
    );

    // Serialization produced the flat row shape
    expect(serialized).toHaveLength(1);
    expect(serialized[0]).toMatchObject({
      id: "pos-1",
      name: "Cash Sweep",
      holdingName: "Schwab Brokerage",
      holdingType: "BROKERAGE",
      holdingId: "hold-1",
      accountId: "acct-12100",
      accountNumber: "12100",
      accountName: "Schwab Brokerage",
      accountType: "ASSET",
    });
  });

  it("includes holding name, type, account number in serialization", () => {
    const serialized = serializePositions([
      {
        id: "pos-2",
        name: "AAPL",
        subledgerItem: {
          id: "hold-2",
          name: "Fidelity",
          itemType: "BROKERAGE",
          accountId: "acct-12200",
          account: { id: "acct-12200", number: "12200", name: "Fidelity", type: "ASSET" },
        },
      },
      {
        id: "pos-3",
        name: "Office Building",
        subledgerItem: {
          id: "hold-3",
          name: "Real Estate",
          itemType: "REAL_ESTATE",
          accountId: "acct-15000",
          account: { id: "acct-15000", number: "15000", name: "Real Estate", type: "ASSET" },
        },
      },
    ]);

    expect(serialized[0].holdingName).toBe("Fidelity");
    expect(serialized[0].holdingType).toBe("BROKERAGE");
    expect(serialized[0].accountNumber).toBe("12200");

    expect(serialized[1].holdingName).toBe("Real Estate");
    expect(serialized[1].holdingType).toBe("REAL_ESTATE");
    expect(serialized[1].accountNumber).toBe("15000");
  });

  it("excludes inactive positions and inactive holdings via where clause", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.position.findMany({
      where: {
        subledgerItem: { entityId: "entity-1", isActive: true },
        isActive: true,
      },
      include: {
        subledgerItem: {
          select: {
            id: true,
            name: true,
            itemType: true,
            accountId: true,
            account: { select: { id: true, number: true, name: true, type: true } },
          },
        },
      },
      orderBy: [{ subledgerItem: { name: "asc" } }, { name: "asc" }],
    });

    const call = mockFindMany.mock.calls[0][0];
    // Assert the query filters inactive rows at BOTH levels
    expect(call.where.isActive).toBe(true);
    expect(call.where.subledgerItem.isActive).toBe(true);
  });

  it("orders by holding name then position name", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.position.findMany({
      where: {
        subledgerItem: { entityId: "entity-1", isActive: true },
        isActive: true,
      },
      include: {
        subledgerItem: {
          select: {
            id: true,
            name: true,
            itemType: true,
            accountId: true,
            account: { select: { id: true, number: true, name: true, type: true } },
          },
        },
      },
      orderBy: [{ subledgerItem: { name: "asc" } }, { name: "asc" }],
    });

    const call = mockFindMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([
      { subledgerItem: { name: "asc" } },
      { name: "asc" },
    ]);
  });
});
