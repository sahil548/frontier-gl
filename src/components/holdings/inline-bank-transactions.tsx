"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  TransactionTable,
  type SerializedBankTransaction,
} from "@/components/bank-feed/transaction-table";

// ---- Types ----------------------------------------------------------------

type AccountOption = {
  id: string;
  accountNumber: string;
  name: string;
};

type InlineBankTransactionsProps = {
  entityId: string;
  subledgerItemId: string;
};

// ---- Accounts cache -------------------------------------------------------

let accountsCache: AccountOption[] = [];
let accountsCacheTime = 0;
const CACHE_TTL = 60_000;

async function fetchAccountsCached(entityId: string): Promise<AccountOption[]> {
  if (accountsCache.length > 0 && Date.now() - accountsCacheTime < CACHE_TTL) {
    return accountsCache;
  }
  const res = await fetch(`/api/entities/${entityId}/accounts`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  accountsCache = (json.data as { id: string; number: string; name: string }[]).map(
    (a) => ({ id: a.id, accountNumber: a.number, name: a.name })
  );
  accountsCacheTime = Date.now();
  return accountsCache;
}

// ---- Component ------------------------------------------------------------

/**
 * Inline bank transaction list for Holdings page bank account rows.
 * Renders recent transactions using TransactionTable in compact mode.
 * Supports categorize and post actions inline.
 */
export function InlineBankTransactions({
  entityId,
  subledgerItemId,
}: InlineBankTransactionsProps) {
  const [transactions, setTransactions] = useState<SerializedBankTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Status counts
  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;
  const categorizedCount = transactions.filter((t) => t.status === "CATEGORIZED").length;
  const postedCount = transactions.filter((t) => t.status === "POSTED").length;

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        subledgerItemId,
        limit: "10",
      });
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTransactions(json.data.transactions ?? json.data);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [entityId, subledgerItemId]);

  useEffect(() => {
    fetchTransactions();
    fetchAccountsCached(entityId).then(setAccounts);
  }, [entityId, subledgerItemId, fetchTransactions]);

  const handleCategorize = async (transactionId: string, accountId: string) => {
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
        fetchTransactions();
      } else {
        toast.error(json.error || "Failed to categorize");
      }
    } catch {
      toast.error("Failed to categorize transaction");
    }
  };

  const handlePost = async (transactionId: string) => {
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
        fetchTransactions();
      } else {
        toast.error(json.error || "Failed to post");
      }
    } catch {
      toast.error("Failed to post transaction");
    }
  };

  // No-op handlers for compact mode (no bulk/split needed inline)
  const handleBulkPost = () => {};
  const handleSplit = () => {};

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-muted" />
        ))}
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No transactions imported yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status summary badges */}
      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {pendingCount} pending
          </Badge>
        )}
        {categorizedCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {categorizedCount} categorized
          </Badge>
        )}
        {postedCount > 0 && (
          <Badge variant="default" className="text-xs">
            {postedCount} posted
          </Badge>
        )}
      </div>

      {/* Transaction table in compact mode */}
      <TransactionTable
        transactions={transactions}
        accounts={accounts}
        onCategorize={handleCategorize}
        onPost={handlePost}
        onBulkPost={handleBulkPost}
        onSplit={handleSplit}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        compact
      />

      {/* Override the "View all" link to include subledgerItemId filter */}
      {transactions.length >= 10 && (
        <div className="text-center">
          <Link
            href={`/bank-feed?subledgerItemId=${subledgerItemId}`}
            className="text-sm text-primary hover:underline"
          >
            View all in Bank Feed
          </Link>
        </div>
      )}
    </div>
  );
}
