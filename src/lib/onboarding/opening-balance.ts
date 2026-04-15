/**
 * Opening balance utilities for the onboarding wizard.
 * Provides grid validation and JE generation for opening balances.
 */

// ── Balance Check ───────────────────────────────────────

export interface BalanceCheckResult {
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
}

/**
 * Checks whether a grid of debit/credit amounts is balanced.
 * Grid state is keyed by `${accountId}-debit` and `${accountId}-credit`.
 * Uses 0.005 tolerance for floating-point comparison.
 */
export function getBalanceCheck(gridState: Map<string, string>): BalanceCheckResult {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const [key, value] of gridState) {
    const amount = parseFloat(value) || 0;
    if (key.endsWith("-debit")) totalDebits += amount;
    if (key.endsWith("-credit")) totalCredits += amount;
  }

  const difference = Math.abs(totalDebits - totalCredits);
  return {
    totalDebits,
    totalCredits,
    difference,
    isBalanced: difference < 0.005,
  };
}

// ── Opening Balance JE Generation ───────────────────────

/**
 * Generates an opening balance journal entry from grid state.
 * Extracts non-zero debit/credit amounts and creates a JE via API.
 *
 * @param entityId - Target entity
 * @param gridState - Map keyed by `${accountId}-debit` / `${accountId}-credit`
 * @param jeDate - Date for the journal entry
 * @returns Created JE id
 */
export async function generateOpeningBalanceJE(
  entityId: string,
  gridState: Map<string, string>,
  jeDate: Date,
): Promise<{ journalEntryId: string }> {
  const lineItems: Array<{
    accountId: string;
    debit: string;
    credit: string;
    memo: string;
  }> = [];

  // Extract unique account IDs
  const accountIds = new Set<string>();
  for (const key of gridState.keys()) {
    const parts = key.split("-");
    // key format: accountId-debit or accountId-credit
    const accountId = parts.slice(0, -1).join("-"); // Handle UUIDs with hyphens
    accountIds.add(accountId);
  }

  for (const accountId of accountIds) {
    const debitStr = gridState.get(`${accountId}-debit`) ?? "";
    const creditStr = gridState.get(`${accountId}-credit`) ?? "";
    const debitVal = parseFloat(debitStr) || 0;
    const creditVal = parseFloat(creditStr) || 0;

    if (debitVal === 0 && creditVal === 0) continue;

    lineItems.push({
      accountId,
      // Schema expects decimal-format strings (e.g. "1000" or "0")
      debit: debitVal > 0 ? debitVal.toString() : "0",
      credit: creditVal > 0 ? creditVal.toString() : "0",
      memo: "Opening Balance",
    });
  }

  if (lineItems.length === 0) {
    throw new Error("No non-zero amounts in opening balance grid");
  }

  const res = await fetch(`/api/entities/${entityId}/journal-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: jeDate.toISOString().split("T")[0],
      description: "Opening Balances",
      lineItems,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to create opening balance JE");
  }

  return { journalEntryId: json.data.id };
}
