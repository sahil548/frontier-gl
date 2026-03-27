"use client"

import { FileSpreadsheet, FileText, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToCsv } from "@/lib/export/csv-export"
import {
  exportLedgerToPdf,
  type LedgerPdfMeta,
} from "@/lib/export/pdf-export"
import type { LedgerRow } from "@/lib/queries/ledger-queries"

interface LedgerExportProps {
  transactions: LedgerRow[]
  meta: LedgerPdfMeta
}

export function LedgerExport({ transactions, meta }: LedgerExportProps) {
  const handleCsvExport = () => {
    const rows: Record<string, unknown>[] = []

    // Beginning balance row
    rows.push({
      Date: "",
      "JE#": "",
      Description: "Beginning Balance",
      Debit: "",
      Credit: "",
      Balance: meta.beginningBalance,
    })

    // Transaction rows
    for (const t of transactions) {
      rows.push({
        Date:
          t.date instanceof Date
            ? t.date.toLocaleDateString("en-US")
            : new Date(t.date).toLocaleDateString("en-US"),
        "JE#": t.jeNumber,
        Description: t.lineMemo || t.description,
        Debit: t.debit > 0 ? t.debit : "",
        Credit: t.credit > 0 ? t.credit : "",
        Balance: t.runningBalance,
      })
    }

    // Footer row
    rows.push({
      Date: "",
      "JE#": "",
      Description: "Totals / Net Change",
      Debit: meta.totalDebits,
      Credit: meta.totalCredits,
      Balance: meta.netChange,
    })

    exportToCsv(rows, `gl-ledger-${meta.accountNumber}`)
  }

  const handlePdfExport = () => {
    exportLedgerToPdf(transactions, meta)
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
  )
}
