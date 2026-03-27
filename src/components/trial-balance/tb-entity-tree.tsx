"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { ConsolidatedTrialBalanceRow } from "@/lib/queries/trial-balance-queries";
import { formatCurrency } from "@/lib/utils/accounting";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

// ─── Types ──────────────────────────────────────────────

interface AccountGroup {
  accountNumber: string;
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
  entities: {
    entityId: string;
    entityName: string;
    totalDebits: number;
    totalCredits: number;
  }[];
}

interface EntityTreeRowsProps {
  rows: ConsolidatedTrialBalanceRow[];
}

// ─── Helpers ────────────────────────────────────────────

function groupByAccount(
  rows: ConsolidatedTrialBalanceRow[]
): AccountGroup[] {
  const map = new Map<string, AccountGroup>();

  for (const row of rows) {
    const key = row.accountNumber;
    let group = map.get(key);
    if (!group) {
      group = {
        accountNumber: row.accountNumber,
        accountName: row.accountName,
        accountType: row.accountType,
        totalDebits: 0,
        totalCredits: 0,
        entities: [],
      };
      map.set(key, group);
    }
    group.totalDebits += row.totalDebits;
    group.totalCredits += row.totalCredits;
    group.entities.push({
      entityId: row.entityId,
      entityName: row.entityName,
      totalDebits: row.totalDebits,
      totalCredits: row.totalCredits,
    });
  }

  // Sort by account number
  return Array.from(map.values()).sort((a, b) =>
    a.accountNumber.localeCompare(b.accountNumber)
  );
}

// ─── Component ──────────────────────────────────────────

/**
 * Tree-style rows for consolidated multi-entity trial balance.
 * Parent rows show consolidated totals; child rows show per-entity breakdowns.
 * Each account row is expandable/collapsible.
 */
export function EntityTreeRows({ rows }: EntityTreeRowsProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );

  const groups = groupByAccount(rows);

  function toggleAccount(accountNumber: string) {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountNumber)) {
        next.delete(accountNumber);
      } else {
        next.add(accountNumber);
      }
      return next;
    });
  }

  return (
    <>
      {groups.map((group) => {
        const isExpanded = expandedAccounts.has(group.accountNumber);
        const hasMultipleEntities = group.entities.length > 1;

        return (
          <tbody key={group.accountNumber}>
            {/* Parent row */}
            <TableRow
              className={cn(
                hasMultipleEntities && "cursor-pointer",
                isExpanded && "bg-muted/30"
              )}
              onClick={() =>
                hasMultipleEntities && toggleAccount(group.accountNumber)
              }
            >
              <TableCell className="font-mono text-sm">
                <span className="flex items-center gap-1.5">
                  {hasMultipleEntities &&
                    (isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ))}
                  {group.accountNumber}
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {group.accountName}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-0 font-medium",
                    TYPE_COLORS[group.accountType] ?? ""
                  )}
                >
                  {TYPE_LABELS[group.accountType] ?? group.accountType}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {group.totalDebits > 0 ? formatCurrency(group.totalDebits) : ""}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {group.totalCredits > 0
                  ? formatCurrency(group.totalCredits)
                  : ""}
              </TableCell>
            </TableRow>

            {/* Child rows (per-entity) */}
            {isExpanded &&
              group.entities.map((entity) => (
                <TableRow
                  key={`${group.accountNumber}-${entity.entityId}`}
                  className="bg-muted/10"
                >
                  <TableCell />
                  <TableCell className="pl-10 text-sm text-muted-foreground">
                    {entity.entityName}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {entity.totalDebits > 0
                      ? formatCurrency(entity.totalDebits)
                      : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {entity.totalCredits > 0
                      ? formatCurrency(entity.totalCredits)
                      : ""}
                  </TableCell>
                </TableRow>
              ))}
          </tbody>
        );
      })}
    </>
  );
}
