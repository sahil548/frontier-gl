import { describe, it, expect } from "vitest";

describe("BUDG-01: PUT /api/entities/:entityId/budgets -- budget upsert", () => {
  it.todo("upserts budget amounts for valid fiscalYear and budgets array");
  it.todo("overwrites existing budget for same account+month (upsert behavior)");
  it.todo("skips rows with zero or empty amount");
  it.todo("returns count of upserted rows");
});

describe("BUDG-01: GET /api/entities/:entityId/budgets -- load budgets", () => {
  it.todo("returns budget rows filtered to the requested fiscal year");
  it.todo("only returns INCOME and EXPENSE account budgets");
  it.todo("includes account details (id, number, name, type)");
});

describe("BUDG-04: entity-scoped budget access", () => {
  it.todo("returns 403 when user has no access to entity");
  it.todo("returns only budgets belonging to the requested entity");
  it.todo("PUT rejects budget for account not belonging to entity");
});
