import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LedgerRow } from "@/lib/queries/ledger-queries";
import type { TrialBalanceRow } from "@/lib/queries/trial-balance-queries";
import { formatCurrency } from "@/lib/utils/accounting";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAL: [number, number, number] = [13, 115, 119]; // #0D7377
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SUBTITLE = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TABLE = 8;
const CELL_PADDING = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function addPageNumbers(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
}

function addBranding(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(128);
  doc.text("Frontier GL", pageWidth - 14, 14, { align: "right" });
}

// ---------------------------------------------------------------------------
// Ledger PDF Export
// ---------------------------------------------------------------------------

export interface LedgerPdfMeta {
  entityName: string;
  accountName: string;
  accountNumber: string;
  dateRange: string;
  beginningBalance: number;
  totalDebits: number;
  totalCredits: number;
  netChange: number;
}

/**
 * Generates and downloads a branded PDF for a GL Ledger report.
 * Uses landscape orientation with teal-themed header styling.
 */
export function exportLedgerToPdf(
  data: LedgerRow[],
  meta: LedgerPdfMeta
): void {
  const doc = new jsPDF({ orientation: "landscape" });

  // Header
  addBranding(doc);

  let y = 14;
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(0);
  doc.text("General Ledger", 14, y);
  y += 7;

  doc.setFontSize(FONT_SIZE_SUBTITLE);
  doc.text(meta.entityName, 14, y);
  y += 5;

  doc.text(`Account: ${meta.accountNumber} - ${meta.accountName}`, 14, y);
  y += 5;

  doc.text(`Period: ${meta.dateRange}`, 14, y);
  y += 5;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(128);
  doc.text(`Generated: ${timestamp()}`, 14, y);
  y += 6;

  // Table body: beginning balance row + transaction rows
  const body: (string | { content: string; styles?: Record<string, unknown> })[][] = [];

  // Beginning balance row
  body.push([
    "",
    "",
    {
      content: "Beginning Balance",
      styles: { fontStyle: "bold" },
    },
    "",
    "",
    formatCurrency(meta.beginningBalance),
  ]);

  // Transaction rows
  for (const row of data) {
    body.push([
      formatDate(row.date),
      row.jeNumber,
      row.lineMemo || row.description,
      row.debit > 0 ? formatCurrency(row.debit) : "",
      row.credit > 0 ? formatCurrency(row.credit) : "",
      formatCurrency(row.runningBalance),
    ]);
  }

  // Totals footer row
  body.push([
    "",
    "",
    {
      content: "Totals / Net Change",
      styles: { fontStyle: "bold" },
    },
    {
      content: formatCurrency(meta.totalDebits),
      styles: { fontStyle: "bold" },
    },
    {
      content: formatCurrency(meta.totalCredits),
      styles: { fontStyle: "bold" },
    },
    {
      content: formatCurrency(meta.netChange),
      styles: { fontStyle: "bold" },
    },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date", "JE#", "Description", "Debit", "Credit", "Balance"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: TEAL,
      fontSize: FONT_SIZE_TABLE,
      cellPadding: CELL_PADDING,
    },
    styles: {
      fontSize: FONT_SIZE_TABLE,
      cellPadding: CELL_PADDING,
    },
    columnStyles: {
      3: { halign: "right" }, // Debit
      4: { halign: "right" }, // Credit
      5: { halign: "right" }, // Balance
    },
  });

  addPageNumbers(doc);
  doc.save(`gl-ledger-${meta.accountNumber}.pdf`);
}

// ---------------------------------------------------------------------------
// Trial Balance PDF Export
// ---------------------------------------------------------------------------

export interface TrialBalancePdfMeta {
  entityName: string;
  asOfDate: string;
  totalDebits: number;
  totalCredits: number;
  inBalance: boolean;
}

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

/**
 * Generates and downloads a branded PDF for a Trial Balance report.
 * Uses portrait orientation with account type grouping and subtotals.
 */
