"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarIcon, Download } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface BalanceSheetData {
  assetRows: ReportRow[];
  liabilityRows: ReportRow[];
  equityRows: ReportRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface CashFlowItem {
  accountName: string;
  amount: number;
}

interface CashFlowSection {
  label: string;
  items: CashFlowItem[];
  total: number;
}

interface CashFlowStatementData {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  beginningCash: number;
  endingCash: number;
}

type ActiveTab = "income-statement" | "balance-sheet" | "cash-flow";

// ─── Constants ──────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EQUITY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INCOME:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  EXPENSE:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
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

// ─── Section rows ───────────────────────────────────────

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
      {/* Section header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={4} className="py-2 font-semibold text-sm">
          {label}
        </TableCell>
      </TableRow>

      {/* Account rows */}
      {rows.map((row) => (
        <TableRow
          key={row.accountId}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => window.location.href = `/gl-ledger/${row.accountId}`}
        >
          <TableCell className="font-mono text-sm pl-6 text-primary hover:underline">
            {row.accountNumber}
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
            {formatCurrency(row.netBalance)}
          </TableCell>
        </TableRow>
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

// ─── Main page component ────────────────────────────────

export default function ReportsPage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const [activeTab, setActiveTab] = useState<ActiveTab>("income-statement");
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual');

  // Income statement state
  const [startDate, setStartDate] = useState<Date>(getFirstOfMonth());
  const [endDate, setEndDate] = useState<Date>(getEndOfMonth());
  const [isData, setIsData] = useState<IncomeStatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);

  // Balance sheet state
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);
  const [bsLoading, setBsLoading] = useState(true);
  const [asOfCalOpen, setAsOfCalOpen] = useState(false);

  // Cash flow state
  const [cfStartDate, setCfStartDate] = useState<Date>(getFirstOfMonth());
  const [cfEndDate, setCfEndDate] = useState<Date>(getEndOfMonth());
  const [cfData, setCfData] = useState<CashFlowStatementData | null>(null);
  const [cfLoading, setCfLoading] = useState(true);
  const [cfStartCalOpen, setCfStartCalOpen] = useState(false);
  const [cfEndCalOpen, setCfEndCalOpen] = useState(false);

  const resolvedEntityId =
    currentEntityId === "all" && entities.length > 0
      ? entities[0].id
      : currentEntityId;

  // ─── Fetch income statement ─────────────────────────

  const fetchIncomeStatement = useCallback(async () => {
    if (!resolvedEntityId || entities.length === 0) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: toISODateString(startDate),
        endDate: toISODateString(endDate),
        basis,
      });

      const res = await fetch(
        `/api/entities/${resolvedEntityId}/reports/income-statement?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setIsData(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [resolvedEntityId, startDate, endDate, basis, entities.length]);

  // ─── Fetch balance sheet ────────────────────────────

  const fetchBalanceSheet = useCallback(async () => {
    if (!resolvedEntityId || entities.length === 0) return;

    setBsLoading(true);
    try {
      const params = new URLSearchParams({
        asOfDate: toISODateString(asOfDate),
        basis,
      });

      const res = await fetch(
        `/api/entities/${resolvedEntityId}/reports/balance-sheet?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBsData(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setBsLoading(false);
    }
  }, [resolvedEntityId, asOfDate, basis, entities.length]);

  // ─── Fetch cash flow statement ────────────────────

  const fetchCashFlow = useCallback(async () => {
    if (!resolvedEntityId || entities.length === 0) return;

    setCfLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: toISODateString(cfStartDate),
        endDate: toISODateString(cfEndDate),
      });

      const res = await fetch(
        `/api/entities/${resolvedEntityId}/reports/cash-flow?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCfData(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setCfLoading(false);
    }
  }, [resolvedEntityId, cfStartDate, cfEndDate, entities.length]);

  // ─── Effects ────────────────────────────────────────

  useEffect(() => {
    if (activeTab === "income-statement") {
      fetchIncomeStatement();
    }
  }, [activeTab, fetchIncomeStatement]);

  useEffect(() => {
    if (activeTab === "balance-sheet") {
      fetchBalanceSheet();
    }
  }, [activeTab, fetchBalanceSheet]);

  useEffect(() => {
    if (activeTab === "cash-flow") {
      fetchCashFlow();
    }
  }, [activeTab, fetchCashFlow]);

  // ─── Export handlers ────────────────────────────────

  function handleExportIncomeStatement() {
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
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Revenue",
      Balance: isData.totalIncome.toFixed(2),
    });

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
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Expenses",
      Balance: isData.totalExpenses.toFixed(2),
    });

    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Net Income",
      Balance: isData.netIncome.toFixed(2),
    });

    exportToCsv(
      rows,
      `income-statement-${toISODateString(startDate)}-to-${toISODateString(endDate)}.csv`
    );
  }

  function handleExportBalanceSheet() {
    if (!bsData) return;

    const rows: Record<string, unknown>[] = [];

    rows.push({ Section: "Assets", "Account Number": "", "Account Name": "", Balance: "" });
    for (const r of bsData.assetRows) {
      rows.push({
        Section: "",
        "Account Number": r.accountNumber,
        "Account Name": r.accountName,
        Balance: r.netBalance.toFixed(2),
      });
    }
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Assets",
      Balance: bsData.totalAssets.toFixed(2),
    });

    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({ Section: "Liabilities", "Account Number": "", "Account Name": "", Balance: "" });
    for (const r of bsData.liabilityRows) {
      rows.push({
        Section: "",
        "Account Number": r.accountNumber,
        "Account Name": r.accountName,
        Balance: r.netBalance.toFixed(2),
      });
    }
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Liabilities",
      Balance: bsData.totalLiabilities.toFixed(2),
    });

    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({ Section: "Equity", "Account Number": "", "Account Name": "", Balance: "" });
    for (const r of bsData.equityRows) {
      rows.push({
        Section: "",
        "Account Number": r.accountNumber,
        "Account Name": r.accountName,
        Balance: r.netBalance.toFixed(2),
      });
    }
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Equity",
      Balance: bsData.totalEquity.toFixed(2),
    });

    rows.push({ Section: "", "Account Number": "", "Account Name": "", Balance: "" });
    rows.push({
      Section: "",
      "Account Number": "",
      "Account Name": "Total Liabilities + Equity",
      Balance: (bsData.totalLiabilities + bsData.totalEquity).toFixed(2),
    });

    exportToCsv(
      rows,
      `balance-sheet-${toISODateString(asOfDate)}.csv`
    );
  }

  function handleExportCashFlow() {
    if (!cfData) return;

    const rows: Record<string, unknown>[] = [];

    const addSection = (section: CashFlowSection) => {
      rows.push({ Section: section.label, Item: "", Amount: "" });
      for (const item of section.items) {
        rows.push({
          Section: "",
          Item: item.accountName,
          Amount: item.amount.toFixed(2),
        });
      }
      rows.push({
        Section: "",
        Item: `Total ${section.label}`,
        Amount: section.total.toFixed(2),
      });
      rows.push({ Section: "", Item: "", Amount: "" });
    };

    addSection(cfData.operating);
    addSection(cfData.investing);
    addSection(cfData.financing);

    rows.push({
      Section: "",
      Item: "Net Change in Cash",
      Amount: cfData.netChange.toFixed(2),
    });
    rows.push({
      Section: "",
      Item: "Beginning Cash Balance",
      Amount: cfData.beginningCash.toFixed(2),
    });
    rows.push({
      Section: "",
      Item: "Ending Cash Balance",
      Amount: cfData.endingCash.toFixed(2),
    });

    exportToCsv(
      rows,
      `cash-flow-${toISODateString(cfStartDate)}-to-${toISODateString(cfEndDate)}.csv`
    );
  }

  // ─── Early returns ────────────────────────────────

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
          Financial Statements
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to view financial statements.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const entityName =
    currentEntityId === "all"
      ? "All Entities"
      : currentEntity?.name ?? "";

  // ─── Render ───────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Financial Statements
        </h1>
        {entityName && (
          <p className="text-sm text-muted-foreground">{entityName}</p>
        )}
      </div>

      {/* Tab buttons + basis toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setActiveTab("income-statement")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "income-statement"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Income Statement
          </button>
          <button
            onClick={() => setActiveTab("balance-sheet")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "balance-sheet"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab("cash-flow")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "cash-flow"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Cash Flow
          </button>
        </div>

        {activeTab !== 'cash-flow' && (
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(['accrual', 'cash'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize",
                  basis === b
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {b === 'accrual' ? 'Accrual' : 'Cash'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Income Statement Tab ─────────────────────── */}
      {activeTab === "income-statement" && (
        <div className="space-y-6">
          {/* Date range controls */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">From</span>
            <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 gap-2 font-normal"
                  />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {formatDateDisplay(startDate)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(date);
                      setStartCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">to</span>
            <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 gap-2 font-normal"
                  />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {formatDateDisplay(endDate)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(date);
                      setEndCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Loading */}
          {isLoading && <ReportSkeleton />}

          {/* Content */}
          {!isLoading && isData && (
            <>
              {/* Export */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportIncomeStatement}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {/* Empty state */}
              {isData.incomeRows.length === 0 &&
                isData.expenseRows.length === 0 && (
                  <div className="rounded-md border py-12 text-center">
                    <p className="text-muted-foreground">
                      No income or expense data found for this period.
                    </p>
                  </div>
                )}

              {/* Table */}
              {(isData.incomeRows.length > 0 ||
                isData.expenseRows.length > 0) && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Revenue section */}
                      {isData.incomeRows.length > 0 && (
                        <SectionRows
                          label="Revenue"
                          rows={isData.incomeRows}
                          total={isData.totalIncome}
                          totalLabel="Total Revenue"
                        />
                      )}

                      {/* Expenses section */}
                      {isData.expenseRows.length > 0 && (
                        <SectionRows
                          label="Expenses"
                          rows={isData.expenseRows}
                          total={isData.totalExpenses}
                          totalLabel="Total Expenses"
                        />
                      )}

                      {/* Net Income row */}
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
        </div>
      )}

      {/* ─── Balance Sheet Tab ────────────────────────── */}
      {activeTab === "balance-sheet" && (
        <div className="space-y-6">
          {/* As-of date control */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">As of</span>
            <Popover open={asOfCalOpen} onOpenChange={setAsOfCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 gap-2 font-normal"
                  />
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
                      setAsOfCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Loading */}
          {bsLoading && <ReportSkeleton />}

          {/* Content */}
          {!bsLoading && bsData && (
            <>
              {/* Export */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportBalanceSheet}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {/* Empty state */}
              {bsData.assetRows.length === 0 &&
                bsData.liabilityRows.length === 0 &&
                bsData.equityRows.length === 0 && (
                  <div className="rounded-md border py-12 text-center">
                    <p className="text-muted-foreground">
                      No balance sheet data found as of this date.
                    </p>
                  </div>
                )}

              {/* Table */}
              {(bsData.assetRows.length > 0 ||
                bsData.liabilityRows.length > 0 ||
                bsData.equityRows.length > 0) && (
                <div className="rounded-md border">
                  <Table>
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
                      {bsData.assetRows.length > 0 && (
                        <SectionRows
                          label="Assets"
                          rows={bsData.assetRows}
                          total={bsData.totalAssets}
                          totalLabel="Total Assets"
                        />
                      )}

                      {/* Liabilities section */}
                      {bsData.liabilityRows.length > 0 && (
                        <SectionRows
                          label="Liabilities"
                          rows={bsData.liabilityRows}
                          total={bsData.totalLiabilities}
                          totalLabel="Total Liabilities"
                        />
                      )}

                      {/* Equity section */}
                      {bsData.equityRows.length > 0 && (
                        <SectionRows
                          label="Equity"
                          rows={bsData.equityRows}
                          total={bsData.totalEquity}
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
                          {formatCurrency(
                            bsData.totalLiabilities + bsData.totalEquity
                          )}
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
                            bsData.totalAssets -
                              (bsData.totalLiabilities + bsData.totalEquity)
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
                                bsData.totalAssets -
                                  (bsData.totalLiabilities +
                                    bsData.totalEquity)
                              )}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Cash Flow Tab ─────────────────────────────── */}
      {activeTab === "cash-flow" && (
        <div className="space-y-6">
          {/* Date range controls */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">From</span>
            <Popover open={cfStartCalOpen} onOpenChange={setCfStartCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 gap-2 font-normal"
                  />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {formatDateDisplay(cfStartDate)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={cfStartDate}
                  onSelect={(date) => {
                    if (date) {
                      setCfStartDate(date);
                      setCfStartCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">to</span>
            <Popover open={cfEndCalOpen} onOpenChange={setCfEndCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 gap-2 font-normal"
                  />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {formatDateDisplay(cfEndDate)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={cfEndDate}
                  onSelect={(date) => {
                    if (date) {
                      setCfEndDate(date);
                      setCfEndCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Loading */}
          {cfLoading && <ReportSkeleton />}

          {/* Content */}
          {!cfLoading && cfData && (
            <>
              {/* Export */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportCashFlow}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {/* Empty state */}
              {cfData.operating.items.length <= 1 &&
                cfData.investing.items.length === 0 &&
                cfData.financing.items.length === 0 &&
                cfData.netChange === 0 && (
                  <div className="rounded-md border py-12 text-center">
                    <p className="text-muted-foreground">
                      No cash flow data found for this period.
                    </p>
                  </div>
                )}

              {/* Table */}
              {(cfData.operating.items.length > 0 ||
                cfData.investing.items.length > 0 ||
                cfData.financing.items.length > 0) && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70%]">Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Operating Activities */}
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={2} className="py-2 font-semibold text-sm">
                          {cfData.operating.label}
                        </TableCell>
                      </TableRow>
                      {cfData.operating.items.map((item, i) => (
                        <TableRow key={`op-${i}`}>
                          <TableCell className="pl-6">{item.accountName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell className="font-semibold text-sm">
                          Net Cash from Operating Activities
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(cfData.operating.total)}
                        </TableCell>
                      </TableRow>

                      {/* Investing Activities */}
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={2} className="py-2 font-semibold text-sm">
                          {cfData.investing.label}
                        </TableCell>
                      </TableRow>
                      {cfData.investing.items.length === 0 ? (
                        <TableRow>
                          <TableCell className="pl-6 text-muted-foreground">
                            No investing activities
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(0)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        cfData.investing.items.map((item, i) => (
                          <TableRow key={`inv-${i}`}>
                            <TableCell className="pl-6">{item.accountName}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell className="font-semibold text-sm">
                          Net Cash from Investing Activities
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(cfData.investing.total)}
                        </TableCell>
                      </TableRow>

                      {/* Financing Activities */}
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={2} className="py-2 font-semibold text-sm">
                          {cfData.financing.label}
                        </TableCell>
                      </TableRow>
                      {cfData.financing.items.length === 0 ? (
                        <TableRow>
                          <TableCell className="pl-6 text-muted-foreground">
                            No financing activities
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(0)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        cfData.financing.items.map((item, i) => (
                          <TableRow key={`fin-${i}`}>
                            <TableCell className="pl-6">{item.accountName}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell className="font-semibold text-sm">
                          Net Cash from Financing Activities
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(cfData.financing.total)}
                        </TableCell>
                      </TableRow>

                      {/* Spacer */}
                      <TableRow>
                        <TableCell colSpan={2} className="h-2 p-0" />
                      </TableRow>

                      {/* Net Change in Cash */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="font-bold">
                          Net Change in Cash
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-bold",
                            cfData.netChange < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          )}
                        >
                          {formatCurrency(cfData.netChange)}
                        </TableCell>
                      </TableRow>

                      {/* Beginning Cash */}
                      <TableRow>
                        <TableCell>Beginning Cash Balance</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(cfData.beginningCash)}
                        </TableCell>
                      </TableRow>

                      {/* Ending Cash */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="font-bold">
                          Ending Cash Balance
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {formatCurrency(cfData.endingCash)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
