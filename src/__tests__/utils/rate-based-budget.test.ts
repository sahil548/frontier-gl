// import { computeMonthlyBudget } from "@/lib/budgets/rate-based";
import { describe, test } from "vitest";

describe("computeMonthlyBudget", () => {
  test.todo("computes monthly budget as holdingValue * rate / 12");
  test.todo("rounds to 4 decimal places matching Decimal(19,4)");
  test.todo("handles zero rate returning zero budget");
  test.todo("handles large holding values without overflow");
});
