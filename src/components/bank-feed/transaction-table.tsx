"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MoreHorizontal, Split, Send, Ban, Tag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountCombobox } from "@/components/ui/account-combobox";
import { cn } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

export type SerializedBankTransaction = {
  id: string;
  subledgerItemId: string;
  externalId: string | null;
  date: string;
  description: string;
  amount: string;
  originalDescription: string | null;
  merchantName: string | null;
  category: string | null;
  source: string;
  status: string;
  accountId: string | null;
  ruleId: string | null;
  isSplit: boolean;
  parentTransactionId: string | null;
  journalEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  account: { id: string; number: string; name: string } | null;
  rule: { id: string; pattern: string } | null;
};

type AccountOption = {
  id: string;
  accountNumber: string;
  name: string;
};

type TransactionTableProps = {
  transactions: SerializedBankTransaction[];
  accounts: AccountOption[];
  onCategorize: (transactionId: string, accountId: string) => void;
  onPost: (transactionId: string) => void;
  onBulkPost: (transactionIds: string[], accountId: string, postImmediately: boolean) => void;
  onSplit: (transactionId: string) => void;
  onExclude?: (transactionId: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  compact?: boolean;
};

// ---- Helpers --------------------------------------------------------------

function formatCurrency(amountStr: string): string {
  const num = parseFloat(amountStr);
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-$${formatted}` : `$${formatted}`;
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PENDING":
      return "outline";
    case "CATEGORIZED":
      return "secondary";
    case "POSTED":
      return "default";
    case "EXCLUDED":
      return "destructive";
    default:
      return "outline";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CATEGORIZED":
      return "Categorized";
    case "POSTED":
      return "Posted";
    case "EXCLUDED":
      return "Excluded";
    default:
      return status;
  }
}

// ---- Component ------------------------------------------------------------

export function TransactionTable({
  transactions,
  accounts,
  onCategorize,
  onPost,
  onBulkPost,
  onSplit,
  onExclude,
  selectedIds,
  onSelectionChange,
  compact = false,
}: TransactionTableProps) {
  const [bulkAccountId, setBulkAccountId] = useState<string | null>(null);

  const displayTransactions = compact
    ? transactions.slice(0, 10)
    : transactions;

  const allSelectableIds = useMemo(
    () => displayTransactions.filter((t) => t.status !== "POSTED").map((t) => t.id),
    [displayTransactions]
  );

  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allSelectableIds);
    }
  }, [allSelected, allSelectableIds, onSelectionChange]);

  const handleSelectRow = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((x) => x !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [selectedIds, onSelectionChange]
  );

  if (displayTransactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          No bank transactions yet. Import a CSV or connect a bank feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            {!compact && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[120px] text-right">Amount</TableHead>
            {!compact && <TableHead className="w-[70px]">Source</TableHead>}
            <TableHead className="w-[180px]">Account</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTransactions.map((txn) => {
            const amount = parseFloat(txn.amount);
            const isPositive = amount >= 0;
            const isPosted = txn.status === "POSTED";

            return (
              <TableRow key={txn.id}>
                {!compact && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(txn.id)}
                      onCheckedChange={() => handleSelectRow(txn.id)}
                      disabled={isPosted}
                      aria-label={`Select ${txn.description}`}
                    />
                  </TableCell>
                )}
                <TableCell className="text-sm whitespace-nowrap">
                  {format(new Date(txn.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-sm max-w-[250px]">
                  <div className="truncate">{txn.description}</div>
                  {txn.merchantName && txn.merchantName !== txn.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {txn.merchantName}
                    </div>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(txn.amount)}
                </TableCell>
                {!compact && (
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {txn.source}
                    </Badge>
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {txn.status === "PENDING" ? (
                    <AccountCombobox
                      accounts={accounts}
                      value={txn.accountId}
                      onSelect={(accountId) =>
                        onCategorize(txn.id, accountId)
                      }
                      placeholder="Assign account..."
                    />
                  ) : txn.account ? (
                    <span className="text-sm">
                      {txn.account.number} - {txn.account.name}
                    </span>
                  ) : txn.isSplit ? (
                    <span className="text-sm text-muted-foreground italic">
                      Split
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(txn.status)}>
                    {statusLabel(txn.status)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {!isPosted && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Transaction actions"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {txn.status === "CATEGORIZED" && (
                          <DropdownMenuItem onClick={() => onPost(txn.id)}>
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Post as JE
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onSplit(txn.id)}>
                          <Split className="mr-2 h-3.5 w-3.5" />
                          Split
                        </DropdownMenuItem>
                        {onExclude && txn.status !== "EXCLUDED" && (
                          <DropdownMenuItem onClick={() => onExclude(txn.id)}>
                            <Ban className="mr-2 h-3.5 w-3.5" />
                            Exclude
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Compact mode: "View all" link */}
      {compact && transactions.length > 10 && (
        <div className="text-center pt-2">
          <Link
            href="/bank-feed"
            className="text-sm text-primary hover:underline"
          >
            View all {transactions.length} transactions in Bank Feed
          </Link>
        </div>
      )}

      {/* Bulk action bar (full mode only, when rows selected) */}
      {!compact && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="w-[240px]">
            <AccountCombobox
              accounts={accounts}
              value={bulkAccountId}
              onSelect={setBulkAccountId}
              placeholder="Assign account..."
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkAccountId}
            onClick={() => {
              if (bulkAccountId) {
                onBulkPost(selectedIds, bulkAccountId, false);
              }
            }}
          >
            Post as Draft
          </Button>
          <Button
            size="sm"
            disabled={!bulkAccountId}
            onClick={() => {
              if (bulkAccountId) {
                onBulkPost(selectedIds, bulkAccountId, true);
              }
            }}
          >
            Post Now
          </Button>
        </div>
      )}
    </div>
  );
}
