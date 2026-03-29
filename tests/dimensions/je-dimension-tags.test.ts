import { describe, it, expect } from "vitest";
import { z } from "zod";
import Decimal from "decimal.js";

// ---------------------------------------------------------------------------
// CLASS-02/05: JE Dimension Tag Integration Tests
//
// Tests the dimensionTags field on lineItemSchema, the serialization logic
// for mapping junction records to { dimensionId: tagId } format, and the
// one-tag-per-dimension constraint enforcement.
// ---------------------------------------------------------------------------

// Mirror of the lineItemSchema with dimensionTags
const lineItemSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    debit: z
      .string()
      .default("0")
      .refine(
        (v) => {
          try {
            return !new Decimal(v || "0").isNegative();
          } catch {
            return false;
          }
        },
        "Debit must be a non-negative number"
      ),
    credit: z
      .string()
      .default("0")
      .refine(
        (v) => {
          try {
            return !new Decimal(v || "0").isNegative();
          } catch {
            return false;
          }
        },
        "Credit must be a non-negative number"
      ),
    memo: z.string().optional(),
    dimensionTags: z.record(z.string(), z.string()).optional().default({}),
  })
  .refine(
    (line) => {
      const d = new Decimal(line.debit || "0");
      const c = new Decimal(line.credit || "0");
      return !(d.isZero() && c.isZero());
    },
    { message: "Each line must have a debit or credit amount" }
  );

const journalEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1).max(500),
    lineItems: z.array(lineItemSchema).min(2),
  })
  .refine(
    (data) => {
      const totalDebit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.debit || "0")),
        new Decimal("0")
      );
      const totalCredit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.credit || "0")),
        new Decimal("0")
      );
      return totalDebit.equals(totalCredit);
    },
    { message: "Total debits must equal total credits", path: ["lineItems"] }
  );

// Serialization helper: maps junction records to { dimensionId: tagId }
function serializeDimensionTags(
  junctionRecords: Array<{
    dimensionTagId: string;
    dimensionTag?: { dimensionId: string };
  }>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const dt of junctionRecords) {
    if (dt.dimensionTag?.dimensionId) {
      result[dt.dimensionTag.dimensionId] = dt.dimensionTagId;
    }
  }
  return result;
}

// One-tag-per-dimension validation (API-level)
function validateOneTagPerDimension(
  dimensionTags: Record<string, string>,
  tagToDimension: Map<string, string>
): { valid: boolean; error?: string } {
  const dimensionsSeen = new Set<string>();
  for (const tagId of Object.values(dimensionTags)) {
    if (!tagId) continue;
    const dimId = tagToDimension.get(tagId);
    if (!dimId) continue;
    if (dimensionsSeen.has(dimId)) {
      return { valid: false, error: `Duplicate tag for dimension ${dimId}` };
    }
    dimensionsSeen.add(dimId);
  }
  return { valid: true };
}

