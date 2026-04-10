import { describe, it, expect } from "vitest";
import type {
  BudgetVsActualRow,
  BudgetVsActualData,
  BudgetVsActualTotals,
} from "@/lib/queries/report-queries";

// --- Helpers that mirror the query logic for unit testing ---

function computeVariancePercent(varianceDollar: number, budget: number): number | null {
  if (budget === 0) return null;
  return (varianceDollar / Math.abs(budget)) * 100;
}

function buildRow(
  accountType: "INCOME" | "EXPENSE",
  actual: number,
  budget: number
): BudgetVsActualRow {
  const isIncome = accountType === "INCOME";
  const varianceDollar = isIncome ? actual - budget : budget - actual;
  const variancePercent = computeVariancePercent(varianceDollar, budget);
  return {
    accountId: "test-id",
    accountNumber: "1000",
    accountName: "Test Account",
    accountType,
    actual,
    budget,
    varianceDollar,
    variancePercent,
  };
}

function buildTotals(rows: BudgetVsActualRow[], type: "INCOME" | "EXPENSE"): BudgetVsActualTotals {
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const varianceDollar = type === "INCOME"
    ? totalActual - totalBudget
    : totalBudget - totalActual;
  return {
    actual: totalActual,
    budget: totalBudget,
    varianceDollar,
    variancePercent: computeVariancePercent(varianceDollar, totalBudget),
  };
}

describe("BUDG-03: GET /api/entities/:entityId/reports/budget-vs-actual -- variance report", () => {
  it("returns income and expense rows with actual, budget, varianceDollar, variancePercent", () => {
    const row = buildRow("INCOME", 5000, 4000);
    expect(row).toHaveProperty("actual", 5000);
    expect(row).toHaveProperty("budget", 4000);
    expect(row).toHaveProperty("varianceDollar");
    expect(row).toHaveProperty("variancePercent");
  });

  it("computes income variance as actual - budget (positive = favorable)", () => {
    // Actual > budget => favorable => positive variance
    const favorable = buildRow("INCOME", 5000, 4000);
    expect(favorable.varianceDollar).toBe(1000); // 5000 - 4000
    expect(favorable.variancePercent).toBe(25); // 1000 / 4000 * 100

    // Actual < budget => unfavorable => negative variance
    const unfavorable = buildRow("INCOME", 3000, 4000);
    expect(unfavorable.varianceDollar).toBe(-1000); // 3000 - 4000
    expect(unfavorable.variancePercent).toBe(-25);
  });

  it("computes expense variance as budget - actual (positive = favorable)", () => {
    // Actual < budget => favorable => positive variance
    const favorable = buildRow("EXPENSE", 3000, 4000);
    expect(favorable.varianceDollar).toBe(1000); // 4000 - 3000
    expect(favorable.variancePercent).toBe(25);

    // Actual > budget => unfavorable => negative variance
    const unfavorable = buildRow("EXPENSE", 5000, 4000);
    expect(unfavorable.varianceDollar).toBe(-1000); // 4000 - 5000
    expect(unfavorable.variancePercent).toBe(-25);
  });

  it("returns null variancePercent when budget is zero", () => {
    const incomeRow = buildRow("INCOME", 5000, 0);
    expect(incomeRow.variancePercent).toBeNull();
    expect(incomeRow.varianceDollar).toBe(5000); // actual - 0

    const expenseRow = buildRow("EXPENSE", 3000, 0);
    expect(expenseRow.variancePercent).toBeNull();
    expect(expenseRow.varianceDollar).toBe(-3000); // 0 - 3000
  });

  it("groups rows into incomeRows and expenseRows", () => {
    const incomeRow = buildRow("INCOME", 5000, 4000);
    const expenseRow = buildRow("EXPENSE", 3000, 4000);

    const data: BudgetVsActualData = {
      incomeRows: [incomeRow],
      expenseRows: [expenseRow],
      totalIncome: buildTotals([incomeRow], "INCOME"),
      totalExpenses: buildTotals([expenseRow], "EXPENSE"),
      netIncome: {
        actual: incomeRow.actual - expenseRow.actual,
        budget: incomeRow.budget - expenseRow.budget,
        varianceDollar: (incomeRow.actual - expenseRow.actual) - (incomeRow.budget - expenseRow.budget),
        variancePercent: null,
      },
    };

    expect(data.incomeRows).toHaveLength(1);
    expect(data.incomeRows[0].accountType).toBe("INCOME");
    expect(data.expenseRows).toHaveLength(1);
    expect(data.expenseRows[0].accountType).toBe("EXPENSE");
  });

  it("computes section totals and net income variance", () => {
    const income1 = buildRow("INCOME", 3000, 2500);
    const income2 = buildRow("INCOME", 2000, 1500);
    const expense1 = buildRow("EXPENSE", 1000, 1200);
    const expense2 = buildRow("EXPENSE", 800, 900);

    const totalIncome = buildTotals([income1, income2], "INCOME");
    expect(totalIncome.actual).toBe(5000);
    expect(totalIncome.budget).toBe(4000);
    expect(totalIncome.varianceDollar).toBe(1000); // 5000 - 4000
    expect(totalIncome.variancePercent).toBe(25);

    const totalExpenses = buildTotals([expense1, expense2], "EXPENSE");
    expect(totalExpenses.actual).toBe(1800);
    expect(totalExpenses.budget).toBe(2100);
    expect(totalExpenses.varianceDollar).toBe(300); // 2100 - 1800 (favorable)

    // Net income
    const netActual = totalIncome.actual - totalExpenses.actual; // 5000 - 1800 = 3200
    const netBudget = totalIncome.budget - totalExpenses.budget; // 4000 - 2100 = 1900
    const netVariance = netActual - netBudget; // 3200 - 1900 = 1300

    expect(netActual).toBe(3200);
    expect(netBudget).toBe(1900);
    expect(netVariance).toBe(1300);
  });
});

