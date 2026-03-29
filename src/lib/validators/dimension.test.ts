import { describe, it, expect } from "vitest";
import {
  createDimensionSchema,
  createTagSchema,
  updateTagSchema,
} from "./dimension";

describe("createDimensionSchema", () => {
  it("accepts a valid name", () => {
    const result = createDimensionSchema.safeParse({ name: "Fund" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createDimensionSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = createDimensionSchema.safeParse({ name: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("createTagSchema", () => {
  it("accepts valid code and name", () => {
    const result = createTagSchema.safeParse({
      code: "FND1",
      name: "Fund I",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty code", () => {
    const result = createTagSchema.safeParse({ code: "", name: "Fund I" });
    expect(result.success).toBe(false);
  });

  it("rejects code over 10 characters", () => {
    const result = createTagSchema.safeParse({
      code: "ABCDEFGHIJK",
      name: "Fund I",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-alphanumeric code", () => {
    const result = createTagSchema.safeParse({
      code: "FND-1",
      name: "Fund I",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description", () => {
    const result = createTagSchema.safeParse({
      code: "FND1",
      name: "Fund I",
      description: "First fund",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTagSchema", () => {
  it("accepts partial updates", () => {
    const result = updateTagSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts isActive toggle", () => {
    const result = updateTagSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateTagSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
