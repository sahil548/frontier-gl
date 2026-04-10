"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DollarSign, Upload, Copy, Save } from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getFiscalYearMonths, type FiscalYearMonth } from "@/lib/utils/fiscal-year";

// ─── Types ──────────────────────────────────────────────

interface AccountRow {
  id: string;
  number: string;
  name: string;
  type: string;
}

interface BudgetEntry {
  id: string;
  accountId: string;
  year: number;
  month: number;
  amount: string;
  account: { id: string; number: string; name: string; type: string };
}

// ─── Helpers ────────────────────────────────────────────

function cellKey(accountId: string, year: number, month: number): string {
  return `${accountId}-${year}-${month}`;
}

function formatAmount(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;
  return num.toFixed(2);
}

function parseAmount(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function generateFiscalYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
}

// ─── Loading skeleton ───────────────────────────────────

function BudgetSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-muted w-80" />
      <div className="rounded-md border">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 border-b bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page component ────────────────────────────────

export default function BudgetsPage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState<number>(currentYear);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [gridState, setGridState] = useState<Map<string, string>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedEntityId =
    currentEntityId === "all" && entities.length > 0
      ? entities[0].id
      : currentEntityId;

  const currentEntity = entities.find((e) => e.id === resolvedEntityId);
  const fiscalYearEnd = currentEntity?.fiscalYearEnd ?? "12-31";
  const entityName = currentEntity?.name ?? "";

  const fyMonths: FiscalYearMonth[] = getFiscalYearMonths(fiscalYearEnd, fiscalYear);
  const fiscalYears = generateFiscalYears();

  // ─── Fetch accounts ─────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!resolvedEntityId || resolvedEntityId === "all") return;
    try {
      const res = await fetch(`/api/entities/${resolvedEntityId}/accounts`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const filtered = (json.data as AccountRow[]).filter(
            (a) => a.type === "INCOME" || a.type === "EXPENSE"
          );
          filtered.sort((a, b) => a.number.localeCompare(b.number));
          setAccounts(filtered);
        }
      }
    } catch {
      // silently fail
    }
  }, [resolvedEntityId]);

  // ─── Fetch budgets ──────────────────────────────────

  const fetchBudgets = useCallback(async () => {
    if (!resolvedEntityId || resolvedEntityId === "all") return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${resolvedEntityId}/budgets?fiscalYear=${fiscalYear}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const newGrid = new Map<string, string>();
          for (const entry of json.data as BudgetEntry[]) {
            const key = cellKey(entry.accountId, entry.year, entry.month);
            newGrid.set(key, formatAmount(entry.amount));
          }
          setGridState(newGrid);
          setIsDirty(false);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [resolvedEntityId, fiscalYear]);

  // ─── Effects ────────────────────────────────────────

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchBudgets();
    } else {
      setLoading(false);
    }
  }, [fetchBudgets, accounts.length]);

  // ─── Cell change handler ────────────────────────────

  function handleCellChange(accountId: string, year: number, month: number, value: string) {
    const key = cellKey(accountId, year, month);
    setGridState((prev) => {
      const next = new Map(prev);
      if (value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
    setIsDirty(true);
  }

  function handleCellBlur(accountId: string, year: number, month: number) {
    const key = cellKey(accountId, year, month);
    setGridState((prev) => {
      const current = prev.get(key) ?? "";
      if (current === "") return prev;
      const formatted = formatAmount(current);
      if (formatted === current) return prev;
      const next = new Map(prev);
      next.set(key, formatted);
      return next;
    });
  }

  // ─── Compute totals ────────────────────────────────

  function getRowTotal(accountId: string): number {
    let total = 0;
    for (const m of fyMonths) {
      const key = cellKey(accountId, m.year, m.month);
      total += parseAmount(gridState.get(key) ?? "");
    }
    return total;
  }

  function getSectionMonthTotal(accountType: string, year: number, month: number): number {
    let total = 0;
    for (const acct of accounts) {
      if (acct.type !== accountType) continue;
      const key = cellKey(acct.id, year, month);
      total += parseAmount(gridState.get(key) ?? "");
    }
    return total;
  }

  function getSectionTotal(accountType: string): number {
    let total = 0;
    for (const acct of accounts) {
      if (acct.type !== accountType) continue;
      total += getRowTotal(acct.id);
    }
    return total;
  }

  // ─── Save handler ──────────────────────────────────

  async function handleSave() {
    if (!resolvedEntityId || resolvedEntityId === "all") return;
    setSaving(true);
    try {
      const budgets: { accountId: string; year: number; month: number; amount: string }[] = [];
      for (const [key, value] of gridState) {
        if (value.trim() === "") continue;
        const parts = key.split("-");
        // key format: accountId-year-month (accountId is CUID so we split from the right)
        const month = parseInt(parts[parts.length - 1], 10);
        const year = parseInt(parts[parts.length - 2], 10);
        const accountId = parts.slice(0, parts.length - 2).join("-");
        budgets.push({ accountId, year, month, amount: value });
      }

      const res = await fetch(`/api/entities/${resolvedEntityId}/budgets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYear, budgets }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          toast.success(`Budget saved (${json.data.upserted} entries)`);
          setIsDirty(false);
        } else {
          toast.error(json.error ?? "Failed to save budgets");
        }
      } else {
        toast.error("Failed to save budgets");
      }
    } catch {
      toast.error("Failed to save budgets");
    } finally {
      setSaving(false);
    }
  }

  // ─── Copy from prior year ──────────────────────────

  async function handleCopyFromPriorYear() {
    if (!resolvedEntityId || resolvedEntityId === "all") return;
    const priorYear = fiscalYear - 1;
    setCopying(true);
    try {
      const res = await fetch(
        `/api/entities/${resolvedEntityId}/budgets?fiscalYear=${priorYear}`
      );
      if (!res.ok) {
        toast.error("Failed to fetch prior year budgets");
        return;
      }
      const json = await res.json();
      if (!json.success) {
        toast.error("Failed to fetch prior year budgets");
        return;
      }

      const priorBudgets = json.data as BudgetEntry[];
      if (priorBudgets.length === 0) {
        toast.info(`No budgets found for FY ${priorYear}`);
        return;
      }

      // Map prior year entries to current year using month offsets
      const priorFyMonths = getFiscalYearMonths(fiscalYearEnd, priorYear);
      let copied = 0;

      setGridState((prev) => {
        const next = new Map(prev);
        for (const entry of priorBudgets) {
          // Find the offset index of this month in prior year
          const priorIdx = priorFyMonths.findIndex(
            (m) => m.year === entry.year && m.month === entry.month
          );
          if (priorIdx === -1) continue;

          // Map to current year at the same offset
          const currentMonth = fyMonths[priorIdx];
          if (!currentMonth) continue;

          const key = cellKey(entry.accountId, currentMonth.year, currentMonth.month);
          // Only overwrite empty cells or fill all if grid is mostly empty
          if (!next.has(key) || next.get(key)?.trim() === "") {
            next.set(key, formatAmount(entry.amount));
            copied++;
          }
        }
        return next;
      });

      setIsDirty(true);
      toast.success(`Copied ${copied} budget amounts from FY ${priorYear}`);
    } catch {
      toast.error("Failed to copy from prior year");
    } finally {
      setCopying(false);
    }
  }

  // ─── CSV Import handler ────────────────────────────

  async function handleCsvImport(file: File) {
    if (!resolvedEntityId || resolvedEntityId === "all") return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch(
        `/api/entities/${resolvedEntityId}/budgets/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: text }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const { imported, skipped, errors } = json.data;
          toast.success(`Imported ${imported} entries, skipped ${skipped}`);
          if (errors && errors.length > 0) {
            toast.warning(`${errors.length} validation warning(s)`, {
              description: errors.slice(0, 3).join("\n"),
            });
          }
          // Refresh grid
          await fetchBudgets();
        } else {
          toast.error(json.error ?? "Import failed");
        }
      } else {
        toast.error("Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground">
          Create an entity first to manage budgets.
        </p>
      </div>
    );
  }

  const incomeAccounts = accounts.filter((a) => a.type === "INCOME");
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  // ─── Render ───────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        {entityName && (
          <p className="text-sm text-muted-foreground">{entityName}</p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Fiscal year selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fiscal Year</span>
          <Select
            value={fiscalYear}
            onValueChange={(val) => setFiscalYear(Number(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Copy from prior year */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleCopyFromPriorYear}
          disabled={copying || loading}
        >
          <Copy className="h-4 w-4" />
          Copy from {fiscalYear - 1}
        </Button>

        {/* CSV Import */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing || loading}
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvImport(file);
          }}
        />

        {/* Save */}
        <Button
          size="sm"
          className="gap-2"
          onClick={handleSave}
          disabled={!isDirty || saving || loading}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Loading */}
      {loading && <BudgetSkeleton />}

      {/* Empty state: no accounts */}
      {!loading && accounts.length === 0 && (
        <div className="rounded-md border py-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            No Income or Expense accounts found.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add accounts in the Chart of Accounts first.
          </p>
        </div>
      )}

      {/* Empty state: accounts exist but no budgets */}
      {!loading && accounts.length > 0 && gridState.size === 0 && (
        <p className="text-sm text-muted-foreground">
          No budgets entered yet for FY {fiscalYear}. Type amounts below or import from CSV.
        </p>
      )}

      {/* Budget grid */}
      {!loading && accounts.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-max min-w-full border-collapse text-sm">
            {/* Header */}
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium w-24">
                  Acct #
                </th>
                <th className="sticky left-24 z-10 bg-muted/50 px-3 py-2 text-left font-medium w-48">
                  Account Name
                </th>
                {fyMonths.map((m) => (
                  <th
                    key={`${m.year}-${m.month}`}
                    className="px-2 py-2 text-right font-medium w-28"
                  >
                    {m.label} {m.year}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium w-28">Total</th>
              </tr>
            </thead>

            <tbody>
              {/* Income section */}
              {incomeAccounts.length > 0 && (
                <>
                  <tr className="bg-green-50 dark:bg-green-950/30">
                    <td
                      colSpan={fyMonths.length + 3}
                      className="px-3 py-2 font-semibold text-sm"
                    >
                      Income
                    </td>
                  </tr>
                  {incomeAccounts.map((acct, idx) => (
                    <tr
                      key={acct.id}
                      className={cn(
                        "hover:bg-muted/30",
                        idx % 2 === 1 && "bg-muted/10"
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-1 font-mono text-xs">
                        {acct.number}
                      </td>
                      <td className="sticky left-24 z-10 bg-inherit px-3 py-1 truncate max-w-48">
                        {acct.name}
                      </td>
                      {fyMonths.map((m) => {
                        const key = cellKey(acct.id, m.year, m.month);
                        return (
                          <td key={key} className="px-1 py-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 hover:border-muted-foreground/20"
                              value={gridState.get(key) ?? ""}
                              onChange={(e) =>
                                handleCellChange(acct.id, m.year, m.month, e.target.value)
                              }
                              onBlur={() => handleCellBlur(acct.id, m.year, m.month)}
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-1 text-right font-mono text-sm font-medium">
                        {getRowTotal(acct.id).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Income subtotal */}
                  <tr className="border-t font-semibold bg-green-50/50 dark:bg-green-950/20">
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2" />
                    <td className="sticky left-24 z-10 bg-inherit px-3 py-2 text-sm">
                      Total Income
                    </td>
                    {fyMonths.map((m) => (
                      <td
                        key={`inc-total-${m.year}-${m.month}`}
                        className="px-2 py-2 text-right font-mono text-sm"
                      >
                        {getSectionMonthTotal("INCOME", m.year, m.month).toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {getSectionTotal("INCOME").toFixed(2)}
                    </td>
                  </tr>
                </>
              )}

              {/* Expense section */}
              {expenseAccounts.length > 0 && (
                <>
                  <tr className="bg-orange-50 dark:bg-orange-950/30">
                    <td
                      colSpan={fyMonths.length + 3}
                      className="px-3 py-2 font-semibold text-sm"
                    >
                      Expenses
                    </td>
                  </tr>
                  {expenseAccounts.map((acct, idx) => (
                    <tr
                      key={acct.id}
                      className={cn(
                        "hover:bg-muted/30",
                        idx % 2 === 1 && "bg-muted/10"
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-1 font-mono text-xs">
                        {acct.number}
                      </td>
                      <td className="sticky left-24 z-10 bg-inherit px-3 py-1 truncate max-w-48">
                        {acct.name}
                      </td>
                      {fyMonths.map((m) => {
                        const key = cellKey(acct.id, m.year, m.month);
                        return (
                          <td key={key} className="px-1 py-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 hover:border-muted-foreground/20"
                              value={gridState.get(key) ?? ""}
                              onChange={(e) =>
                                handleCellChange(acct.id, m.year, m.month, e.target.value)
                              }
                              onBlur={() => handleCellBlur(acct.id, m.year, m.month)}
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-1 text-right font-mono text-sm font-medium">
                        {getRowTotal(acct.id).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Expense subtotal */}
                  <tr className="border-t font-semibold bg-orange-50/50 dark:bg-orange-950/20">
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2" />
                    <td className="sticky left-24 z-10 bg-inherit px-3 py-2 text-sm">
                      Total Expenses
                    </td>
                    {fyMonths.map((m) => (
                      <td
                        key={`exp-total-${m.year}-${m.month}`}
                        className="px-2 py-2 text-right font-mono text-sm"
                      >
                        {getSectionMonthTotal("EXPENSE", m.year, m.month).toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {getSectionTotal("EXPENSE").toFixed(2)}
                    </td>
                  </tr>
                </>
              )}

              {/* Net (Income - Expenses) */}
              <tr className="border-t-2 font-bold bg-muted/30">
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2" />
                <td className="sticky left-24 z-10 bg-inherit px-3 py-2 text-sm">
                  Net Income
                </td>
                {fyMonths.map((m) => {
                  const net =
                    getSectionMonthTotal("INCOME", m.year, m.month) -
                    getSectionMonthTotal("EXPENSE", m.year, m.month);
                  return (
                    <td
                      key={`net-${m.year}-${m.month}`}
                      className={cn(
                        "px-2 py-2 text-right font-mono text-sm",
                        net < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {net.toFixed(2)}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono text-sm",
                    getSectionTotal("INCOME") - getSectionTotal("EXPENSE") < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  )}
                >
                  {(getSectionTotal("INCOME") - getSectionTotal("EXPENSE")).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
