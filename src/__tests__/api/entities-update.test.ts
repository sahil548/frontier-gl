/**
 * ENTM-02: PUT /api/entities/:id updates entity fields
 * Returns 200 with updated data on success.
 * Returns 400 on validation failure.
 * Returns 401 when unauthenticated.
 *
 * Strategy: Test the Zod update schema (the gating logic for entity updates)
 * and the response envelope contracts for the PUT endpoint. DB operations
 * require a live Prisma connection and are covered by manual integration tests.
 */

import { describe, it, expect } from "vitest";
import { updateEntitySchema } from "@/lib/validators/entity";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

describe("ENTM-02: PUT /api/entities/:id — entity update validation", () => {
  it("accepts a partial update with only name changed", () => {
    const result = updateEntitySchema.safeParse({ name: "Renamed Entity" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Renamed Entity");
    }
  });

  it("accepts a partial update with only type changed", () => {
    const result = updateEntitySchema.safeParse({ type: "LLC" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only fiscalYearEnd changed", () => {
    const result = updateEntitySchema.safeParse({ fiscalYearEnd: "03-31" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fiscalYearEnd).toBe("03-31");
    }
  });

  it("accepts deactivation via isActive: false", () => {
    const result = updateEntitySchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it("accepts reactivation via isActive: true", () => {
    const result = updateEntitySchema.safeParse({ isActive: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("accepts an empty update object (no fields changed)", () => {
    const result = updateEntitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a full update with all fields provided", () => {
    const result = updateEntitySchema.safeParse({
      name: "Updated Trust",
      type: "TRUST",
      fiscalYearEnd: "06-30",
      coaTemplate: "TEMPLATE",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an update with an empty name string", () => {
    const result = updateEntitySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an update with an invalid entity type", () => {
    const result = updateEntitySchema.safeParse({ type: "INVALID_TYPE" });
    expect(result.success).toBe(false);
  });

  it("rejects an update with an invalid fiscalYearEnd format", () => {
    const result = updateEntitySchema.safeParse({ fiscalYearEnd: "12/31" });
    expect(result.success).toBe(false);
  });

  it("rejects an update where isActive is a non-boolean value", () => {
    const result = updateEntitySchema.safeParse({ isActive: "yes" });
    expect(result.success).toBe(false);
  });

  it("rejects an update with a name exceeding 200 characters", () => {
    const result = updateEntitySchema.safeParse({ name: "A".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("ENTM-02: PUT /api/entities/:id — 200 response shape on update", () => {
  it("successResponse with 200 status reflects entity update contract", async () => {
    const updatedEntity = {
      id: "clxabc123",
      name: "Renamed LP",
      type: "LP",
      typeOther: null,
      fiscalYearEnd: "03-31",
      coaTemplate: "BLANK",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const response = successResponse(updatedEntity, 200);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("clxabc123");
    expect(body.data.name).toBe("Renamed LP");
    expect(body.data.fiscalYearEnd).toBe("03-31");
    expect(body.data.isActive).toBe(true);
  });

  it("deactivation response reflects isActive: false in updated data", async () => {
    const deactivatedEntity = {
      id: "clxabc123",
      name: "Acme LP",
      type: "LP",
      typeOther: null,
      fiscalYearEnd: "12-31",
      coaTemplate: "BLANK",
      isActive: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const response = successResponse(deactivatedEntity, 200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.isActive).toBe(false);
  });

  it("errorResponse with 400 reflects validation failure on update", async () => {
    const response = errorResponse("Validation failed", 400);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  it("errorResponse with 404 reflects entity not found on update", async () => {
    const response = errorResponse("Entity not found", 404);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Entity not found");
  });

  it("errorResponse with 401 reflects unauthenticated update request", async () => {
    const response = errorResponse("Unauthorized", 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });
});
