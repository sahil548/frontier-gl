// import { inferCashFlowCategory } from "@/lib/accounts/cash-flow-backfill";
import { describe, test } from "vitest";

describe("inferCashFlowCategory", () => {
  test.todo("assigns OPERATING to receivable/payable assets and liabilities");
  test.todo(
    "assigns INVESTING to investment/securities/real-estate asset accounts",
  );
  test.todo(
    "assigns FINANCING to loan/mortgage liabilities and equity/capital accounts",
  );
  test.todo("assigns EXCLUDED to cash asset accounts");
  test.todo("returns null for INCOME and EXPENSE account types");
  test.todo("defaults unmatched balance sheet accounts to OPERATING");
});
