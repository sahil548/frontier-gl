import { describe, it, expect } from "vitest";
import { generateTransactionHash } from "@/lib/bank-transactions/duplicate-check";

describe("generateTransactionHash", () => {
  it("produces consistent SHA-256 for same inputs", () => {
    const hash1 = generateTransactionHash("2025-01-15", "49.99", "AMAZON PURCHASE");
    const hash2 = generateTransactionHash("2025-01-15", "49.99", "AMAZON PURCHASE");

    expect(hash1).toBe(hash2);
    // SHA-256 hex string is 64 characters
    expect(hash1).toHaveLength(64);
  });

  it("different inputs produce different hashes", () => {
    const hash1 = generateTransactionHash("2025-01-15", "49.99", "AMAZON PURCHASE");
    const hash2 = generateTransactionHash("2025-01-16", "49.99", "AMAZON PURCHASE");
    const hash3 = generateTransactionHash("2025-01-15", "50.00", "AMAZON PURCHASE");
    const hash4 = generateTransactionHash("2025-01-15", "49.99", "WALMART PURCHASE");

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).not.toBe(hash4);
  });

  it("normalizes amount to 4 decimal places", () => {
    const hash1 = generateTransactionHash("2025-01-15", "49.99", "PURCHASE");
    const hash2 = generateTransactionHash("2025-01-15", "49.9900", "PURCHASE");
    const hash3 = generateTransactionHash("2025-01-15", "49.990000", "PURCHASE");

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it("lowercases and trims description", () => {
    const hash1 = generateTransactionHash("2025-01-15", "49.99", "AMAZON PURCHASE");
    const hash2 = generateTransactionHash("2025-01-15", "49.99", "amazon purchase");
    const hash3 = generateTransactionHash("2025-01-15", "49.99", "  AMAZON PURCHASE  ");

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it("includes rowIndex in hash when provided for disambiguation", () => {
    const hash1 = generateTransactionHash("2025-01-15", "49.99", "PURCHASE", 0);
    const hash2 = generateTransactionHash("2025-01-15", "49.99", "PURCHASE", 1);
    const hashNoIdx = generateTransactionHash("2025-01-15", "49.99", "PURCHASE");

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hashNoIdx);
  });
});
