import { describe, it, expect } from "vitest";

describe("BUDG-02: POST /api/entities/:entityId/budgets/import -- CSV import", () => {
  it.todo("parses valid CSV with account_number, period, amount columns");
  it.todo("upserts parsed rows into budget table");
  it.todo("returns imported count, skipped count, and errors array");
  it.todo("skips rows where account number not found in entity");
  it.todo("skips rows where account is not INCOME or EXPENSE type");
  it.todo("reports validation errors with row numbers");
  it.todo("handles CSV with header variations (accountNumber vs account_number)");
});
