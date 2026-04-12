"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";
import {
  applyContraNetting,
  type ReportRowWithContra,
  type ContraGroupedRow,
} from "@/lib/accounts/contra-netting";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  netBalance: number;
  isContra?: boolean;
  parentId?: string | null;
}

interface BalanceSheetData {
  assetRows: ReportRow[];
  liabilityRows: ReportRow[];
  equityRows: ReportRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface BalanceSheetViewProps {
  data: BalanceSheetData;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EQUITY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
};

// ---------------------------------------------------------------------------
// Grouped Section Rows (with contra netting)
// ---------------------------------------------------------------------------

function ContraAwareSectionRows({
  label,
  rows,
  total,
  totalLabel,
}: {
  label: string;
  rows: ReportRow[];
  total: number;
  totalLabel: string;
}) {
  const grouped = applyContraNetting(rows as ReportRowWithContra[]);

  return (
    <>
      {/* Section header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={4} className="py-2 font-semibold text-sm">
          {label}
        </TableCell>
      </TableRow>

      {/* Grouped rows */}
      {grouped.map((entry, idx) => (
        <ContraGroupedRowRender key={idx} entry={entry} />
      ))}

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

function ContraGroupedRowRender({ entry }: { entry: ContraGroupedRow }) {
  switch (entry.type) {
    case "normal":
      return (
        <TableRow
          className="cursor-pointer hover:bg-muted/50"
          onClick={() =>
            (window.location.href = `/gl-ledger/${entry.row.accountId}`)
          }
        >
          <TableCell className="font-mono text-sm pl-6 text-primary hover:underline">
            {entry.row.accountNumber}
          </TableCell>
          <TableCell>{entry.row.accountName}</TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 font-medium",
                TYPE_COLORS[entry.row.accountType] ?? ""
              )}
            >
              {TYPE_LABELS[entry.row.accountType] ?? entry.row.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrency(entry.row.netBalance)}
          </TableCell>
        </TableRow>
      );

    case "contra":
      return (
        <TableRow
          className="cursor-pointer hover:bg-muted/50"
          onClick={() =>
            (window.location.href = `/gl-ledger/${entry.row.accountId}`)
          }
        >
          <TableCell className="font-mono text-sm pl-10 text-primary hover:underline">
            {entry.row.accountNumber}
          </TableCell>
          <TableCell className="pl-8 italic text-muted-foreground">
            Less: {entry.row.accountName}
          </TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 font-medium",
                TYPE_COLORS[entry.row.accountType] ?? ""
              )}
            >
              {TYPE_LABELS[entry.row.accountType] ?? entry.row.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono text-sm text-muted-foreground">
            ({formatCurrency(Math.abs(entry.row.netBalance))})
          </TableCell>
        </TableRow>
      );

    case "net":
      return (
        <TableRow className="border-t border-dashed hover:bg-muted/30">
          <TableCell />
          <TableCell className="pl-8 font-medium text-sm">
            Net {entry.parentName}
          </TableCell>
          <TableCell />
          <TableCell className="text-right font-mono text-sm font-medium">
            {formatCurrency(entry.netAmount)}
          </TableCell>
        </TableRow>
      );

    case "standalone-contra":
      return (
        <TableRow
          className="cursor-pointer hover:bg-muted/50"
          onClick={() =>
            (window.location.href = `/gl-ledger/${entry.row.accountId}`)
          }
        >
          <TableCell className="font-mono text-sm pl-6 text-primary hover:underline">
            {entry.row.accountNumber}
          </TableCell>
          <TableCell className="italic text-muted-foreground">
            Less: {entry.row.accountName}
          </TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 font-medium",
                TYPE_COLORS[entry.row.accountType] ?? ""
              )}
            >
              {TYPE_LABELS[entry.row.accountType] ?? entry.row.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono text-sm text-muted-foreground">
            ({formatCurrency(Math.abs(entry.row.netBalance))})
          </TableCell>
        </TableRow>
      );
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BalanceSheetView({ data }: BalanceSheetViewProps) {
  if (
    data.assetRows.length === 0 &&
    data.liabilityRows.length === 0 &&
    data.equityRows.length === 0
  ) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No balance sheet data found as of this date.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="w-max min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Account Number</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Assets section */}
          {data.assetRows.length > 0 && (
            <ContraAwareSectionRows
              label="Assets"
              rows={data.assetRows}
              total={data.totalAssets}
              totalLabel="Total Assets"
            />
          )}

          {/* Liabilities section */}
          {data.liabilityRows.length > 0 && (
            <ContraAwareSectionRows
              label="Liabilities"
              rows={data.liabilityRows}
              total={data.totalLiabilities}
              totalLabel="Total Liabilities"
            />
          )}

          {/* Equity section */}
          {data.equityRows.length > 0 && (
            <ContraAwareSectionRows
              label="Equity"
              rows={data.equityRows}
              total={data.totalEquity}
              totalLabel="Total Equity"
            />
          )}

          {/* Liabilities + Equity total */}
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableCell />
            <TableCell className="font-semibold text-sm">
              Total Liabilities + Equity
            </TableCell>
            <TableCell />
            <TableCell className="text-right font-mono text-sm font-semibold">
              {formatCurrency(data.totalLiabilities + data.totalEquity)}
            </TableCell>
          </TableRow>

          {/* Balance check row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell />
            <TableCell className="font-bold">
              Balance Check (Assets = L + E)
            </TableCell>
            <TableCell />
            <TableCell className="text-right">
              {Math.abs(
                data.totalAssets -
                  (data.totalLiabilities + data.totalEquity)
              ) < 0.005 ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0"
                >
                  Balanced
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0"
                >
                  Difference:{" "}
                  {formatCurrency(
                    data.totalAssets -
                      (data.totalLiabilities + data.totalEquity)
                  )}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
