import type { ReportRow } from "@/lib/queries/report-queries";

// ---------------------------------------------------------------------------
// Contra Account Netting — Pure Display Utility
// ---------------------------------------------------------------------------

/**
 * A row in the contra-grouped output.
 * - Regular accounts: type = "normal", rendered as-is
 * - Contra accounts under a parent: type = "contra", rendered with "Less:" prefix
 * - Net total row: type = "net", shows net after contra deductions
 * - Standalone contra (no parent): type = "standalone-contra", rendered with "Less:" prefix inline
 */
export type ContraGroupedRow =
  | { type: "normal"; row: ReportRow }
  | { type: "contra"; row: ReportRow; parentId: string }
  | { type: "net"; parentName: string; parentId: string; netAmount: number }
  | { type: "standalone-contra"; row: ReportRow };

/**
 * Extended ReportRow that includes contra/parent metadata from the API response.
 */
export interface ReportRowWithContra extends ReportRow {
  isContra?: boolean;
  parentId?: string | null;
}

/**
 * Groups balance sheet rows by parent/contra relationship for display.
 *
 * For each parent account with contra children:
 *   1. Parent row (normal, shows gross balance)
 *   2. Each contra child (contra, shows with "Less:" prefix)
 *   3. Net row (net, shows parent balance minus sum of contra balances)
 *
 * Contra accounts with no parent are shown as standalone-contra.
 * Regular accounts with no contra children pass through unchanged.
 *
 * IMPORTANT: This does NOT modify balances — it is display-only grouping.
 * The raw netBalance from the query is preserved. Netting is computed
 * visually in the component.
 */
export function applyContraNetting(
  rows: ReportRowWithContra[]
): ContraGroupedRow[] {
  // Build lookup: parentId -> contra children
  const contraByParent = new Map<string, ReportRowWithContra[]>();
  const contraIds = new Set<string>();

  for (const row of rows) {
    if (row.isContra && row.parentId) {
      contraIds.add(row.accountId);
      const existing = contraByParent.get(row.parentId) ?? [];
      existing.push(row);
      contraByParent.set(row.parentId, existing);
    }
  }

  const result: ContraGroupedRow[] = [];

  for (const row of rows) {
    // Skip contra accounts that belong to a parent (they'll appear under the parent)
    if (contraIds.has(row.accountId)) continue;

    // Check if this account has contra children
    const contras = contraByParent.get(row.accountId);
    if (contras && contras.length > 0) {
      // Parent with contra children: show parent, then contras, then net
      result.push({ type: "normal", row });
      for (const contra of contras) {
        result.push({ type: "contra", row: contra, parentId: row.accountId });
      }
      const contraTotal = contras.reduce(
        (sum, c) => sum + Math.abs(c.netBalance),
        0
      );
      const netAmount = row.netBalance - contraTotal;
      result.push({
        type: "net",
        parentName: row.accountName,
        parentId: row.accountId,
        netAmount,
      });
    } else if (row.isContra && !row.parentId) {
      // Standalone contra (no parent): display with "Less:" prefix inline
      result.push({ type: "standalone-contra", row });
    } else {
      // Regular account, no contra children
      result.push({ type: "normal", row });
    }
  }

  return result;
}
