"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VerificationBanner } from "@/components/trial-balance/tb-verification-banner";
import { TrialBalanceExport } from "@/components/trial-balance/tb-export";
import { EntityTreeRows } from "@/components/trial-balance/tb-entity-tree";
import { formatCurrency } from "@/lib/utils/accounting";
import type { TrialBalanceRow, ConsolidatedTrialBalanceRow } from "@/lib/queries/trial-balance-queries";
import { cn } from "@/lib/utils";

// ─── Account type ordering and display ──────────────────

const ACCOUNT_TYPE_ORDER = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

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

interface TrialBalanceData {
  rows: TrialBalanceRow[] | ConsolidatedTrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  inBalance: boolean;
  consolidated: boolean;
}

interface AccountTypeGroup {
  type: string;
  rows: TrialBalanceRow[];
  subtotalDebits: number;
  subtotalCredits: number;
}

// ─── Helpers ────────────────────────────────────────────

function groupByAccountType(rows: TrialBalanceRow[]): AccountTypeGroup[] {
  const groups: AccountTypeGroup[] = [];

  for (const type of ACCOUNT_TYPE_ORDER) {
    const typeRows = rows.filter((r) => r.accountType === type);
    if (typeRows.length === 0) continue;

    const subtotalDebits = typeRows.reduce((sum, r) => sum + r.totalDebits, 0);
    const subtotalCredits = typeRows.reduce(
      (sum, r) => sum + r.totalCredits,
      0
    );

    groups.push({
      type,
      rows: typeRows,
      subtotalDebits,
      subtotalCredits,
    });
  }

  return groups;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Loading skeleton ───────────────────────────────────

function TrialBalanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 rounded-lg bg-muted" />
      <div className="rounded-md border">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 border-b bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page component ────────────────────────────────

/**
 * Trial Balance page.
 * Shows all active accounts with debit/credit balances for a selected as-of date.
 * Supports single-entity (grouped by account type) and consolidated (tree) views.
 */
export default function TrialBalancePage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [tbData, setTbData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isConsolidated = currentEntityId === "all";

  const fetchTrialBalance = useCallback(async () => {
    if (!currentEntityId || entities.length === 0) return;

    setLoading(true);
    try {
      // For consolidated, use first entity ID as placeholder (API will ignore it when consolidated=true)
      const entityIdForUrl = isConsolidated
        ? entities[0].id
        : currentEntityId;
      const params = new URLSearchParams({
        asOfDate: toISODateString(asOfDate),
        ...(isConsolidated ? { consolidated: "true" } : {}),
      });

      const res = await fetch(
        `/api/entities/${entityIdForUrl}/trial-balance?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTbData(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [currentEntityId, asOfDate, entities, isConsolidated]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fetchTrialBalance]);

  // ─── Early returns ──────────────────────────────────

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Trial Balance
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to view the trial balance.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const entityName = isConsolidated
    ? "All Entities (Consolidated)"
    : currentEntity?.name ?? "";

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header with as-of date picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Trial Balance
          </h1>
          <span className="text-muted-foreground">as of</span>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="h-9 gap-2 font-normal" />
              }
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDateDisplay(asOfDate)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={asOfDate}
                onSelect={(date) => {
                  if (date) {
                    setAsOfDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {entityName && (
          <p className="text-sm text-muted-foreground">
            {entityName}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && <TrialBalanceSkeleton />}

      {/* Content */}
      {!loading && tbData && (
        <>
          {/* Verification banner */}
          <VerificationBanner
            totalDebits={tbData.totalDebits}
            totalCredits={tbData.totalCredits}
          />

          {/* Export button */}
          <div className="flex justify-end">
            <TrialBalanceExport
              rows={tbData.rows as TrialBalanceRow[]}
              meta={{
                entityName,
                asOfDate: toISODateString(asOfDate),
                totalDebits: tbData.totalDebits,
                totalCredits: tbData.totalCredits,
                inBalance: tbData.inBalance,
              }}
            />
          </div>

          {/* Empty state */}
          {tbData.rows.length === 0 && (
            <div className="rounded-md border py-12 text-center">
              <p className="text-muted-foreground">
                No account balances found for this period.
              </p>
            </div>
          )}

          {/* Consolidated tree view */}
          {tbData.rows.length > 0 && tbData.consolidated && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit Balance</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <EntityTreeRows
                  rows={tbData.rows as ConsolidatedTrialBalanceRow[]}
                />
              </Table>
            </div>
          )}

          {/* Single-entity grouped view */}
          {tbData.rows.length > 0 && !tbData.consolidated && (
            <SingleEntityView
              rows={tbData.rows as TrialBalanceRow[]}
              totalDebits={tbData.totalDebits}
              totalCredits={tbData.totalCredits}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Single entity view with grouping ───────────────────

function SingleEntityView({
  rows,
  totalDebits,
  totalCredits,
}: {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
}) {
  const groups = groupByAccountType(rows);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Number</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Debit Balance</TableHead>
            <TableHead className="text-right">Credit Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <AccountTypeGroupRows key={group.type} group={group} />
          ))}

          {/* Grand total row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell />
            <TableCell className="font-bold">Grand Total</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono font-bold">
              {formatCurrency(totalDebits)}
            </TableCell>
            <TableCell className="text-right font-mono font-bold">
              {formatCurrency(totalCredits)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Account type group rows ────────────────────────────

function AccountTypeGroupRows({ group }: { group: AccountTypeGroup }) {
  return (
    <>
      {/* Section header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell
          colSpan={5}
          className="py-2 font-semibold text-sm"
        >
          {ACCOUNT_TYPE_LABELS[group.type] ?? group.type}
        </TableCell>
      </TableRow>

      {/* Account rows */}
      {group.rows.map((row) => (
        <TableRow
          key={row.accountId}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => window.location.href = `/gl-ledger/${row.accountId}`}
        >
          <TableCell className="font-mono text-sm pl-6">
            <Link href={`/gl-ledger/${row.accountId}`} className="hover:underline text-primary">
              {row.accountNumber}
            </Link>
          </TableCell>
          <TableCell>{row.accountName}</TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 font-medium",
                TYPE_COLORS[row.accountType] ?? ""
              )}
            >
              {TYPE_LABELS[row.accountType] ?? row.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {row.totalDebits > 0 ? formatCurrency(row.totalDebits) : ""}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {row.totalCredits > 0 ? formatCurrency(row.totalCredits) : ""}
          </TableCell>
        </TableRow>
      ))}

      {/* Subtotal row */}
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell />
        <TableCell className="font-semibold text-sm">
          {ACCOUNT_TYPE_LABELS[group.type]} Subtotal
        </TableCell>
        <TableCell />
        <TableCell className="text-right font-mono text-sm font-semibold">
          {group.subtotalDebits > 0
            ? formatCurrency(group.subtotalDebits)
            : ""}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">
          {group.subtotalCredits > 0
            ? formatCurrency(group.subtotalCredits)
            : ""}
        </TableCell>
      </TableRow>
    </>
  );
}
