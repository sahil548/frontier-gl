"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// ─── Types ──────────────────────────────────────────────

interface ClosedPeriod {
  id: string;
  entityId: string;
  year: number;
  month: number;
  closedBy: string;
  closedAt: string;
}

// ─── Loading skeleton ───────────────────────────────────

function PeriodCloseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Main page component ────────────────────────────────

export default function PeriodClosePage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkMonth, setBulkMonth] = useState<number>(0);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isAllEntities = currentEntityId === "all";

  // ─── Fetch closed periods ──────────────────────────────

  const fetchPeriods = useCallback(async () => {
    if (!currentEntityId || isAllEntities || entities.length === 0) {
      setClosedPeriods([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/period-close`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setClosedPeriods(json.data);
        }
      }
    } catch {
      toast.error("Failed to load closed periods");
    } finally {
      setLoading(false);
    }
  }, [currentEntityId, entities.length, isAllEntities]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // ─── Helpers ───────────────────────────────────────────

  function isMonthClosed(month: number): boolean {
    return closedPeriods.some((p) => p.year === year && p.month === month);
  }

  function getClosedPeriod(month: number): ClosedPeriod | undefined {
    return closedPeriods.find((p) => p.year === year && p.month === month);
  }

  // ─── Close a period ────────────────────────────────────

  async function closePeriod(month: number) {
    setActionLoading(month);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/period-close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`${MONTH_NAMES[month - 1]} ${year} closed`);
        await fetchPeriods();
      } else {
        toast.error(json.error ?? "Failed to close period");
      }
    } catch {
      toast.error("Failed to close period");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Reopen a period ──────────────────────────────────

  async function reopenPeriod(month: number) {
    setActionLoading(month);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/period-close`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`${MONTH_NAMES[month - 1]} ${year} reopened`);
        await fetchPeriods();
      } else {
        toast.error(json.error ?? "Failed to reopen period");
      }
    } catch {
      toast.error("Failed to reopen period");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Close all through a month ─────────────────────────

  async function closeAllThrough() {
    if (bulkMonth < 1) return;

    setBulkLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let m = 1; m <= bulkMonth; m++) {
      if (isMonthClosed(m)) continue;

      try {
        const res = await fetch(
          `/api/entities/${currentEntityId}/period-close`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, month: m }),
          }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Closed ${successCount} period${successCount > 1 ? "s" : ""}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to close ${errorCount} period${errorCount > 1 ? "s" : ""}`);
    }

    await fetchPeriods();
    setBulkLoading(false);
  }

  // ─── Summary counts ───────────────────────────────────

  const closedCount = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    isMonthClosed
  ).length;

  // ─── Early returns ────────────────────────────────────

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
          Period Close
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to manage period close.
        </p>
      </div>
    );
  }

  if (isAllEntities) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Period Close
        </h1>
        <div className="rounded-md border py-12 text-center">
          <p className="text-muted-foreground">
            Select a specific entity to manage period close.
          </p>
        </div>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Period Close
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center text-lg font-semibold tabular-nums">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentEntity && (
            <p className="text-sm text-muted-foreground">
              {currentEntity.name}
            </p>
          )}
          <Badge
            variant="secondary"
            className="ml-2"
          >
            {closedCount}/12 closed
          </Badge>
        </div>
      </div>

      {/* Close All Through */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Close All Through</CardTitle>
          <CardDescription>
            Close all open periods from January through the selected month.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Select
            value={bulkMonth}
            onValueChange={(val) => setBulkMonth(val as number)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={i + 1}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={closeAllThrough}
            disabled={bulkMonth < 1 || bulkLoading}
            size="sm"
          >
            {bulkLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Close Periods
          </Button>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && <PeriodCloseSkeleton />}

      {/* Month grid */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {MONTH_NAMES.map((name, i) => {
            const month = i + 1;
            const closed = isMonthClosed(month);
            const closedPeriod = getClosedPeriod(month);
            const isActioning = actionLoading === month;

            return (
              <Card
                key={month}
                size="sm"
                className={cn(
                  "transition-colors",
                  closed
                    ? "bg-muted/50 ring-green-500/20"
                    : "ring-foreground/10"
                )}
              >
                <CardContent className="flex flex-col items-center gap-2 px-3 py-4">
                  <span className="text-sm font-medium">
                    {MONTH_SHORT[i]}
                  </span>
                  <Badge
                    variant={closed ? "default" : "outline"}
                    className={cn(
                      "gap-1",
                      closed
                        ? "bg-green-600 text-white dark:bg-green-700"
                        : ""
                    )}
                  >
                    {closed ? (
                      <>
                        <Lock className="h-3 w-3" />
                        Closed
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3" />
                        Open
                      </>
                    )}
                  </Badge>
                  {closedPeriod && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(closedPeriod.closedAt).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    variant={closed ? "outline" : "default"}
                    size="sm"
                    className="mt-1 h-7 w-full text-xs"
                    disabled={isActioning}
                    onClick={() =>
                      closed ? reopenPeriod(month) : closePeriod(month)
                    }
                  >
                    {isActioning ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : closed ? (
                      "Reopen"
                    ) : (
                      "Close"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
