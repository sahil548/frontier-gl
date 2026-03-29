"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Lock,
  Unlock,
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from "date-fns";
import { useEntityContext } from "@/providers/entity-provider";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/accounting";
import { AssetPieChart } from "@/components/dashboard/asset-pie-chart";
import { IncomeExpenseBar } from "@/components/dashboard/income-expense-bar";
import { EquityTrendArea } from "@/components/dashboard/equity-trend-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────

interface DashboardData {
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    netIncome: number;
  };
  recentEntries: Array<{
    id: string;
    entryNumber: string;
    date: string;
    description: string;
    status: string;
    totalAmount: number;
  }>;
  periodStatus: {
    year: number;
    month: number;
    isClosed: boolean;
  };
  assetBreakdown: { name: string; value: number }[];
  incomeVsExpense: { category: string; amount: number }[];
  equityTrend: { month: string; equity: number }[];
}

// ─── Helpers ────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function statusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "POSTED":
      return "default";
    case "APPROVED":
      return "secondary";
    default:
      return "outline";
  }
}

// ─── Page Component ─────────────────────────────────────

type PeriodKey = "this-month" | "last-month" | "this-quarter" | "ytd";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "ytd", label: "Year to Date" },
];

function getPeriodRange(key: PeriodKey): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (key) {
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now), label: "This Month" };
    case "last-month": {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev), label: "Last Month" };
    }
    case "this-quarter":
      return { start: startOfQuarter(now), end: endOfMonth(now), label: "This Quarter" };
    case "ytd":
      return { start: startOfYear(now), end: endOfMonth(now), label: "Year to Date" };
  }
}

export default function DashboardPage() {
  const { entities, isLoading, currentEntityId } = useEntityContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("this-month");

  const periodRange = useMemo(() => getPeriodRange(period), [period]);
  const incomeStartStr = periodRange.start.toISOString().split("T")[0];
  const incomeEndStr = periodRange.end.toISOString().split("T")[0];

  const fetchDashboard = useCallback(async () => {
    if (entities.length === 0) return;

    setDashboardLoading(true);
    try {
      const isConsolidated = currentEntityId === "all";
      const targetEntityId = isConsolidated ? entities[0].id : currentEntityId;
      const params = new URLSearchParams();
      if (isConsolidated) params.set("consolidated", "true");
      params.set("incomeStart", incomeStartStr);
      params.set("incomeEnd", incomeEndStr);
      const res = await fetch(
        `/api/entities/${targetEntityId}/dashboard?${params}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // silently fail — dashboard shows zero state
    } finally {
      setDashboardLoading(false);
    }
  }, [entities, currentEntityId, incomeStartStr, incomeEndStr]);

  useEffect(() => {
    if (!isLoading && entities.length > 0) {
      fetchDashboard();
    }
  }, [isLoading, entities, fetchDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return <WelcomeScreen />;
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const contextLabel = currentEntity ? currentEntity.name : "All Entities";

  if (dashboardLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Viewing: {contextLabel}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { summary, recentEntries, periodStatus, assetBreakdown, incomeVsExpense, equityTrend } = data;
  const monthLabel = `${MONTH_NAMES[periodStatus.month - 1]} ${periodStatus.year}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Viewing: {contextLabel}</p>
        </div>
        <Select
          value={period}
          onValueChange={(val) => setPeriod(val as PeriodKey)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.totalAssets)}
            </p>
          </CardContent>
        </Card>

        {/* Total Liabilities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Liabilities
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalLiabilities)}
            </p>
          </CardContent>
        </Card>

        {/* Total Equity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Equity
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalEquity)}
            </p>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income - {periodRange.label}
            </CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${
                summary.netIncome >= 0 ? "text-yellow-500" : "text-orange-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                summary.netIncome >= 0
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-orange-600 dark:text-orange-400"
              }`}
            >
              {formatCurrency(summary.netIncome)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {assetBreakdown && (
          <AssetPieChart
            data={assetBreakdown}
            entityId={currentEntityId ?? entities[0]?.id ?? ""}
          />
        )}
        {incomeVsExpense && (
          <IncomeExpenseBar data={incomeVsExpense} />
        )}
        {equityTrend && (
          <EquityTrendArea data={equityTrend} />
        )}
      </div>

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Journal Entries
          </CardTitle>
          <Button variant="outline" size="sm" render={<Link href="/journal-entries" />}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No journal entries yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/journal-entries/${entry.id}`}
                  >
                    <TableCell>
                      <Link
                        href={`/journal-entries/${entry.id}`}
                        className="hover:underline"
                      >
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/journal-entries/${entry.id}`}
                        className="font-mono hover:underline"
                      >
                        {entry.entryNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Period Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {periodStatus.isClosed ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Unlock className="h-5 w-5 text-muted-foreground" />
            )}
            Current Period: {monthLabel}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant={periodStatus.isClosed ? "default" : "secondary"}>
              {periodStatus.isClosed ? "Closed" : "Open"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/period-close" />}
            >
              Period Close
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
