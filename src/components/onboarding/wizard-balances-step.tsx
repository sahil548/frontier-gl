"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, AlertCircle, Upload, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getBalanceCheck, generateOpeningBalanceJE } from "@/lib/onboarding/opening-balance";
import Papa from "papaparse";
import { ColumnMappingUI } from "@/components/csv-import/column-mapping-ui";

// ── Types ───────────────────────────────────────────────

interface AccountRow {
  id: string;
  number: string;
  name: string;
  type: string;
  parentId: string | null;
}

interface WizardBalancesStepProps {
  entityId: string;
  entityFiscalYearEnd?: string; // MM-DD format
  onComplete: () => void;
  onSkip: () => void;
}

// ── Helpers ─────────────────────────────────────────────

function cellKey(accountId: string, column: "debit" | "credit"): string {
  return `${accountId}-${column}`;
}

function getFiscalYearStartDate(fiscalYearEnd?: string): string {
  const now = new Date();
  const year = now.getFullYear();

  if (!fiscalYearEnd || fiscalYearEnd === "12-31") {
    return `${year}-01-01`;
  }

  // Parse MM-DD to determine fiscal year start
  const [mm, dd] = fiscalYearEnd.split("-").map(Number);
  // Fiscal year starts the day after fiscal year end
  const endDate = new Date(year, mm - 1, dd);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() + 1);

  // If the start date is in the future, use last year
  if (startDate > now) {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  return startDate.toISOString().split("T")[0];
}

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY"];
const TYPE_LABELS: Record<string, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
};

// ── Component ───────────────────────────────────────────

/**
 * Step 3: Opening balances.
 * Spreadsheet-style grid for entering opening debit/credit balances
 * per balance sheet account. Real-time balance check with JE generation.
 */
