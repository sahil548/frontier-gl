"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { exportToCsv } from "@/lib/export/csv-export";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface ReportRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  netBalance: number;
}

interface IncomeStatementData {
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

interface TagBreakdownEntry {
  tagId: string | null;
  tagName: string | null;
  netBalance: number;
}

interface DimensionedReportRow extends ReportRow {
  tagBreakdown: TagBreakdownEntry[];
  totalBalance: number;
}

interface DimensionedIncomeStatementData {
  incomeRows: DimensionedReportRow[];
  expenseRows: DimensionedReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  tags: Array<{ id: string; name: string }>;
}

interface DimensionOption {
  id: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  EXPENSE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};

// ─── Helpers ────────────────────────────────────────────

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

function getFirstOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

// ─── Section rows (non-dimensioned) ─────────────────────

function SectionRows({
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
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={4} className="py-2 font-semibold text-sm">
          {label}
        </TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow
          key={row.accountId}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => (window.location.href = `/gl-ledger/${row.accountId}`)}
        >
          <TableCell className="font-mono text-sm pl-6 text-primary hover:underline">
            {row.accountNumber}
          </TableCell>
          <TableCell>{row.accountName}</TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn("border-0 font-medium", TYPE_COLORS[row.accountType] ?? "")}
            >
              {TYPE_LABELS[row.accountType] ?? row.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrency(row.netBalance)}
          </TableCell>
        </TableRow>
      ))}
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

// ─── Dimensioned section rows ───────────────────────────

function DimensionedSectionRows({
  label,
  rows,
  tags,
  totalLabel,
}: {
  label: string;
  rows: DimensionedReportRow[];
  tags: Array<{ id: string; name: string }>;
  totalLabel: string;
}) {
  const colCount = tags.length + 4; // Account # + Name + per tag + Unclassified + Total

  // Compute column totals
  const columnTotals = new Map<string | null, number>();
  for (const tag of tags) columnTotals.set(tag.id, 0);
  columnTotals.set(null, 0);
  let sectionTotal = 0;

  for (const row of rows) {
    for (const entry of row.tagBreakdown) {
      columnTotals.set(entry.tagId, (columnTotals.get(entry.tagId) ?? 0) + entry.netBalance);
    }
    sectionTotal += row.totalBalance;
  }

  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={colCount} className="py-2 font-semibold text-sm">
          {label}
        </TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow
          key={row.accountId}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => (window.location.href = `/gl-ledger/${row.accountId}`)}
        >
          <TableCell className="sticky left-0 z-10 bg-background font-mono text-sm pl-6 text-primary hover:underline">
            {row.accountNumber}
          </TableCell>
          <TableCell className="sticky left-[120px] z-10 bg-background">
            {row.accountName}
          </TableCell>
          {tags.map((tag) => {
            const entry = row.tagBreakdown.find((e) => e.tagId === tag.id);
            return (
              <TableCell key={tag.id} className="text-right font-mono text-sm">
                {entry && entry.netBalance !== 0 ? formatCurrency(entry.netBalance) : ""}
              </TableCell>
            );
          })}
          {/* Unclassified */}
          <TableCell className="text-right font-mono text-sm">
            {(() => {
              const entry = row.tagBreakdown.find((e) => e.tagId === null);
              return entry && entry.netBalance !== 0 ? formatCurrency(entry.netBalance) : "";
            })()}
          </TableCell>
          {/* Total */}
          <TableCell className="text-right font-mono text-sm font-semibold">
            {formatCurrency(row.totalBalance)}
          </TableCell>
        </TableRow>
      ))}
      {/* Section total */}
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell className="sticky left-0 z-10 bg-muted/20" />
        <TableCell className="sticky left-[120px] z-10 bg-muted/20 font-semibold text-sm">
          {totalLabel}
        </TableCell>
        {tags.map((tag) => (
          <TableCell key={tag.id} className="text-right font-mono text-sm font-semibold">
            {(columnTotals.get(tag.id) ?? 0) !== 0
              ? formatCurrency(columnTotals.get(tag.id) ?? 0)
              : ""}
          </TableCell>
        ))}
        <TableCell className="text-right font-mono text-sm font-semibold">
          {(columnTotals.get(null) ?? 0) !== 0
            ? formatCurrency(columnTotals.get(null) ?? 0)
            : ""}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">
          {formatCurrency(sectionTotal)}
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Loading skeleton ───────────────────────────────────

