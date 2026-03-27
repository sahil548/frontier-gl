import type { AccountType } from "@/generated/prisma/enums";

export type { AccountType };

/**
 * Returns the normal balance side for a given account type.
 * Assets and Expenses are debit-normal.
 * Liabilities, Equity, and Income are credit-normal.
 */
export function getNormalBalanceSide(
  accountType: AccountType
): "DEBIT" | "CREDIT" {
  switch (accountType) {
    case "ASSET":
    case "EXPENSE":
      return "DEBIT";
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
  }
}

/**
 * Convenience wrapper: returns true if the account type has a debit normal balance.
 */
export function isDebitNormal(accountType: AccountType): boolean {
  return getNormalBalanceSide(accountType) === "DEBIT";
}

/**
 * Formats a number or string (Prisma Decimal) as currency.
 * Returns a string like "$1,234.56" or "-$1,234.56".
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";

  const absFormatted = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return num < 0 ? `-$${absFormatted}` : `$${absFormatted}`;
}
