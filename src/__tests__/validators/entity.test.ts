import { describe, it, expect } from "vitest";
import {
  createEntitySchema,
  updateEntitySchema,
} from "@/lib/validators/entity";
import { entityScope } from "@/lib/db/scoped-query";

describe("createEntitySchema", () => {
  const validInput = {
    name: "Test Entity LP",
    type: "LP",
    fiscalYearEnd: "12-31",
    coaTemplate: "BLANK",
  };

  it("accepts valid entity data", () => {
    const result = createEntitySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid entity data without coaTemplate (defaults to BLANK)", () => {
    const { coaTemplate, ...withoutTemplate } = validInput;
    const result = createEntitySchema.safeParse(withoutTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coaTemplate).toBe("BLANK");
    }
  });

  it("rejects missing name", () => {
    const { name, ...withoutName } = validInput;
    const result = createEntitySchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createEntitySchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      name: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid entity type", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      type: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fiscalYearEnd format", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      fiscalYearEnd: "2024-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fiscalYearEnd with invalid month", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      fiscalYearEnd: "13-31",
    });
    expect(result.success).toBe(false);
  });

  it("requires typeOther when type is OTHER", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      type: "OTHER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts typeOther when type is OTHER", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      type: "OTHER",
      typeOther: "Family Trust",
    });
    expect(result.success).toBe(true);
  });

  it("rejects typeOther longer than 100 characters", () => {
    const result = createEntitySchema.safeParse({
      ...validInput,
      type: "OTHER",
      typeOther: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid entity types", () => {
    const types = [
      "LP",
      "LLC",
      "CORPORATION",
      "S_CORP",
      "TRUST",
      "FOUNDATION",
      "PARTNERSHIP",
      "INDIVIDUAL",
      "OTHER",
    ];
    for (const type of types) {
      const input =
        type === "OTHER"
          ? { ...validInput, type, typeOther: "Custom" }
          : { ...validInput, type };
      const result = createEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });
});

describe("updateEntitySchema", () => {
  it("accepts partial fields", () => {
    const result = updateEntitySchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts isActive boolean", () => {
    const result = updateEntitySchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateEntitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid name on update", () => {
    const result = updateEntitySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid isActive value", () => {
    const result = updateEntitySchema.safeParse({ isActive: "yes" });
    expect(result.success).toBe(false);
  });
});

describe("entityScope", () => {
  it('returns empty object for "all"', () => {
    const result = entityScope("all");
    expect(result).toEqual({});
  });

  it("returns entityId filter for specific id", () => {
    const result = entityScope("some-id");
    expect(result).toEqual({ entityId: "some-id" });
  });
});