function ReportSkeleton() {
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

// ─── Main component ─────────────────────────────────────

interface IncomeStatementViewProps {
  entityId: string;
  basis: "accrual" | "cash";
}

export function IncomeStatementView({ entityId, basis }: IncomeStatementViewProps) {
  const [startDate, setStartDate] = useState<Date>(getFirstOfMonth());
  const [endDate, setEndDate] = useState<Date>(getEndOfMonth());
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Standard P&L data
  const [isData, setIsData] = useState<IncomeStatementData | null>(null);
  // Dimensioned P&L data
  const [dimData, setDimData] = useState<DimensionedIncomeStatementData | null>(null);

  // Dimension picker
  const [dimensions, setDimensions] = useState<DimensionOption[]>([]);
  const [selectedDimensionId, setSelectedDimensionId] = useState<string>("none");

  // Fetch available dimensions
  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/entities/${entityId}/dimensions`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDimensions(
            json.data.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, [entityId]);

  // Fetch income statement
  const fetchData = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: toISODateString(startDate),
        endDate: toISODateString(endDate),
        basis,
      });
      if (selectedDimensionId !== "none") {
        params.set("dimensionId", selectedDimensionId);
      }

      const res = await fetch(
        `/api/entities/${entityId}/reports/income-statement?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (selectedDimensionId !== "none" && json.data.tags) {
            setDimData(json.data as DimensionedIncomeStatementData);
            setIsData(null);
          } else {
            setIsData(json.data as IncomeStatementData);
            setDimData(null);
          }
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [entityId, startDate, endDate, basis, selectedDimensionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export handlers
  function handleExport() {
    if (dimData) {
      handleExportDimensioned();
    } else if (isData) {
      handleExportStandard();
    }
  }

  function handleExportStandard() {
    if (!isData) return;
    const rows: Record<string, unknown>[] = [];

    rows.push({ Section: "Revenue", "Account Number": "", "Account Name": "", Balance: "" });
    for (const r of isData.incomeRows) {
      rows.push({
        Section: "",
        "Account Number": r.accountNumber,
        "Account Name": r.accountName,
        Balance: r.netBalance.toFixed(2),
      });
    }
    rows.push({ Section: "", "Account Number": "", "Account Name": "Total Revenue", Balance: isData.totalIncome.toFixed(2) });

    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({ Section: "Expenses", "Account Number": "", "Account Name": "", Balance: "" });
    for (const r of isData.expenseRows) {
      rows.push({
        Section: "",
        "Account Number": r.accountNumber,
        "Account Name": r.accountName,
        Balance: r.netBalance.toFixed(2),
      });
    }
    rows.push({ Section: "", "Account Number": "", "Account Name": "Total Expenses", Balance: isData.totalExpenses.toFixed(2) });
    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({ Section: "", "Account Number": "", "Account Name": "Net Income", Balance: isData.netIncome.toFixed(2) });

    exportToCsv(rows, `income-statement-${toISODateString(startDate)}-to-${toISODateString(endDate)}.csv`);
  }

  function handleExportDimensioned() {
    if (!dimData) return;
    const csvRows: Record<string, unknown>[] = [];

    const buildCsvRow = (label: string, accountNum: string, accountName: string, row?: DimensionedReportRow) => {
      const entry: Record<string, unknown> = {
        Section: label,
        "Account Number": accountNum,
        "Account Name": accountName,
      };
      if (row) {
        for (const tag of dimData.tags) {
          const found = row.tagBreakdown.find((e) => e.tagId === tag.id);
          entry[tag.name] = (found?.netBalance ?? 0).toFixed(2);
        }
        const uncl = row.tagBreakdown.find((e) => e.tagId === null);
        entry["Unclassified"] = (uncl?.netBalance ?? 0).toFixed(2);
        entry["Total"] = row.totalBalance.toFixed(2);
      } else {
        for (const tag of dimData.tags) entry[tag.name] = "";
        entry["Unclassified"] = "";
        entry["Total"] = "";
      }
      return entry;
    };

    csvRows.push(buildCsvRow("Revenue", "", ""));
    for (const r of dimData.incomeRows) {
      csvRows.push(buildCsvRow("", r.accountNumber, r.accountName, r));
    }
    csvRows.push(buildCsvRow("", "", "Total Revenue"));
    csvRows.push(buildCsvRow("", "", ""));
    csvRows.push(buildCsvRow("Expenses", "", ""));
    for (const r of dimData.expenseRows) {
      csvRows.push(buildCsvRow("", r.accountNumber, r.accountName, r));
    }
    csvRows.push(buildCsvRow("", "", "Total Expenses"));
    csvRows.push(buildCsvRow("", "", ""));
    csvRows.push(buildCsvRow("", "", "Net Income"));

    exportToCsv(csvRows, `income-statement-by-dimension-${toISODateString(startDate)}-to-${toISODateString(endDate)}.csv`);
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Date range controls + dimension picker */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">From</span>
        <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
          <PopoverTrigger
            render={<Button variant="outline" className="h-9 gap-2 font-normal" />}
          >
            <CalendarIcon className="h-4 w-4" />
            {formatDateDisplay(startDate)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                if (date) { setStartDate(date); setStartCalOpen(false); }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">to</span>
        <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
          <PopoverTrigger
            render={<Button variant="outline" className="h-9 gap-2 font-normal" />}
          >
            <CalendarIcon className="h-4 w-4" />
            {formatDateDisplay(endDate)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                if (date) { setEndDate(date); setEndCalOpen(false); }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Dimension picker */}
        {dimensions.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground ml-2">View by</span>
            <Select value={selectedDimensionId} onValueChange={(v) => setSelectedDimensionId(v ?? "none")}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {dimensions.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id}>
                    {dim.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Loading */}
      {loading && <ReportSkeleton />}

      {/* Standard (non-dimensioned) view */}
      {!loading && isData && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {isData.incomeRows.length === 0 && isData.expenseRows.length === 0 && (
            <div className="rounded-md border py-12 text-center">
              <p className="text-muted-foreground">
                No income or expense data found for this period.
              </p>
            </div>
          )}

          {(isData.incomeRows.length > 0 || isData.expenseRows.length > 0) && (
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
                  {isData.incomeRows.length > 0 && (
                    <SectionRows
                      label="Revenue"
                      rows={isData.incomeRows}
                      total={isData.totalIncome}
                      totalLabel="Total Revenue"
                    />
                  )}
                  {isData.expenseRows.length > 0 && (
                    <SectionRows
                      label="Expenses"
                      rows={isData.expenseRows}
                      total={isData.totalExpenses}
                      totalLabel="Total Expenses"
                    />
                  )}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell />
                    <TableCell className="font-bold">Net Income</TableCell>
                    <TableCell />
                    <TableCell
                      className={cn(
                        "text-right font-mono font-bold",
                        isData.netIncome < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {formatCurrency(isData.netIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Dimensioned (column-per-tag) view */}
      {!loading && dimData && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {dimData.incomeRows.length === 0 && dimData.expenseRows.length === 0 && (
            <div className="rounded-md border py-12 text-center">
              <p className="text-muted-foreground">
                No income or expense data found for this period.
              </p>
            </div>
          )}

          {(dimData.incomeRows.length > 0 || dimData.expenseRows.length > 0) && (
            <div className="overflow-x-auto rounded-md border">
              <Table className="w-max min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background">Account Number</TableHead>
                    <TableHead className="sticky left-[120px] z-10 bg-background">Account Name</TableHead>
                    {dimData.tags.map((tag) => (
                      <TableHead key={tag.id} className="text-right">
                        {tag.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Unclassified</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dimData.incomeRows.length > 0 && (
                    <DimensionedSectionRows
                      label="Revenue"
                      rows={dimData.incomeRows}
                      tags={dimData.tags}
                      totalLabel="Total Revenue"
                    />
                  )}
                  {dimData.expenseRows.length > 0 && (
                    <DimensionedSectionRows
                      label="Expenses"
                      rows={dimData.expenseRows}
                      tags={dimData.tags}
                      totalLabel="Total Expenses"
                    />
                  )}
                  {/* Net Income row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell className="sticky left-0 z-10 bg-muted/50" />
                    <TableCell className="sticky left-[120px] z-10 bg-muted/50 font-bold">
                      Net Income
                    </TableCell>
                    {dimData.tags.map((tag) => {
                      const incomeTagTotal = dimData.incomeRows.reduce((sum, r) => {
                        const entry = r.tagBreakdown.find((e) => e.tagId === tag.id);
                        return sum + (entry?.netBalance ?? 0);
                      }, 0);
                      const expenseTagTotal = dimData.expenseRows.reduce((sum, r) => {
                        const entry = r.tagBreakdown.find((e) => e.tagId === tag.id);
                        return sum + (entry?.netBalance ?? 0);
                      }, 0);
                      const netForTag = incomeTagTotal - expenseTagTotal;
                      return (
                        <TableCell
                          key={tag.id}
                          className={cn(
                            "text-right font-mono font-bold",
                            netForTag < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          )}
                        >
                          {netForTag !== 0 ? formatCurrency(netForTag) : ""}
                        </TableCell>
                      );
                    })}
                    {/* Unclassified net income */}
                    {(() => {
                      const incUncl = dimData.incomeRows.reduce((sum, r) => {
                        const entry = r.tagBreakdown.find((e) => e.tagId === null);
                        return sum + (entry?.netBalance ?? 0);
                      }, 0);
                      const expUncl = dimData.expenseRows.reduce((sum, r) => {
                        const entry = r.tagBreakdown.find((e) => e.tagId === null);
                        return sum + (entry?.netBalance ?? 0);
                      }, 0);
                      const netUncl = incUncl - expUncl;
                      return (
                        <TableCell
                          className={cn(
                            "text-right font-mono font-bold",
                            netUncl < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          )}
                        >
                          {netUncl !== 0 ? formatCurrency(netUncl) : ""}
                        </TableCell>
                      );
                    })()}
                    {/* Total net income */}
                    <TableCell
                      className={cn(
                        "text-right font-mono font-bold",
                        dimData.netIncome < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {formatCurrency(dimData.netIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
