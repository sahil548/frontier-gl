"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";

interface VerificationBannerProps {
  totalDebits: number;
  totalCredits: number;
}

/**
 * Persistent banner showing trial balance verification status.
 * Green when total debits equal total credits (within epsilon),
 * red when out of balance showing the difference.
 */
export function VerificationBanner({
  totalDebits,
  totalCredits,
}: VerificationBannerProps) {
  const difference = Math.abs(totalDebits - totalCredits);
  const inBalance = difference < 0.005;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
        inBalance
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      )}
    >
      {inBalance ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0" />
      )}
      <span>
        {inBalance ? (
          <>
            In Balance &mdash; Total Debits: {formatCurrency(totalDebits)} |
            Total Credits: {formatCurrency(totalCredits)}
          </>
        ) : (
          <>
            Out of Balance by {formatCurrency(difference)} &mdash; Total Debits:{" "}
            {formatCurrency(totalDebits)} | Total Credits:{" "}
            {formatCurrency(totalCredits)}
          </>
        )}
      </span>
    </div>
  );
}