export function WizardBalancesStep({
  entityId,
  entityFiscalYearEnd,
  onComplete,
  onSkip,
}: WizardBalancesStepProps) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [gridState, setGridState] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [jeDate, setJeDate] = useState(getFiscalYearStartDate(entityFiscalYearEnd));

  // CSV import state
  const [csvHeaders, setCsvHeaders] = useState<string[] | null>(null);
  const [csvSampleRows, setCsvSampleRows] = useState<string[][]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch balance sheet accounts
  useEffect(() => {
    let cancelled = false;

    async function fetchAccounts() {
      try {
        const res = await fetch(`/api/entities/${entityId}/accounts`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success) {
            const allAccounts = json.data as AccountRow[];
            // Build set of parent IDs (any account referenced as parentId)
            const parentIds = new Set<string>();
            for (const a of allAccounts) {
              if (a.parentId) parentIds.add(a.parentId);
            }
            // Only leaf balance-sheet accounts are postable
            const bsLeafAccounts = allAccounts.filter(
              (a) => TYPE_ORDER.includes(a.type) && !parentIds.has(a.id)
            );
            setAccounts(bsLeafAccounts);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAccounts();
    return () => { cancelled = true; };
  }, [entityId]);

  // Balance check
  const balanceCheck = getBalanceCheck(gridState);

  const handleCellChange = useCallback(
    (accountId: string, column: "debit" | "credit", value: string) => {
      setGridState((prev) => {
        const next = new Map(prev);
        const key = cellKey(accountId, column);
        if (value === "" || value === "0") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      });
    },
    []
  );

  const handleGenerateJE = async () => {
    if (!balanceCheck.isBalanced) {
      toast.error("Debits and credits must be balanced");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateOpeningBalanceJE(
        entityId,
        gridState,
        new Date(jeDate)
      );
      toast.success(`Opening balance JE created (${result.journalEntryId})`);
      onComplete();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create opening balance JE"
      );
    } finally {
      setGenerating(false);
    }
  };

  // CSV import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      preview: 10,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          toast.error("CSV file appears to be empty");
          return;
        }
        setCsvHeaders(rows[0]);
        setCsvSampleRows(rows.slice(1));
        setShowMapping(true);
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });

    // Reset file input
    e.target.value = "";
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    // Map CSV data to grid state using the confirmed mapping
    const accountNumberCol = mapping.accountNumber;
    const debitCol = mapping.debit;
    const creditCol = mapping.credit;
    const amountCol = mapping.amount;

    if (!accountNumberCol) {
      toast.error("Account Number column must be mapped");
      setShowMapping(false);
      return;
    }

    if (!debitCol && !creditCol && !amountCol) {
      toast.error("At least one of Debit, Credit, or Amount must be mapped");
      setShowMapping(false);
      return;
    }

    // Build a lookup from account number to account id
    const numberToId = new Map<string, string>();
    for (const acct of accounts) {
      numberToId.set(acct.number, acct.id);
    }

    const newGrid = new Map(gridState);
    const headerIdx = new Map<string, number>();
    if (csvHeaders) {
      csvHeaders.forEach((h, i) => headerIdx.set(h, i));
    }

    const acctNumIdx = headerIdx.get(accountNumberCol);
    const debitIdx = debitCol ? headerIdx.get(debitCol) : undefined;
    const creditIdx = creditCol ? headerIdx.get(creditCol) : undefined;
    const amountIdx = amountCol ? headerIdx.get(amountCol) : undefined;

    let imported = 0;
    for (const row of csvSampleRows) {
      if (acctNumIdx === undefined) continue;
      const acctNum = row[acctNumIdx]?.trim();
      const acctId = numberToId.get(acctNum);
      if (!acctId) continue;

      if (debitIdx !== undefined) {
        const val = parseFloat(row[debitIdx]) || 0;
        if (val > 0) newGrid.set(cellKey(acctId, "debit"), val.toString());
      }
      if (creditIdx !== undefined) {
        const val = parseFloat(row[creditIdx]) || 0;
        if (val > 0) newGrid.set(cellKey(acctId, "credit"), val.toString());
      }
      if (amountIdx !== undefined && debitIdx === undefined && creditIdx === undefined) {
        const val = parseFloat(row[amountIdx]) || 0;
        if (val > 0) {
          newGrid.set(cellKey(acctId, "debit"), val.toString());
        } else if (val < 0) {
          newGrid.set(cellKey(acctId, "credit"), Math.abs(val).toString());
        }
      }
      imported++;
    }

    setGridState(newGrid);
    setShowMapping(false);
    toast.success(`Imported balances for ${imported} accounts`);
  };

  // Group accounts by type
  const groupedAccounts = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0);

  const hasAnyAmount = gridState.size > 0;

  if (showMapping && csvHeaders) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Import Opening Balances from CSV</h2>
        <ColumnMappingUI
          headers={csvHeaders}
          sampleRows={csvSampleRows}
          importType="coa"
          entityId={entityId}
          onConfirm={handleMappingConfirm}
          onCancel={() => setShowMapping(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Opening Balances</h2>
        <p className="text-sm text-muted-foreground">
          Enter the opening debit and credit balances for each balance sheet
          account. Debits must equal credits before generating the journal entry.
        </p>
      </div>

      {/* Date picker and CSV import */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label htmlFor="je-date" className="text-sm font-medium flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Journal Entry Date
          </label>
          <Input
            id="je-date"
            type="date"
            value={jeDate}
            onChange={(e) => setJeDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import from CSV
          </Button>
        </div>
      </div>

      {/* Balance grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Loading accounts...
        </p>
      ) : accounts.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No balance sheet accounts found. Add accounts in the Chart of
            Accounts step first.
          </p>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium w-24">Number</th>
                <th className="px-3 py-2 text-left font-medium">Account Name</th>
                <th className="px-3 py-2 text-right font-medium w-36">Debit</th>
                <th className="px-3 py-2 text-right font-medium w-36">Credit</th>
              </tr>
            </thead>
            <tbody>
              {groupedAccounts.map((group) => (
                <GroupRows
                  key={group.type}
                  label={group.label}
                  accounts={group.accounts}
                  gridState={gridState}
                  onCellChange={handleCellChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Balance indicator */}
      {accounts.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-4 rounded-md border px-4 py-3 text-sm",
            balanceCheck.isBalanced
              ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
              : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
          )}
        >
          {balanceCheck.isBalanced ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <div className="flex flex-wrap gap-4">
            <span>
              Total Debits:{" "}
              <span className="font-mono font-medium">
                ${balanceCheck.totalDebits.toFixed(2)}
              </span>
            </span>
            <span>
              Total Credits:{" "}
              <span className="font-mono font-medium">
                ${balanceCheck.totalCredits.toFixed(2)}
              </span>
            </span>
            {!balanceCheck.isBalanced && (
              <span className="text-red-600 dark:text-red-400">
                Difference:{" "}
                <span className="font-mono font-medium">
                  ${balanceCheck.difference.toFixed(2)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button
          onClick={handleGenerateJE}
          disabled={!hasAnyAmount || !balanceCheck.isBalanced || generating}
        >
          {generating ? "Generating..." : "Generate Opening Balance JE"}
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function GroupRows({
  label,
  accounts,
  gridState,
  onCellChange,
}: {
  label: string;
  accounts: AccountRow[];
  gridState: Map<string, string>;
  onCellChange: (accountId: string, column: "debit" | "credit", value: string) => void;
}) {
  return (
    <>
      <tr className="bg-muted/30">
        <td colSpan={4} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </td>
      </tr>
      {accounts.map((acct) => (
        <tr key={acct.id} className="border-b">
          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
            {acct.number}
          </td>
          <td className="px-3 py-1.5 text-sm">{acct.name}</td>
          <td className="px-3 py-1.5">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={gridState.get(cellKey(acct.id, "debit")) ?? ""}
              onChange={(e) => onCellChange(acct.id, "debit", e.target.value)}
              className="h-7 text-right text-sm font-mono w-full"
            />
          </td>
          <td className="px-3 py-1.5">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={gridState.get(cellKey(acct.id, "credit")) ?? ""}
              onChange={(e) => onCellChange(acct.id, "credit", e.target.value)}
              className="h-7 text-right text-sm font-mono w-full"
            />
          </td>
        </tr>
      ))}
    </>
  );
}
