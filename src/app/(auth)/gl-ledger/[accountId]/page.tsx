"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { startOfMonth, format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { useEntityContext } from "@/providers/entity-provider"
import { DataTable } from "@/components/data-table/data-table"
import { AccountSummaryCard } from "@/components/gl-ledger/account-summary-card"
import { LedgerFilters, type LedgerFilterValues } from "@/components/gl-ledger/ledger-filters"
import { LedgerExport } from "@/components/gl-ledger/ledger-export"
import { ledgerColumns, type LedgerRowData } from "@/components/gl-ledger/ledger-columns"
import { formatCurrency } from "@/lib/utils/accounting"
import type { AccountType } from "@/lib/utils/accounting"
import type { LedgerRow } from "@/lib/queries/ledger-queries"
import { TableCell, TableRow } from "@/components/ui/table"

interface LedgerApiResponse {
  account: {
    id: string
    name: string
    accountNumber: string
    type: AccountType
  }
  summary: {
    currentBalance: number
    ytdDebits: number
    ytdCredits: number
  }
  beginningBalance: number
  transactions: Array<{
    date: string
    jeNumber: string
    jeId: string
    description: string
    lineMemo: string | null
    debit: number
    credit: number
    runningBalance: number
  }>
}

/**
 * Account-specific GL Ledger page.
 * Shows account summary, filters, export, and data table
 * with beginning balance row and footer totals.
 */
export default function AccountLedgerPage() {
  const params = useParams<{ accountId: string }>()
  const accountId = params.accountId
  const { currentEntityId } = useEntityContext()

  const [data, setData] = useState<LedgerApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LedgerFilterValues>({
    dateRange: { from: startOfMonth(new Date()), to: new Date() },
    memoSearch: "",
    minAmount: "",
    maxAmount: "",
  })

  const fetchLedger = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all" || !accountId) return

    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      if (filters.dateRange.from) {
        searchParams.set("startDate", filters.dateRange.from.toISOString())
      }
      if (filters.dateRange.to) {
        searchParams.set("endDate", filters.dateRange.to.toISOString())
      }
      if (filters.memoSearch) {
        searchParams.set("memoSearch", filters.memoSearch)
      }
      if (filters.minAmount) {
        searchParams.set("minAmount", filters.minAmount)
      }
      if (filters.maxAmount) {
        searchParams.set("maxAmount", filters.maxAmount)
      }

      const res = await fetch(
        `/api/entities/${currentEntityId}/ledger/${accountId}?${searchParams.toString()}`
      )
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [currentEntityId, accountId, filters])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  // Compute totals
  const totals = useMemo(() => {
    if (!data) return { totalDebits: 0, totalCredits: 0, netChange: 0 }
    const totalDebits = data.transactions.reduce((s, t) => s + t.debit, 0)
    const totalCredits = data.transactions.reduce((s, t) => s + t.credit, 0)
    return {
      totalDebits,
      totalCredits,
      netChange: totalDebits - totalCredits,
    }
  }, [data])

  // Build table data with beginning balance row prepended
  const tableData: LedgerRowData[] = useMemo(() => {
    if (!data) return []
    const rows: LedgerRowData[] = []

    // Beginning balance row
    rows.push({
      date: "",
      jeNumber: "",
      jeId: "",
      description: "Beginning Balance",
      lineMemo: null,
      debit: 0,
      credit: 0,
      runningBalance: data.beginningBalance,
      _isBeginningBalance: true,
    })

    // Transaction rows
    for (const t of data.transactions) {
      rows.push({
        date: t.date,
        jeNumber: t.jeNumber,
        jeId: t.jeId,
        description: t.description,
        lineMemo: t.lineMemo,
        debit: t.debit,
        credit: t.credit,
        runningBalance: t.runningBalance,
      })
    }

    return rows
  }, [data])

  // Footer row
  const footerRow = data ? (
    <TableRow className="font-semibold bg-muted/50">
      <TableCell />
      <TableCell />
      <TableCell>Totals / Net Change</TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(totals.totalDebits)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(totals.totalCredits)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(totals.netChange)}
      </TableCell>
    </TableRow>
  ) : undefined

  // Build export meta
  const entityName = "" // Entity name not in API response but not critical for UI
  const dateRangeLabel =
    filters?.dateRange.from && filters?.dateRange.to
      ? `${format(filters.dateRange.from, "MMM d, yyyy")} - ${format(filters.dateRange.to, "MMM d, yyyy")}`
      : "Current Month"

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="h-12 rounded-md bg-muted animate-pulse" />
        <div className="h-96 rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  // No data
  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          General Ledger
        </h1>
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">Account not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        General Ledger
      </h1>

      {/* Account summary card */}
      <AccountSummaryCard
        account={{
          accountNumber: data.account.accountNumber,
          name: data.account.name,
          type: data.account.type,
        }}
        summary={data.summary}
      />

      {/* Filters */}
      <LedgerFilters
        onFiltersChange={setFilters}
        initialDateRange={{
          from: startOfMonth(new Date()),
          to: new Date(),
        }}
      />

      {/* Export + table */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <LedgerExport
            transactions={data.transactions as unknown as LedgerRow[]}
            meta={{
              entityName,
              accountName: data.account.name,
              accountNumber: data.account.accountNumber,
              dateRange: dateRangeLabel,
              beginningBalance: data.beginningBalance,
              totalDebits: totals.totalDebits,
              totalCredits: totals.totalCredits,
              netChange: totals.netChange,
            }}
          />
        </div>

        {data.transactions.length === 0 && !loading ? (
          <div className="rounded-md border p-8 text-center space-y-2">
            <p className="text-muted-foreground font-medium">
              No posted transactions for this account.
            </p>
            <p className="text-sm text-muted-foreground">
              Check that journal entries are posted (not in Draft status).
            </p>
          </div>
        ) : (
          <DataTable
            columns={ledgerColumns}
            data={tableData}
            pageSize={50}
            footerRow={footerRow}
          />
        )}
      </div>
    </div>
  )
}
