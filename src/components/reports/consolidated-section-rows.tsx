"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────

interface ReportRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  netBalance: number;
}

interface EntityBreakdownData {
  entityId: string;
  entityName: string;
  data: {
    incomeRows?: ReportRow[];
    expenseRows?: ReportRow[];
    assetRows?: ReportRow[];
    liabilityRows?: ReportRow[];
    equityRows?: ReportRow[];
  };
}

interface AccountGroup {
  accountNumber: string;
  accountName: string;
  accountType: string;
  totalBalance: number;
  entities: {
    entityId: string;
    entityName: string;
    balance: number;
  }[];
}

interface ConsolidatedSectionRowsProps {
  label: string;
  rowKey: "incomeRows" | "expenseRows" | "assetRows" | "liabilityRows" | "equityRows";
  entityBreakdowns: EntityBreakdownData[];
  total: number;
  totalLabel: string;
  selectedEntityIds: Set<string>;
}

// ─── Helper: group rows by account across entities ──────

function groupByAccount(
  entityBreakdowns: EntityBreakdownData[],
  rowKey: string,
  selectedEntityIds: Set<string>
): AccountGroup[] {
  const map = new Map<string, AccountGroup>();

  for (const breakdown of entityBreakdowns) {
    if (!selectedEntityIds.has(breakdown.entityId)) continue;

    const rows = (breakdown.data as Record<string, ReportRow[] | undefined>)[rowKey];
    if (!rows) continue;

    for (const row of rows) {
      const key = `${row.accountNumber}:${row.accountType}`;
      let group = map.get(key);
      if (!group) {
        group = {
          accountNumber: row.accountNumber,
          accountName: row.accountName,
          accountType: row.accountType,
          totalBalance: 0,
          entities: [],
        };
        map.set(key, group);
      }
      group.totalBalance += row.netBalance;
      group.entities.push({
        entityId: breakdown.entityId,
        entityName: breakdown.entityName,
        balance: row.netBalance,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.accountNumber.localeCompare(b.accountNumber)
  );
}

// ─── Component ──────────────────────────────────────────

export function ConsolidatedSectionRows({
  label,
  rowKey,
  entityBreakdowns,
  total,
  totalLabel,
  selectedEntityIds,
}: ConsolidatedSectionRowsProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );

  const groups = groupByAccount(entityBreakdowns, rowKey, selectedEntityIds);

  function toggleAccount(key: string) {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <>
      {/* Section header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={4} className="py-2 font-semibold text-sm">
          {label}
        </TableCell>
      </TableRow>

      {/* Account rows */}
      {groups.map((group) => {
        const key = `${group.accountNumber}:${group.accountType}`;
        const isExpanded = expandedAccounts.has(key);
        const hasMultipleEntities = group.entities.length > 1;

        return (
          <tbody key={key}>
            {/* Parent row (consolidated) */}
            <TableRow
              className={cn(
                hasMultipleEntities && "cursor-pointer",
                isExpanded && "bg-muted/20"
              )}
              onClick={() => hasMultipleEntities && toggleAccount(key)}
            >
              <TableCell className="font-mono text-sm pl-6">
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
              <TableCell>{group.accountName}</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(group.totalBalance)}
              </TableCell>
            </TableRow>

            {/* Child rows (per-entity) */}
            {isExpanded &&
              group.entities.map((entity) => (
                <TableRow
                  key={`${key}-${entity.entityId}`}
                  className="bg-muted/10"
                >
                  <TableCell />
                  <TableCell className="pl-10 text-sm text-muted-foreground">
                    {entity.entityName}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatCurrency(entity.balance)}
                  </TableCell>
                </TableRow>
              ))}
          </tbody>
        );
      })}

      {/* Section total */}
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell />
        <TableCell className="font-semibold text-sm">{totalLabel}</TableCell>
        <TableCell />
        <TableCell className="text-right font-mono text-sm font-semibold">
          {formatCurrency(total)}
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Cash Flow Consolidated Section ─────────────────────

interface CashFlowItem {
  accountName: string;
  amount: number;
}

interface CashFlowSection {
  label: string;
  items: CashFlowItem[];
  total: number;
}

interface CashFlowEntityBreakdown {
  entityId: string;
  entityName: string;
  data: {
    operating: CashFlowSection;
    investing: CashFlowSection;
    financing: CashFlowSection;
  };
}

interface ConsolidatedCashFlowSectionProps {
  section: CashFlowSection;
  entityBreakdowns: CashFlowEntityBreakdown[];
  sectionKey: "operating" | "investing" | "financing";
  selectedEntityIds: Set<string>;
}

interface CashFlowAccountGroup {
  accountName: string;
  totalAmount: number;
  entities: { entityId: string; entityName: string; amount: number }[];
}

function groupCashFlowByAccount(
  entityBreakdowns: CashFlowEntityBreakdown[],
  sectionKey: string,
  selectedEntityIds: Set<string>
): CashFlowAccountGroup[] {
  const map = new Map<string, CashFlowAccountGroup>();

  for (const breakdown of entityBreakdowns) {
    if (!selectedEntityIds.has(breakdown.entityId)) continue;
    const section = (breakdown.data as Record<string, CashFlowSection | undefined>)[sectionKey];
    if (!section) continue;

    for (const item of section.items) {
      let group = map.get(item.accountName);
      if (!group) {
        group = {
          accountName: item.accountName,
          totalAmount: 0,
          entities: [],
        };
        map.set(item.accountName, group);
      }
      group.totalAmount += item.amount;
      group.entities.push({
        entityId: breakdown.entityId,
        entityName: breakdown.entityName,
        amount: item.amount,
      });
    }
  }

  return Array.from(map.values());
}

export function ConsolidatedCashFlowSection({
  section,
  entityBreakdowns,
  sectionKey,
  selectedEntityIds,
}: ConsolidatedCashFlowSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const groups = groupCashFlowByAccount(
    entityBreakdowns,
    sectionKey,
    selectedEntityIds
  );

  function toggleItem(name: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <>
      {/* Section header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={2} className="py-2 font-semibold text-sm">
          {section.label}
        </TableCell>
      </TableRow>

      {/* Items */}
      {groups.map((group) => {
        const isExpanded = expandedItems.has(group.accountName);
        const hasMultipleEntities = group.entities.length > 1;

        return (
          <tbody key={group.accountName}>
            <TableRow
              className={cn(
                hasMultipleEntities && "cursor-pointer",
                isExpanded && "bg-muted/20"
              )}
              onClick={() => hasMultipleEntities && toggleItem(group.accountName)}
            >
              <TableCell className="pl-6">
                <span className="flex items-center gap-1.5">
                  {hasMultipleEntities &&
                    (isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ))}
                  {group.accountName}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(group.totalAmount)}
              </TableCell>
            </TableRow>

            {isExpanded &&
              group.entities.map((entity) => (
                <TableRow
                  key={`${group.accountName}-${entity.entityId}`}
                  className="bg-muted/10"
                >
                  <TableCell className="pl-10 text-sm text-muted-foreground">
                    {entity.entityName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatCurrency(entity.amount)}
                  </TableCell>
                </TableRow>
              ))}
          </tbody>
        );
      })}

      {/* Section total */}
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell className="font-semibold text-sm">
          Net Cash from {section.label}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">
          {formatCurrency(section.total)}
        </TableCell>
      </TableRow>
    </>
  );
}
