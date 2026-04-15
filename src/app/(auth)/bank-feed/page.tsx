"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TransactionTable,
  type SerializedBankTransaction,
} from "@/components/bank-feed/transaction-table";
import { SplitDialog } from "@/components/bank-feed/split-dialog";
import { CategorizePrompt } from "@/components/bank-feed/categorize-prompt";
import { ReconciliationSummary } from "@/components/bank-feed/reconciliation-summary";
import { ColumnMappingUI } from "@/components/csv-import/column-mapping-ui";
import Papa from "papaparse";

// ---- Types ----------------------------------------------------------------

type BankAccount = {
  id: string;
  name: string;
  accountId: string;
};

type AccountOption = {
  id: string;
  accountNumber: string;
  name: string;
};

type TabKey = "ALL" | "PENDING" | "CATEGORIZED" | "POSTED";

type TabState = {
  transactions: SerializedBankTransaction[];
  total: number;
  page: number;
  isLoading: boolean;
};

// ---- Accounts cache -------------------------------------------------------

let accountsCache: AccountOption[] = [];
let accountsCacheTime = 0;
const CACHE_TTL = 60_000;

async function fetchAccounts(entityId: string): Promise<AccountOption[]> {
  if (accountsCache.length > 0 && Date.now() - accountsCacheTime < CACHE_TTL) {
    return accountsCache;
  }
  const res = await fetch(`/api/entities/${entityId}/accounts`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  accountsCache = (json.data as { id: string; number: string; name: string }[]).map(
    (a) => ({
      id: a.id,
      accountNumber: a.number,
      name: a.name,
    })
  );
  accountsCacheTime = Date.now();
  return accountsCache;
}

// ---- Component ------------------------------------------------------------

const TABS: TabKey[] = ["ALL", "PENDING", "CATEGORIZED", "POSTED"];

export default function BankFeedPage() {
  const { currentEntityId, entities, isLoading: entityLoading } = useEntityContext();
  const searchParams = useSearchParams();
  const urlSubledgerItemId = searchParams.get("subledgerItemId") ?? "";

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(urlSubledgerItemId);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Split dialog state
  const [splitTransaction, setSplitTransaction] =
    useState<SerializedBankTransaction | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  // Categorize prompt state
  const [categorizePrompt, setCategorizePrompt] = useState<{
    transactionDescription: string;
    merchantName: string | null;
    accountId: string;
    accountName: string;
    positionId?: string | null;
    positionLabel?: string | null;
  } | null>(null);

  // Column mapping state for CSV import
  const [csvMappingData, setCsvMappingData] = useState<{
    csvText: string;
    headers: string[];
    sampleRows: string[][];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab data
  const [tabData, setTabData] = useState<Record<TabKey, TabState>>({
    ALL: { transactions: [], total: 0, page: 1, isLoading: true },
    PENDING: { transactions: [], total: 0, page: 1, isLoading: true },
    CATEGORIZED: { transactions: [], total: 0, page: 1, isLoading: true },
    POSTED: { transactions: [], total: 0, page: 1, isLoading: true },
  });

  const entityId =
    currentEntityId === "all" ? "" : currentEntityId;

  // Fetch bank accounts (subledger items of type BANK_ACCOUNT)
  useEffect(() => {
    if (!entityId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/entities/${entityId}/subledger?itemType=BANK_ACCOUNT`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const items = json.data as {
              id: string;
              name: string;
              accountId: string;
            }[];
            setBankAccounts(items);
          }
        }
      } catch {
        // silently fail
      }
    })();
  }, [entityId]);

  // Fetch GL accounts for combobox
  useEffect(() => {
    if (!entityId) return;
    fetchAccounts(entityId).then(setAccounts);
  }, [entityId]);

  // Fetch transactions for a tab
  const fetchTab = useCallback(
    async (tab: TabKey, page = 1) => {
      if (!entityId) return;

      setTabData((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], isLoading: true },
      }));

      const queryParams = new URLSearchParams({ page: String(page), limit: "50" });
      if (tab !== "ALL") {
        queryParams.set("status", tab);
      }
      if (selectedBankAccountId) {
        queryParams.set("subledgerItemId", selectedBankAccountId);
      }

      try {
        const res = await fetch(
          `/api/entities/${entityId}/bank-transactions?${queryParams.toString()}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTabData((prev) => ({
              ...prev,
              [tab]: {
                transactions: json.data.transactions,
                total: json.data.total,
                page: json.data.page,
                isLoading: false,
              },
            }));
          }
        }
      } catch {
        // silently fail
      } finally {
        setTabData((prev) => ({
          ...prev,
          [tab]: { ...prev[tab], isLoading: false },
        }));
      }
    },
    [entityId, selectedBankAccountId]
  );

  // Fetch all tabs on mount and when filters change
  useEffect(() => {
    for (const tab of TABS) {
      fetchTab(tab);
    }
  }, [fetchTab]);

  const refreshAll = useCallback(() => {
    setSelectedIds([]);
    setCategorizePrompt(null);
    for (const tab of TABS) {
      fetchTab(tab);
    }
  }, [fetchTab]);

  // ---- CSV Import ---------------------------------------------------------

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityId) return;

    // Phase 12-09: the bank-account selector is no longer required at file
    // pick time. If the user maps an "Account" column in the Column Mapping
    // UI they'll enter multi-account (per-row) mode; if not, we'll re-check
    // selectedBankAccountId in handleMappingConfirm before submitting.

    try {
      const text = await file.text();
      // Parse CSV to extract headers and sample rows for mapping UI
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        toast.error("CSV has no headers");
        return;
      }

      const headers = parsed.meta.fields;
      const sampleRows = parsed.data.slice(0, 5).map((row) =>
        headers.map((h) => row[h] ?? "")
      );

      setCsvMappingData({ csvText: text, headers, sampleRows });
    } catch {
      toast.error("Failed to read CSV file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    if (!entityId || !csvMappingData) return;

    // Phase 12-09: branch on whether user mapped the Account column.
    // - With mapping.account: multi-account mode (per-row routing by name)
    // - Without: legacy single-account mode (requires selectedBankAccountId)
    const isMultiAccount = Boolean(mapping.account);

    if (!isMultiAccount && !selectedBankAccountId) {
      toast.error(
        "Please select a bank account in the selector above, OR map the Account column for per-row routing."
      );
      return;
    }

    setIsImporting(true);
    setCsvMappingData(null);
    try {
      const body = isMultiAccount
        ? {
            csv: csvMappingData.csvText,
            columnMapping: mapping,
            accountResolution: {
              strategy: "per-row" as const,
              matchBy: "name" as const,
            },
          }
        : {
            csv: csvMappingData.csvText,
            subledgerItemId: selectedBankAccountId,
            columnMapping: mapping,
          };

      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();
      if (json.success) {
        const { imported, skipped, categorized, errors } = json.data;
        const parts: string[] = [];
        if (imported > 0) parts.push(`Imported ${imported} transactions`);
        if (skipped > 0) parts.push(`${skipped} duplicates skipped`);
        if (categorized > 0) parts.push(`${categorized} auto-categorized`);
        if (errors && errors.length > 0) {
          parts.push(`${errors.length} rows could not be imported`);
        }
        toast.success(parts.join(", ") || "Import complete");

        // Surface unresolved-row errors so the user sees what was skipped.
        if (errors && errors.length > 0) {
          const preview = errors
            .slice(0, 3)
            .map((e: string) => `- ${e}`)
            .join("\n");
          const suffix = errors.length > 3 ? `\n…and ${errors.length - 3} more` : "";
          toast.error(`Unresolved rows:\n${preview}${suffix}`, {
            duration: 10000,
          });
        }

        refreshAll();
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  // ---- Transaction Actions ------------------------------------------------

  const handleCategorize = async (transactionId: string, accountId: string, positionId?: string | null) => {
    if (!entityId) return;

    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, ...(positionId ? { positionId } : {}) }),
        }
      );

      const json = await res.json();
      if (json.success) {
        toast.success("Transaction categorized");

        // Find account name for prompt
        const account = accounts.find((a) => a.id === accountId);
        const txn = tabData[activeTab].transactions.find(
          (t) => t.id === transactionId
        );

        if (account && txn) {
          let resolvedPositionLabel: string | null = null;
          if (positionId) {
            try {
              const posRes = await fetch(`/api/entities/${entityId}/positions`);
              const posJson = await posRes.json();
              if (posJson.success) {
                const pos = posJson.data.find((p: { id: string }) => p.id === positionId);
                if (pos) {
                  resolvedPositionLabel = `${pos.holdingName} -> ${pos.name}`;
                }
              }
            } catch { /* fallback to null */ }
          }

          setCategorizePrompt({
            transactionDescription: txn.description,
            merchantName: txn.merchantName,
            accountId,
            accountName: `${account.accountNumber} - ${account.name}`,
            positionId: positionId ?? null,
            positionLabel: resolvedPositionLabel,
          });
        }

        refreshAll();
      } else {
        toast.error(json.error || "Failed to categorize");
      }
    } catch {
      toast.error("Failed to categorize transaction");
    }
  };

  const handlePost = async (transactionId: string) => {
    if (!entityId) return;

    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/${transactionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postImmediately: true }),
        }
      );

      const json = await res.json();
      if (json.success) {
        toast.success(`Journal entry ${json.data.entryNumber} created and posted`);
        refreshAll();
      } else {
        toast.error(json.error || "Failed to post");
      }
    } catch {
      toast.error("Failed to post transaction");
    }
  };

  const handleBulkPost = async (
    ids: string[],
    accountId: string,
    postImmediately: boolean
  ) => {
    if (!entityId) return;

    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/bulk-categorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionIds: ids,
            accountId,
            postImmediately,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        const { processed, journalEntries } = json.data;
        toast.success(
          postImmediately
            ? `${processed} transactions posted (${journalEntries} JEs created)`
            : `${processed} transactions categorized`
        );
        refreshAll();
      } else {
        toast.error(json.error || "Bulk operation failed");
      }
    } catch {
      toast.error("Bulk operation failed");
    }
  };

  const handleSplit = (transactionId: string) => {
    const txn = tabData[activeTab].transactions.find(
      (t) => t.id === transactionId
    );
    if (txn) {
      setSplitTransaction(txn);
      setSplitOpen(true);
    }
  };

  // ---- Guards -------------------------------------------------------------

  if (entityLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Bank Feed</h1>
        <p className="text-muted-foreground">
          Create an entity first to manage bank transactions.
        </p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Bank Feed</h1>
        <p className="text-muted-foreground">
          Select a specific entity to view bank transactions.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const currentTabData = tabData[activeTab];

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bank Feed</h1>
          {currentEntity && (
            <p className="text-muted-foreground text-sm">
              Viewing: {currentEntity.name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Bank account selector */}
          {bankAccounts.length > 0 && (
            <Select
              value={selectedBankAccountId}
              onValueChange={(v) => setSelectedBankAccountId(v ?? "")}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All bank accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All bank accounts</SelectItem>
                {bankAccounts.map((ba) => (
                  <SelectItem key={ba.id} value={ba.id}>
                    {ba.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* CSV Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="outline"
            onClick={handleImportCsv}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import CSV
          </Button>
        </div>
      </div>

      {/* Column mapping UI for CSV import */}
      {csvMappingData && (
        <ColumnMappingUI
          headers={csvMappingData.headers}
          sampleRows={csvMappingData.sampleRows}
          importType="bank"
          entityId={entityId}
          onConfirm={handleMappingConfirm}
          onCancel={() => setCsvMappingData(null)}
        />
      )}

      {/* Categorize prompt */}
      {categorizePrompt && (
        <CategorizePrompt
          entityId={entityId}
          transactionDescription={categorizePrompt.transactionDescription}
          merchantName={categorizePrompt.merchantName}
          accountId={categorizePrompt.accountId}
          accountName={categorizePrompt.accountName}
          positionId={categorizePrompt.positionId}
          positionLabel={categorizePrompt.positionLabel}
          onDismiss={() => setCategorizePrompt(null)}
          onRuleCreated={refreshAll}
        />
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="ALL"
        onValueChange={(v) => {
          setActiveTab(v as TabKey);
          setSelectedIds([]);
        }}
      >
        <TabsList variant="line">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === "ALL"
                ? "All"
                : tab === "PENDING"
                  ? "Pending"
                  : tab === "CATEGORIZED"
                    ? "Categorized"
                    : "Posted"}
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] h-4 px-1.5"
              >
                {tabData[tab].total}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {tabData[tab].isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ReconciliationSummary transactions={tabData[tab].transactions} />
                <TransactionTable
                  transactions={tabData[tab].transactions}
                  accounts={accounts}
                  onCategorize={handleCategorize}
                  onPost={handlePost}
                  onBulkPost={handleBulkPost}
                  onSplit={handleSplit}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  entityId={entityId}
                />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {currentTabData.total > 50 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Page {currentTabData.page} of{" "}
            {Math.ceil(currentTabData.total / 50)} ({currentTabData.total}{" "}
            transactions)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentTabData.page <= 1}
              onClick={() => fetchTab(activeTab, currentTabData.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                currentTabData.page >= Math.ceil(currentTabData.total / 50)
              }
              onClick={() => fetchTab(activeTab, currentTabData.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Split dialog */}
      <SplitDialog
        transaction={splitTransaction}
        accounts={accounts}
        entityId={entityId}
        open={splitOpen}
        onOpenChange={setSplitOpen}
        onSuccess={refreshAll}
      />
    </div>
  );
}
