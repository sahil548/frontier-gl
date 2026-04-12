// import { getCashFlowStatement } from "@/lib/queries/report-queries";
import { describe, test } from "vitest";

describe("getCashFlowStatement — cashFlowCategory field", () => {
  test.todo(
    "classifies account by cashFlowCategory field instead of name matching",
  );
  test.todo(
    "treats null cashFlowCategory as OPERATING for balance sheet accounts",
  );
  test.todo("skips EXCLUDED category accounts from cash flow");
  test.todo("ignores cashFlowCategory for income and expense accounts");
});
