"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TrialBalanceRow } from "@/lib/queries/trial-balance-queries";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";

// ─── Account type badge colors ──────────────────────────

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EQUITY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INCOME: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  EXPENSE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

// ─── Column definitions ─────────────────────────────────

export const trialBalanceColumns: ColumnDef<TrialBalanceRow>[] = [
  {
    accessorKey: "accountNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account Number" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.accountNumber}</span>
    ),
  },
  {
    accessorKey: "accountName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account Name" />
    ),
  },
  {
    accessorKey: "accountType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.accountType;
      return (
        <Badge
          variant="secondary"
          className={cn(
            "border-0 font-medium",
            TYPE_COLORS[type] ?? ""
          )}
        >
          {TYPE_LABELS[type] ?? type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "totalDebits",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Debit Balance"
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      const value = row.original.totalDebits;
      return (
        <div className="text-right font-mono text-sm">
          {value > 0 ? formatCurrency(value) : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "totalCredits",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Credit Balance"
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      const value = row.original.totalCredits;
      return (
        <div className="text-right font-mono text-sm">
          {value > 0 ? formatCurrency(value) : ""}
        </div>
      );
    },
  },
];
