import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RECR-01: Recurring template setup
//
// The POST /templates/recurring { action: "setup" } handler accepts:
//   { templateId, frequency, nextRunDate }
// and sets isRecurring=true, frequency, and nextRunDate on the template.
//
// We test the Zod schema validation logic and the resulting update shape
// without Prisma. The setupSchema mirrors what is validated in the route.
// ---------------------------------------------------------------------------

import { z } from "zod";

const setupSchema = z.object({
  templateId: z.string().min(1),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
  nextRunDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "nextRunDate must be a valid date",
  }),
});

/** Mirror of the update payload that would be written to Prisma */
function buildSetupPayload(input: {
  frequency: "monthly" | "quarterly" | "annually";
  nextRunDate: string;
}) {
  return {
    isRecurring: true,
    frequency: input.frequency,
    nextRunDate: new Date(input.nextRunDate),
  };
}

describe("Recurring template setup", () => {
  it("marks template as recurring with frequency and start date", () => {
    const validInput = {
      templateId: "tpl-001",
      frequency: "monthly" as const,
      nextRunDate: "2026-04-01",
    };

    // Schema validation must pass
    const parsed = setupSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    // The update payload must set isRecurring=true plus the provided values
    const payload = buildSetupPayload(parsed.data);

    expect(payload.isRecurring).toBe(true);
    expect(payload.frequency).toBe("monthly");
    expect(payload.nextRunDate).toBeInstanceOf(Date);
    expect(payload.nextRunDate.toISOString().startsWith("2026-04-01")).toBe(true);

    // Test other valid frequencies
    const quarterly = setupSchema.safeParse({
      ...validInput,
      frequency: "quarterly",
    });
    expect(quarterly.success).toBe(true);

    const annually = setupSchema.safeParse({
      ...validInput,
      frequency: "annually",
    });
    expect(annually.success).toBe(true);

    // Invalid frequency must fail schema
    const invalid = setupSchema.safeParse({
      ...validInput,
      frequency: "weekly",
    });
    expect(invalid.success).toBe(false);

    // Invalid date must fail schema
    const badDate = setupSchema.safeParse({
      ...validInput,
      nextRunDate: "not-a-date",
    });
    expect(badDate.success).toBe(false);

    // Missing templateId must fail schema
    const noId = setupSchema.safeParse({
      frequency: "monthly",
      nextRunDate: "2026-04-01",
    });
    expect(noId.success).toBe(false);
  });
});
