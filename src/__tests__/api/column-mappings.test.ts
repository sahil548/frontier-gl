import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    columnMapping: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { getSavedMapping, saveMapping } from "@/lib/bank-transactions/column-mapping-store";
import { prisma } from "@/lib/db/prisma";

const mockFindUnique = prisma.columnMapping.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.columnMapping.findMany as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.columnMapping.upsert as ReturnType<typeof vi.fn>;

describe("column-mapping-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSavedMapping", () => {
    it("returns null for unknown source name", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getSavedMapping("entity-1", "Unknown Bank", "bank");
      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          entityId_sourceName_importType: {
            entityId: "entity-1",
            sourceName: "Unknown Bank",
            importType: "bank",
          },
        },
      });
    });

    it("returns stored mapping for known source name", async () => {
      const savedMapping = {
        date: "Transaction Date",
        description: "Memo",
        amount: "Net Amount",
      };

      mockFindUnique.mockResolvedValueOnce({
        id: "mapping-1",
        entityId: "entity-1",
        sourceName: "Chase Checking",
        importType: "bank",
        mapping: savedMapping,
      });

      const result = await getSavedMapping("entity-1", "Chase Checking", "bank");
      expect(result).toEqual(savedMapping);
    });
  });

  describe("saveMapping", () => {
    it("upserts by entity+source+type unique constraint", async () => {
      const mapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
      };

      mockUpsert.mockResolvedValueOnce({
        id: "mapping-1",
        entityId: "entity-1",
        sourceName: "Chase Checking",
        importType: "bank",
        mapping,
      });

      await saveMapping("entity-1", "Chase Checking", "bank", mapping);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          entityId_sourceName_importType: {
            entityId: "entity-1",
            sourceName: "Chase Checking",
            importType: "bank",
          },
        },
        create: {
          entityId: "entity-1",
          sourceName: "Chase Checking",
          importType: "bank",
          mapping,
        },
        update: {
          mapping,
        },
      });
    });

    it("updates existing mapping when called again with same source", async () => {
      const updatedMapping = {
        date: "Post Date",
        description: "Details",
        amount: "Total",
      };

      mockUpsert.mockResolvedValueOnce({
        id: "mapping-1",
        entityId: "entity-1",
        sourceName: "Chase Checking",
        importType: "bank",
        mapping: updatedMapping,
      });

      await saveMapping("entity-1", "Chase Checking", "bank", updatedMapping);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { mapping: updatedMapping },
        })
      );
    });
  });
});
