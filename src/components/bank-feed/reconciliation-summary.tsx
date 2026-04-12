"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";

interface ReconciliationSummaryProps {
  transactions: Array<{
    amount: string | number;
    reconciliationStatus?: string;
  }>;
}

export function ReconciliationSummary({
  transactions,
}: ReconciliationSummaryProps) {
  const stats = useMemo(() => {
    let reconciledCount = 0;
    let pendingCount = 0;
    let unmatchedCount = 0;
    let reconciledTotal = 0;
    let unreconciledTotal = 0;

    for (const txn of transactions) {
      const absAmount = Math.abs(
        typeof txn.amount === "string" ? parseFloat(txn.amount) : txn.amount
      );
      const status = txn.reconciliationStatus ?? "PENDING";

      if (status === "RECONCILED") {
        reconciledCount++;
        reconciledTotal += absAmount;
      } else if (status === "UNMATCHED") {
        unmatchedCount++;
        unreconciledTotal += absAmount;
      } else {
        // PENDING or any other status
        pendingCount++;
        unreconciledTotal += absAmount;
      }
    }

    return {
      reconciledCount,
      pendingCount,
      unmatchedCount,
      reconciledTotal,
      unreconciledTotal,
    };
  }, [transactions]);

  if (transactions.length === 0) return null;

  return (
    <div className="flex flex-row flex-wrap gap-4 rounded-lg bg-muted/50 border px-4 py-3">
      {/* Reconciled */}
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
        <span className="text-muted-foreground">Reconciled:</span>
        <span className="font-medium">
          {stats.reconciledCount}
        </span>
        <span className="text-muted-foreground">
          ({formatCurrency(stats.reconciledTotal)})
        </span>
      </div>

      {/* Pending */}
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
        <span className="text-muted-foreground">Pending:</span>
        <span className="font-medium">
          {stats.pendingCount}
        </span>
        <span className="text-muted-foreground">
          ({formatCurrency(stats.unreconciledTotal)})
        </span>
      </div>

      {/* Unmatched (only if any) */}
      {stats.unmatchedCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
          <span className="text-muted-foreground">Unmatched:</span>
          <span className="font-medium">
            {stats.unmatchedCount}
          </span>
        </div>
      )}
    </div>
  );
}
