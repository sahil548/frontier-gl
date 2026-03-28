"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useEntityContext } from "@/providers/entity-provider";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { formatCurrency } from "@/lib/utils/accounting";
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

export default function DashboardPage() {
  const { entities, isLoading, currentEntityId } = useEntityContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (entities.length === 0) return;

    setDashboardLoading(true);
    try {
      const isConsolidated = currentEntityId === "all";
      const targetEntityId = isConsolidated ? entities[0].id : currentEntityId;
      const qs = isConsolidated ? "?consolidated=true" : "";
      const res = await fetch(
        `/api/entities/${targetEntityId}/dashboard${qs}`
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
  }, [entities, currentEntityId]);

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

  const { summary, recentEntries, periodStatus } = data;
  const monthLabel = `${MONTH_NAMES[periodStatus.month - 1]} ${periodStatus.year}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Viewing: {contextLabel}</p>
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
              Net Income - Current Month
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
                  <TableRow key={entry.id}>
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
