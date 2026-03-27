"use client";

import Decimal from "decimal.js";
import { CheckCircle2, AlertCircle } from "lucide-react";

type JETotalsRowProps = {
  totalDebit: Decimal;
  totalCredit: Decimal;
};

/**
 * Format a Decimal value as currency string.
 */
function formatCurrency(value: Decimal): string {
  const abs = value.abs();
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${formatted}`;
}

/**
 * Running totals row displayed at the bottom of the line items table.
 * Shows green checkmark when balanced (debit = credit and both > 0).
 * Shows red warning with difference when unbalanced.
 */
export function JETotalsRow({ totalDebit, totalCredit }: JETotalsRowProps) {
  const isBalanced =
    totalDebit.equals(totalCredit) &&
    !totalDebit.isZero();
  const difference = totalDebit.minus(totalCredit).abs();

  return (
    <tr className="border-t-2 border-border font-medium bg-muted/30">
      {/* Account column */}
      <td className="px-3 py-2 text-sm text-right">Totals</td>
      {/* Debit total */}
      <td className="px-3 py-2 text-sm font-mono text-right">
        {formatCurrency(totalDebit)}
      </td>
      {/* Credit total */}
      <td className="px-3 py-2 text-sm font-mono text-right">
        {formatCurrency(totalCredit)}
      </td>
      {/* Memo column -- balance indicator */}
      <td className="px-3 py-2 text-sm" colSpan={2}>
        {isBalanced ? (
          <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Balanced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            Out of balance by {formatCurrency(difference)}
          </span>
        )}
      </td>
    </tr>
  );
}
