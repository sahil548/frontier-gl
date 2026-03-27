import { describe, it, expect } from "vitest";
import { validateStatusTransition } from "./status";

describe("Journal Entry Status Transitions", () => {
  describe("valid transitions", () => {
    it("allows DRAFT -> APPROVED", () => {
      expect(validateStatusTransition("DRAFT", "APPROVED")).toBe(true);
    });

    it("allows DRAFT -> POSTED", () => {
      expect(validateStatusTransition("DRAFT", "POSTED")).toBe(true);
    });

    it("allows APPROVED -> POSTED", () => {
      expect(validateStatusTransition("APPROVED", "POSTED")).toBe(true);
    });
  });

  describe("invalid transitions", () => {
    it("rejects POSTED -> DRAFT", () => {
      expect(validateStatusTransition("POSTED", "DRAFT")).toBe(false);
    });

    it("rejects POSTED -> APPROVED", () => {
      expect(validateStatusTransition("POSTED", "APPROVED")).toBe(false);
    });

    it("rejects POSTED -> POSTED", () => {
      expect(validateStatusTransition("POSTED", "POSTED")).toBe(false);
    });

    it("rejects APPROVED -> DRAFT", () => {
      expect(validateStatusTransition("APPROVED", "DRAFT")).toBe(false);
    });
  });
});