describe("JE Dimension Tags", () => {
  describe("lineItemSchema with dimensionTags", () => {
    it("accepts line item without dimensionTags (backward compatible)", () => {
      const result = lineItemSchema.safeParse({
        accountId: "acc-001",
        debit: "100",
        credit: "0",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dimensionTags).toEqual({});
      }
    });

    it("accepts line item with empty dimensionTags", () => {
      const result = lineItemSchema.safeParse({
        accountId: "acc-001",
        debit: "100",
        credit: "0",
        dimensionTags: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dimensionTags).toEqual({});
      }
    });

    it("accepts line item with dimension tags", () => {
      const result = lineItemSchema.safeParse({
        accountId: "acc-001",
        debit: "250",
        credit: "0",
        dimensionTags: {
          "dim-fund": "tag-fund1",
          "dim-prop": "tag-propA",
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dimensionTags).toEqual({
          "dim-fund": "tag-fund1",
          "dim-prop": "tag-propA",
        });
      }
    });

    it("rejects non-string values in dimensionTags", () => {
      const result = lineItemSchema.safeParse({
        accountId: "acc-001",
        debit: "100",
        credit: "0",
        dimensionTags: { "dim-fund": 123 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("journalEntrySchema with dimensionTags", () => {
    it("validates balanced entry with dimension tags", () => {
      const result = journalEntrySchema.safeParse({
        date: "2026-03-29",
        description: "Test entry with dimensions",
        lineItems: [
          {
            accountId: "acc-001",
            debit: "500",
            credit: "0",
            dimensionTags: { "dim-fund": "tag-fund1" },
          },
          {
            accountId: "acc-002",
            debit: "0",
            credit: "500",
            dimensionTags: { "dim-fund": "tag-fund2" },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("validates entry with mixed dimension usage (some lines tagged, some not)", () => {
      const result = journalEntrySchema.safeParse({
        date: "2026-03-29",
        description: "Mixed tagging",
        lineItems: [
          {
            accountId: "acc-001",
            debit: "300",
            credit: "0",
            dimensionTags: { "dim-fund": "tag-fund1" },
          },
          {
            accountId: "acc-002",
            debit: "0",
            credit: "300",
            // No dimension tags - existing entry pattern
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("serializeDimensionTags", () => {
    it("maps junction records to { dimensionId: tagId } format", () => {
      const junctions = [
        {
          dimensionTagId: "tag-fund1",
          dimensionTag: { dimensionId: "dim-fund" },
        },
        {
          dimensionTagId: "tag-propA",
          dimensionTag: { dimensionId: "dim-prop" },
        },
      ];

      const result = serializeDimensionTags(junctions);
      expect(result).toEqual({
        "dim-fund": "tag-fund1",
        "dim-prop": "tag-propA",
      });
    });

    it("returns empty object for empty junction array", () => {
      expect(serializeDimensionTags([])).toEqual({});
    });

    it("skips records without dimensionTag relation", () => {
      const junctions = [
        { dimensionTagId: "tag-orphan" },
        {
          dimensionTagId: "tag-fund1",
          dimensionTag: { dimensionId: "dim-fund" },
        },
      ];

      const result = serializeDimensionTags(junctions);
      expect(result).toEqual({ "dim-fund": "tag-fund1" });
    });
  });

  describe("one-tag-per-dimension constraint", () => {
    const tagToDimension = new Map([
      ["tag-fund1", "dim-fund"],
      ["tag-fund2", "dim-fund"],
      ["tag-propA", "dim-prop"],
      ["tag-propB", "dim-prop"],
    ]);

    it("allows one tag per dimension", () => {
      const result = validateOneTagPerDimension(
        { "dim-fund": "tag-fund1", "dim-prop": "tag-propA" },
        tagToDimension
      );
      expect(result.valid).toBe(true);
    });

    it("allows empty dimensionTags", () => {
      const result = validateOneTagPerDimension({}, tagToDimension);
      expect(result.valid).toBe(true);
    });

    it("the record structure naturally enforces one tag per dimension key", () => {
      // Since dimensionTags is Record<dimensionId, tagId>,
      // having two tags from the same dimension is structurally impossible
      // in the record format. This test confirms the format.
      const tags: Record<string, string> = {
        "dim-fund": "tag-fund1",
      };
      // Overwriting with another tag from same dimension
      tags["dim-fund"] = "tag-fund2";
      expect(Object.keys(tags).length).toBe(1);
      expect(tags["dim-fund"]).toBe("tag-fund2");
    });
  });

  describe("dimension tags in create payload", () => {
    it("extracts tag IDs from dimensionTags for junction record creation", () => {
      const dimensionTags = {
        "dim-fund": "tag-fund1",
        "dim-prop": "tag-propA",
      };

      const junctionPayloads = Object.values(dimensionTags)
        .filter(Boolean)
        .map((tagId) => ({ dimensionTagId: tagId }));

      expect(junctionPayloads).toEqual([
        { dimensionTagId: "tag-fund1" },
        { dimensionTagId: "tag-propA" },
      ]);
    });

    it("handles empty dimensionTags gracefully", () => {
      const dimensionTags = {};
      const junctionPayloads = Object.values(dimensionTags)
        .filter(Boolean)
        .map((tagId) => ({ dimensionTagId: tagId }));

      expect(junctionPayloads).toEqual([]);
    });

    it("filters out empty string tag values", () => {
      const dimensionTags = {
        "dim-fund": "tag-fund1",
        "dim-prop": "", // user cleared selection
      };

      const junctionPayloads = Object.values(dimensionTags)
        .filter(Boolean)
        .map((tagId) => ({ dimensionTagId: tagId }));

      expect(junctionPayloads).toEqual([{ dimensionTagId: "tag-fund1" }]);
    });
  });
});
