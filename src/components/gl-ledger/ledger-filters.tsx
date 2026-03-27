"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { format, startOfMonth } from "date-fns"

import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface LedgerFilterValues {
  dateRange: DateRange
  memoSearch: string
  minAmount: string
  maxAmount: string
}

interface LedgerFiltersProps {
  onFiltersChange: (filters: LedgerFilterValues) => void
  initialDateRange?: DateRange
}

function getDefaultDateRange(): DateRange {
  return {
    from: startOfMonth(new Date()),
    to: new Date(),
  }
}

export function LedgerFilters({
  onFiltersChange,
  initialDateRange,
}: LedgerFiltersProps) {
  const defaultRange = initialDateRange ?? getDefaultDateRange()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange)
  const [memoSearch, setMemoSearch] = useState("")
  const [debouncedMemo, setDebouncedMemo] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")

  // Debounce memo search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemo(memoSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [memoSearch])

  // Emit filter changes
  const emitFilters = useCallback(() => {
    onFiltersChange({
      dateRange: dateRange ?? getDefaultDateRange(),
      memoSearch: debouncedMemo,
      minAmount,
      maxAmount,
    })
  }, [dateRange, debouncedMemo, minAmount, maxAmount, onFiltersChange])

  useEffect(() => {
    emitFilters()
  }, [emitFilters])

  const handleClearAll = () => {
    const defaults = getDefaultDateRange()
    setDateRange(defaults)
    setMemoSearch("")
    setDebouncedMemo("")
    setMinAmount("")
    setMaxAmount("")
  }

  const clearMemoSearch = () => {
    setMemoSearch("")
    setDebouncedMemo("")
  }

  const clearMinAmount = () => setMinAmount("")
  const clearMaxAmount = () => setMaxAmount("")

  const hasActiveFilters =
    debouncedMemo !== "" || minAmount !== "" || maxAmount !== ""

  return (
    <div className="space-y-2">
      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Date Range
          </label>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        <div className="min-w-0 flex-1 max-w-[240px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Search
          </label>
          <Input
            placeholder="Search description/memo..."
            value={memoSearch}
            onChange={(e) => setMemoSearch(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="w-[120px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Min Amount
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>
          <div className="w-[120px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Max Amount
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {debouncedMemo && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{debouncedMemo}&quot;
              <button
                onClick={clearMemoSearch}
                className="ml-1 rounded-full hover:bg-muted"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {minAmount && (
            <Badge variant="secondary" className="gap-1">
              Min: ${minAmount}
              <button
                onClick={clearMinAmount}
                className="ml-1 rounded-full hover:bg-muted"
                aria-label="Remove minimum amount filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {maxAmount && (
            <Badge variant="secondary" className="gap-1">
              Max: ${maxAmount}
              <button
                onClick={clearMaxAmount}
                className="ml-1 rounded-full hover:bg-muted"
                aria-label="Remove maximum amount filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
