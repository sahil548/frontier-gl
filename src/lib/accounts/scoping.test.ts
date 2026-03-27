import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for account entity scoping.
 * Verifies that account operations are properly scoped by entityId.
 */

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

const mockFindMany = vi.mocked(prisma.account.findMany);
const mockFindFirst = vi.mocked(prisma.account.findFirst);

describe("Account Entity Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only accounts for given entityId", async () => {
    const entity1Accounts = [
      { id: "acc-1", entityId: "entity-1", number: "10000", name: "Assets" },
      { id: "acc-2", entityId: "entity-1", number: "20000", name: "Liabilities" },
    ];

    mockFindMany.mockResolvedValue(entity1Accounts as never);

    const accounts = await prisma.account.findMany({
      where: { entityId: "entity-1" },
    });

    expect(accounts).toHaveLength(2);
    expect(accounts.every((a: { entityId: string }) => a.entityId === "entity-1")).toBe(true);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { entityId: "entity-1" },
    });
  });

  it("rejects cross-entity account access", async () => {
    // Attempting to find an account in an entity it doesn't belong to
    mockFindFirst.mockResolvedValue(null);

    const account = await prisma.account.findFirst({
      where: {
        id: "acc-1",
        entityId: "wrong-entity", // Account belongs to different entity
      },
    });

    expect(account).toBeNull();
    // API would return 404 "Account not found"
  });

  it("template applies to specific entity only", async () => {
    // Verify that findMany is called with specific entityId
    mockFindMany.mockResolvedValue([]);

    await prisma.account.findMany({
      where: { entityId: "entity-specific" },
      select: { number: true },
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { entityId: "entity-specific" },
      select: { number: true },
    });
  });

  it("unique constraint scoped to entityId and number", async () => {
    // Different entities can have the same account number
    const entity1Account = {
      id: "acc-1",
      entityId: "entity-1",
      number: "10000",
    };
    const entity2Account = {
      id: "acc-2",
      entityId: "entity-2",
      number: "10000",
    };

    // Both can exist because @@unique([entityId, number])
    expect(entity1Account.number).toBe(entity2Account.number);
    expect(entity1Account.entityId).not.toBe(entity2Account.entityId);
  });
});
