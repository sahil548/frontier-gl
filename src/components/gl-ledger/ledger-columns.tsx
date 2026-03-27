"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { format } from "date-fns"

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { formatCurrency } from "@/lib/utils/accounting"

export interface LedgerRowData {
  date: string
  jeNumber: string
  jeId: string
  description: string
  lineMemo: string | null
  debit: number
  credit: number
  runningBalance: number
  /** Synthetic flag for beginning balance row */
  _isBeginningBalance?: boolean
}

export const ledgerColumns: ColumnDef<LedgerRowData>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      if (row.original._isBeginningBalance) return ""
      const dateStr = row.getValue<string>("date")
      return format(new Date(dateStr), "MMM d, yyyy")
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "jeNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="JE#" />
    ),
    cell: ({ row }) => {
      if (row.original._isBeginningBalance) return ""
      const jeNumber = row.getValue<string>("jeNumber")
      const jeId = row.original.jeId
      return (
        <Link
          href={`/journal-entries/${jeId}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          {jeNumber}
        </Link>
      )
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      if (row.original._isBeginningBalance) {
        return <span className="font-semibold">Beginning Balance</span>
      }
      const description = row.getValue<string>("description")
      const lineMemo = row.original.lineMemo
      return (
        <div>
          <div>{description}</div>
          {lineMemo && (
            <div className="text-xs text-muted-foreground">{lineMemo}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "debit",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Debit"
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      if (row.original._isBeginningBalance) return ""
      const debit = row.getValue<number>("debit")
      return (
        <div className="text-right font-mono">
          {debit > 0 ? formatCurrency(debit) : ""}
        </div>
      )
    },
  },
  {
    accessorKey: "credit",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Credit"
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      if (row.original._isBeginningBalance) return ""
      const credit = row.getValue<number>("credit")
      return (
        <div className="text-right font-mono">
          {credit > 0 ? formatCurrency(credit) : ""}
        </div>
      )
    },
  },
  {
    accessorKey: "runningBalance",
    header: () => (
      <div className="text-right">Balance</div>
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right font-mono font-medium">
          {formatCurrency(row.getValue<number>("runningBalance"))}
        </div>
      )
    },
    enableSorting: false,
  },
]
