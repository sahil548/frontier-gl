"use client";

import { useState, useCallback } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { toast } from "sonner";
import { Loader2, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConnectBankFeedProps {
  subledgerItemId: string;
  connectionStatus?: "ACTIVE" | "ERROR" | "DISCONNECTED" | null;
  institutionName?: string | null;
  lastSyncAt?: string | null;
  error?: string | null;
  onSyncComplete?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ConnectBankFeed({
  subledgerItemId,
  connectionStatus,
  institutionName,
  lastSyncAt,
  error,
  onSyncComplete,
}: ConnectBankFeedProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // --- Plaid Link ---

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true);
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            subledgerItemId,
            institutionId: metadata.institution?.institution_id ?? undefined,
            institutionName: metadata.institution?.name ?? undefined,
            accountId: metadata.accounts[0]?.id ?? undefined,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          toast.success(
            `Connected to ${metadata.institution?.name ?? "bank"}! Synced ${json.data?.transactionsSynced ?? 0} transactions.`
          );
          onSyncComplete?.();
        } else {
          toast.error(json.error || "Failed to connect bank");
        }
      } catch {
        toast.error("Failed to connect bank");
      } finally {
        setLoading(false);
        setLinkToken(null);
      }
    },
    [subledgerItemId, onSyncComplete]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      setLinkToken(null);
    },
  });

  // Fetch link token lazily (only on button click)
  const handleConnect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subledgerItemId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLinkToken(json.data.linkToken);
      } else {
        toast.error(json.error || "Failed to create link token");
        setLoading(false);
      }
    } catch {
      toast.error("Failed to create link token");
      setLoading(false);
    }
  }, [subledgerItemId]);

  // Open Plaid Link once token is ready
  if (linkToken && ready) {
    open();
  }

  // --- Sync Now ---

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subledgerItemId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        toast.success(
          `Synced: ${d.added} added, ${d.modified} modified, ${d.removed} removed`
        );
        onSyncComplete?.();
      } else {
        toast.error(json.error || "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [subledgerItemId, onSyncComplete]);

  // ──────────────────────────────────────────────────────────
  // State 1: Not connected
  // ──────────────────────────────────────────────────────────

  if (!connectionStatus) {
    return (
      <Button
        variant="outline"
        size="xs"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Wifi className="mr-1 h-3 w-3" />
        )}
        Connect Bank Feed
      </Button>
    );
  }

  // ──────────────────────────────────────────────────────────
  // State 2: Active connection
  // ──────────────────────────────────────────────────────────

  if (connectionStatus === "ACTIVE") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex h-2 w-2 rounded-full bg-green-500"
          )}
        />
        <span className="text-muted-foreground">
          {institutionName || "Connected"}
        </span>
        {lastSyncAt && (
          <span className="text-muted-foreground/70">
            Synced {formatRelativeTime(lastSyncAt)}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleSyncNow}
          disabled={syncing}
          title="Sync Now"
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // State 3: Error
  // ──────────────────────────────────────────────────────────

  if (connectionStatus === "ERROR") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        <span className="text-amber-600 dark:text-amber-400">
          {error || "Connection error"}
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : null}
          Reconnect
        </Button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // State 4: Disconnected
  // ──────────────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-2 text-xs">
      <WifiOff className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">Disconnected</span>
      <Button
        variant="outline"
        size="xs"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : null}
        Reconnect
      </Button>
    </div>
  );
}
