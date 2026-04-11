"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
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

    if (!selectedBankAccountId) {
      toast.error("Please select a bank account before importing");
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csv: text,
            subledgerItemId: selectedBankAccountId,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        const { imported, skipped, categorized } = json.data;
        const parts: string[] = [];
        if (imported > 0) parts.push(`Imported ${imported} transactions`);
        if (skipped > 0) parts.push(`${skipped} duplicates skipped`);
        if (categorized > 0) parts.push(`${categorized} auto-categorized`);
        toast.success(parts.join(", ") || "Import complete");
        refreshAll();
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ---- Transaction Actions ------------------------------------------------

  const handleCategorize = async (transactionId: string, accountId: string) => {
    if (!entityId) return;

    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
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
          setCategorizePrompt({
            transactionDescription: txn.description,
            merchantName: txn.merchantName,
            accountId,
            accountName: `${account.accountNumber} - ${account.name}`,
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
            disabled={isImporting || !selectedBankAccountId}
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

      {/* Categorize prompt */}
      {categorizePrompt && (
        <CategorizePrompt
          entityId={entityId}
          transactionDescription={categorizePrompt.transactionDescription}
          merchantName={categorizePrompt.merchantName}
          accountId={categorizePrompt.accountId}
          accountName={categorizePrompt.accountName}
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
              <TransactionTable
                transactions={tabData[tab].transactions}
                accounts={accounts}
                onCategorize={handleCategorize}
                onPost={handlePost}
                onBulkPost={handleBulkPost}
                onSplit={handleSplit}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
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
