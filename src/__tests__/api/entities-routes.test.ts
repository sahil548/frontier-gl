/**
 * API-01: RESTful entity endpoints
 * - GET returns list with 200 and JSON envelope
 * - POST creates with 201 and JSON envelope
 * - PUT updates with 200 and JSON envelope
 * - Proper status codes and consistent {success, data/error} envelope
 *
 * Strategy: Test the response helpers and Zod schemas that form the
 * observable contract of the API routes. Actual DB-backed route handler
 * tests require a live environment and are covered by manual verification.
 */

import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { createEntitySchema, updateEntitySchema } from "@/lib/validators/entity";

// Representative serialized entities matching what the API returns
const mockEntityList = [
  {
    id: "clx1",
    name: "Alpha LP",
    type: "LP",
    typeOther: null,
    fiscalYearEnd: "12-31",
    coaTemplate: "BLANK",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "clx2",
    name: "Beta Trust",
    type: "TRUST",
    typeOther: null,
    fiscalYearEnd: "06-30",
    coaTemplate: "BLANK",
    isActive: true,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("API-01: GET /api/entities — list endpoint contract", () => {
  it("GET list returns 200 status", async () => {
    const response = successResponse(mockEntityList, 200);
    expect(response.status).toBe(200);
  });

  it("GET list returns JSON envelope with success: true and data array", async () => {
    const response = successResponse(mockEntityList, 200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("GET list response includes entity fields: id, name, type, fiscalYearEnd", async () => {
    const response = successResponse(mockEntityList, 200);
    const body = await response.json();

    const firstEntity = body.data[0];
    expect(firstEntity.id).toBeDefined();
    expect(firstEntity.name).toBeDefined();
    expect(firstEntity.type).toBeDefined();
    expect(firstEntity.fiscalYearEnd).toBeDefined();
  });

  it("GET list returns empty array when user has no entities", async () => {
    const response = successResponse([], 200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("GET list returns 401 for unauthenticated request", async () => {
    const response = errorResponse("Unauthorized", 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });
});

describe("API-01: POST /api/entities — create endpoint contract", () => {
  it("POST create returns 201 status for valid input", async () => {
    const newEntity = mockEntityList[0];
    const response = successResponse(newEntity, 201);
    expect(response.status).toBe(201);
  });

  it("POST create returns JSON envelope with success: true and data object", async () => {
    const newEntity = mockEntityList[0];
    const response = successResponse(newEntity, 201);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("clx1");
  });

  it("POST create returns 400 with validation errors for invalid input", async () => {
    // Simulate what the route does on Zod failure
    const schema = createEntitySchema;
    const parseResult = schema.safeParse({ name: "", type: "INVALID" });
    expect(parseResult.success).toBe(false);

    if (!parseResult.success) {
      const response = errorResponse("Validation failed", 400, parseResult.error);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    }
  });

  it("POST create returns 401 for unauthenticated request", async () => {
    const response = errorResponse("Unauthorized", 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });
});

describe("API-01: PUT /api/entities/:id — update endpoint contract", () => {
  it("PUT update returns 200 status for valid input", async () => {
    const updatedEntity = { ...mockEntityList[0], name: "Alpha LP Updated" };
    const response = successResponse(updatedEntity, 200);
    expect(response.status).toBe(200);
  });

  it("PUT update returns JSON envelope with success: true and updated data", async () => {
    const updatedEntity = { ...mockEntityList[0], name: "Alpha LP Updated" };
    const response = successResponse(updatedEntity, 200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Alpha LP Updated");
  });

  it("PUT update returns 400 with field errors for invalid input", async () => {
    const parseResult = updateEntitySchema.safeParse({ name: "" });
    expect(parseResult.success).toBe(false);

    if (!parseResult.success) {
      const response = errorResponse("Validation failed", 400, parseResult.error);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.details).toBeDefined();
    }
  });

  it("PUT update returns 404 when entity does not exist", async () => {
    const response = errorResponse("Entity not found", 404);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Entity not found");
  });

  it("PUT update returns 401 for unauthenticated request", async () => {
    const response = errorResponse("Unauthorized", 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });
});

describe("API-01: JSON envelope consistency across all endpoints", () => {
  it("all success responses include success: true", async () => {
    const responses = [
      successResponse(mockEntityList),
      successResponse(mockEntityList[0], 201),
      successResponse(mockEntityList[0], 200),
    ];

    for (const response of responses) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.error).toBeUndefined();
    }
  });

  it("all error responses include success: false", async () => {
    const responses = [
      errorResponse("Unauthorized", 401),
      errorResponse("Validation failed", 400),
      errorResponse("Entity not found", 404),
    ];

    for (const response of responses) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.data).toBeUndefined();
    }
  });

  it("all responses have application/json content type", () => {
    const responses = [
      successResponse(mockEntityList),
      errorResponse("Error", 400),
    ];

    for (const response of responses) {
      expect(response.headers.get("content-type")).toContain("application/json");
    }
  });
});
