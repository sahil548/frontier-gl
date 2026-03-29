"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface SubledgerItem {
  id: string;
  name: string;
  itemType: string;
  accountId: string;
  currentBalance: string;
  account?: {
    id: string;
    number: string;
    name: string;
    type: string;
  };
  reconciliations?: ReconRecord[];
}

interface ReconRecord {
  id: string;
  statementDate: string;
  statementBalance: string;
  glBalance: string;
  difference: string;
  status: string;
  reconciledAt: string | null;
}

interface LedgerTransaction {
  date: string;
  jeNumber: string;
  jeId: string;
  description: string;
  lineMemo: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerApiResponse {
  account: { id: string; name: string; accountNumber: string; type: string };
  beginningBalance: number;
  transactions: LedgerTransaction[];
  summary: { currentBalance: number; ytdDebits: number; ytdCredits: number };
}

interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Bank Account",
  INVESTMENT: "Investment",
  REAL_ESTATE: "Real Estate",
  LOAN: "Loan",
  PRIVATE_EQUITY: "Private Equity",
  RECEIVABLE: "Receivable",
  OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  BANK_ACCOUNT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  INVESTMENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REAL_ESTATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  LOAN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PRIVATE_EQUITY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  RECEIVABLE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

// ─── Main page ──────────────────────────────────────────

export default function ReconcilePage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const router = useRouter();
  const { currentEntityId } = useEntityContext();

  // Period selector
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // Item + ledger data
  const [item, setItem] = useState<SubledgerItem | null>(null);
  const [itemLoading, setItemLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<LedgerApiResponse | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Statement inputs
  const [statementDate, setStatementDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]
  );
  const [statementBalance, setStatementBalance] = useState("");

