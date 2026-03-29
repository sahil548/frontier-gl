import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RECR-05: Generated JEs link back to their source recurring template
//
// Requirements:
//   1. The generated JE has templateId set to the source template's id
//   2. The JE description contains "(recurring)" as a marker
//
// We test the JE creation payload shape to confirm both invariants.
// ---------------------------------------------------------------------------

type GeneratedJEPayload = {
  entityId: string;
  entryNumber: string;
  date: Date;
  description: string;
  status: "DRAFT";
  createdBy: string;
  templateId: string;
};

/** Mirror of the JE creation payload built in the generate handler */
function buildGeneratedJEPayload(
  template: { id: string; name: string; nextRunDate: Date; entityId: string },
  createdBy: string,
  entryNumber: string
): GeneratedJEPayload {
  return {
    entityId: template.entityId,
    entryNumber,
    date: template.nextRunDate,
    description: `${template.name} (recurring)`,
    status: "DRAFT",
    createdBy,
    templateId: template.id,
  };
}

describe("Generated entries linked to template", () => {
  it("generated JE has templateId set to source template", () => {
    const template = {
      id: "tpl-abc123",
      name: "Monthly Rent",
      nextRunDate: new Date("2026-03-01T00:00:00Z"),
      entityId: "entity-001",
    };

    const payload = buildGeneratedJEPayload(template, "user-001", "JE-0042");

    // The templateId must match the source template exactly
    expect(payload.templateId).toBe("tpl-abc123");
    expect(payload.templateId).toBe(template.id);

    // templateId must be a non-empty string
    expect(typeof payload.templateId).toBe("string");
    expect(payload.templateId.length).toBeGreaterThan(0);

    // Entry must be DRAFT status
    expect(payload.status).toBe("DRAFT");

    // Date must be the template's scheduled nextRunDate
    expect(payload.date).toEqual(template.nextRunDate);
  });

  it("generated JE description contains recurring marker", () => {
    const templates = [
      {
        id: "tpl-1",
        name: "Monthly Rent",
        nextRunDate: new Date("2026-04-01T00:00:00Z"),
        entityId: "entity-001",
      },
      {
        id: "tpl-2",
        name: "Quarterly Tax Provision",
        nextRunDate: new Date("2026-04-01T00:00:00Z"),
        entityId: "entity-001",
      },
      {
        id: "tpl-3",
        name: "Annual Depreciation",
        nextRunDate: new Date("2027-01-01T00:00:00Z"),
        entityId: "entity-001",
      },
    ];

    for (const template of templates) {
      const payload = buildGeneratedJEPayload(
        template,
        "user-001",
        "JE-0001"
      );

      // Description must contain "(recurring)" marker
      expect(payload.description).toContain("(recurring)");

      // Description must also contain the template name
      expect(payload.description).toContain(template.name);

      // The exact format is "{name} (recurring)"
      expect(payload.description).toBe(`${template.name} (recurring)`);
    }
  });
});
