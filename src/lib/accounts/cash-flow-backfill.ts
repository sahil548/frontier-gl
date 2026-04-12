import type { AccountType, CashFlowCategory } from "@/generated/prisma/enums";

/**
 * Infers the CashFlowCategory for an account based on its type and name.
 * Matches the classification logic from report-queries.ts cash flow statement.
 *
 * - INCOME/EXPENSE -> null (flow through net income)
 * - ASSET + cash -> EXCLUDED (cash is the result, not a source)
 * - ASSET + investment/securities/real estate/private equity -> INVESTING
 * - LIABILITY + loan/mortgage -> FINANCING
 * - EQUITY + equity/capital (not retained) -> FINANCING
 * - EQUITY + distribution -> FINANCING
 * - ASSET + receivable/prepaid -> OPERATING
 * - LIABILITY + payable/accrued -> OPERATING
 * - Default for unmatched balance sheet -> OPERATING
 */
export function inferCashFlowCategory(
  accountType: AccountType | string,
  accountName: string,
): CashFlowCategory | null {
  // Income and expense accounts flow through net income on the cash flow statement
  if (accountType === "INCOME" || accountType === "EXPENSE") {
    return null;
  }

  const nameLower = accountName.toLowerCase();

  // ── ASSET classification ──
  if (accountType === "ASSET") {
    // Cash accounts are excluded (they are the result, not a source)
    if (nameLower.includes("cash")) {
      return "EXCLUDED";
    }

    // Investment-type asset accounts -> INVESTING
    if (
      nameLower.includes("investment") ||
      nameLower.includes("securities") ||
      nameLower.includes("real estate") ||
      nameLower.includes("private equity")
    ) {
      return "INVESTING";
    }

    // Working capital assets -> OPERATING
    if (nameLower.includes("receivable") || nameLower.includes("prepaid")) {
      return "OPERATING";
    }

    // Default for unmatched balance sheet assets -> OPERATING
    return "OPERATING";
  }

  // ── LIABILITY classification ──
  if (accountType === "LIABILITY") {
    // Loan/mortgage liabilities -> FINANCING
    if (nameLower.includes("loan") || nameLower.includes("mortgage")) {
      return "FINANCING";
    }

    // Working capital liabilities -> OPERATING
    if (nameLower.includes("payable") || nameLower.includes("accrued")) {
      return "OPERATING";
    }

    // Default for unmatched liabilities -> OPERATING
    return "OPERATING";
  }

  // ── EQUITY classification ──
  if (accountType === "EQUITY") {
    // Equity/capital accounts (not retained earnings) -> FINANCING
    if (
      (nameLower.includes("equity") || nameLower.includes("capital")) &&
      !nameLower.includes("retained")
    ) {
      return "FINANCING";
    }

    // Distributions -> FINANCING
    if (nameLower.includes("distribution")) {
      return "FINANCING";
    }

    // Default for unmatched equity (e.g., retained earnings) -> OPERATING
    return "OPERATING";
  }

  // Fallback for any unexpected type
  return null;
}

/**
 * Backfills cashFlowCategory for all accounts that currently have null.
 * Uses inferCashFlowCategory to determine the category from type + name.
 *
 * @returns Count of updated accounts
 */
export async function backfillAllAccounts(
  prisma: Parameters<Parameters<typeof import("@/lib/db/prisma").prisma.$transaction>[0]>[0],
): Promise<{ updated: number }> {
  const accounts = await prisma.account.findMany({
    where: { cashFlowCategory: null },
    select: { id: true, type: true, name: true },
  });

  let updated = 0;

  for (const account of accounts) {
    const category = inferCashFlowCategory(account.type, account.name);
    if (category !== null) {
      await prisma.account.update({
        where: { id: account.id },
        data: { cashFlowCategory: category },
      });
      updated++;
    }
  }

  return { updated };
}