  // Statement lines (manual entry)
  const [stmtLines, setStmtLines] = useState<StatementLine[]>([]);
  const [lineDate, setLineDate] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [lineAmount, setLineAmount] = useState("");

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false);

  // Saving
  const [saving, setSaving] = useState(false);

  // ─── Fetch item ─────────────────────────────────────

  const fetchItem = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all" || !itemId) return;
    setItemLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/subledger/${itemId}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setItem(json.data);
      } else {
        toast.error("Subledger item not found");
        router.push("/holdings");
      }
    } catch {
      toast.error("Failed to load item");
    } finally {
      setItemLoading(false);
    }
  }, [currentEntityId, itemId, router]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  // ─── Fetch ledger ────────────────────────────────────

  const fetchLedger = useCallback(async () => {
    if (!currentEntityId || !item?.accountId) return;
    setLedgerLoading(true);
    try {
      const periodStart = new Date(
        selectedYear,
        selectedMonth - 1,
        1
      ).toISOString();
      const periodEnd = new Date(
        selectedYear,
        selectedMonth,
        0,
        23,
        59,
        59
      ).toISOString();
      const res = await fetch(
        `/api/entities/${currentEntityId}/ledger/${item.accountId}?startDate=${periodStart}&endDate=${periodEnd}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setLedgerData(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLedgerLoading(false);
    }
  }, [currentEntityId, item?.accountId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Update statementDate default when period changes
  useEffect(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    setStatementDate(lastDay.toISOString().split("T")[0]);
  }, [selectedYear, selectedMonth]);

  // ─── Computed values ─────────────────────────────────

  const glBalance = useMemo(() => {
    if (!ledgerData) return null;
    return (
      ledgerData.beginningBalance +
      ledgerData.transactions.reduce((s, t) => s + t.debit - t.credit, 0)
    );
  }, [ledgerData]);

  const openingBalance = ledgerData?.beginningBalance ?? 0;

  const stmtTotal = stmtLines.reduce(
    (s, l) => s + (parseFloat(l.amount) || 0),
    0
  );

  const stmtBalanceParsed = parseFloat(statementBalance) || 0;
  const difference =
    glBalance !== null && statementBalance
      ? stmtBalanceParsed - glBalance
      : null;

  // ─── Statement line handlers ─────────────────────────

  function addStmtLine() {
    if (!lineDesc.trim() || !lineAmount) return;
    setStmtLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: lineDate,
        description: lineDesc.trim(),
        amount: lineAmount,
      },
    ]);
    setLineDate("");
    setLineDesc("");
    setLineAmount("");
  }

  function removeStmtLine(id: string) {
    setStmtLines((prev) => prev.filter((l) => l.id !== id));
  }

  // ─── Submit reconciliation ────────────────────────────

  async function submitReconciliation(status: "COMPLETED" | "IN_PROGRESS") {
    if (!statementBalance) {
      toast.error("Enter the statement balance");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/subledger/${itemId}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statementDate,
            statementBalance: stmtBalanceParsed,
            statementLines:
              stmtLines.length > 0
                ? stmtLines.map((l) => ({
                    date: l.date || statementDate,
                    description: l.description,
                    amount: parseFloat(l.amount),
                  }))
                : undefined,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        if (status === "COMPLETED") {
          toast.success("Reconciliation completed");
        } else {
          toast.success("Progress saved");
        }
        // Refresh item to get updated reconciliation history
        await fetchItem();
        setHistoryOpen(true);
      } else {
        toast.error(json.error ?? "Reconciliation failed");
      }
    } catch {
      toast.error("Reconciliation failed");
    } finally {
      setSaving(false);
    }
  }

  // ─── Year options ─────────────────────────────────────

  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i
  );

  // ─── Loading / error states ───────────────────────────

  if (itemLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-96 rounded-xl bg-muted animate-pulse" />
          <div className="h-96 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!item) return null;

  const reconciledInPeriod = item.reconciliations?.find((r) => {
    const d = new Date(r.statementDate);
    return (
      d.getFullYear() === selectedYear &&
      d.getMonth() + 1 === selectedMonth &&
      r.status === "COMPLETED"
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/holdings")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Holdings
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {item.name}
            </h1>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 text-xs",
                TYPE_COLORS[item.itemType] ?? ""
              )}
            >
              {TYPE_LABELS[item.itemType] ?? item.itemType}
            </Badge>
          </div>
          {item.account && (
            <p className="text-sm text-muted-foreground">
              Account {item.account.number} — {item.account.name}
            </p>
          )}
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => { if (v) setSelectedMonth(parseInt(v)); }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => { if (v) setSelectedYear(parseInt(v)); }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Already reconciled banner */}
      {reconciledInPeriod && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500 bg-green-50 px-4 py-3 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            This period is already reconciled (
            {new Date(reconciledInPeriod.statementDate).toLocaleDateString()})
            — Statement: {formatCurrency(parseFloat(reconciledInPeriod.statementBalance))},
            GL: {formatCurrency(parseFloat(reconciledInPeriod.glBalance))},
            Diff: {formatCurrency(parseFloat(reconciledInPeriod.difference))}
          </span>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: GL Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GL Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} — Posted
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerLoading ? (
              <div className="space-y-2 p-4 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-muted" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-right text-xs">Debit</TableHead>
                      <TableHead className="text-right text-xs">Credit</TableHead>
                      <TableHead className="text-right text-xs">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening balance row */}
                    <TableRow className="bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground" />
                      <TableCell className="text-xs font-medium">
                        Opening Balance
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right text-xs font-mono font-semibold">
                        {formatCurrency(openingBalance)}
                      </TableCell>
                    </TableRow>

                    {ledgerData && ledgerData.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No transactions in this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerData?.transactions.map((txn) => (
                        <TableRow key={txn.jeId + txn.date}>
                          <TableCell className="text-xs">
                            {new Date(txn.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-xs max-w-[140px] truncate">
                            {txn.lineMemo ?? txn.description}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {txn.debit > 0
                              ? formatCurrency(txn.debit)
                              : ""}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {txn.credit > 0
                              ? formatCurrency(txn.credit)
                              : ""}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {formatCurrency(txn.runningBalance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}

                    {/* Closing GL Balance */}
                    {ledgerData && (
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell />
                        <TableCell className="text-xs">
                          Closing GL Balance
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right text-xs font-mono">
                          {glBalance !== null
                            ? formatCurrency(glBalance)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter statement details from your bank or custodian
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Statement Date</Label>
                <Input
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Statement Ending Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Statement lines */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Statement Lines (optional)
              </Label>
              <div className="rounded-md border">
                {stmtLines.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="py-1.5 px-2 text-left font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-muted-foreground">
                          Description
                        </th>
                        <th className="py-1.5 px-2 text-right font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {stmtLines.map((line) => (
                        <tr key={line.id} className="border-b last:border-0">
                          <td className="py-1.5 px-2 text-muted-foreground">
                            {line.date || "—"}
                          </td>
                          <td className="py-1.5 px-2">{line.description}</td>
                          <td className="py-1.5 px-2 text-right font-mono">
                            {formatCurrency(parseFloat(line.amount) || 0)}
                          </td>
                          <td className="py-1.5 px-2">
                            <button
                              onClick={() => removeStmtLine(line.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="py-1.5 px-2" colSpan={2}>
                          Running Total
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {formatCurrency(stmtTotal)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Add line form */}
                <div className="flex gap-2 p-2 border-t bg-muted/20">
                  <Input
                    type="date"
                    value={lineDate}
                    onChange={(e) => setLineDate(e.target.value)}
                    className="h-7 text-xs w-32"
                  />
                  <Input
                    value={lineDesc}
                    onChange={(e) => setLineDesc(e.target.value)}
                    placeholder="Description"
                    className="h-7 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addStmtLine();
                    }}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={lineAmount}
                    onChange={(e) => setLineAmount(e.target.value)}
                    placeholder="Amount"
                    className="h-7 text-xs w-24"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addStmtLine();
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={addStmtLine}
                    disabled={!lineDesc.trim() || !lineAmount}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary bar */}
      <Card
        className={cn(
          "transition-colors",
          difference === null
            ? ""
            : Math.abs(difference) < 0.005
              ? "border-green-500 bg-green-50/50 dark:bg-green-950/30"
              : "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30"
        )}
      >
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground">GL Balance</p>
                <p className="font-mono font-semibold">
                  {glBalance !== null ? formatCurrency(glBalance) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Statement Balance
                </p>
                <p className="font-mono font-semibold">
                  {statementBalance
                    ? formatCurrency(stmtBalanceParsed)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Difference</p>
                <p
                  className={cn(
                    "font-mono font-semibold",
                    difference === null
                      ? "text-muted-foreground"
                      : Math.abs(difference) < 0.005
                        ? "text-green-600"
                        : "text-red-600"
                  )}
                >
                  {difference === null
                    ? "—"
                    : formatCurrency(difference)}
                </p>
              </div>
              {difference !== null && Math.abs(difference) < 0.005 && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Balanced
                  </span>
                </div>
              )}
              {difference !== null && Math.abs(difference) >= 0.005 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">
                    Out of balance
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!statementBalance || saving}
                onClick={() => submitReconciliation("IN_PROGRESS")}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Progress
              </Button>
              <Button
                size="sm"
                disabled={!statementBalance || saving}
                onClick={() => submitReconciliation("COMPLETED")}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Complete Reconciliation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation history */}
      {item.reconciliations && item.reconciliations.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setHistoryOpen((p) => !p)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Reconciliation History ({item.reconciliations.length})
              </CardTitle>
              {historyOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {historyOpen && (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement Date</TableHead>
                    <TableHead className="text-right">Statement Bal</TableHead>
                    <TableHead className="text-right">GL Balance</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reconciled At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.reconciliations.map((r) => {
                    const diff = parseFloat(r.difference);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          {new Date(r.statementDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(parseFloat(r.statementBalance))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(parseFloat(r.glBalance))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono text-sm",
                            Math.abs(diff) < 0.005
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {formatCurrency(diff)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "COMPLETED" ? "default" : "secondary"
                            }
                            className={cn(
                              "text-xs",
                              r.status === "COMPLETED"
                                ? "bg-green-600 text-white"
                                : ""
                            )}
                          >
                            {r.status === "COMPLETED"
                              ? "Completed"
                              : "In Progress"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.reconciledAt
                            ? new Date(r.reconciledAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
