import { describe, it, expect } from "vitest";
// Import will fail until 07-01 creates the file -- that's expected for stubs
// import { budgetLineSchema, budgetUpsertSchema, budgetCsvRowSchema } from "@/validators/budget";

describe("BUDG-01: budget upsert schema validation", () => {
  it.todo("accepts valid budget line with accountId, year, month, amount");
  it.todo("rejects budget line with month < 1 or > 12");
  it.todo("rejects budget line with year outside 2000-2100");
  it.todo("rejects budget line with missing accountId");
  it.todo("accepts valid budgetUpsertSchema with fiscalYear and budgets array");
  it.todo("rejects upsert schema with empty budgets array");
});

describe("BUDG-02: budget CSV row schema validation", () => {
  it.todo("accepts valid CSV row with accountNumber, period MM/YYYY, amount");
  it.todo("rejects CSV row with invalid period format");
  it.todo("rejects CSV row with non-numeric amount");
  it.todo("rejects CSV row with empty accountNumber");
});
