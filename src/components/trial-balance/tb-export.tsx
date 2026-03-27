"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { TrialBalanceRow } from "@/lib/queries/trial-balance-queries";
import { exportToCsv } from "@/lib/export/csv-export";
import {
  exportTrialBalanceToPdf,
  type TrialBalancePdfMeta,
} from "@/lib/export/pdf-export";
import { formatCurrency } from "@/lib/utils/accounting";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Account type ordering and labels ───────────────────

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

// ─── Types ──────────────────────────────────────────────

interface TrialBalanceExportProps {
  rows: TrialBalanceRow[];
  meta: {
    entityName: string;
    asOfDate: string;
    totalDebits: number;
    totalCredits: number;
    inBalance: boolean;
  };
}

// ─── Helpers ────────────────────────────────────────────

function buildCsvData(
  rows: TrialBalanceRow[],
  meta: TrialBalanceExportProps["meta"]
): Record<string, unknown>[] {
  const csvRows: Record<string, unknown>[] = [];

  // Group by account type
  for (const type of ACCOUNT_TYPE_ORDER) {
    const typeRows = rows.filter((r) => r.accountType === type);
    if (typeRows.length === 0) continue;

    // Section header
    csvRows.push({
      "Account Number": "",
      "Account Name": ACCOUNT_TYPE_LABELS[type] ?? type,
      Type: "",
      "Debit Balance": "",
      "Credit Balance": "",
    });

    let groupDebits = 0;
    let groupCredits = 0;

    for (const row of typeRows) {
      groupDebits += row.totalDebits;
      groupCredits += row.totalCredits;

      csvRows.push({
        "Account Number": row.accountNumber,
        "Account Name": row.accountName,
        Type: row.accountType,
        "Debit Balance": row.totalDebits > 0 ? formatCurrency(row.totalDebits) : "",
        "Credit Balance": row.totalCredits > 0 ? formatCurrency(row.totalCredits) : "",
      });
    }

    // Subtotal
    csvRows.push({
      "Account Number": "",
      "Account Name": `${ACCOUNT_TYPE_LABELS[type]} Subtotal`,
      Type: "",
      "Debit Balance": groupDebits > 0 ? formatCurrency(groupDebits) : "",
      "Credit Balance": groupCredits > 0 ? formatCurrency(groupCredits) : "",
    });

    // Blank separator
    csvRows.push({
      "Account Number": "",
      "Account Name": "",
      Type: "",
      "Debit Balance": "",
      "Credit Balance": "",
    });
  }

  // Grand total
  csvRows.push({
    "Account Number": "",
    "Account Name": "Grand Total",
    Type: "",
    "Debit Balance": formatCurrency(meta.totalDebits),
    "Credit Balance": formatCurrency(meta.totalCredits),
  });

  return csvRows;
}

// ─── Component ──────────────────────────────────────────

/**
 * Export dropdown for trial balance. Supports CSV and PDF exports.
 * CSV includes group headers and subtotals.
 * PDF uses branded template with grouping and verification status.
 */
export function TrialBalanceExport({
  rows,
  meta,
}: TrialBalanceExportProps) {
  function handleCsvExport() {
    const csvData = buildCsvData(rows, meta);
    exportToCsv(csvData, `trial-balance-${meta.asOfDate}`);
  }

  function handlePdfExport() {
    const pdfMeta: TrialBalancePdfMeta = {
      entityName: meta.entityName,
      asOfDate: meta.asOfDate,
      totalDebits: meta.totalDebits,
      totalCredits: meta.totalCredits,
      inBalance: meta.inBalance,
    };
    exportTrialBalanceToPdf(rows, pdfMeta);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsvExport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdfExport}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
