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

import {
  getSavedMapping,
  saveMapping,
  findMappingByHeaders,
} from "@/lib/bank-transactions/column-mapping-store";
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

  describe("findMappingByHeaders", () => {
    it("returns the saved mapping whose stored mapping values reference all provided headers, preferring most recently updated", async () => {
      // Two saved mappings exist for the same entity+importType.
      // The more recently updated one should win when both sets of stored headers match.
      const recentMapping = {
        date: "Transaction Date",
        description: "Memo",
        amount: "Net Amount",
      };
      const olderMapping = {
        date: "Transaction Date",
        description: "Memo",
        amount: "Net Amount",
      };

      mockFindMany.mockResolvedValueOnce([
        {
          id: "mapping-recent",
          entityId: "entity-1",
          sourceName: "Chase Checking",
          importType: "bank",
          mapping: recentMapping,
          updatedAt: new Date("2026-04-10T00:00:00Z"),
        },
        {
          id: "mapping-older",
          entityId: "entity-1",
          sourceName: "Chase Checking (old)",
          importType: "bank",
          mapping: olderMapping,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]);

      const headers = ["Transaction Date", "Memo", "Net Amount", "Extra Column"];
      const result = await findMappingByHeaders("entity-1", "bank", headers);

      expect(result).not.toBeNull();
      expect(result?.sourceName).toBe("Chase Checking");
      expect(result?.mapping).toEqual(recentMapping);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { entityId: "entity-1", importType: "bank" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("returns null when no saved mapping has a matching (superset) set of headers (normalized)", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "mapping-1",
          entityId: "entity-1",
          sourceName: "Chase Checking",
          importType: "bank",
          mapping: {
            date: "Transaction Date",
            description: "Memo",
            amount: "Net Amount",
          },
          updatedAt: new Date("2026-04-10T00:00:00Z"),
        },
      ]);

      // Incoming headers are missing "Net Amount" — stored mapping cannot apply.
      const headers = ["Transaction Date", "Memo", "Posting Date"];
      const result = await findMappingByHeaders("entity-1", "bank", headers);

      expect(result).toBeNull();
    });

    it("ignores saved mappings for a different importType even if the header set matches", async () => {
      // Prisma is queried filtered by importType, so mockFindMany returns only
      // records for the requested importType. This test verifies that the
      // where clause scopes by importType so mismatched-type records are skipped.
      mockFindMany.mockResolvedValueOnce([]); // no "coa" mappings for this entity

      const headers = ["Transaction Date", "Memo", "Net Amount"];
      const result = await findMappingByHeaders("entity-1", "coa", headers);

      expect(result).toBeNull();
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { entityId: "entity-1", importType: "coa" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("returns the matched record with sourceName so callers can surface it in the badge/UI", async () => {
      const savedMapping = {
        date: "Trans Date",
        description: "Description",
        amount: "Amount",
      };

      mockFindMany.mockResolvedValueOnce([
        {
          id: "mapping-1",
          entityId: "entity-1",
          sourceName: "UAT-Chase",
          importType: "bank",
          mapping: savedMapping,
          updatedAt: new Date("2026-04-10T00:00:00Z"),
        },
      ]);

      // Normalize matters: incoming headers differ in case/whitespace.
      const headers = [" trans date ", "DESCRIPTION", "amount", "balance"];
      const result = await findMappingByHeaders("entity-1", "bank", headers);

      expect(result).not.toBeNull();
      expect(result?.sourceName).toBe("UAT-Chase");
      expect(result?.mapping).toEqual(savedMapping);
    });
  });
});
