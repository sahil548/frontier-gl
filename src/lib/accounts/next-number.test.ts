import { describe, it, expect, vi, beforeEach } from "vitest";
import { suggestNextAccountNumber } from "./next-number";

// Mock the prisma module
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

const mockFindFirst = vi.mocked(prisma.account.findFirst);
const mockFindMany = vi.mocked(prisma.account.findMany);

describe("suggestNextAccountNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "10000" for empty entity (no accounts)', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await suggestNextAccountNumber("entity-1");
    expect(result).toBe("10000");
  });

  it("returns next 10000 increment for top-level accounts", async () => {
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      number: "10000",
    } as never);

    const result = await suggestNextAccountNumber("entity-1");
    expect(result).toBe("20000");
  });

  it("returns next 10000 increment from highest existing", async () => {
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      number: "30000",
    } as never);

    const result = await suggestNextAccountNumber("entity-1");
    expect(result).toBe("40000");
  });

  it("returns parent + 100 for first sub-account", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await suggestNextAccountNumber("entity-1", "10000");
    expect(result).toBe("10100");
  });

  it("returns next 100 increment from highest sibling", async () => {
    mockFindMany.mockResolvedValue([
      { id: "acc-2", number: "10200" } as never,
    ]);

    const result = await suggestNextAccountNumber("entity-1", "10000");
    expect(result).toBe("10300");
  });

  it("handles entity with single top-level account", async () => {
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      number: "50000",
    } as never);

    const result = await suggestNextAccountNumber("entity-1");
    expect(result).toBe("60000");
  });
});
