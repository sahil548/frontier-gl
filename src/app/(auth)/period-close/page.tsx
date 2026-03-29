"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [yecOpen, setYecOpen] = useState(false);
  const [yecLoading, setYecLoading] = useState(false);
  const [equityAccounts, setEquityAccounts] = useState<Array<{ id: string; number: string; name: string }>>([]);
  const [selectedREAccount, setSelectedREAccount] = useState<string>("");

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

  async function closePeriod(month: number, force = false) {
    setActionLoading(month);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/period-close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month, force }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`${MONTH_NAMES[month - 1]} ${year} closed`);
        await fetchPeriods();
      } else if (res.status === 422 && json.unreconciledAccounts) {
        // Unreconciled accounts — ask to force
        const names = json.unreconciledAccounts
          .slice(0, 3)
          .map((a: { name: string }) => a.name)
          .join(", ");
        const more = json.unreconciledAccounts.length > 3
          ? ` and ${json.unreconciledAccounts.length - 3} more`
          : "";
        toast.error(
          `${json.unreconciledAccounts.length} unreconciled: ${names}${more}`,
          {
            action: {
              label: "Close Anyway",
              onClick: () => closePeriod(month, true),
            },
            duration: 10000,
          }
        );
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

  // ─── Year-End Close ──────────────────────────────────

  async function fetchEquityAccounts() {
    try {
      const res = await fetch(`/api/entities/${currentEntityId}/accounts`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const equity = json.data.filter(
            (a: { type: string; parentId: string | null; isActive: boolean }) =>
              a.type === "EQUITY" && a.isActive
          );
          setEquityAccounts(equity);
          // Auto-select "Retained Earnings" if it exists
          const re = equity.find((a: { name: string }) =>
            a.name.toLowerCase().includes("retained earnings")
          );
          if (re) setSelectedREAccount(re.id);
        }
      }
    } catch { /* ignore */ }
  }

  async function runYearEndClose() {
    if (!selectedREAccount) {
      toast.error("Select a retained earnings account");
      return;
    }
    setYecLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/year-end-close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fiscalYear: year,
            retainedEarningsAccountId: selectedREAccount,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          `Year-end close complete: ${json.data.entryNumber} created`
        );
        setYecOpen(false);
      } else {
        toast.error(json.error ?? "Year-end close failed");
      }
    } catch {
      toast.error("Year-end close failed");
    } finally {
      setYecLoading(false);
    }
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
            value={bulkMonth || null}
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

      {/* Year-End Close */}
      {!loading && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookCheck className="h-4 w-4" />
              Year-End Close
            </CardTitle>
            <CardDescription>
              Generate closing entries that zero out income and expense accounts
              to retained earnings. All 12 months must be closed first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              open={yecOpen}
              onOpenChange={(open) => {
                setYecOpen(open);
                if (open) fetchEquityAccounts();
              }}
            >
              <DialogTrigger
                render={
                  <Button disabled={closedCount < 12} />
                }
              >
                <BookCheck className="mr-2 h-4 w-4" />
                {closedCount < 12
                  ? `Close all 12 months first (${closedCount}/12)`
                  : `Run Year-End Close for ${year}`}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Year-End Close — FY{year}</DialogTitle>
                  <DialogDescription>
                    This will create a posted journal entry that zeros out all
                    income and expense accounts and transfers the net amount to
                    the selected retained earnings account.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Retained Earnings Account
                  </label>
                  <Select
                    value={selectedREAccount || null}
                    onValueChange={(val) => setSelectedREAccount(val as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select equity account" />
                    </SelectTrigger>
                    <SelectContent>
                      {equityAccounts.map((acct) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.number} — {acct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    onClick={runYearEndClose}
                    disabled={!selectedREAccount || yecLoading}
                  >
                    {yecLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generate Closing Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
