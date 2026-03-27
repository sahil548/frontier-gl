/**
 * ENTM-01: POST /api/entities creates an entity with name, type, fiscalYearEnd
 * Returns 201 with entity data on success.
 * Returns 400 on validation failure.
 * Returns 401 when unauthenticated.
 *
 * Strategy: Test the Zod validation layer (the gating logic for entity creation)
 * and the response envelope contracts. The handler's DB operations require a
 * live Prisma connection and are covered by manual integration tests.
 */

import { describe, it, expect } from "vitest";
import { createEntitySchema } from "@/lib/validators/entity";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

describe("ENTM-01: POST /api/entities — entity creation validation", () => {
  const validEntityInput = {
    name: "Acme LP",
    type: "LP",
    fiscalYearEnd: "12-31",
    coaTemplate: "BLANK",
  };

  it("accepts valid entity creation input with all required fields", () => {
    const result = createEntitySchema.safeParse(validEntityInput);
    expect(result.success).toBe(true);
  });

  it("accepts entity creation with name, type, and fiscalYearEnd (coaTemplate defaults to BLANK)", () => {
    const { coaTemplate, ...minimal } = validEntityInput;
    const result = createEntitySchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coaTemplate).toBe("BLANK");
      expect(result.data.name).toBe("Acme LP");
      expect(result.data.type).toBe("LP");
      expect(result.data.fiscalYearEnd).toBe("12-31");
    }
  });

  it("rejects entity creation without a name", () => {
    const { name, ...withoutName } = validEntityInput;
    const result = createEntitySchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects entity creation with an invalid fiscal year end format", () => {
    const result = createEntitySchema.safeParse({
      ...validEntityInput,
      fiscalYearEnd: "December 31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects entity creation with an invalid entity type", () => {
    const result = createEntitySchema.safeParse({
      ...validEntityInput,
      type: "FAKE_TYPE",
    });
    expect(result.success).toBe(false);
  });
});

describe("ENTM-01: POST /api/entities — 201 response shape on creation", () => {
  it("successResponse with 201 status reflects entity creation contract", async () => {
    const createdEntity = {
      id: "clxabc123",
      name: "Acme LP",
      type: "LP",
      typeOther: null,
      fiscalYearEnd: "12-31",
      coaTemplate: "BLANK",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const response = successResponse(createdEntity, 201);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("clxabc123");
    expect(body.data.name).toBe("Acme LP");
    expect(body.data.type).toBe("LP");
    expect(body.data.fiscalYearEnd).toBe("12-31");
  });

  it("errorResponse with 400 status reflects validation failure contract", async () => {
    const response = errorResponse("Validation failed", 400);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  it("errorResponse with 401 status reflects unauthenticated request contract", async () => {
    const response = errorResponse("Unauthorized", 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });
});

describe("ENTM-01: Entity creation supports all valid entity types", () => {
  const types = [
    "LP",
    "LLC",
    "CORPORATION",
    "S_CORP",
    "TRUST",
    "FOUNDATION",
    "PARTNERSHIP",
    "INDIVIDUAL",
  ];

  types.forEach((type) => {
    it(`accepts entity creation with type ${type}`, () => {
      const result = createEntitySchema.safeParse({
        name: `Test ${type} Entity`,
        type,
        fiscalYearEnd: "12-31",
      });
      expect(result.success).toBe(true);
    });
  });

  it("accepts entity creation with type OTHER when typeOther is provided", () => {
    const result = createEntitySchema.safeParse({
      name: "Custom Entity",
      type: "OTHER",
      typeOther: "Family Foundation",
      fiscalYearEnd: "12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects entity creation with type OTHER when typeOther is missing", () => {
    const result = createEntitySchema.safeParse({
      name: "Custom Entity",
      type: "OTHER",
      fiscalYearEnd: "12-31",
    });
    expect(result.success).toBe(false);
  });
});
