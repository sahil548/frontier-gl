import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RECR-04: Edit and stop recurring template
//
// PATCH /templates/recurring accepts:
//   { templateId, name?, description?, frequency?, nextRunDate?, lines? }
// Only allowed on active (isRecurring=true) templates.
//
// POST { action: "stop" } sets:
//   { isRecurring: false, frequency: null, nextRunDate: null }
//
// We test the Zod schema validation for PATCH and the stop payload shape
// without Prisma.
// ---------------------------------------------------------------------------

import { z } from "zod";

// Mirror of patchSchema in the recurring route
const patchSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  frequency: z.enum(["monthly", "quarterly", "annually"]).optional(),
  nextRunDate: z
    .string()
    .refine((s) => !isNaN(Date.parse(s)), {
      message: "nextRunDate must be a valid date",
    })
    .optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1),
        debit: z.union([z.string(), z.number()]).transform((v) => String(v)),
        credit: z.union([z.string(), z.number()]).transform((v) => String(v)),
        memo: z.string().optional().default(""),
      })
    )
    .optional(),
});

/** Build the Prisma update data object from a valid patch payload */
function buildPatchUpdateData(data: {
  name?: string;
  description?: string;
  frequency?: "monthly" | "quarterly" | "annually";
  nextRunDate?: string;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.nextRunDate !== undefined)
    updateData.nextRunDate = new Date(data.nextRunDate);
  return updateData;
}

/** Mirror of the stop action update payload */
function buildStopPayload() {
  return {
    isRecurring: false,
    frequency: null,
    nextRunDate: null,
  };
}

describe("Edit and stop recurring template", () => {
  it("updates frequency and next run date on active template", () => {
    const validPatch = {
      templateId: "tpl-001",
      frequency: "quarterly" as const,
      nextRunDate: "2026-07-01",
    };

    const parsed = patchSchema.safeParse(validPatch);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const updateData = buildPatchUpdateData(parsed.data);

    expect(updateData.frequency).toBe("quarterly");
    expect(updateData.nextRunDate).toBeInstanceOf(Date);

    const nextDate = updateData.nextRunDate as Date;
    expect(nextDate.toISOString().startsWith("2026-07-01")).toBe(true);

    // name and description should NOT appear in updateData when not provided
    expect(updateData).not.toHaveProperty("name");
    expect(updateData).not.toHaveProperty("description");

    // Changing name without changing frequency is also valid
    const namePatch = { templateId: "tpl-001", name: "Renamed Template" };
    const nameParsed = patchSchema.safeParse(namePatch);
    expect(nameParsed.success).toBe(true);

    if (nameParsed.success) {
      const nameUpdateData = buildPatchUpdateData(nameParsed.data);
      expect(nameUpdateData.name).toBe("Renamed Template");
      expect(nameUpdateData).not.toHaveProperty("frequency");
    }
  });

  it("updates template line items", () => {
    const patchWithLines = {
      templateId: "tpl-001",
      lines: [
        { accountId: "acct-1", debit: "1000", credit: "0", memo: "Rent" },
        { accountId: "acct-2", debit: "0", credit: "1000", memo: "" },
      ],
    };

    const parsed = patchSchema.safeParse(patchWithLines);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const lines = parsed.data.lines!;

    expect(lines).toHaveLength(2);
    expect(lines[0].accountId).toBe("acct-1");
    expect(lines[0].debit).toBe("1000");
    expect(lines[0].credit).toBe("0");
    expect(lines[0].memo).toBe("Rent");

    // Numeric debit/credit values must be coerced to strings
    const numericLines = {
      templateId: "tpl-001",
      lines: [
        { accountId: "acct-1", debit: 500, credit: 0 },
        { accountId: "acct-2", debit: 0, credit: 500 },
      ],
    };
    const numericParsed = patchSchema.safeParse(numericLines);
    expect(numericParsed.success).toBe(true);

    if (numericParsed.success) {
      expect(typeof numericParsed.data.lines![0].debit).toBe("string");
      expect(numericParsed.data.lines![0].debit).toBe("500");
    }

    // Empty lines array is valid (clears all lines)
    const emptyLines = { templateId: "tpl-001", lines: [] };
    const emptyParsed = patchSchema.safeParse(emptyLines);
    expect(emptyParsed.success).toBe(true);

    // Line item with missing accountId must fail
    const badLine = {
      templateId: "tpl-001",
      lines: [{ accountId: "", debit: "100", credit: "0" }],
    };
    const badParsed = patchSchema.safeParse(badLine);
    expect(badParsed.success).toBe(false);
  });

  it("stops recurrence by clearing nextRunDate and isRecurring", () => {
    const stopPayload = buildStopPayload();

    // The stop payload must clear all recurring fields
    expect(stopPayload.isRecurring).toBe(false);
    expect(stopPayload.frequency).toBeNull();
    expect(stopPayload.nextRunDate).toBeNull();

    // After applying this payload, the GET handler should compute status = "stopped"
    // (nextRunDate is null => status = "stopped")
    const stoppedTemplate = {
      nextRunDate: null as Date | null,
    };
    const status =
      !stoppedTemplate.nextRunDate
        ? "stopped"
        : stoppedTemplate.nextRunDate <= new Date()
        ? "overdue"
        : "active";

    expect(status).toBe("stopped");
  });
});
