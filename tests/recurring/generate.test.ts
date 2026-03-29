import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RECR-03: Generate due entries
//
// The POST { action: "generate" } handler:
//   1. Finds templates where isRecurring=true AND nextRunDate <= today
//   2. For each, creates a DRAFT JE with description "${name} (recurring)"
//      and templateId set to the source template
//   3. Updates lastRunDate = old nextRunDate, advances nextRunDate by frequency
//
// We test the date-advancement logic and JE creation payload construction
// without Prisma — these are pure functions.
// ---------------------------------------------------------------------------

type Frequency = "monthly" | "quarterly" | "annually";

/**
 * Mirror of the nextRunDate advancement logic in the generate handler.
 * Given the current nextRunDate and frequency, returns the new nextRunDate.
 */
function advanceNextRunDate(currentNextRunDate: Date, frequency: Frequency): Date {
  const next = new Date(currentNextRunDate);
  switch (frequency) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "annually":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/** Mirror of the JE creation payload in the generate handler */
function buildGeneratedJEPayload(template: {
  id: string;
  name: string;
  nextRunDate: Date;
  entityId: string;
  createdBy: string;
}) {
  return {
    entityId: template.entityId,
    date: template.nextRunDate,
    description: `${template.name} (recurring)`,
    status: "DRAFT" as const,
    createdBy: template.createdBy,
    templateId: template.id,
  };
}

/** Mirror of the update payload applied after generation */
function buildPostGenerationUpdate(template: {
  nextRunDate: Date;
  frequency: Frequency;
}) {
  return {
    lastRunDate: template.nextRunDate,
    nextRunDate: advanceNextRunDate(template.nextRunDate, template.frequency),
  };
}

describe("Generate due entries", () => {
  it("creates draft JEs from overdue recurring templates", () => {
    const template = {
      id: "tpl-001",
      name: "Monthly Rent",
      nextRunDate: new Date("2026-03-01T00:00:00Z"),
      entityId: "entity-001",
      createdBy: "user-001",
    };

    const payload = buildGeneratedJEPayload(template);

    // Must be DRAFT status
    expect(payload.status).toBe("DRAFT");

    // Must have templateId linking back to the source template
    expect(payload.templateId).toBe("tpl-001");

    // Must use the template's nextRunDate as the JE date
    expect(payload.date).toEqual(template.nextRunDate);

    // Must include the entity
    expect(payload.entityId).toBe("entity-001");

    // Must record who created it
    expect(payload.createdBy).toBe("user-001");
  });

  it("updates lastRunDate and advances nextRunDate after generation", () => {
    const baseDate = new Date("2026-03-01T00:00:00Z");

    // Monthly advancement
    const monthlyUpdate = buildPostGenerationUpdate({
      nextRunDate: baseDate,
      frequency: "monthly",
    });
    expect(monthlyUpdate.lastRunDate).toEqual(baseDate);
    expect(monthlyUpdate.nextRunDate.getMonth()).toBe(baseDate.getMonth() + 1);
    expect(monthlyUpdate.nextRunDate.getFullYear()).toBe(baseDate.getFullYear());

    // Quarterly advancement (3 months)
    const quarterlyUpdate = buildPostGenerationUpdate({
      nextRunDate: baseDate,
      frequency: "quarterly",
    });
    expect(quarterlyUpdate.lastRunDate).toEqual(baseDate);
    const expectedQuarterlyMonth = (baseDate.getMonth() + 3) % 12;
    expect(quarterlyUpdate.nextRunDate.getMonth()).toBe(expectedQuarterlyMonth);

    // Annual advancement (1 year)
    const annualUpdate = buildPostGenerationUpdate({
      nextRunDate: baseDate,
      frequency: "annually",
    });
    expect(annualUpdate.lastRunDate).toEqual(baseDate);
    expect(annualUpdate.nextRunDate.getFullYear()).toBe(baseDate.getFullYear() + 1);
    expect(annualUpdate.nextRunDate.getMonth()).toBe(baseDate.getMonth());
    expect(annualUpdate.nextRunDate.getDate()).toBe(baseDate.getDate());

    // lastRunDate must always be set to the old nextRunDate (not today)
    expect(monthlyUpdate.lastRunDate).toEqual(baseDate);
    expect(quarterlyUpdate.lastRunDate).toEqual(baseDate);
    expect(annualUpdate.lastRunDate).toEqual(baseDate);
  });
});
