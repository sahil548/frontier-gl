import type { CashFlowItem } from "@/lib/queries/report-queries";

// ---------------------------------------------------------------------------
// Cash Flow Classification — Pure Function
// ---------------------------------------------------------------------------

/**
 * Input row shape expected by the classifier.
 * Mirrors the SQL query result columns.
 */
export interface CashFlowRawRow {
  account_name: string;
  account_type: string;
  cash_flow_category: string | null;
  net_movement: number;
}

/**
 * Classification result. null means the row should be skipped.
 */
export interface CashFlowClassification {
  section: "operating" | "investing" | "financing";
  item: CashFlowItem;
}

/**
 * Classifies a single account row into a cash flow section
 * based on the cashFlowCategory field.
 *
 * Returns null if the row should be skipped (zero movement,
 * EXCLUDED category, or income/expense account without
 * depreciation add-back).
 */
export function classifyCashFlowRow(
  row: CashFlowRawRow
): CashFlowClassification | null {
  const mv = row.net_movement;
  if (mv === 0) return null;

  // Income/Expense: skip (captured in net income), except depreciation add-back
  if (row.account_type === "INCOME" || row.account_type === "EXPENSE") {
    if (
      row.account_type === "EXPENSE" &&
      row.account_name.toLowerCase().includes("depreciation")
    ) {
      return {
        section: "operating",
        item: { accountName: `Add back: ${row.account_name}`, amount: mv },
      };
    }
    return null;
  }

  // Use cashFlowCategory field, default to OPERATING for null
  const category = row.cash_flow_category || "OPERATING";
  if (category === "EXCLUDED") return null;

  switch (category) {
    case "INVESTING":
      return {
        section: "investing",
        item: { accountName: row.account_name, amount: -mv },
      };
    case "FINANCING":
      return {
        section: "financing",
        item: { accountName: row.account_name, amount: -mv },
      };
    case "OPERATING":
    default:
      return {
        section: "operating",
        item: { accountName: `Change in ${row.account_name}`, amount: -mv },
      };
  }
}
