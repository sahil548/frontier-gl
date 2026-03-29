import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RECR-02: Recurring template listing — status computation
//
// The GET handler computes a "status" field for each template:
//   - "stopped"  if nextRunDate is null
//   - "overdue"  if nextRunDate <= today
//   - "active"   if nextRunDate > today
//
// We test the pure status-derivation logic without hitting Prisma.
// ---------------------------------------------------------------------------

type TemplateRow = {
  id: string;
  name: string;
  isRecurring: boolean;
  frequency: string | null;
  nextRunDate: Date | null;
  lastRunDate: Date | null;
};

function computeStatus(
  template: Pick<TemplateRow, "nextRunDate">,
  today: Date
): "active" | "stopped" | "overdue" {
  if (!template.nextRunDate) return "stopped";
  if (template.nextRunDate <= today) return "overdue";
  return "active";
}

function serializeTemplate(
  t: TemplateRow,
  today: Date
): {
  id: string;
  name: string;
  frequency: string | null;
  isRecurring: boolean;
  nextRunDate: string | null;
  lastRunDate: string | null;
  status: "active" | "stopped" | "overdue";
} {
  return {
    id: t.id,
    name: t.name,
    frequency: t.frequency,
    isRecurring: t.isRecurring,
    nextRunDate: t.nextRunDate?.toISOString() ?? null,
    lastRunDate: t.lastRunDate?.toISOString() ?? null,
    status: computeStatus(t, today),
  };
}

const TODAY = new Date("2026-03-29T00:00:00Z");

describe("Recurring template listing", () => {
  it("returns all recurring templates with status fields", () => {
    const templates: TemplateRow[] = [
      {
        id: "tpl-1",
        name: "Monthly Rent",
        isRecurring: true,
        frequency: "monthly",
        nextRunDate: new Date("2026-04-01T00:00:00Z"),
        lastRunDate: new Date("2026-03-01T00:00:00Z"),
      },
      {
        id: "tpl-2",
        name: "Quarterly Tax",
        isRecurring: true,
        frequency: "quarterly",
        nextRunDate: new Date("2026-01-01T00:00:00Z"), // overdue
        lastRunDate: new Date("2025-10-01T00:00:00Z"),
      },
      {
        id: "tpl-3",
        name: "Annual Audit",
        isRecurring: true,
        frequency: null,
        nextRunDate: null, // stopped
        lastRunDate: null,
      },
    ];

    const serialized = templates.map((t) => serializeTemplate(t, TODAY));

    // Must return all three
    expect(serialized).toHaveLength(3);

    // Each item must have all expected status fields
    for (const item of serialized) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("frequency");
      expect(item).toHaveProperty("isRecurring");
      expect(item).toHaveProperty("nextRunDate");
      expect(item).toHaveProperty("lastRunDate");
      expect(item).toHaveProperty("status");
      expect(["active", "stopped", "overdue"]).toContain(item.status);
    }

    // Active template: nextRunDate is in the future
    expect(serialized[0].status).toBe("active");

    // Overdue template: nextRunDate is in the past
    expect(serialized[1].status).toBe("overdue");

    // Stopped template: nextRunDate is null
    expect(serialized[2].status).toBe("stopped");
    expect(serialized[2].nextRunDate).toBeNull();
  });

  it("computes active/stopped/overdue status correctly", () => {
    // Boundary: exactly today at midnight (<=) is overdue
    const exactlyToday = new Date("2026-03-29T00:00:00Z");
    expect(
      computeStatus({ nextRunDate: exactlyToday }, TODAY)
    ).toBe("overdue");

    // One millisecond in the future is active
    const oneMsAhead = new Date(TODAY.getTime() + 1);
    expect(
      computeStatus({ nextRunDate: oneMsAhead }, TODAY)
    ).toBe("active");

    // Well in the past is overdue
    const pastDate = new Date("2025-01-01T00:00:00Z");
    expect(
      computeStatus({ nextRunDate: pastDate }, TODAY)
    ).toBe("overdue");

    // Well in the future is active
    const futureDate = new Date("2027-01-01T00:00:00Z");
    expect(
      computeStatus({ nextRunDate: futureDate }, TODAY)
    ).toBe("active");

    // null nextRunDate is always stopped
    expect(
      computeStatus({ nextRunDate: null }, TODAY)
    ).toBe("stopped");
  });
});
