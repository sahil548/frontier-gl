import { describe, it, expect } from "vitest";

describe("BUDG-03: GET /api/entities/:entityId/reports/budget-vs-actual -- variance report", () => {
  it.todo("returns income and expense rows with actual, budget, varianceDollar, variancePercent");
  it.todo("computes income variance as actual - budget (positive = favorable)");
  it.todo("computes expense variance as budget - actual (positive = favorable)");
  it.todo("returns null variancePercent when budget is zero");
  it.todo("groups rows into incomeRows and expenseRows");
  it.todo("computes section totals and net income variance");
});

describe("BUDG-05: budget report CSV export data", () => {
  it.todo("report data includes all columns needed for CSV export (Account #, Name, Actual, Budget, Variance $, Variance %)");
  it.todo("section headers and subtotals are included in export-ready format");
});