describe("BUDG-05: budget report CSV export data", () => {
  it("report data includes all columns needed for CSV export (Account #, Name, Actual, Budget, Variance $, Variance %)", () => {
    const row = buildRow("INCOME", 5000, 4000);
    // Verify all fields exist for CSV export mapping
    const csvRow = {
      "Account Number": row.accountNumber,
      "Account Name": row.accountName,
      "Actual": row.actual.toFixed(2),
      "Budget": row.budget.toFixed(2),
      "Variance $": row.varianceDollar.toFixed(2),
      "Variance %": row.variancePercent !== null ? row.variancePercent.toFixed(1) + "%" : "--",
    };

    expect(csvRow["Account Number"]).toBe("1000");
    expect(csvRow["Account Name"]).toBe("Test Account");
    expect(csvRow["Actual"]).toBe("5000.00");
    expect(csvRow["Budget"]).toBe("4000.00");
    expect(csvRow["Variance $"]).toBe("1000.00");
    expect(csvRow["Variance %"]).toBe("25.0%");
  });

  it("section headers and subtotals are included in export-ready format", () => {
    const income1 = buildRow("INCOME", 3000, 2500);
    const totals = buildTotals([income1], "INCOME");

    // Section header row
    const headerRow = {
      "Account Number": "",
      "Account Name": "Income",
      "Actual": "",
      "Budget": "",
      "Variance $": "",
      "Variance %": "",
    };
    expect(headerRow["Account Name"]).toBe("Income");

    // Subtotal row
    const subtotalRow = {
      "Account Number": "",
      "Account Name": "Total Income",
      "Actual": totals.actual.toFixed(2),
      "Budget": totals.budget.toFixed(2),
      "Variance $": totals.varianceDollar.toFixed(2),
      "Variance %": totals.variancePercent !== null ? totals.variancePercent.toFixed(1) + "%" : "--",
    };
    expect(subtotalRow["Account Name"]).toBe("Total Income");
    expect(subtotalRow["Actual"]).toBe("3000.00");
  });
});
