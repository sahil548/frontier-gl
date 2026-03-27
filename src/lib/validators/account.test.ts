import { describe, it, expect } from "vitest";
import { createAccountSchema, updateAccountSchema } from "./account";

describe("Account Validators", () => {
  describe("createAccountSchema", () => {
    it("accepts valid account input", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash and Cash Equivalents",
        number: "10100",
        type: "ASSET",
        description: "Main operating cash account",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid input without optional fields", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "10100",
        type: "ASSET",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid input with parentId", () => {
      const result = createAccountSchema.safeParse({
        name: "Sub Account",
        number: "10200",
        type: "ASSET",
        parentId: "clz1234567890abcdefghij",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createAccountSchema.safeParse({
        name: "",
        number: "10100",
        type: "ASSET",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 200 characters", () => {
      const result = createAccountSchema.safeParse({
        name: "A".repeat(201),
        number: "10100",
        type: "ASSET",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing type", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "10100",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid type", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "10100",
        type: "INVALID_TYPE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects account number longer than 5 digits", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "123456",
        type: "ASSET",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric account number", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "ABC",
        type: "ASSET",
      });
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 500 characters", () => {
      const result = createAccountSchema.safeParse({
        name: "Cash",
        number: "10100",
        type: "ASSET",
        description: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateAccountSchema", () => {
    it("accepts partial update with just name", () => {
      const result = updateAccountSchema.safeParse({
        name: "Updated Cash",
      });
      expect(result.success).toBe(true);
    });

    it("accepts update with isActive", () => {
      const result = updateAccountSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (all optional)", () => {
      const result = updateAccountSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid isActive type", () => {
      const result = updateAccountSchema.safeParse({
        isActive: "not-a-boolean",
      });
      expect(result.success).toBe(false);
    });
  });
});
