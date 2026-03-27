import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

describe("successResponse", () => {
  it("returns success: true with data", async () => {
    const data = { id: "1", name: "Test" };
    const response = successResponse(data);
    const body = await response.json();

    expect(body).toEqual({ success: true, data });
  });

  it("defaults to status 200", () => {
    const response = successResponse({ id: "1" });
    expect(response.status).toBe(200);
  });

  it("accepts custom status code", () => {
    const response = successResponse({ id: "1" }, 201);
    expect(response.status).toBe(201);
  });

  it("returns proper JSON content type", () => {
    const response = successResponse({ id: "1" });
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("errorResponse", () => {
  it("returns success: false with error message", async () => {
    const response = errorResponse("Something went wrong");
    const body = await response.json();

    expect(body).toEqual({ success: false, error: "Something went wrong" });
  });

  it("defaults to status 400", () => {
    const response = errorResponse("Bad request");
    expect(response.status).toBe(400);
  });

  it("accepts custom status code", () => {
    const response = errorResponse("Not found", 404);
    expect(response.status).toBe(404);
  });

  it("includes field errors from ZodError when provided", async () => {
    // Simulate a ZodError with flatten
    const z = await import("zod");
    const schema = z.z.object({ name: z.z.string().min(1) });
    const result = schema.safeParse({ name: "" });

    if (!result.success) {
      const response = errorResponse("Validation failed", 400, result.error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(body.details.name).toBeDefined();
      expect(Array.isArray(body.details.name)).toBe(true);
    }
  });

  it("does not include details when no ZodError provided", async () => {
    const response = errorResponse("Server error", 500);
    const body = await response.json();

    expect(body.details).toBeUndefined();
  });
});