export function exportTrialBalanceToPdf(
  data: TrialBalanceRow[],
  meta: TrialBalancePdfMeta
): void {
  const doc = new jsPDF({ orientation: "portrait" });

  // Header
  addBranding(doc);

  let y = 14;
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(0);
  doc.text("Trial Balance", 14, y);
  y += 7;

  doc.setFontSize(FONT_SIZE_SUBTITLE);
  doc.text(meta.entityName, 14, y);
  y += 5;

  doc.text(`As of ${meta.asOfDate}`, 14, y);
  y += 5;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(128);
  doc.text(`Generated: ${timestamp()}`, 14, y);
  y += 6;

  // Group data by account type
  const grouped = new Map<string, TrialBalanceRow[]>();
  for (const type of ACCOUNT_TYPE_ORDER) {
    grouped.set(type, []);
  }
  for (const row of data) {
    const bucket = grouped.get(row.accountType);
    if (bucket) bucket.push(row);
  }

  // Build table body with section headers, rows, and subtotals
  const body: (string | { content: string; styles?: Record<string, unknown> })[][] = [];

  for (const type of ACCOUNT_TYPE_ORDER) {
    const rows = grouped.get(type)!;
    if (rows.length === 0) continue;

    // Section header
    body.push([
      {
        content: ACCOUNT_TYPE_LABELS[type] || type,
        styles: {
          fontStyle: "bold",
          fillColor: [230, 230, 230] as unknown as string,
        },
      },
      { content: "", styles: { fillColor: [230, 230, 230] as unknown as string } },
      { content: "", styles: { fillColor: [230, 230, 230] as unknown as string } },
      { content: "", styles: { fillColor: [230, 230, 230] as unknown as string } },
      { content: "", styles: { fillColor: [230, 230, 230] as unknown as string } },
    ]);

    // Account rows
    let groupDebits = 0;
    let groupCredits = 0;
    for (const row of rows) {
      const isDebitNormal = ["ASSET", "EXPENSE"].includes(row.accountType);
      const debitBal = isDebitNormal && row.netBalance > 0 ? row.netBalance : 0;
      const creditBal = !isDebitNormal && row.netBalance > 0 ? row.netBalance : 0;
      // Negative net: reverse side
      const debitDisplay =
        debitBal > 0
          ? debitBal
          : !isDebitNormal && row.netBalance < 0
            ? Math.abs(row.netBalance)
            : 0;
      const creditDisplay =
        creditBal > 0
          ? creditBal
          : isDebitNormal && row.netBalance < 0
            ? Math.abs(row.netBalance)
            : 0;

      groupDebits += debitDisplay;
      groupCredits += creditDisplay;

      body.push([
        row.accountNumber,
        row.accountName,
        row.accountType,
        debitDisplay > 0 ? formatCurrency(debitDisplay) : "",
        creditDisplay > 0 ? formatCurrency(creditDisplay) : "",
      ]);
    }

    // Subtotal row
    body.push([
      "",
      {
        content: `${ACCOUNT_TYPE_LABELS[type]} Subtotal`,
        styles: { fontStyle: "bold" },
      },
      "",
      {
        content: groupDebits > 0 ? formatCurrency(groupDebits) : "",
        styles: { fontStyle: "bold" },
      },
      {
        content: groupCredits > 0 ? formatCurrency(groupCredits) : "",
        styles: { fontStyle: "bold" },
      },
    ]);
  }

  // Grand total row
  body.push([
    "",
    {
      content: "Grand Total",
      styles: { fontStyle: "bold", fillColor: [240, 240, 240] as unknown as string },
    },
    { content: "", styles: { fillColor: [240, 240, 240] as unknown as string } },
    {
      content: formatCurrency(meta.totalDebits),
      styles: { fontStyle: "bold", fillColor: [240, 240, 240] as unknown as string },
    },
    {
      content: formatCurrency(meta.totalCredits),
      styles: { fontStyle: "bold", fillColor: [240, 240, 240] as unknown as string },
    },
  ]);

  // Verification status
  const diff = Math.abs(meta.totalDebits - meta.totalCredits);
  const statusText = meta.inBalance
    ? "In Balance"
    : `Out of Balance by ${formatCurrency(diff)}`;
  const statusColor: [number, number, number] = meta.inBalance
    ? [34, 139, 34]
    : [220, 20, 60];

  body.push([
    "",
    {
      content: statusText,
      styles: {
        fontStyle: "bold",
        textColor: statusColor as unknown as string,
      },
    },
    "",
    "",
    "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Account Number",
        "Account Name",
        "Type",
        "Debit Balance",
        "Credit Balance",
      ],
    ],
    body,
    theme: "grid",
    headStyles: {
      fillColor: TEAL,
      fontSize: FONT_SIZE_TABLE,
      cellPadding: CELL_PADDING,
    },
    styles: {
      fontSize: FONT_SIZE_TABLE,
      cellPadding: CELL_PADDING,
    },
    columnStyles: {
      3: { halign: "right" }, // Debit Balance
      4: { halign: "right" }, // Credit Balance
    },
    rowPageBreak: "avoid",
  });

  addPageNumbers(doc);
  doc.save(`trial-balance-${meta.asOfDate}.pdf`);
}
